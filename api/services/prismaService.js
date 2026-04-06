const { PrismaClient } = require('@prisma/client');

/**
 * Singleton instance of Prisma Client.
 * In Prisma 7, when URLs are moved to the config file, 
 * you pass the connection string via the datasourceUrl property.
 */
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

module.exports = prisma;
