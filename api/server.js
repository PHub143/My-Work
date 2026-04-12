const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();
const routes = require('./routes');
const { syncDatabase } = require('./scripts/sync-drive');

// BigInt JSON serialization patch
// Required for Prisma BigInt fields to be correctly handled in Express responses
BigInt.prototype.toJSON = function() {
  const int = Number(this);
  return Number.isSafeInteger(int) ? int : this.toString();
};

const app = express();
const port = process.env.PORT || 3001;

// Middleware for parsing JSON bodies
app.use(express.json());

// Configure CORS for security
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isLocalhost = origin.startsWith('http://localhost:') || 
                       origin.startsWith('http://127.0.0.1:') ||
                       origin === 'http://localhost' ||
                       origin === 'http://127.0.0.1';
    
    if (isLocalhost || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Extend timeout for large file uploads (2 hours)
app.use('/upload', (req, res, next) => {
  req.setTimeout(2 * 60 * 60 * 1000);
  res.setTimeout(2 * 60 * 60 * 1000);
  next();
});

// Use modular routes
app.use('/', routes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error.';

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ message });
});

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);

  // Set server-level timeouts for multi-GB uploads (2 hours)
  server.keepAliveTimeout = 2 * 60 * 60 * 1000;
  server.headersTimeout = 2 * 60 * 60 * 1000 + 1000;

  // Schedule full synchronization from Google Drive every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled synchronization...');
    await syncDatabase();
  });

  // Initial sync on server start (optional, but good for ensuring consistency)
  console.log('Running initial synchronization...');
  syncDatabase()
    .then(() => console.log('Initial sync completed successfully.'))
    .catch(err => {
      if (err.status === 500 && err.message.includes('not fully configured')) {
        console.warn('Initial sync skipped: Google Drive is not fully configured. Use the Settings UI to complete setup.');
      } else {
        console.error('Initial sync failed during startup:', err);
      }
    });
});
