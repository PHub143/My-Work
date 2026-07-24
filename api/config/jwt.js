require('dotenv').config();

// Fallback secret is for local development only. Production MUST provide
// JWT_SECRET (see config/AGENTS.md); otherwise tokens would be signed and
// verified with a value that is public in this repository, allowing forgery.
const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';

const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production. Refusing to start with an insecure default.');
  }
  console.warn('Warning: JWT_SECRET is not set. Using an insecure development-only secret.');
}

module.exports = { JWT_SECRET };
