const bcrypt = require('bcryptjs');
const prisma = require('./prismaService');
const { ROLES } = require('../utils/roles');

const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'lieutienthinh@gmail.com';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || 'Default Admin';

async function ensureDefaultAdmin() {
  const existingUser = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  if (existingUser) {
    return { created: false, user: existingUser };
  }

  if (!process.env.DEFAULT_ADMIN_PASSWORD) {
    console.warn(
      `Warning: creating default admin ${DEFAULT_ADMIN_EMAIL} with the built-in default password. ` +
      'Set DEFAULT_ADMIN_PASSWORD (and change the password after first login) to secure this account.'
    );
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: DEFAULT_ADMIN_EMAIL,
      name: DEFAULT_ADMIN_NAME,
      password: hashedPassword,
      role: ROLES.ADMIN,
      roles: [ROLES.ADMIN],
    },
  });

  return { created: true, user };
}

module.exports = {
  DEFAULT_ADMIN_EMAIL,
  ensureDefaultAdmin,
};
