require('dotenv').config();
const prisma = require('../services/prismaService');
const {
  DEFAULT_ADMIN_EMAIL,
  ensureDefaultAdmin,
} = require('../services/defaultAdminService');

async function main() {
  const { created } = await ensureDefaultAdmin();
  console.log(created ? 'Default admin user created.' : 'Default admin user already exists.');
  console.log(`Email: ${DEFAULT_ADMIN_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
