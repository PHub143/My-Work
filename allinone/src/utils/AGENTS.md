# AGENTS.md — `src/utils/`

Helper utilities, role logic, and learning module functions.

## Files

| File | Description |
|---|---|
| `roles.js` | Role normalization (`ADMIN`, `STUDENT`), `isAdmin()`, `isStudent()`, `primaryRole()`, `getUserRoles()` |
| `routeAccess.js` | Path-based access helpers: `isLearningPath()`, `getLoginModeForPath()`, `canRoleAccessPath()` |
| `learning.js` | Learning module: stats, filtering, practice sessions, question rendering helpers, TOEIC reading/listening test assembly and scoring, grammar drill assembly (`getDrillTopics`, `assembleDrill`) |
| `learning.test.js` | Tests for `learning.js` using Node's built-in `node:test` and `node:assert/strict` |
| `vocab.js` | English vocabulary spaced repetition: Leitner boxes, due-card queue, streaks, missed-word mining, localStorage persistence |
| `vocab.test.js` | Tests for `vocab.js` (injected `now` timestamps) |
| `progress.js` | English per-tag practice history: accumulates test/drill accuracy per topic, weakest-topics report, localStorage persistence (`english.progress.<userId>`) |
| `progress.test.js` | Tests for `progress.js` |

## Test Patterns

- Tests use `node:test` and `node:assert/strict` (Vitest was not introduced).
- Run tests from `allinone/` with: `node src/utils/learning.test.js`, `node src/utils/vocab.test.js`, and `node src/utils/progress.test.js`
- Follow existing pattern when adding new test suites.
