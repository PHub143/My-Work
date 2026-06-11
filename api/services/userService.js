const prisma = require('./prismaService');
const bcrypt = require('bcryptjs');
const {
  normalizeRoles,
  primaryRole,
  withNormalizedRoles,
} = require('../utils/roles');

function hasOwn(data, key) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

/**
 * User Service for database operations.
 */
const userService = {
  /**
   * Finds a user by their email.
   * @param {string} email - The user's email address.
   * @returns {Promise<Object|null>}
   */
  findUserByEmail: async (email) => {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
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
   * Hashes the password before saving.
   * @param {Object} data - User data (email, name, password, role).
   * @returns {Promise<Object>}
   */
  createUser: async (data) => {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const roles = normalizeRoles(hasOwn(data, 'roles') ? data.roles : data.role);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
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
