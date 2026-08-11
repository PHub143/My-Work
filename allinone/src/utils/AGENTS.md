# AGENTS.md — `src/utils/`

Helper utilities, role logic, and learning module functions.

## Files

| File | Description |
|---|---|
| `roles.js` | Role normalization (`ADMIN`, `STUDENT`), `isAdmin()`, `isStudent()`, `primaryRole()`, `getUserRoles()` |
| `routeAccess.js` | Path-based access helpers: `isLearningPath()`, `getLoginModeForPath()`, `canRoleAccessPath()` |
| `learning.js` | Learning module: stats, filtering, practice sessions, question rendering helpers |
| `learning.test.js` | Tests for `learning.js` using Node's built-in `node:test` and `node:assert/strict` |
| `ai102.js` | AI-102 content helpers |
| `ybm.js` | YBM TOEIC: booklet page and audio URLs, option keys, test readiness, attempt persistence (localStorage), scoring |
| `ybm.test.js` | Tests for `ybm.js`, the manifest, and the answer keys |
| `toeicScore.js` | Raw-to-scaled TOEIC conversion (5–495 per section, 990 cap) |

## Test Patterns

- Tests use `node:test` and `node:assert/strict` (Vitest was not introduced).
- Run the whole suite from `allinone/` with `npm test`, or a single file with `node src/utils/learning.test.js`.
- Follow existing pattern when adding new test suites.
