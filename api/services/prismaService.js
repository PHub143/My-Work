const { PrismaClient } = require('@prisma/client');

/**
 * Singleton instance of Prisma Client.
 * Automatically picks up the DATABASE_URL from the environment.
 */
const prisma = new PrismaClient();

module.exports = prisma;
