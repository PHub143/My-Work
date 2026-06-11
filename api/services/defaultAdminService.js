const bcrypt = require('bcryptjs');
const prisma = require('./prismaService');
const { ROLES } = require('../utils/roles');

const DEFAULT_ADMIN_EMAIL = 'lieutienthinh@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DEFAULT_ADMIN_NAME = 'Default Admin';

async function ensureDefaultAdmin() {
  const existingUser = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  if (existingUser) {
    return { created: false, user: existingUser };
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
