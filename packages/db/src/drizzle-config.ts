import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "dotenv";

const API_ENV_FILES = [".env", ".env.local"] as const;

function loadApiEnv(repoRoot: string) {
  const apiDir = path.join(repoRoot, "apps", "api");
  const shellKeys = new Set(Object.keys(process.env));

  for (const envFile of API_ENV_FILES) {
    const envPath = path.join(apiDir, envFile);

    if (!existsSync(envPath)) {
      continue;
    }

    const parsed = parse(readFileSync(envPath));

    for (const [key, value] of Object.entries(parsed)) {
      if (shellKeys.has(key)) {
        continue;
      }

      process.env[key] = value;
    }
  }
}

export function loadDatabaseUrl(repoRoot: string) {
  loadApiEnv(repoRoot);

  if (!process.env.DATABASE_URL) {
    throw new Error(
      `DATABASE_URL is required. Set it in your shell or ${path.join(repoRoot, "apps", "api", ".env")}.`,
    );
  }

  return process.env.DATABASE_URL;
}
