const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const controllerPath = path.resolve(__dirname, 'controllers/userAuthController.js');
const middlewarePath = path.resolve(__dirname, 'middleware/authMiddleware.js');
const userServicePath = path.resolve(__dirname, 'services/userService.js');
const {
  ROLES,
  normalizeRoles,
  getUserRoles,
  hasRole,
  isAdminUser,
  primaryRole,
  withNormalizedRoles,
} = require('./utils/roles');

function loadWithMockedUserService(targetPath, mockService) {
  delete require.cache[targetPath];
  require.cache[userServicePath] = {
    id: userServicePath,
    filename: userServicePath,
    loaded: true,
    exports: mockService,
  };
  return require(targetPath);
}

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

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
        role: data.role,
      };
    },
  });

  const req = {
    body: {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
      role: 'ADMIN',
    },
  };
  const res = makeResponse();

  await registerHandler(req, res, assert.fail);

  assert.equal(res.statusCode, 201);
  assert.equal(createdUsers[0].role, ROLES.STUDENT);
  assert.equal(res.body.user.role, ROLES.STUDENT);
});

test('normalizeRoles maps legacy USER to STUDENT', () => {
  assert.deepEqual(normalizeRoles(['USER']), [ROLES.STUDENT]);
});

test('normalizeRoles keeps ADMIN access and helpers recognize admin users', () => {
  const roles = normalizeRoles(['ADMIN', 'USER', 'ADMIN', 'STUDENT']);

  assert.deepEqual(roles, [ROLES.STUDENT, ROLES.ADMIN]);
  assert.equal(hasRole({ roles }, ROLES.ADMIN), true);
  assert.equal(hasRole({ roles }, ROLES.STUDENT), true);
  assert.equal(isAdminUser({ roles }), true);
  assert.equal(primaryRole(roles), ROLES.ADMIN);
});

test('normalizeRoles falls back to STUDENT for missing empty and unknown roles', () => {
  assert.deepEqual(normalizeRoles(), [ROLES.STUDENT]);
  assert.deepEqual(normalizeRoles([]), [ROLES.STUDENT]);
  assert.deepEqual(normalizeRoles(['']), [ROLES.STUDENT]);
  assert.deepEqual(normalizeRoles(['MANAGER']), [ROLES.STUDENT]);
});

test('user role helpers do not grant roles for missing users or unknown checks', () => {
  assert.deepEqual(getUserRoles(null), []);
  assert.equal(hasRole(null, ROLES.STUDENT), false);
  assert.equal(hasRole({ role: ROLES.ADMIN }, 'MANAGER'), false);
});

test('withNormalizedRoles preserves fields and sets admin compatibility role', () => {
  const user = {
    id: 'user_1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'USER',
    roles: ['ADMIN', 'USER', 'ADMIN'],
  };

  assert.deepEqual(withNormalizedRoles(user), {
    id: 'user_1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: ROLES.ADMIN,
    roles: [ROLES.STUDENT, ROLES.ADMIN],
  });
});

test('normalizeRoles rejects unknown roles when strict validation is enabled', () => {
  assert.throws(
    () => normalizeRoles(['MANAGER'], { strict: true }),
    /Role must be ADMIN or STUDENT/,
  );
});

test('isAdmin rejects stale admin token when persisted role is no longer ADMIN', async () => {
  const { isAdmin } = loadWithMockedUserService(middlewarePath, {
    findUserById: async () => ({
      id: 'user_1',
      email: 'user@example.com',
      role: 'USER',
    }),
  });

  const req = {
    user: {
      id: 'user_1',
      email: 'user@example.com',
      role: 'ADMIN',
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
