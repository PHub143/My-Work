# Prisma Postgres Troubleshooting Checklist

## Quick Triage

1. Open `prisma/schema.prisma`.
2. Open the env file used by the failing command.
3. Identify the failing command and its exact error text.
4. Confirm the working directory and whether `--schema` is needed.
5. Decide whether this is config, migration, generation, or runtime.

## Schema Checks

- Confirm `datasource db` includes `provider = "postgresql"`.
- Confirm `url = env("DATABASE_URL")` is present.
- Add `directUrl = env("DIRECT_URL")` when the project uses a direct migration connection.
- Confirm model relations have matching fields and references.
- Confirm optional vs required fields match the intended DB constraints.

## Env Checks

- Confirm `DATABASE_URL` is defined.
- Confirm `DIRECT_URL` is defined if migrations should use a direct connection.
- Confirm URLs target the correct database and environment.
- Confirm SSL params and query params are valid for the provider.
- Confirm secrets are not placeholder values.

## Command Checks

Use the right command for the job:

- `npx prisma validate` for schema syntax and config checks
- `npx prisma generate` after schema changes
- `npx prisma migrate dev` for local development migrations
- `npx prisma migrate deploy` for applying committed migrations
- `npx prisma db pull` for introspection from an existing database

## Interpretation Hints

- Errors mentioning env vars, datasource, or schema loading usually mean config problems.
- Errors during migration application usually mean drift, SQL incompatibility, or connection mode issues.
- Runtime errors after successful generation often point to DB constraints or stale application assumptions.

## Fix Order

1. Fix datasource and env wiring.
2. Re-run validation.
3. Fix migration history or generate a new migration.
4. Re-run client generation.
5. Re-test the app path that previously failed.
