const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

/**
 * Singleton instance of Prisma Client configured for PostgreSQL in Prisma 7.
 * Uses the @prisma/adapter-pg for standard PostgreSQL hosting.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
