const userService = require('../services/userService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ROLES, withNormalizedRoles } = require('../utils/roles');

const { JWT_SECRET } = require('../config/jwt');

const createUserToken = (user) => jwt.sign(
  {
    id: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles,
    name: user.name,
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

/**
 * Handles user login.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const loginHandler = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const normalizedUser = withNormalizedRoles(user);

    const token = createUserToken(normalizedUser);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: normalizedUser.id,
        email: normalizedUser.email,
        name: normalizedUser.name,
        role: normalizedUser.role,
        roles: normalizedUser.roles,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles initial admin registration (optional helper).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const registerHandler = async (req, res, next) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const newUser = await userService.createUser({
      email,
      password,
      name,
      roles: [ROLES.STUDENT],
    });
    const normalizedUser = withNormalizedRoles(newUser);
    const token = createUserToken(normalizedUser);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: normalizedUser.id,
        email: normalizedUser.email,
        name: normalizedUser.name,
        role: normalizedUser.role,
        roles: normalizedUser.roles,
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginHandler,
  registerHandler
};
