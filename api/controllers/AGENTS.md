# AGENTS.md — `controllers/`

Request/response validation and flow control. Validates input in controllers before calling services.

## Files

| File | Description |
|---|---|
| `authController.js` | Login, token verification |
| `configController.js` | Drive config CRUD handlers |
| `fileController.js` | File upload, listing, delete handlers |
| `userAuthController.js` | User registration, authentication |
| `userController.js` | User management (admin) |
| `learningResultController.js` | Learning-result create/list handlers |
| `ybmAssetController.js` | Streams a YBM Drive asset to the response; see `services/ybmAssetService.js` |

## Conventions

- Validate request input in controllers before calling services.
- Return JSON errors in `{ message: string }` format.
- Use centralized error handling: throw or pass errors with optional `status` and `message`.
- Avoid introducing new frameworks, ORMs, upload middleware, or build tooling unless required by the task.
