import { db } from "@clircel/db";
import { jobs } from "@clircel/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export type JobRecord = typeof jobs.$inferSelect;

type JobMetadataValue = string | number | boolean;
type JobMetadata = Record<string, JobMetadataValue>;

export const JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

const createJobSchema = z.object({
  sourceType: z.enum(["repo", "upload"]),
  source: z.string().min(1),
  runtime: z.string().min(1).optional(),
  entryCommand: z.string().min(1).optional(),
});

const updateJobStatusSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum([
    JOB_STATUS.QUEUED,
    JOB_STATUS.PROCESSING,
    JOB_STATUS.READY,
    JOB_STATUS.FAILED,
  ]),
  artifactUrl: z.string().url().optional(),
});

const saveLogsSchema = z.object({
  jobId: z.string().uuid(),
  logs: z.string(),
});

const updateRuntimeSchema = z.object({
  jobId: z.string().uuid(),
  runtime: z.enum(["node", "python"]),
  entryCommand: z.string().min(1),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

export async function createJob(input: CreateJobInput): Promise<JobRecord> {
  const validated = createJobSchema.parse(input);

  const [job] = await db
    .insert(jobs)
    .values({
      status: JOB_STATUS.QUEUED,
      runtime: validated.runtime ?? "unknown",
      sourceUrl: validated.source,
      entryCommand: validated.entryCommand ?? "auto",
      metadata: {
        sourceType: validated.sourceType,
      },
    })
    .returning();

  return job;
}

export async function getJobById(jobId: string): Promise<JobRecord | null> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return job ?? null;
}

export async function updateJobStatus(params: {
  jobId: string;
  status: JobStatus;
  artifactUrl?: string;
}): Promise<JobRecord> {
  const validated = updateJobStatusSchema.parse(params);
  const currentJob = await getRequiredJob(validated.jobId);

  const patch: JobMetadata = {};

  if (validated.artifactUrl) {
    patch.artifactUrl = validated.artifactUrl;
  }

  const [job] = await db
    .update(jobs)
    .set({
      status: validated.status,
      metadata: mergeMetadata(currentJob.metadata, patch),
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, validated.jobId))
    .returning();

  return job;
}

export async function saveLogs(params: { jobId: string; logs: string }): Promise<JobRecord> {
  const validated = saveLogsSchema.parse(params);
  const currentJob = await getRequiredJob(validated.jobId);

  const [job] = await db
    .update(jobs)
    .set({
      metadata: mergeMetadata(currentJob.metadata, {
        logs: validated.logs,
      }),
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, validated.jobId))
    .returning();

  return job;
}

export async function updateRuntime(params: {
  jobId: string;
  runtime: "node" | "python";
  entryCommand: string;
}): Promise<JobRecord> {
  const validated = updateRuntimeSchema.parse(params);
  const [job] = await db
    .update(jobs)
    .set({
      runtime: validated.runtime,
      entryCommand: validated.entryCommand,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, validated.jobId))
    .returning();

  return job;
}

async function getRequiredJob(jobId: string): Promise<JobRecord> {
  const job = await getJobById(jobId);

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  return job;
}

function mergeMetadata(
  existing: JobRecord["metadata"],
  patch: JobMetadata,
): JobMetadata {
  return {
    ...(existing ?? {}),
    ...patch,
  };
}
