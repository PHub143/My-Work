const { PrismaClient } = require('@prisma/client');

/**
 * Singleton instance of Prisma Client.
 * Manually passing the datasource URL as required by Prisma 7 when
 * URLs are removed from the schema.prisma file.
 */
const prisma = new PrismaClient({
  datasource: {
    url: process.env.DATABASE_URL
  }
});

module.exports = prisma;
