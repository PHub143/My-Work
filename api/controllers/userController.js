const userService = require('../services/userService');

/**
 * Controller for administrative user management.
 */
const userController = {
  /**
   * Retrieves all users. Restricted to Admin.
   */
  listUsers: async (req, res, next) => {
    try {
      const users = await userService.getAllUsers();
      // Don't leak passwords in the list
      const safeUsers = users.map(({ password, ...user }) => user);
      res.status(200).json({ users: safeUsers });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Creates a new user. Restricted to Admin.
   */
  createUser: async (req, res, next) => {
    try {
      const { email, name, password, role } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
      }

      const existingUser = await userService.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'A user with this email already exists.' });
      }

      const user = await userService.createUser({ email, name, password, role });
      const { password: _, ...safeUser } = user;
      res.status(201).json({ 
        message: 'User created successfully', 
        user: safeUser 
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Updates an existing user. Restricted to Admin.
   */
  updateUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { email, name, password, role } = req.body;

      // Check if user exists
      // Note: We don't have a findUserById yet, but we can use prismaService directly or add it.
      // For now, let's just try the update.
      const user = await userService.updateUser(id, { email, name, password, role });
      const { password: _, ...safeUser } = user;
      res.status(200).json({ 
        message: 'User updated successfully', 
        user: safeUser 
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'User not found.' });
      }
      next(error);
    }
  },

  /**
   * Deletes a user. Restricted to Admin.
   */
  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Prevent admin from deleting themselves (optional but recommended)
      if (id === req.user.id) {
        return res.status(400).json({ message: 'Admins cannot delete their own account.' });
      }

      await userService.deleteUser(id);
      res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'User not found.' });
      }
      next(error);
    }
  }
};

module.exports = userController;
