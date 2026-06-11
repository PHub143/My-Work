# Multi-Role Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-role users where `ADMIN` has all access and `STUDENT` can access only Learning content.

**Architecture:** Add a `roles` JSON field while keeping legacy `role` as a compatibility bridge. Centralize role normalization and authorization helpers on backend and frontend, then migrate route/UI checks from single-role comparisons to helper-based checks.

**Tech Stack:** Express 5 CommonJS backend, Prisma 7 PostgreSQL, JSON Web Tokens, React 19 + Vite 8 frontend, plain CSS, Node `node:test`.

---

## Pre-Execution Context

The working tree contains uncommitted role-security edits from the previous fix:

- `api/controllers/userAuthController.js`
- `api/controllers/userController.js`
- `api/middleware/authMiddleware.js`
- `api/services/userService.js`
- `allinone/src/App.jsx`
- `api/auth-role.test.js`

Do not revert those edits. Treat them as the starting point if they are present. Keep changes scoped to `api/`, `allinone/src/`, and this plan's verification files.

Do not run `npm run build` in `api/`; that script runs `prisma db push --accept-data-loss`. For backend schema verification, run `npx prisma generate` only.

## File Structure

Backend files:

- Create `api/utils/roles.js`: fixed role constants, role normalization, compatibility primary-role helpers.
- Modify `api/prisma/schema.prisma`: add `User.roles Json @default("[\"STUDENT\"]")`.
- Modify `api/services/userService.js`: normalize roles on reads/writes and expose `findUserById`.
- Modify `api/controllers/userAuthController.js`: issue JWTs and responses with `roles` and compatibility `role`; public register always creates student.
- Modify `api/controllers/userController.js`: admin create/update accepts `roles` arrays, validates fixed roles, returns safe users with normalized roles.
- Modify `api/middleware/authMiddleware.js`: use `isAdminUser` against persisted DB user.
- Modify `api/auth-role.test.js`: expand Node tests for role normalization and authorization.

Frontend files:

- Create `allinone/src/utils/roles.js`: frontend role helpers matching backend semantics.
- Modify `allinone/src/AuthContext.jsx`: decode `roles` and expose compatibility `role`.
- Modify `allinone/src/components/AdminRoute.jsx`: use frontend `isAdmin`.
- Modify `allinone/src/components/ProtectedRoute.jsx`: admin-only documents/gallery access.
- Modify `allinone/src/components/Navbar.jsx`: show Learning to students and all sections to admins.
- Modify `allinone/src/components/FileModal.jsx`: use `isAdmin` for delete/tag editing controls.
- Modify `allinone/src/pages/Users.jsx`: replace single role select with role checkboxes and submit `roles`.
- Modify `allinone/src/pages/Users.css`: style the role checkbox group.
- Modify `allinone/src/App.jsx`: Documents, Gallery, Upload, Users, Settings require admin; Learning remains public.

## Tasks

### Task 1: Backend Role Helpers And Regression Tests

**Files:**
- Create: `api/utils/roles.js`
- Modify: `api/auth-role.test.js`

- [ ] **Step 1: Write failing tests for normalization and admin checks**

Append these tests to `api/auth-role.test.js`:

```js
test('normalizeRoles maps legacy USER to STUDENT', () => {
  const { normalizeRoles, primaryRole } = require('./utils/roles');

  assert.deepEqual(normalizeRoles('USER'), ['STUDENT']);
  assert.equal(primaryRole(['STUDENT']), 'STUDENT');
});

test('normalizeRoles keeps ADMIN as all-access role', () => {
  const { normalizeRoles, hasRole, isAdminUser, primaryRole } = require('./utils/roles');
  const roles = normalizeRoles(['student', 'ADMIN', 'ADMIN']);

  assert.deepEqual(roles, ['STUDENT', 'ADMIN']);
  assert.equal(hasRole({ roles }, 'ADMIN'), true);
  assert.equal(isAdminUser({ roles }), true);
  assert.equal(primaryRole(roles), 'ADMIN');
});

test('normalizeRoles rejects unknown roles when strict validation is enabled', () => {
  const { normalizeRoles } = require('./utils/roles');

  assert.throws(
    () => normalizeRoles(['ADMIN', 'TEACHER'], { strict: true }),
    /Role must be ADMIN or STUDENT/
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/api
node --test auth-role.test.js
```

Expected: FAIL because `./utils/roles` does not exist.

- [ ] **Step 3: Implement role helpers**

Create `api/utils/roles.js`:

```js
const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
});

const ALLOWED_ROLES = new Set(Object.values(ROLES));

const ROLE_ORDER = [ROLES.STUDENT, ROLES.ADMIN];

const normalizeRoleValue = (role) => {
  if (role === undefined || role === null || role === '') {
    return null;
  }

  const normalized = String(role).trim().toUpperCase();
  if (normalized === 'USER') {
    return ROLES.STUDENT;
  }
  return normalized;
};

const normalizeRoles = (input, options = {}) => {
  const { fallback = [ROLES.STUDENT], strict = false } = options;
  const rawRoles = Array.isArray(input) ? input : [input];
  const roles = [];

  for (const rawRole of rawRoles) {
    const role = normalizeRoleValue(rawRole);
    if (!role) continue;

    if (!ALLOWED_ROLES.has(role)) {
      if (strict) {
        throw new Error('Role must be ADMIN or STUDENT.');
      }
      continue;
    }

    if (!roles.includes(role)) {
      roles.push(role);
    }
  }

  if (roles.length === 0) {
    return normalizeRoles(fallback, { fallback: [ROLES.STUDENT], strict: false });
  }

  return ROLE_ORDER.filter((role) => roles.includes(role));
};

const getUserRoles = (user) => {
  if (!user) return [];
  return normalizeRoles(user.roles || user.role);
};

const hasRole = (user, role) => {
  const normalizedRole = normalizeRoleValue(role);
  return getUserRoles(user).includes(normalizedRole);
};

const isAdminUser = (user) => hasRole(user, ROLES.ADMIN);

const primaryRole = (roles) => {
  const normalizedRoles = normalizeRoles(roles);
  return normalizedRoles.includes(ROLES.ADMIN) ? ROLES.ADMIN : ROLES.STUDENT;
};

const withNormalizedRoles = (user) => {
  if (!user) return user;
  const roles = getUserRoles(user);
  return {
    ...user,
    roles,
    role: primaryRole(roles),
  };
};

module.exports = {
  ROLES,
  ALLOWED_ROLES,
  normalizeRoles,
  getUserRoles,
  hasRole,
  isAdminUser,
  primaryRole,
  withNormalizedRoles,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/api
node --test auth-role.test.js
```

Expected: PASS for the new helper tests. If unrelated auth tests fail before Task 3 has run, continue with Task 2 and Task 3, then require the full `auth-role.test.js` suite to pass.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/Samsung_T5/My\ Work
git add api/utils/roles.js api/auth-role.test.js
git commit -m "Add backend role normalization helpers"
```

### Task 2: Prisma Schema And User Service Role Bridge

**Files:**
- Modify: `api/prisma/schema.prisma`
- Modify: `api/services/userService.js`
- Modify: `api/auth-role.test.js`

- [ ] **Step 1: Write failing service-level tests using mocked Prisma**

Append these tests to `api/auth-role.test.js`:

```js
test('userService.createUser stores normalized roles and compatibility role', async () => {
  const servicePath = path.resolve(__dirname, 'services/userService.js');
  const prismaPath = path.resolve(__dirname, 'services/prismaService.js');
  delete require.cache[servicePath];
  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: {
      user: {
        create: async ({ data }) => ({
          id: 'user_1',
          ...data,
        }),
      },
    },
  };

  const userService = require('./services/userService');
  const user = await userService.createUser({
    email: 'student@example.com',
    password: 'password123',
    roles: ['USER'],
  });

  assert.deepEqual(user.roles, ['STUDENT']);
  assert.equal(user.role, 'STUDENT');
});

test('userService.getAllUsers returns normalized roles for legacy users', async () => {
  const servicePath = path.resolve(__dirname, 'services/userService.js');
  const prismaPath = path.resolve(__dirname, 'services/prismaService.js');
  delete require.cache[servicePath];
  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: {
      user: {
        findMany: async () => [
          { id: 'admin_1', email: 'admin@example.com', role: 'ADMIN', password: 'x' },
          { id: 'student_1', email: 'student@example.com', role: 'USER', password: 'x' },
        ],
      },
    },
  };

  const userService = require('./services/userService');
  const users = await userService.getAllUsers();

  assert.deepEqual(users[0].roles, ['ADMIN']);
  assert.deepEqual(users[1].roles, ['STUDENT']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/api
node --test auth-role.test.js
```

Expected: FAIL because `userService` does not yet write or normalize `roles`.

- [ ] **Step 3: Add `roles` to Prisma schema**

In `api/prisma/schema.prisma`, update `model User`:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  role      String   @default("USER")
  roles     Json     @default("[\"STUDENT\"]")
  files     File[]
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt
}
```

- [ ] **Step 4: Update `userService` to normalize roles**

In `api/services/userService.js`, import helpers:

```js
const {
  normalizeRoles,
  primaryRole,
  withNormalizedRoles,
} = require('../utils/roles');
```

Add this helper near the top:

```js
const buildRoleData = (data) => {
  const rolesInput = data.roles !== undefined ? data.roles : data.role;
  const roles = normalizeRoles(rolesInput);
  return {
    roles,
    role: primaryRole(roles),
  };
};
```

Update service methods so they match this shape:

```js
findUserByEmail: async (email) => {
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  return withNormalizedRoles(user);
},

findUserById: async (id) => {
  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });
  return withNormalizedRoles(user);
},

createUser: async (data) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const roleData = buildRoleData(data);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword,
      ...roleData,
    },
  });
  return withNormalizedRoles(user);
},

getAllUsers: async () => {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
  return users.map(withNormalizedRoles);
},

updateUser: async (id, data) => {
  const updateData = { ...data };
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  if (data.roles !== undefined || data.role !== undefined) {
    const roleData = buildRoleData(data);
    updateData.roles = roleData.roles;
    updateData.role = roleData.role;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });
  return withNormalizedRoles(user);
},
```

- [ ] **Step 5: Verify schema/client and tests**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/api
npx prisma generate
node --test auth-role.test.js
node -c services/userService.js
```

Expected: `npx prisma generate` exits 0. Tests related to service normalization pass. Syntax check exits 0.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/Samsung_T5/My\ Work
git add api/prisma/schema.prisma api/services/userService.js api/auth-role.test.js
git commit -m "Add user roles persistence bridge"
```

### Task 3: Backend Auth Controllers And Admin Middleware

**Files:**
- Modify: `api/controllers/userAuthController.js`
- Modify: `api/controllers/userController.js`
- Modify: `api/middleware/authMiddleware.js`
- Modify: `api/auth-role.test.js`

- [ ] **Step 1: Write failing controller and middleware tests**

Update or add tests in `api/auth-role.test.js` so the expected behaviors are:

```js
test('public register cannot create an admin role from request body', async () => {
  const createdUsers = [];
  const { registerHandler } = loadWithMockedUserService(controllerPath, {
    findUserByEmail: async () => null,
    createUser: async (data) => {
      createdUsers.push(data);
      return {
        id: 'user_1',
        email: data.email,
        name: data.name,
        role: 'STUDENT',
        roles: ['STUDENT'],
      };
    },
  });

  const req = {
    body: {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
      role: 'ADMIN',
      roles: ['ADMIN'],
    },
  };
  const res = makeResponse();

  await registerHandler(req, res, assert.fail);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(createdUsers[0].roles, ['STUDENT']);
  assert.equal(createdUsers[0].role, undefined);
  assert.deepEqual(res.body.user.roles, ['STUDENT']);
  assert.equal(res.body.user.role, 'STUDENT');
});

test('isAdmin accepts persisted ADMIN roles', async () => {
  const { isAdmin } = loadWithMockedUserService(middlewarePath, {
    findUserById: async () => ({
      id: 'admin_1',
      email: 'admin@example.com',
      role: 'ADMIN',
      roles: ['ADMIN'],
    }),
  });

  const req = {
    user: {
      id: 'admin_1',
      email: 'admin@example.com',
      role: 'ADMIN',
      roles: ['ADMIN'],
    },
  };
  const res = makeResponse();
  let nextCalled = false;

  await isAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('isAdmin rejects stale admin token when persisted roles are STUDENT', async () => {
  const { isAdmin } = loadWithMockedUserService(middlewarePath, {
    findUserById: async () => ({
      id: 'user_1',
      email: 'user@example.com',
      role: 'STUDENT',
      roles: ['STUDENT'],
    }),
  });

  const req = {
    user: {
      id: 'user_1',
      email: 'user@example.com',
      role: 'ADMIN',
      roles: ['ADMIN'],
    },
  };
  const res = makeResponse();
  let nextCalled = false;

  await isAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Access denied. Administrator privileges required.');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/api
node --test auth-role.test.js
```

Expected: FAIL until controllers and middleware use `roles`.

- [ ] **Step 3: Update login/register responses and JWT payload**

In `api/controllers/userAuthController.js`, import:

```js
const { ROLES, primaryRole, withNormalizedRoles } = require('../utils/roles');
```

In `loginHandler`, after password validation:

```js
const safeUser = withNormalizedRoles(user);
const token = jwt.sign(
  {
    id: safeUser.id,
    email: safeUser.email,
    role: safeUser.role,
    roles: safeUser.roles,
    name: safeUser.name,
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

res.status(200).json({
  message: 'Login successful',
  token,
  user: {
    id: safeUser.id,
    email: safeUser.email,
    name: safeUser.name,
    role: safeUser.role,
    roles: safeUser.roles,
  },
});
```

In `registerHandler`, call:

```js
const newUser = await userService.createUser({
  email,
  password,
  name,
  roles: [ROLES.STUDENT],
});

const safeUser = withNormalizedRoles(newUser);

res.status(201).json({
  message: 'User created successfully',
  user: {
    id: safeUser.id,
    email: safeUser.email,
    name: safeUser.name,
    role: primaryRole(safeUser.roles),
    roles: safeUser.roles,
  },
});
```

- [ ] **Step 4: Update `isAdmin` middleware**

In `api/middleware/authMiddleware.js`, import:

```js
const { isAdminUser } = require('../utils/roles');
```

Replace role comparisons with:

```js
const isAdmin = async (req, res, next) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }

  try {
    const currentUser = await userService.findUserById(req.user.id);
    if (!isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
    }
    next();
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 5: Update admin user controller validation**

In `api/controllers/userController.js`, replace local role constants with imports:

```js
const {
  normalizeRoles,
  primaryRole,
  withNormalizedRoles,
} = require('../utils/roles');
```

Add helper:

```js
const parseRequestRoles = (body, fallback) => {
  const input = body.roles !== undefined ? body.roles : body.role;
  return normalizeRoles(input, { fallback, strict: true });
};
```

For create:

```js
const roles = parseRequestRoles(req.body, ['STUDENT']);
const user = await userService.createUser({ email, name, password, roles });
const { password: _, ...safeUser } = withNormalizedRoles(user);
res.status(201).json({
  message: 'User created successfully',
  user: {
    ...safeUser,
    role: primaryRole(safeUser.roles),
  },
});
```

For update, build:

```js
const updateData = { email, name, password };
if (roles !== undefined || role !== undefined) {
  updateData.roles = parseRequestRoles(req.body, undefined);
}
```

In controller catches, if the role helper throws `Role must be ADMIN or STUDENT.`, return:

```js
return res.status(400).json({ message: error.message });
```

Before calling `parseRequestRoles`, reject empty arrays on create/update:

```js
if (Array.isArray(req.body.roles) && req.body.roles.length === 0) {
  return res.status(400).json({ message: 'At least one role is required.' });
}
```

- [ ] **Step 6: Run backend verification**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/api
node --test auth-role.test.js
node -c controllers/userAuthController.js
node -c controllers/userController.js
node -c middleware/authMiddleware.js
```

Expected: tests pass and syntax checks exit 0.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/Samsung_T5/My\ Work
git add api/controllers/userAuthController.js api/controllers/userController.js api/middleware/authMiddleware.js api/auth-role.test.js
git commit -m "Update backend auth for multi-role users"
```

### Task 4: Frontend Role Helpers And Auth Context

**Files:**
- Create: `allinone/src/utils/roles.js`
- Modify: `allinone/src/AuthContext.jsx`

- [ ] **Step 1: Create frontend role helper module**

Create `allinone/src/utils/roles.js`:

```js
export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
});

const ROLE_ORDER = [ROLES.STUDENT, ROLES.ADMIN];

const normalizeRoleValue = (role) => {
  if (role === undefined || role === null || role === '') return null;
  const normalized = String(role).trim().toUpperCase();
  return normalized === 'USER' ? ROLES.STUDENT : normalized;
};

export const normalizeRoles = (input, fallback = [ROLES.STUDENT]) => {
  const rawRoles = Array.isArray(input) ? input : [input];
  const roles = [];

  rawRoles.forEach((rawRole) => {
    const role = normalizeRoleValue(rawRole);
    if (!role || !Object.values(ROLES).includes(role)) return;
    if (!roles.includes(role)) roles.push(role);
  });

  if (roles.length === 0) {
    return normalizeRoles(fallback, [ROLES.STUDENT]);
  }

  return ROLE_ORDER.filter((role) => roles.includes(role));
};

export const getUserRoles = (user) => normalizeRoles(user?.roles || user?.role);

export const hasRole = (user, role) => getUserRoles(user).includes(normalizeRoleValue(role));

export const isAdmin = (user) => hasRole(user, ROLES.ADMIN);

export const isStudent = (user) => hasRole(user, ROLES.STUDENT) || isAdmin(user);

export const primaryRole = (roles) => {
  const normalizedRoles = normalizeRoles(roles);
  return normalizedRoles.includes(ROLES.ADMIN) ? ROLES.ADMIN : ROLES.STUDENT;
};
```

- [ ] **Step 2: Update AuthContext to expose `roles`**

In `allinone/src/AuthContext.jsx`, import:

```js
import { normalizeRoles, primaryRole } from './utils/roles';
```

Replace the user construction with:

```js
const roles = normalizeRoles(decoded.roles || decoded.role);

return {
  id: decoded.id,
  email: decoded.email,
  roles,
  role: primaryRole(roles),
  name: decoded.name,
};
```

- [ ] **Step 3: Run targeted frontend lint**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/allinone
npx eslint src/AuthContext.jsx src/utils/roles.js
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/Samsung_T5/My\ Work
git add allinone/src/utils/roles.js allinone/src/AuthContext.jsx
git commit -m "Add frontend role helpers"
```

### Task 5: Frontend Route And Navigation Authorization

**Files:**
- Modify: `allinone/src/App.jsx`
- Modify: `allinone/src/components/AdminRoute.jsx`
- Modify: `allinone/src/components/ProtectedRoute.jsx`
- Modify: `allinone/src/components/Navbar.jsx`
- Modify: `allinone/src/components/FileModal.jsx`

- [ ] **Step 1: Update AdminRoute helper usage**

In `allinone/src/components/AdminRoute.jsx`, import:

```js
import { isAdmin } from '../utils/roles';
```

Replace:

```js
if (!isAuthenticated || user?.role !== 'ADMIN') {
```

with:

```js
if (!isAuthenticated || !isAdmin(user)) {
```

- [ ] **Step 2: Update ProtectedRoute to require admin for protected content**

In `allinone/src/components/ProtectedRoute.jsx`, import:

```js
import { isAdmin } from '../utils/roles';
```

After loading checks, add:

```js
if (!isAdmin(user)) {
  return <Navigate to="/learning/ai-103" replace />;
}
```

Then replace:

```js
if (user?.role === 'ADMIN') {
```

with:

```js
if (isAdmin(user)) {
```

- [ ] **Step 3: Update route layering**

In `allinone/src/App.jsx`, keep Learning public and keep these routes admin-only:

```jsx
<Route element={<ProtectedRoute />}>
  <Route path='/' element={<Documents />} />
  <Route path='/gallery' element={<Gallery />} />
  <Route path='/upload' element={<Upload />} />
</Route>
<Route element={<AdminRoute />}>
  <Route path='/users' element={<Users />} />
  <Route path='/settings' element={<Settings />} />
</Route>
<Route path='/learning/ai-103' element={<AI103 />} />
```

- [ ] **Step 4: Update Navbar visibility**

In `allinone/src/components/Navbar.jsx`, import:

```js
import { isAdmin } from '../utils/roles';
```

Add:

```js
const canAdmin = isAdmin(user);
```

Wrap Documents and Gallery nav items in `canAdmin && (...)`. Replace every `user?.role === 'ADMIN'` with `canAdmin`.

- [ ] **Step 5: Update FileModal admin controls**

In `allinone/src/components/FileModal.jsx`, import:

```js
import { isAdmin } from '../utils/roles';
```

Add near `useAuth()`:

```js
const canAdmin = isAdmin(user);
```

Replace both `user?.role === 'ADMIN'` checks with `canAdmin`.

- [ ] **Step 6: Run targeted lint and build**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/allinone
npx eslint src/App.jsx src/components/AdminRoute.jsx src/components/ProtectedRoute.jsx src/components/Navbar.jsx src/components/FileModal.jsx src/utils/roles.js
npm run build
```

Expected: targeted ESLint exits 0. Vite build exits 0.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/Samsung_T5/My\ Work
git add allinone/src/App.jsx allinone/src/components/AdminRoute.jsx allinone/src/components/ProtectedRoute.jsx allinone/src/components/Navbar.jsx allinone/src/components/FileModal.jsx
git commit -m "Gate frontend routes by multi-role access"
```

### Task 6: Users Page Multi-Role Editing

**Files:**
- Modify: `allinone/src/pages/Users.jsx`
- Modify: `allinone/src/pages/Users.css`

- [ ] **Step 1: Update Users page state and helpers**

In `allinone/src/pages/Users.jsx`, import:

```js
import { ROLES, normalizeRoles, isAdmin } from '../utils/roles';
```

Change initial form state to:

```js
const [formData, setFormData] = useState({
  name: '',
  email: '',
  password: '',
  roles: [ROLES.STUDENT],
});
```

Add helper:

```js
const toggleRole = (role) => {
  setFormData((current) => {
    const roles = normalizeRoles(current.roles);
    const nextRoles = roles.includes(role)
      ? roles.filter((existingRole) => existingRole !== role)
      : [...roles, role];

    return {
      ...current,
      roles: nextRoles.length > 0 ? normalizeRoles(nextRoles) : [ROLES.STUDENT],
    };
  });
};
```

- [ ] **Step 2: Normalize fetched users**

After fetching users:

```js
setUsers(data.users.map((u) => ({
  ...u,
  roles: normalizeRoles(u.roles || u.role),
})));
```

- [ ] **Step 3: Update modal open/reset logic**

For edit:

```js
setFormData({
  name: user.name || '',
  email: user.email,
  password: '',
  roles: normalizeRoles(user.roles || user.role),
});
```

For create:

```js
setFormData({
  name: '',
  email: '',
  password: '',
  roles: [ROLES.STUDENT],
});
```

- [ ] **Step 4: Update role counts and badges**

Replace the header metadata with:

```jsx
<span className="users-meta">
  · {users.filter(isAdmin).length} admin · {users.filter((u) => !isAdmin(u)).length} students
</span>
```

Replace the single badge with:

```jsx
<div className="role-badge-group">
  {normalizeRoles(u.roles || u.role).map((role) => (
    <span key={role} className={`role-badge ${role === ROLES.ADMIN ? 'admin' : 'user'}`}>
      {role}
    </span>
  ))}
</div>
```

- [ ] **Step 5: Replace select with role checkboxes**

Replace the `<select>` block with:

```jsx
<div className="form-group">
  <label>Roles</label>
  <div className="role-checklist">
    <label className="role-check">
      <input
        type="checkbox"
        checked={formData.roles.includes(ROLES.ADMIN)}
        onChange={() => toggleRole(ROLES.ADMIN)}
      />
      <span>Admin</span>
    </label>
    <label className="role-check">
      <input
        type="checkbox"
        checked={formData.roles.includes(ROLES.STUDENT)}
        onChange={() => toggleRole(ROLES.STUDENT)}
      />
      <span>Student</span>
    </label>
  </div>
</div>
```

- [ ] **Step 6: Style checklist**

Add to `allinone/src/pages/Users.css`:

```css
.role-badge-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.role-checklist {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.role-check {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-secondary-background);
  color: var(--color-label);
  cursor: pointer;
}

.role-check input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--page-accent);
}
```

- [ ] **Step 7: Run targeted lint and build**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/allinone
npx eslint src/pages/Users.jsx src/utils/roles.js
npm run build
```

Expected: targeted ESLint exits 0. Vite build exits 0.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/Samsung_T5/My\ Work
git add allinone/src/pages/Users.jsx allinone/src/pages/Users.css
git commit -m "Add multi-role editing UI"
```

### Task 7: Final Verification And Notes

**Files:**
- Modify: no files unless verification notes must be recorded in this plan.

- [ ] **Step 1: Run backend verification**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/api
node --test auth-role.test.js
node -c utils/roles.js
node -c services/userService.js
node -c controllers/userAuthController.js
node -c controllers/userController.js
node -c middleware/authMiddleware.js
npx prisma generate
```

Expected: all commands exit 0.

- [ ] **Step 2: Run frontend verification**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/allinone
npx eslint src/App.jsx src/AuthContext.jsx src/utils/roles.js src/components/AdminRoute.jsx src/components/ProtectedRoute.jsx src/components/Navbar.jsx src/components/FileModal.jsx src/pages/Users.jsx
npm run build
```

Expected: targeted ESLint exits 0 and Vite build exits 0.

- [ ] **Step 3: Check full lint and record known limitation**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work/allinone
npm run lint
```

Expected: full lint currently fails due existing unrelated `allinone/UI/` reference-file lint errors. If the output shows only `allinone/UI/` failures, record that in the final response and do not edit `allinone/UI/`.

- [ ] **Step 4: Inspect git diff**

Run:

```bash
cd /Volumes/Samsung_T5/My\ Work
git status --short
git diff --stat HEAD
```

Expected: only multi-role implementation files are modified or newly created after the task commits.

- [ ] **Step 5: Final commit if verification-only edits were made**

If Task 7 modified files, commit them:

```bash
cd /Volumes/Samsung_T5/My\ Work
git add docs/superpowers/plans/2026-06-11-multi-role-users.md
git commit -m "Document multi-role verification notes"
```

If Task 7 did not modify files, do not create an empty commit.
