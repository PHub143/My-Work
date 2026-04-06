const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Singleton instance of Prisma Client configured for SQLite in Prisma 7.
 * Ensures the database path is absolute for consistent access.
 */
let dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.startsWith('file:')) {
  const rawPath = dbUrl.replace('file:', '');
  const absolutePath = path.isAbsolute(rawPath) 
    ? rawPath 
    : path.resolve(__dirname, '..', rawPath);
  dbUrl = `file:${absolutePath}`;
}

const adapter = new PrismaBetterSqlite3({ url: dbUrl });

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
