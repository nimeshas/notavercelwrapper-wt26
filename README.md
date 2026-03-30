# Clircel Monorepo

This repo is now split into a small Bun workspace monorepo so you can build the hackathon control plane without mixing the frontend, API, and database code together.

## Apps

- `apps/web`: Next.js 16 frontend
- `apps/api`: Elysia API running on Bun
- `apps/cli`: Bun CLI for local automation and GitHub Actions
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

Run the CLI:

```bash
bun run cli -- help
```

Generate and push Drizzle schema changes:

```bash
bun run db:generate
bun run db:migrate
```

You can also run Drizzle directly from the repo root:

```bash
bunx drizzle-kit generate
bunx drizzle-kit push
```

The Drizzle configs resolve `apps/api/.env` from the repo root, so `DATABASE_URL` stays in one place for the API and DB tooling. Shell environment variables still win over file-based values.

## CLI

The CLI talks to the API and is intended for automation flows such as GitHub Actions.

Example commands:

```bash
bun run cli -- health
bun run cli -- workers:list
bun run cli -- jobs:list
bun run cli -- jobs:create --runtime node --source-url https://example.com/repo.tar.gz --entry-command "npm start"
```

Set the API URL with:

```bash
export CLIRCEL_API_URL=http://localhost:3001
```

## Hackathon Notes

- Keep the warm-worker scheduler in the API, not in the Next app.
- Do not add Redis until the database-backed lease flow is actually working.
- Neon is fine for control-plane state. User workloads should still run on workers, not inside this API service.
