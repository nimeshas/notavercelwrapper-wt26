import path from "node:path";

import { execa } from "execa";

export type Runtime = "node" | "python";

export class DockerCommandError extends Error {
  constructor(
    message: string,
    public readonly logs: string,
  ) {
    super(message);
    this.name = "DockerCommandError";
  }
}

export function generateDockerfile(runtime: Runtime, entryFile: string): string {
  if (runtime === "node") {
    return `FROM node:20-alpine
WORKDIR /app
COPY . .
RUN if [ -f package.json ]; then npm install --omit=dev; else echo "package.json missing" && exit 1; fi
CMD ["node", ${JSON.stringify(entryFile)}]
`;
  }

  return `FROM python:3.12-alpine
WORKDIR /app
COPY . .
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; else echo "requirements.txt missing" && exit 1; fi
CMD ["python", ${JSON.stringify(entryFile)}]
`;
}

export async function buildImage(
  jobId: string,
  buildContextPath: string,
  signal?: AbortSignal,
): Promise<string> {
  const imageTag = `job-${jobId}`;

  const result = await execa("docker", ["build", "-t", imageTag, "."], {
    cwd: buildContextPath,
    reject: false,
    all: true,
    signal,
  });

  const logs = result.all ?? "";

  if (result.exitCode !== 0) {
    throw new DockerCommandError(`Docker build failed for ${imageTag}`, logs);
  }

  return logs;
}

export async function exportImage(
  jobId: string,
  outputDirectory: string,
  signal?: AbortSignal,
): Promise<string> {
  const imageTag = `job-${jobId}`;
  const outputTarPath = path.join(outputDirectory, "image.tar");

  const result = await execa("docker", ["save", imageTag, "-o", outputTarPath], {
    reject: false,
    all: true,
    signal,
  });

  if (result.exitCode !== 0) {
    throw new DockerCommandError(
      `Docker image export failed for ${imageTag}`,
      result.all ?? "",
    );
  }

  return outputTarPath;
}
