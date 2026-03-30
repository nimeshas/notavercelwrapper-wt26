import path from "node:path";
import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "node:url";

import { loadDatabaseUrl } from "./src/drizzle-config";

const configDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(configDir, "../..");

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: loadDatabaseUrl(repoRoot),
  },
  strict: true,
  verbose: true,
});
