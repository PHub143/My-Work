const userService = require('../services/userService');
const { normalizeRoles, withNormalizedRoles } = require('../utils/roles');

function hasOwn(data, key) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function roleError(message) {
  return {
    error: { message },
  };
}

function isBlankRole(role) {
  return role === null || role === undefined || (typeof role === 'string' && role.trim() === '');
}

function validateRolesInput(roles) {
  if (isBlankRole(roles)) {
    return roleError('At least one role is required.');
  }

  if (!Array.isArray(roles)) {
    return typeof roles === 'string' ? null : roleError('Role must be ADMIN or STUDENT.');
  }

  if (roles.length === 0 || roles.some(isBlankRole)) {
    return roleError('At least one role is required.');
  }

  if (roles.some((role) => typeof role !== 'string')) {
    return roleError('Role must be ADMIN or STUDENT.');
  }

  return null;
}

function validateRoleInput(role) {
  if (isBlankRole(role) || (Array.isArray(role) && role.length === 0)) {
    return roleError('At least one role is required.');
  }

  if (Array.isArray(role) || typeof role !== 'string') {
    return roleError('Role must be ADMIN or STUDENT.');
  }

  return null;
}

function getRequestedRoles(body, useDefault = false) {
  if (hasOwn(body, 'roles')) {
    const validationError = validateRolesInput(body.roles);
    if (validationError) {
      return validationError;
    }

    try {
      return { roles: normalizeRoles(body.roles, { strict: true }) };
    } catch (error) {
      return roleError(error.message);
    }
  }

  if (hasOwn(body, 'role')) {
    const validationError = validateRoleInput(body.role);
    if (validationError) {
      return validationError;
    }

    try {
      return { roles: normalizeRoles(body.role, { strict: true }) };
    } catch (error) {
      return roleError(error.message);
    }
  }

  return useDefault ? { roles: normalizeRoles() } : { roles: undefined };
}

function safeUserResponse(user) {
  const { password, ...safeUser } = user;
  return withNormalizedRoles(safeUser);
}

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
      const safeUsers = users.map(safeUserResponse);
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
      const { email, name, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
      }

      const requestedRoles = getRequestedRoles(req.body, true);
      if (requestedRoles.error) {
        return res.status(400).json(requestedRoles.error);
      }

      const existingUser = await userService.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'A user with this email already exists.' });
      }

      const user = await userService.createUser({ email, name, password, roles: requestedRoles.roles });
      res.status(201).json({ 
        message: 'User created successfully', 
        user: safeUserResponse(user),
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
      const updateData = {};

      if (hasOwn(req.body, 'email')) {
        updateData.email = req.body.email;
      }
      if (hasOwn(req.body, 'name')) {
        updateData.name = req.body.name;
      }
      if (hasOwn(req.body, 'password')) {
        updateData.password = req.body.password;
      }

      const requestedRoles = getRequestedRoles(req.body);
      if (requestedRoles.error) {
        return res.status(400).json(requestedRoles.error);
      }
      if (requestedRoles.roles) {
        updateData.roles = requestedRoles.roles;
      }

      // Check if user exists
      // Note: We don't have a findUserById yet, but we can use prismaService directly or add it.
      // For now, let's just try the update.
      const user = await userService.updateUser(id, updateData);
      res.status(200).json({ 
        message: 'User updated successfully', 
        user: safeUserResponse(user),
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
