---
name: prisma-postgres-troubleshooting
description: Diagnose and fix Prisma ORM problems in Postgres projects, especially schema.prisma issues, datasource configuration, env var wiring, migration drift, client generation problems, and database connectivity failures. Use when Codex is working with Prisma and PostgreSQL or Neon and needs to debug setup, migrations, introspection, generated client errors, or runtime query failures.
---

# Prisma Postgres Troubleshooting

Use this skill to debug Prisma setup and runtime failures systematically instead of guessing. Start from the repo state, verify the datasource and environment wiring, then isolate whether the failure is configuration, schema, migration history, generated client drift, or database reachability.

## Workflow

1. Read `prisma/schema.prisma` and the relevant env file before suggesting fixes.
2. Identify the exact failing surface:
   - `prisma validate` or schema parse error
   - `prisma generate` or client type mismatch
   - `prisma migrate dev|deploy|reset` failure
   - `prisma db pull` or introspection failure
   - application runtime query or connection error
3. Verify datasource wiring first. In Postgres projects, check `provider`, `url`, and if relevant `directUrl`.
4. Verify whether the connection string targets pooled or direct access and whether that matches the Prisma command being run.
5. Check migration state versus schema state before editing models. Drift and failed migrations often look like schema bugs.
6. Regenerate or revalidate only after fixing the likely root cause.

## What To Check First

### Datasource Shape

For Postgres, prefer an explicit datasource block such as:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

If `url` is missing, Prisma cannot connect. If `directUrl` is present in env but not used in `schema.prisma`, note that migration commands may still be using the pooled URL unintentionally or not using the direct URL at all.

### Environment Files

Check whether the project uses `.env`, framework-specific env loading, or deployment secrets. Confirm:

- `DATABASE_URL` exists and is actually loaded for the command being run
- `DIRECT_URL` exists if migrations should bypass a pooler
- surrounding quotes, escaping, and special characters are valid
- local and deployed env values are not being confused

### Command Context

Run Prisma commands from the directory that owns `schema.prisma`, or pass `--schema` explicitly. A valid config in one package can appear broken when commands are run from the wrong working directory.

## Neon And Postgres Guidance

When using Neon:

- Use the normal or pooled URL for application traffic based on runtime needs.
- Prefer `DIRECT_URL` for migrations if the pooled endpoint causes migration or prepared statement issues.
- Treat connection failures as one of: bad credentials, bad host, SSL mismatch, wrong endpoint type, or missing env loading.

If Neon-specific details are needed, also read the sibling skill:

`api/.agents/skills/neon-postgres/SKILL.md`

## Common Failure Patterns

### Schema Parses But Commands Fail

Likely causes:

- env var not loaded
- datasource missing `url`
- Prisma command run from the wrong directory
- unreachable database host

### Migration Drift Or Shadow Database Errors

Check:

- whether migration files reflect the current models
- whether the database was changed manually
- whether `DIRECT_URL` should be used for migrations
- whether previous failed migrations left partial state

### Generated Client Mismatch

Check:

- whether `prisma generate` was rerun after schema edits
- whether the app imports a stale generated client
- whether multiple Prisma schemas or clients exist in the repo

### Runtime Query Errors

Separate:

- schema modeling issues
- generated client type issues
- actual database constraint errors
- connection exhaustion or timeout errors

Use the error text to classify the failure before editing models.

## Repo-Specific Notes

In this repo, check `api/prisma/schema.prisma` and `api/.env` first. If `api/.env` defines `DATABASE_URL` or `DIRECT_URL` but the Prisma datasource does not reference them, fix the datasource before attempting migrations or client generation.

## References

Read `references/checklist.md` when you need a concrete debugging checklist for Prisma and Postgres failures.
