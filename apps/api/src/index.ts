import { cors } from "@elysiajs/cors";
import { db } from "@clircel/db";
import { jobs, workers } from "@clircel/db/schema";
import { desc } from "drizzle-orm";
import { Elysia } from "elysia";

import { env } from "./env";

const app = new Elysia()
  .use(cors())
  .get("/health", () => ({
    ok: true,
    service: "api",
    timestamp: new Date().toISOString(),
  }))
  .get("/workers", async () => {
    return db.select().from(workers).orderBy(desc(workers.createdAt)).limit(25);
  })
  .get("/jobs", async () => {
    return db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(25);
  })
  .listen({
    hostname: env.API_HOST,
    port: env.API_PORT,
  });

console.log(
  `API listening on http://${app.server?.hostname ?? env.API_HOST}:${app.server?.port ?? env.API_PORT}`,
);
