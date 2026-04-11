require('dotenv').config();
const prisma = require('../services/prismaService');
const bcrypt = require('bcryptjs');

async function main() {
  const email = 'admin@example.com';
  const password = 'adminpassword123';
  const name = 'System Admin';

  const existingAdmin = await prisma.user.findUnique({
    where: { email }
  });

  if (existingAdmin) {
    console.log('Admin user already exists.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: 'ADMIN'
    }
  });

  console.log('Admin user created successfully.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
