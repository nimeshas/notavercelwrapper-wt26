import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "node:url";

import { loadDatabaseUrl } from "./packages/db/src/drizzle-config";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  out: "./packages/db/drizzle",
  schema: "./packages/db/src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: loadDatabaseUrl(repoRoot),
  },
  strict: true,
  verbose: true,
});
