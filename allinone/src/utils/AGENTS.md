# AGENTS.md — `src/utils/`

Helper utilities, role logic, and learning module functions.

## Files

| File | Description |
|---|---|
| `roles.js` | Role normalization (`ADMIN`, `STUDENT`), `isAdmin()`, `isStudent()`, `primaryRole()`, `getUserRoles()` |
| `routeAccess.js` | Path-based access helpers: `isLearningPath()`, `getLoginModeForPath()`, `canRoleAccessPath()` |
| `learning.js` | Learning module: stats, filtering, practice sessions, question rendering helpers (~1200 lines) |
| `learning.test.js` | Tests for `learning.js` using Node's built-in `node:test` and `node:assert/strict` |

## Test Patterns

- Tests use `node:test` and `node:assert/strict` (Vitest was not introduced).
- Run tests from `allinone/` with: `node src/utils/learning.test.js`
- Follow existing pattern when adding new test suites.
