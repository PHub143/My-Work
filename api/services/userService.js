const prisma = require('./prismaService');
const bcrypt = require('bcryptjs');

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
    return prisma.user.findUnique({
      where: {
        email: email,
      },
    });
  },

  /**
   * Creates a new user in the database.
   * Hashes the password before saving.
   * @param {Object} data - User data (email, name, password, role).
   * @returns {Promise<Object>}
   */
  createUser: async (data) => {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role || 'USER',
      },
    });
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
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
    });
  },
};

module.exports = userService;
