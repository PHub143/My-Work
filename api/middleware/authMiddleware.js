const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const { isAdminUser } = require('../utils/roles');

const { JWT_SECRET } = require('../config/jwt');

/**
 * Middleware to authenticate JWT tokens from the Authorization header.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired authentication token.' });
    }
    req.user = user;
    next();
  });
};

/**
 * Middleware to check if the authenticated user is an Admin.
 */
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

module.exports = {
  authenticateToken,
  isAdmin
};
