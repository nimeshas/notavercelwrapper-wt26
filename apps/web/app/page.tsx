"use client";

import { useEffect, useMemo, useState } from "react";

type JobMetadata = Record<string, string | number | boolean> | null;

type Job = {
  id: string;
  status: string;
  runtime: string;
  sourceUrl: string;
  entryCommand: string;
  exposedPort: number | null;
  metadata: JobMetadata;
  createdAt: string;
};

type CreateJobResponse = {
  ok: boolean;
  job?: Job;
  message?: string;
};

const STATUS_CLASS: Record<string, string> = {
  queued: "status queued",
  processing: "status processing",
  ready: "status ready",
  failed: "status failed",
};

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<"repo" | "upload">("repo");
  const [runtime, setRuntime] = useState("node");
  const [sourceUrl, setSourceUrl] = useState("");
  const [entryCommand, setEntryCommand] = useState("auto");
  const [exposedPort, setExposedPort] = useState("");

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [jobs],
  );

  async function fetchJobs() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/jobs", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs (${response.status})`);
      }

      const payload = (await response.json()) as Job[];
      setJobs(payload);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sourceUrl.trim()) {
      setError("Source URL/path is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          runtime,
          sourceUrl: sourceUrl.trim(),
          entryCommand: entryCommand.trim() || "auto",
          exposedPort: exposedPort.trim() ? Number(exposedPort) : undefined,
          metadata: {
            sourceType,
          },
        }),
      });

      const payload = (await response.json()) as CreateJobResponse;

      if (!response.ok || !payload.ok || !payload.job) {
        throw new Error(payload.message ?? `Create job failed (${response.status})`);
      }

      setSourceUrl("");
      setExposedPort("");
      await fetchJobs();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void fetchJobs();
  }, []);

  return (
    <main className="shell">
      <section className="panel intro fade-in">
        <p className="kicker">Serverless Build Pipeline</p>
        <h1>Code to Docker to R2</h1>
        <p className="subtitle">
          Create jobs, track status, and verify artifacts from one minimal control page.
        </p>
      </section>

      <section className="panel fade-in" style={{ animationDelay: "0.08s" }}>
        <form className="form" onSubmit={onSubmit}>
          <div className="field-row">
            <label>
              <span>Source Type</span>
              <select value={sourceType} onChange={(e) => setSourceType(e.target.value as "repo" | "upload")}>
                <option value="repo">repo</option>
                <option value="upload">upload</option>
              </select>
            </label>

            <label>
              <span>Runtime</span>
              <select value={runtime} onChange={(e) => setRuntime(e.target.value)}>
                <option value="node">node</option>
                <option value="python">python</option>
              </select>
            </label>

            <label>
              <span>Exposed Port (optional)</span>
              <input
                type="number"
                min={1}
                max={65535}
                value={exposedPort}
                onChange={(e) => setExposedPort(e.target.value)}
                placeholder="3000"
              />
            </label>
          </div>

          <label>
            <span>Source URL / Path</span>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://github.com/org/repo or /tmp/source.zip"
              required
            />
          </label>

          <label>
            <span>Entry Command</span>
            <input
              value={entryCommand}
              onChange={(e) => setEntryCommand(e.target.value)}
              placeholder="auto"
              required
            />
          </label>

          <div className="actions">
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Create Job"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void fetchJobs()} disabled={loading}>
              Refresh
            </button>
          </div>

          {error ? <p className="error">{error}</p> : null}
        </form>
      </section>

      <section className="panel fade-in" style={{ animationDelay: "0.16s" }}>
        <div className="list-header">
          <h2>Recent Jobs</h2>
          <span>{loading ? "Loading..." : `${sortedJobs.length} jobs`}</span>
        </div>

        <div className="list">
          {sortedJobs.map((job) => {
            const metadata = job.metadata ?? {};
            const artifactUrl = String(metadata.artifactUrl ?? "");
            const logs = String(metadata.logs ?? "");

            return (
              <article key={job.id} className="job-card">
                <div className="job-head">
                  <code>{job.id}</code>
                  <span className={STATUS_CLASS[job.status] ?? "status"}>{job.status}</span>
                </div>

                <dl>
                  <div>
                    <dt>Runtime</dt>
                    <dd>{job.runtime}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd className="break">{job.sourceUrl}</dd>
                  </div>
                  <div>
                    <dt>Entry</dt>
                    <dd>{job.entryCommand}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(job.createdAt).toLocaleString()}</dd>
                  </div>
                  {artifactUrl ? (
                    <div>
                      <dt>Artifact</dt>
                      <dd className="break">
                        <a href={artifactUrl} target="_blank" rel="noreferrer">
                          {artifactUrl}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {logs ? (
                    <div>
                      <dt>Logs</dt>
                      <dd className="logs">{logs.slice(0, 260)}{logs.length > 260 ? "..." : ""}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            );
          })}

          {!loading && sortedJobs.length === 0 ? (
            <p className="empty">No jobs yet. Create one above.</p>
          ) : null}
        </div>
      </section>
import { headers } from "next/headers";

import { SignInCard } from "@/components/sign-in-card";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden px-6 py-14 sm:px-10">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-[8%] top-[14%] h-56 w-56 rounded-full bg-[rgba(31,111,235,0.14)] blur-3xl" />
        <div className="absolute bottom-[10%] right-[10%] h-72 w-72 rounded-full bg-[rgba(255,149,0,0.16)] blur-3xl" />
      </div>
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel)] p-8 shadow-[0_24px_80px_rgba(49,33,12,0.10)] backdrop-blur md:p-12">
          <div className="space-y-8">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[rgba(31,111,235,0.18)] bg-white/70 px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
              GitHub OAuth
            </div>
            <div className="space-y-4">
              <p className="max-w-xl font-mono text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
                Launch repos into warm workers without passing PATs around.
              </p>
              <h1 className="max-w-2xl text-5xl font-semibold tracking-[-0.06em] text-[var(--foreground)] sm:text-6xl">
                Sign in once.
                <br />
                Hand Clircel repo access safely.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-[var(--muted)]">
                GitHub OAuth powers the control plane login. We request repository
                access so the platform can inspect, clone, and launch your repos on
                demand.
              </p>
            </div>
          </div>
          <div className="grid gap-4 pt-10 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-white/75 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Scope
              </p>
              <p className="mt-3 font-mono text-lg font-medium text-[var(--foreground)]">
                repo
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-white/75 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Backend
              </p>
              <p className="mt-3 text-lg font-medium text-[var(--foreground)]">
                Better Auth + Drizzle
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-white/75 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Database
              </p>
              <p className="mt-3 text-lg font-medium text-[var(--foreground)]">
                CockroachDB
              </p>
            </div>
          </div>
        </section>
        <SignInCard session={session} />
      </div>
    </main>
  );
}
