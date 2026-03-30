# Clircel Monorepo

This repo is now split into a small Bun workspace monorepo so you can build the hackathon control plane without mixing the frontend, API, and database code together.

## Apps

- `apps/web`: Next.js 16 frontend
- `apps/api`: Elysia API running on Bun
- `apps/cli`: Bun CLI for local automation and GitHub Actions
- `packages/db`: Drizzle schema and CockroachDB client

## Run It

Install dependencies with Bun:

```bash
bun install
```

Start the frontend:

```bash
bun run dev:web
```

The web app intentionally runs Next through `node` with `--webpack` to avoid Bun/Turbopack instability during local development.

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

The DB scripts automatically load `apps/api/.env`, so keep `DATABASE_URL` there and the API plus migration commands will stay in sync. The web app also needs its own auth variables in `apps/web/.env.local`; copy from `apps/web/.env.example` and point both apps at the same CockroachDB cluster. Shell environment variables still win over file-based values.

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
- Auth is handled in `apps/web` with Better Auth, GitHub OAuth, Drizzle, and CockroachDB.
- User workloads should still run on workers, not inside this API service.
