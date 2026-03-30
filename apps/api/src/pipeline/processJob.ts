import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import {
  buildImage,
  DockerCommandError,
  exportImage,
  generateDockerfile,
  type Runtime,
} from "./services/dockerService";
import { cloneRepo, CodeFetchError, extractZip } from "./services/codeFetcher";
import {
  getJobById,
  JOB_STATUS,
  saveLogs,
  updateJobStatus,
  updateRuntime,
  type JobStatus,
} from "./services/jobService";
import { isObjectPubliclyAccessible, uploadToR2 } from "./services/storageService";

const PROCESS_TIMEOUT_MS = 120_000;
const MAX_SOURCE_BYTES = 250 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 512 * 1024 * 1024;
const R2_UPLOAD_MAX_RETRIES = 3;

const processJobIdSchema = z.string().uuid();

const metadataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .optional()
  .nullable();

const dbJobSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  runtime: z.string(),
  sourceUrl: z.string().min(1),
  entryCommand: z.string().min(1),
  metadata: metadataSchema,
});

type RuntimeDetection = {
  runtime: Runtime;
  entryFile: string;
};

type JobSourceType = "repo" | "upload";

export type ProcessJobResult = {
  jobId: string;
  status: JobStatus;
  artifactUrl: string | null;
};

export async function processJob(jobId: string): Promise<ProcessJobResult> {
  processJobIdSchema.parse(jobId);

  const jobDirectory = path.join("/tmp/jobs", jobId);
  const sourceDirectory = path.join(jobDirectory, "source");
  const logs: string[] = [];

  let artifactUrl: string | null = null;
  let jobFound = false;

  const log = (message: string): void => {
    const line = `[${new Date().toISOString()}] ${message}`;
    logs.push(line);
    console.info(`[processJob:${jobId}] ${message}`);
  };

  try {
    const result = await runWithTimeout(async (signal) => {
      const fetchedJob = await getJobById(jobId);

      if (!fetchedJob) {
        throw new Error(`Job not found: ${jobId}`);
      }

      jobFound = true;

      const job = dbJobSchema.parse(fetchedJob);
      const sourceType = resolveSourceType(job.sourceUrl, job.metadata);

      await updateJobStatus({
        jobId: job.id,
        status: JOB_STATUS.PROCESSING,
      });

      log(`Job moved to ${JOB_STATUS.PROCESSING}`);
      log(`Source type: ${sourceType}`);

      await rm(jobDirectory, { recursive: true, force: true });
      await mkdir(sourceDirectory, { recursive: true });
      log(`Workspace prepared at ${jobDirectory}`);

      if (sourceType === "repo") {
        log(`Cloning repository: ${job.sourceUrl}`);
        await cloneRepo(job.sourceUrl, sourceDirectory, signal);
      } else {
        const zipPath = path.join(jobDirectory, "source.zip");
        await stageUploadSource(job.sourceUrl, zipPath, signal, log);
        log(`Extracting zip archive to ${sourceDirectory}`);
        await extractZip(zipPath, sourceDirectory, signal);
      }

      const sourceSizeBytes = await getDirectorySize(sourceDirectory);

      if (sourceSizeBytes > MAX_SOURCE_BYTES) {
        throw new Error(
          `Source too large: ${sourceSizeBytes} bytes exceeds ${MAX_SOURCE_BYTES} bytes`,
        );
      }

      log(`Source size: ${sourceSizeBytes} bytes`);

      const runtime = await detectRuntime(sourceDirectory);
      const entryCommand = getEntryCommand(runtime.runtime, runtime.entryFile);
      log(`Detected runtime=${runtime.runtime}, entryFile=${runtime.entryFile}`);

      await updateRuntime({
        jobId: job.id,
        runtime: runtime.runtime,
        entryCommand,
      });

      const dockerfile = generateDockerfile(runtime.runtime, runtime.entryFile);
      await writeFile(path.join(sourceDirectory, "Dockerfile"), dockerfile, "utf8");
      log("Dockerfile generated");

      log("Building Docker image");
      const buildLogs = await buildImage(job.id, sourceDirectory, signal);

      if (buildLogs.trim().length > 0) {
        logs.push(`[docker-build]\n${buildLogs}`);
      }

      log("Docker image built successfully");

      const artifactPath = await exportImage(job.id, jobDirectory, signal);
      const artifactStats = await stat(artifactPath);

      if (artifactStats.size > MAX_ARTIFACT_BYTES) {
        throw new Error(
          `Artifact too large: ${artifactStats.size} bytes exceeds ${MAX_ARTIFACT_BYTES} bytes`,
        );
      }

      log(`Artifact exported to ${artifactPath} (${artifactStats.size} bytes)`);

      const r2Key = `jobs/${job.id}.tar`;
      artifactUrl = await uploadWithRetry(artifactPath, r2Key, log, signal);
      log(`Artifact uploaded to R2 at key=${r2Key}`);

      const isPublic = await isObjectPubliclyAccessible(artifactUrl);

      if (!isPublic) {
        log(
          `Warning: artifact URL may not be publicly accessible. Bucket may be private: ${artifactUrl}`,
        );
      }

      await updateJobStatus({
        jobId: job.id,
        status: JOB_STATUS.READY,
        artifactUrl,
      });

      log(`Job moved to ${JOB_STATUS.READY}`);

      return {
        jobId: job.id,
        status: JOB_STATUS.READY,
        artifactUrl,
      } satisfies ProcessJobResult;
    }, PROCESS_TIMEOUT_MS);

    return result;
  } catch (error) {
    const message = formatError(error);

    log(`Job failed: ${message}`);

    if (error instanceof DockerCommandError || error instanceof CodeFetchError) {
      if (error.logs.trim().length > 0) {
        logs.push(`[error-detail]\n${error.logs}`);
      }
    }

    if (jobFound) {
      try {
        await updateJobStatus({
          jobId,
          status: JOB_STATUS.FAILED,
        });
      } catch (statusError) {
        log(`Failed to update status to FAILED: ${formatError(statusError)}`);
      }
    }

    return {
      jobId,
      status: JOB_STATUS.FAILED,
      artifactUrl,
    };
  } finally {
    if (jobFound) {
      try {
        await saveLogs({
          jobId,
          logs: logs.join("\n"),
        });
      } catch (logError) {
        console.error(
          `[processJob:${jobId}] failed to persist logs: ${formatError(logError)}`,
        );
      }
    }

    try {
      await rm(jobDirectory, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn(
        `[processJob:${jobId}] cleanup warning: ${formatError(cleanupError)}`,
      );
    }
  }
}

async function stageUploadSource(
  source: string,
  zipDestination: string,
  signal: AbortSignal,
  log: (message: string) => void,
): Promise<void> {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    log(`Downloading uploaded archive from URL: ${source}`);

    const response = await fetch(source, { signal });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to download uploaded source: HTTP ${response.status}`);
    }

    await Bun.write(zipDestination, response);
    return;
  }

  const normalizedSource = source.startsWith("file://")
    ? decodeURIComponent(new URL(source).pathname)
    : source;

  const absoluteSourcePath = path.isAbsolute(normalizedSource)
    ? normalizedSource
    : path.resolve(normalizedSource);

  const sourceFile = Bun.file(absoluteSourcePath);

  if (!(await sourceFile.exists())) {
    throw new Error(`Upload source file does not exist: ${absoluteSourcePath}`);
  }

  log(`Copying uploaded archive from local path: ${absoluteSourcePath}`);
  await Bun.write(zipDestination, sourceFile);
}

async function detectRuntime(sourceDirectory: string): Promise<RuntimeDetection> {
  const packageJsonPath = path.join(sourceDirectory, "package.json");
  const requirementsPath = path.join(sourceDirectory, "requirements.txt");

  const hasPackageJson = await Bun.file(packageJsonPath).exists();

  if (hasPackageJson) {
    const packageJsonRaw = await readFile(packageJsonPath, "utf8");
    const packageJson = z
      .object({
        main: z.string().optional(),
      })
      .passthrough()
      .parse(JSON.parse(packageJsonRaw));

    const candidateEntryFiles = [
      packageJson.main,
      "index.js",
      "server.js",
      "app.js",
      "dist/index.js",
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const entryFile of candidateEntryFiles) {
      if (await Bun.file(path.join(sourceDirectory, entryFile)).exists()) {
        return {
          runtime: "node",
          entryFile,
        };
      }
    }

    throw new Error("Missing Node entry file (checked main/index.js/server.js/app.js/dist/index.js)");
  }

  if (await Bun.file(requirementsPath).exists()) {
    const pythonCandidates = ["main.py", "app.py", "server.py"];

    for (const entryFile of pythonCandidates) {
      if (await Bun.file(path.join(sourceDirectory, entryFile)).exists()) {
        return {
          runtime: "python",
          entryFile,
        };
      }
    }

    throw new Error("Missing Python entry file (checked main.py/app.py/server.py)");
  }

  throw new Error("Unsupported runtime. Expected package.json (Node) or requirements.txt (Python)");
}

function getEntryCommand(runtime: Runtime, entryFile: string): string {
  if (runtime === "node") {
    return `node ${entryFile}`;
  }

  return `python ${entryFile}`;
}

function resolveSourceType(
  sourceUrl: string,
  metadata: Record<string, unknown> | null | undefined,
): JobSourceType {
  const metadataValue = metadata?.sourceType;

  if (metadataValue === "repo" || metadataValue === "upload") {
    return metadataValue;
  }

  const lowerSourceUrl = sourceUrl.toLowerCase();

  if (
    lowerSourceUrl.startsWith("file://") ||
    lowerSourceUrl.endsWith(".zip") ||
    lowerSourceUrl.includes(".zip?")
  ) {
    return "upload";
  }

  return "repo";
}

async function getDirectorySize(directory: string): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true });
  let total = 0;

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      total += await getDirectorySize(fullPath);
      continue;
    }

    if (entry.isFile()) {
      const fileStats = await stat(fullPath);
      total += fileStats.size;
    }
  }

  return total;
}

async function uploadWithRetry(
  filePath: string,
  key: string,
  log: (message: string) => void,
  signal: AbortSignal,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= R2_UPLOAD_MAX_RETRIES; attempt += 1) {
    if (signal.aborted) {
      throw signal.reason ?? new Error("Upload aborted");
    }

    try {
      log(`Uploading artifact to R2 (attempt ${attempt}/${R2_UPLOAD_MAX_RETRIES})`);
      return await uploadToR2(filePath, key);
    } catch (error) {
      lastError = error;
      log(`R2 upload attempt ${attempt} failed: ${formatError(error)}`);

      if (attempt < R2_UPLOAD_MAX_RETRIES) {
        await sleep(attempt * 500, signal);
      }
    }
  }

  throw new Error(
    `R2 upload failed after ${R2_UPLOAD_MAX_RETRIES} attempts: ${formatError(lastError)}`,
  );
}

async function runWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`Job timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    throw signal.reason ?? new Error("Operation aborted");
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason ?? new Error("Operation aborted"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
