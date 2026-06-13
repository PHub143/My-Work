const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const controllerPath = path.resolve(__dirname, 'controllers/userAuthController.js');
const userControllerPath = path.resolve(__dirname, 'controllers/userController.js');
const middlewarePath = path.resolve(__dirname, 'middleware/authMiddleware.js');
const userServicePath = path.resolve(__dirname, 'services/userService.js');
const defaultAdminServicePath = path.resolve(__dirname, 'services/defaultAdminService.js');
const prismaServicePath = path.resolve(__dirname, 'services/prismaService.js');
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
  const cachedTarget = require.cache[targetPath];
  const cachedUserService = require.cache[userServicePath];

  delete require.cache[targetPath];
  delete require.cache[userServicePath];
  require.cache[userServicePath] = {
    id: userServicePath,
    filename: userServicePath,
    loaded: true,
    exports: mockService,
  };

  try {
    return require(targetPath);
  } finally {
    if (cachedTarget) {
      require.cache[targetPath] = cachedTarget;
    } else {
      delete require.cache[targetPath];
    }

    if (cachedUserService) {
      require.cache[userServicePath] = cachedUserService;
    } else {
      delete require.cache[userServicePath];
    }
  }
}

function loadUserServiceWithMockedPrisma(mockPrisma) {
  const cachedUserService = require.cache[userServicePath];
  const cachedPrismaService = require.cache[prismaServicePath];

  delete require.cache[userServicePath];
  delete require.cache[prismaServicePath];
  require.cache[prismaServicePath] = {
    id: prismaServicePath,
    filename: prismaServicePath,
    loaded: true,
    exports: mockPrisma,
  };

  return {
    userService: require(userServicePath),
    cleanup() {
      if (cachedUserService) {
        require.cache[userServicePath] = cachedUserService;
      } else {
        delete require.cache[userServicePath];
      }

      if (cachedPrismaService) {
        require.cache[prismaServicePath] = cachedPrismaService;
      } else {
        delete require.cache[prismaServicePath];
      }
    },
  };
}

function loadDefaultAdminServiceWithMockedPrisma(mockPrisma) {
  const cachedDefaultAdminService = require.cache[defaultAdminServicePath];
  const cachedPrismaService = require.cache[prismaServicePath];

  delete require.cache[defaultAdminServicePath];
  delete require.cache[prismaServicePath];
  require.cache[prismaServicePath] = {
    id: prismaServicePath,
    filename: prismaServicePath,
    loaded: true,
    exports: mockPrisma,
  };

  return {
    defaultAdminService: require(defaultAdminServicePath),
    cleanup() {
      if (cachedDefaultAdminService) {
        require.cache[defaultAdminServicePath] = cachedDefaultAdminService;
      } else {
        delete require.cache[defaultAdminServicePath];
      }

      if (cachedPrismaService) {
        require.cache[prismaServicePath] = cachedPrismaService;
      } else {
        delete require.cache[prismaServicePath];
      }
    },
  };
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
        roles: data.roles,
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
  assert.equal(Object.hasOwn(createdUsers[0], 'role'), false);
  assert.deepEqual(createdUsers[0].roles, [ROLES.STUDENT]);
  assert.equal(res.body.user.role, ROLES.STUDENT);
  assert.deepEqual(res.body.user.roles, [ROLES.STUDENT]);
});

test('public student register emits token and normalized user response', async () => {
  const jwt = require('jsonwebtoken');
  const { registerHandler } = loadWithMockedUserService(controllerPath, {
    findUserByEmail: async () => null,
    createUser: async (data) => ({
      id: 'student_1',
      email: data.email,
      name: data.name,
      role: ROLES.STUDENT,
      roles: data.roles,
    }),
  });

  const req = {
    body: {
      email: 'student@example.com',
      password: 'password123',
      name: 'Student User',
    },
  };
  const res = makeResponse();

  await registerHandler(req, res, assert.fail);

  const payload = jwt.verify(res.body.token, process.env.JWT_SECRET || 'your-default-secret-key-change-this-in-production');
  assert.equal(res.statusCode, 201);
  assert.equal(payload.id, 'student_1');
  assert.equal(payload.email, 'student@example.com');
  assert.equal(payload.name, 'Student User');
  assert.equal(payload.role, ROLES.STUDENT);
  assert.deepEqual(payload.roles, [ROLES.STUDENT]);
  assert.deepEqual(res.body.user, {
    id: 'student_1',
    email: 'student@example.com',
    name: 'Student User',
    role: ROLES.STUDENT,
    roles: [ROLES.STUDENT],
  });
});

test('login emits normalized role and roles in token and response', async () => {
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);
  const { loginHandler } = loadWithMockedUserService(controllerPath, {
    findUserByEmail: async () => ({
      id: 'admin_1',
      email: 'admin@example.com',
      name: 'Admin User',
      password: passwordHash,
      role: ROLES.STUDENT,
      roles: [ROLES.ADMIN],
    }),
  });

  const req = {
    body: {
      email: 'admin@example.com',
      password,
    },
  };
  const res = makeResponse();

  await loginHandler(req, res, assert.fail);

  const payload = jwt.verify(res.body.token, process.env.JWT_SECRET || 'your-default-secret-key-change-this-in-production');
  assert.equal(res.statusCode, 200);
  assert.equal(payload.id, 'admin_1');
  assert.equal(payload.email, 'admin@example.com');
  assert.equal(payload.name, 'Admin User');
  assert.equal(payload.role, ROLES.ADMIN);
  assert.deepEqual(payload.roles, [ROLES.STUDENT, ROLES.ADMIN]);
  assert.deepEqual(res.body.user, {
    id: 'admin_1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: ROLES.ADMIN,
    roles: [ROLES.STUDENT, ROLES.ADMIN],
  });
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

test('withNormalizedRoles preserves legacy admin when roles has default student', () => {
  const user = {
    id: 'user_1',
    email: 'admin@example.com',
    role: ROLES.ADMIN,
    roles: [ROLES.STUDENT],
  };

  const normalizedUser = withNormalizedRoles(user);

  assert.deepEqual(normalizedUser.roles, [ROLES.STUDENT, ROLES.ADMIN]);
  assert.equal(normalizedUser.role, ROLES.ADMIN);
});

test('normalizeRoles rejects unknown roles when strict validation is enabled', () => {
  assert.throws(
    () => normalizeRoles(['MANAGER'], { strict: true }),
    /Role must be ADMIN or STUDENT/,
  );
});

test('createUser stores normalized roles and compatibility role for legacy USER input', async () => {
  let createPayload;
  const { userService, cleanup } = loadUserServiceWithMockedPrisma({
    user: {
      create: async (payload) => {
        createPayload = payload;
        return {
          id: 'user_1',
          email: payload.data.email,
          name: payload.data.name,
          password: payload.data.password,
          role: payload.data.role,
          roles: payload.data.roles,
        };
      },
    },
  });

  try {
    const user = await userService.createUser({
      email: 'student@example.com',
      name: 'Student User',
      password: 'password123',
      roles: ['USER'],
    });

    assert.deepEqual(createPayload.data.roles, [ROLES.STUDENT]);
    assert.equal(createPayload.data.role, ROLES.STUDENT);
    assert.notEqual(createPayload.data.password, 'password123');
    assert.deepEqual(user.roles, [ROLES.STUDENT]);
    assert.equal(user.role, ROLES.STUDENT);
  } finally {
    cleanup();
  }
});

test('getAllUsers returns normalized roles for legacy ADMIN and USER roles', async () => {
  const { userService, cleanup } = loadUserServiceWithMockedPrisma({
    user: {
      findMany: async () => [
        {
          id: 'user_1',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
        {
          id: 'user_2',
          email: 'student@example.com',
          role: 'USER',
        },
      ],
    },
  });

  try {
    const users = await userService.getAllUsers();

    assert.deepEqual(users.map((user) => user.roles), [
      [ROLES.ADMIN],
      [ROLES.STUDENT],
    ]);
    assert.deepEqual(users.map((user) => user.role), [ROLES.ADMIN, ROLES.STUDENT]);
  } finally {
    cleanup();
  }
});

test('updateUser omits empty password from Prisma update data', async () => {
  let updatePayload;
  const { userService, cleanup } = loadUserServiceWithMockedPrisma({
    user: {
      update: async (payload) => {
        updatePayload = payload;
        return {
          id: payload.where.id,
          email: 'student@example.com',
          role: ROLES.STUDENT,
          roles: [ROLES.STUDENT],
        };
      },
    },
  });

  try {
    await userService.updateUser('user_1', { password: '' });

    assert.deepEqual(updatePayload.data, {});
    assert.equal(Object.hasOwn(updatePayload.data, 'password'), false);
  } finally {
    cleanup();
  }
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

test('isAdmin accepts admin from token and persisted roles', async () => {
  const { isAdmin } = loadWithMockedUserService(middlewarePath, {
    findUserById: async () => ({
      id: 'user_1',
      email: 'admin@example.com',
      roles: [ROLES.ADMIN],
    }),
  });

  const req = {
    user: {
      id: 'user_1',
      email: 'admin@example.com',
      roles: [ROLES.ADMIN],
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
      role: ROLES.STUDENT,
      roles: [ROLES.STUDENT],
    }),
  });

  const req = {
    user: {
      id: 'user_1',
      email: 'user@example.com',
      roles: [ROLES.ADMIN],
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

test('admin create accepts roles and returns normalized safe user', async () => {
  const createdUsers = [];
  const userController = loadWithMockedUserService(userControllerPath, {
    findUserByEmail: async () => null,
    createUser: async (data) => {
      createdUsers.push(data);
      return {
        id: 'user_1',
        email: data.email,
        name: data.name,
        password: 'hashed-password',
        role: primaryRole(data.roles),
        roles: data.roles,
      };
    },
  });

  const req = {
    body: {
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin User',
      role: ROLES.STUDENT,
      roles: [ROLES.ADMIN],
    },
  };
  const res = makeResponse();

  await userController.createUser(req, res, assert.fail);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(createdUsers[0].roles, [ROLES.ADMIN]);
  assert.equal(Object.hasOwn(createdUsers[0], 'role'), false);
  assert.equal(Object.hasOwn(res.body.user, 'password'), false);
  assert.equal(res.body.user.role, ROLES.ADMIN);
  assert.deepEqual(res.body.user.roles, [ROLES.ADMIN]);
});

test('admin create rejects unknown roles', async () => {
  const userController = loadWithMockedUserService(userControllerPath, {
    findUserByEmail: assert.fail,
    createUser: assert.fail,
  });
  const req = {
    body: {
      email: 'manager@example.com',
      password: 'password123',
      roles: ['MANAGER'],
    },
  };
  const res = makeResponse();

  await userController.createUser(req, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Role must be ADMIN or STUDENT.');
});

test('admin create rejects null roles', async () => {
  const userController = loadWithMockedUserService(userControllerPath, {
    findUserByEmail: assert.fail,
    createUser: assert.fail,
  });
  const req = {
    body: {
      email: 'student@example.com',
      password: 'password123',
      roles: null,
    },
  };
  const res = makeResponse();

  await userController.createUser(req, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'At least one role is required.');
});

test('admin create rejects blank roles', async () => {
  const userController = loadWithMockedUserService(userControllerPath, {
    findUserByEmail: assert.fail,
    createUser: assert.fail,
  });
  const req = {
    body: {
      email: 'student@example.com',
      password: 'password123',
      roles: [''],
    },
  };
  const res = makeResponse();

  await userController.createUser(req, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'At least one role is required.');
});

test('admin create rejects blank scalar roles', async () => {
  const userController = loadWithMockedUserService(userControllerPath, {
    findUserByEmail: assert.fail,
    createUser: assert.fail,
  });
  const req = {
    body: {
      email: 'student@example.com',
      password: 'password123',
      roles: '',
    },
  };
  const res = makeResponse();

  await userController.createUser(req, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'At least one role is required.');
});

test('admin create rejects null role entries', async () => {
  const userController = loadWithMockedUserService(userControllerPath, {
    findUserByEmail: assert.fail,
    createUser: assert.fail,
  });
  const req = {
    body: {
      email: 'student@example.com',
      password: 'password123',
      roles: [null],
    },
  };
  const res = makeResponse();

  await userController.createUser(req, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'At least one role is required.');
});

test('admin update rejects empty roles array', async () => {
  const userController = loadWithMockedUserService(userControllerPath, {
    updateUser: assert.fail,
  });
  const req = {
    params: { id: 'user_1' },
    body: {
      roles: [],
    },
  };
  const res = makeResponse();

  await userController.updateUser(req, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'At least one role is required.');
});

test('admin update rejects array role shorthand', async () => {
  const userController = loadWithMockedUserService(userControllerPath, {
    updateUser: assert.fail,
  });
  const req = {
    params: { id: 'user_1' },
    body: {
      role: [],
    },
  };
  const res = makeResponse();

  await userController.updateUser(req, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'At least one role is required.');
});

test('admin update rejects blank role shorthand', async () => {
  const userController = loadWithMockedUserService(userControllerPath, {
    updateUser: assert.fail,
  });
  const req = {
    params: { id: 'user_1' },
    body: {
      role: '',
    },
  };
  const res = makeResponse();

  await userController.updateUser(req, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'At least one role is required.');
});

test('ensureDefaultAdmin creates the default admin when missing', async () => {
  let createPayload;
  const { defaultAdminService, cleanup } = loadDefaultAdminServiceWithMockedPrisma({
    user: {
      findUnique: async ({ where }) => {
        assert.deepEqual(where, { email: 'lieutienthinh@gmail.com' });
        return null;
      },
      create: async (payload) => {
        createPayload = payload;
        return {
          id: 'admin_1',
          ...payload.data,
        };
      },
    },
  });

  try {
    const result = await defaultAdminService.ensureDefaultAdmin();

    assert.equal(result.created, true);
    assert.equal(createPayload.data.email, 'lieutienthinh@gmail.com');
    assert.equal(createPayload.data.name, 'Default Admin');
    assert.equal(createPayload.data.role, ROLES.ADMIN);
    assert.deepEqual(createPayload.data.roles, [ROLES.ADMIN]);
    assert.notEqual(createPayload.data.password, 'admin123');
    assert.equal(await require('bcryptjs').compare('admin123', createPayload.data.password), true);
  } finally {
    cleanup();
  }
});

test('ensureDefaultAdmin leaves an existing default admin untouched', async () => {
  let createCalled = false;
  const existingAdmin = {
    id: 'admin_1',
    email: 'lieutienthinh@gmail.com',
    name: 'Existing Admin',
    role: ROLES.ADMIN,
    roles: [ROLES.ADMIN],
  };
  const { defaultAdminService, cleanup } = loadDefaultAdminServiceWithMockedPrisma({
    user: {
      findUnique: async () => existingAdmin,
      create: async () => {
        createCalled = true;
      },
    },
  });

  try {
    const result = await defaultAdminService.ensureDefaultAdmin();

    assert.equal(result.created, false);
    assert.equal(result.user, existingAdmin);
    assert.equal(createCalled, false);
  } finally {
    cleanup();
  }
});
