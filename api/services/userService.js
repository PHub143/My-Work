const prisma = require('./prismaService');
const bcrypt = require('bcryptjs');
const {
  normalizeRoles,
  primaryRole,
  withNormalizedRoles,
} = require('../utils/roles');
const { getUserIdFromEmail, normalizeUserId } = require('../utils/userId');

function hasOwn(data, key) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

/**
 * User Service for database operations.
 */
const userService = {
  /**
   * Finds a user by login identifier: a full email address (if it contains
   * `@`) or a UserID otherwise.
   * @param {string} loginId - The UserID or full email address.
   * @returns {Promise<Object|null>}
   */
  findUserByLoginId: async (loginId) => {
    const trimmed = typeof loginId === 'string' ? loginId.trim() : '';
    if (!trimmed) {
      return null;
    }

    if (trimmed.includes('@')) {
      const user = await prisma.user.findUnique({
        where: {
          email: trimmed,
        },
      });

      return withNormalizedRoles(user);
    }

    const user = await prisma.user.findUnique({
      where: {
        userId: normalizeUserId(trimmed),
      },
    });

    return withNormalizedRoles(user);
  },

  /**
   * Finds a user by their ID.
   * @param {string} id - The user's ID.
   * @returns {Promise<Object|null>}
   */
  findUserById: async (id) => {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });

    return withNormalizedRoles(user);
  },

  /**
   * Creates a new user in the database.
   * Hashes the password before saving. `userId` (the login handle) is used
   * if given, otherwise it's derived from the email local part.
   * @param {Object} data - User data (userId, email, name, password, role).
   * @returns {Promise<Object>}
   */
  createUser: async (data) => {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const roles = normalizeRoles(hasOwn(data, 'roles') ? data.roles : data.role);
    const userId = normalizeUserId(data.userId || getUserIdFromEmail(data.email));
    const email = typeof data.email === 'string' && data.email.trim() ? data.email.trim() : null;
    const user = await prisma.user.create({
      data: {
        userId,
        email,
        name: data.name || null,
        password: hashedPassword,
        role: primaryRole(roles),
        roles,
      },
    });

    return withNormalizedRoles(user);
  },

  /**
   * Retrieves all users from the database.
   * @returns {Promise<Array>}
   */
  getAllUsers: async () => {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map(withNormalizedRoles);
  },

  /**
   * Updates an existing user's information.
   * Hashes the password if it's being changed.
   * @param {string} id - The user's ID.
   * @param {Object} data - Updated user data.
   * @returns {Promise<Object>}
   */
  updateUser: async (id, data) => {
    const updateData = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    } else if (hasOwn(data, 'password')) {
      delete updateData.password;
    }

    if (hasOwn(data, 'roles') || hasOwn(data, 'role')) {
      const roles = normalizeRoles(hasOwn(data, 'roles') ? data.roles : data.role);
      updateData.roles = roles;
      updateData.role = primaryRole(roles);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return withNormalizedRoles(user);
  },

  /**
   * Stamps a user's last-login time. Called on successful authentication.
   * @param {string} id - The user's ID.
   * @returns {Promise<Object>}
   */
  recordLogin: async (id) => {
    const user = await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });

    return withNormalizedRoles(user);
  },

  /**
   * Deletes a user from the database.
   * @param {string} id - The user's ID.
   * @returns {Promise<Object>}
   */
  deleteUser: async (id) => {
    return prisma.user.delete({
      where: { id },
    });
  },
};

module.exports = userService;
