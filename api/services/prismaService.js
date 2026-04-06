const { PrismaClient } = require('@prisma/client');

/**
 * Singleton instance of Prisma Client.
 * Explicitly passing the connection URL via the datasources property (plural)
 * as required by Prisma 7 when URLs are moved out of the schema file.
 */
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

module.exports = prisma;
