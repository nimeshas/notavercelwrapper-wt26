# Clircel Monorepo

This repo is now split into a small Bun workspace monorepo so you can build the hackathon control plane without mixing the frontend, API, and database code together.

## Apps

- `apps/web`: Next.js 16 frontend
- `apps/api`: Elysia API running on Bun
- `packages/db`: Drizzle schema and Neon client

## Run It

Install dependencies with Bun:

```bash
bun install
```

Start the frontend:

```bash
bun run dev:web
```

Start the API:

```bash
cp apps/api/.env.example apps/api/.env
bun run dev:api
```

Generate and push Drizzle schema changes:

```bash
bun run db:generate
bun run db:migrate
```

The DB scripts automatically load `apps/api/.env`, so keep `DATABASE_URL` there and the API plus migration commands will stay in sync.

## Hackathon Notes

- Keep the warm-worker scheduler in the API, not in the Next app.
- Do not add Redis until the database-backed lease flow is actually working.
- Neon is fine for control-plane state. User workloads should still run on workers, not inside this API service.
