# AGENTS.md — `scripts/`

Operational jobs such as Drive sync, token management, and admin seeding.

## Files

| File | Description |
|---|---|
| `sync-drive.js` | Syncs each configured drive, removes orphaned database records, upserts Drive files, attempts to make synced files public. Called by `npm run db:sync` and scheduled hourly in `server.js`. |
| `seed-admin.js` | Seeds the default admin user |
| `get-token.js` | OAuth token retrieval utility |
| `get-token-fallback.js` | Fallback token retrieval |
| `test-token.js` | Token testing utility |

## Sync Behavior

- `server.js` schedules `syncDatabase()` hourly and runs an initial sync on startup. Startup tolerates unconfigured Drive with a warning.
- `scripts/sync-drive.js` is the sync implementation.
- `npm run db:sync` can call Google APIs and mutate database state. Treat it as an integration operation, not a cheap verification command.
