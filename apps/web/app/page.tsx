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
    </main>
  );
}
