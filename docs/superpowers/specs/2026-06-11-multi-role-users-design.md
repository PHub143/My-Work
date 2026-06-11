# Multi-Role Users Design

## Goal

Users should be able to hold multiple roles at once. The first supported roles are:

- `ADMIN`: all access and all actions.
- `STUDENT`: learning content only.

Existing single-role `USER` accounts become `STUDENT` accounts. Existing `ADMIN` accounts remain admin accounts.

## Current State

The backend stores one `User.role` string with a default of `USER`. Login signs that string into the JWT as `role`. Backend authorization checks compare the token or persisted user role to the literal string `ADMIN`. The frontend decodes the token into `user.role` and uses `user?.role === 'ADMIN'` for route and UI checks.

The current active routes are:

- Documents and Gallery: currently behind `ProtectedRoute`.
- Upload, Users, Settings: admin-only behavior.
- Learning AI-103: currently route-level public.

## Data Model

Add a new multi-role field to `User`, named `roles`. It stores an array of fixed role strings. The preferred Prisma shape is a JSON field because it works predictably across PostgreSQL and Prisma for small fixed arrays:

```prisma
roles Json @default("[\"STUDENT\"]")
```

Keep the old `role String @default("USER")` field during this change as a compatibility bridge. New application code should read and write `roles`. The old `role` value should be maintained as a primary role for compatibility until a later cleanup removes it.

Role normalization rules:

- `ADMIN` maps to `["ADMIN"]` unless extra roles are explicitly supplied.
- `USER` maps to `["STUDENT"]`.
- `STUDENT` maps to `["STUDENT"]`.
- Missing, empty, malformed, or unknown roles map to `["STUDENT"]`.
- Duplicate roles are removed.
- Stored role values are uppercase.

## Backend API Behavior

Login responses and JWTs should include `roles`. They also include `role` as a compatibility field. For users without `roles`, login derives roles from legacy `role`.

Public register always creates a student account:

```json
{
  "roles": ["STUDENT"],
  "role": "STUDENT"
}
```

Admin user create/update accepts `roles` as the new preferred request field. The old `role` field can still be accepted as a single-role shorthand during the transition. Responses include both `roles` and `role` so the frontend can migrate incrementally.

Validation:

- Allowed roles are exactly `ADMIN` and `STUDENT`.
- Unknown roles return `400` on admin create/update.
- Empty role arrays return `400` on admin create/update.
- Public register ignores submitted roles and always creates `STUDENT`.

## Authorization

Add shared backend helpers:

- `normalizeRoles(input, fallback)`
- `getUserRoles(user)`
- `hasRole(user, role)`
- `isAdminUser(user)`

Admin-only API routes continue to use `authenticateToken` and `isAdmin`, but `isAdmin` should check the persisted database user's normalized roles rather than trusting only the JWT. This preserves the stale-token revocation behavior from the earlier role fix.

Access rules:

- `ADMIN`: all API mutations and admin-only pages.
- `STUDENT`: no admin API mutations.
- Unauthenticated users: no admin API mutations.

Learning content remains public for unauthenticated visitors to preserve current behavior. Logged-in students can access Learning and should see only Learning navigation after login.

## Frontend Behavior

`AuthContext` should decode `roles` from the token and expose them on `user.roles`. It should also expose a compatibility `user.role` value derived from the highest role:

- `ADMIN` if roles include `ADMIN`.
- `STUDENT` otherwise.

Add frontend helpers:

- `hasRole(user, role)`
- `isAdmin(user)`
- `isStudent(user)`

Route and UI rules:

- `AdminRoute` checks `isAdmin(user)`.
- Documents and Gallery become admin-only.
- Upload, Users, and Settings stay admin-only.
- Learning remains available to students.
- Navbar shows Learning for students.
- Navbar shows all app sections for admins.
- Student users should not see Documents, Gallery, Upload, Users, or Settings.

The Users page changes the single role select into a role checklist. For this first version it shows `Admin` and `Student`. Creating a normal student user selects `Student` by default. Selecting `Admin` is enough for full access; the UI allows both `Admin` and `Student`, but authorization treats `Admin` as all-access.

## Migration Strategy

Because this repo does not currently have a migrations folder, use a safe application-level bridge:

1. Add `roles` to the Prisma schema and regenerate the client.
2. Update service reads to derive roles from `roles` when present, or legacy `role` otherwise.
3. Update service writes to store both `roles` and compatibility `role`.
4. Provide a one-time script or documented database update to backfill existing users:
   - `role = 'ADMIN'` -> `roles = ["ADMIN"]`, `role = 'ADMIN'`
   - any other `role` -> `roles = ["STUDENT"]`, `role = 'STUDENT'`

Do not run destructive database synchronization without explicit approval and a safe database target.

## Testing

Backend tests:

- Public register ignores submitted admin roles and creates `STUDENT`.
- Login includes normalized `roles`.
- Admin middleware accepts persisted `roles: ["ADMIN"]`.
- Admin middleware rejects persisted `roles: ["STUDENT"]`, even if the token claims admin.
- Legacy `role: "USER"` normalizes to `["STUDENT"]`.
- Admin create/update rejects unknown roles and empty role arrays.

Frontend tests or targeted verification:

- `AuthContext` derives `user.roles` and compatibility `user.role`.
- Admin route helper accepts `ADMIN`.
- Student route behavior blocks admin-only pages.
- Navbar hides admin sections for students.
- Users page submits `roles` arrays.

## Out Of Scope

- Custom user-defined roles.
- Permission records or role-management tables.
- Removing the legacy `role` field.
- Audit logs for role changes.
- Database mutation commands against production or any unsafe database target.
