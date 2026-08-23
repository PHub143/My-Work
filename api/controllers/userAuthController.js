const userService = require('../services/userService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ROLES, hasRole, withNormalizedRoles } = require('../utils/roles');
const { normalizeUserId } = require('../utils/userId');

const { JWT_SECRET } = require('../config/jwt');

const createUserToken = (user) => jwt.sign(
  {
    id: user.id,
    userId: user.userId,
    email: user.email,
    role: user.role,
    roles: user.roles,
    name: user.name,
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

const safeAuthUser = (user) => ({
  id: user.id,
  userId: user.userId,
  email: user.email,
  name: user.name,
  role: user.role,
  roles: user.roles,
});

/**
 * Handles user login.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const loginHandler = async (req, res, next) => {
  const { userId, email, password, portal } = req.body;
  const loginId = typeof userId === 'string' ? userId.trim() : typeof email === 'string' ? email.trim() : '';

  if (!loginId || !password) {
    return res.status(400).json({ message: 'User ID and password are required.' });
  }

  try {
    const user = await userService.findUserByLoginId(loginId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid user ID or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid user ID or password.' });
    }

    const normalizedUser = withNormalizedRoles(user);

    // A portal is which login form the request came from (student vs admin).
    // An account must carry the matching role to sign in through that portal,
    // even if the password is otherwise correct.
    if (portal === 'admin' && !hasRole(normalizedUser, ROLES.ADMIN)) {
      return res.status(403).json({ message: 'This account does not have admin access.' });
    }
    // The student portal is the public-facing one, so a role mismatch here
    // gets the same generic message as a wrong password — it must not hint
    // that an admin account, or a separate admin sign-in page, exists.
    if (portal === 'student' && !hasRole(normalizedUser, ROLES.STUDENT)) {
      return res.status(401).json({ message: 'Invalid user ID or password.' });
    }

    const token = createUserToken(normalizedUser);
    await userService.recordLogin(normalizedUser.id);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: safeAuthUser(normalizedUser),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles self-service student registration. UserID is the required login
 * handle; email is optional and can be added later from the profile page.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const registerHandler = async (req, res, next) => {
  const { userId, email, password } = req.body;
  const trimmedUserId = typeof userId === 'string' ? userId.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';

  if (!trimmedUserId || !password) {
    return res.status(400).json({ message: 'User ID and password are required.' });
  }

  if (trimmedUserId.includes('@')) {
    return res.status(400).json({ message: 'User ID cannot contain "@".' });
  }

  try {
    const existingUser = await userService.findUserByLoginId(trimmedUserId);
    if (existingUser) {
      return res.status(400).json({ message: 'User ID is already in use.' });
    }

    const newUser = await userService.createUser({
      userId: normalizeUserId(trimmedUserId),
      email: trimmedEmail || undefined,
      password,
      roles: [ROLES.STUDENT],
    });
    const normalizedUser = withNormalizedRoles(newUser);
    const token = createUserToken(normalizedUser);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: safeAuthUser(normalizedUser),
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '');
      if (target.includes('email')) {
        return res.status(400).json({ message: 'Email address is already in use.' });
      }
      return res.status(400).json({ message: 'User ID is already in use.' });
    }
    next(error);
  }
};

module.exports = {
  loginHandler,
  registerHandler
};
