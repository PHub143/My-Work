// Prisma 7 configuration file
import "dotenv/config";
import { defineConfig } from "prisma/config";

// On Render, env vars are in process.env but might not be in a .env file.
const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL || databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
    directUrl: directUrl,
  },
});
