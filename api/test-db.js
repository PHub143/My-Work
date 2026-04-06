require('dotenv').config();
const prisma = require('./services/prismaService');

async function main() {
  try {
    console.log('Attempting to connect to database...');
    // Simply try to count the number of files to verify the connection
    const fileCount = await prisma.file.count();
    console.log(`Successfully connected! Total files in DB: ${fileCount}`);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
