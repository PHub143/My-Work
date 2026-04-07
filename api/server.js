const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();
const routes = require('./routes');
const { syncDatabase } = require('./scripts/sync-drive');

const app = express();
const port = process.env.PORT || 3001;

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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);

  // Schedule full synchronization from Google Drive every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled synchronization...');
    await syncDatabase();
  });

  // Initial sync on server start (optional, but good for ensuring consistency)
  console.log('Running initial synchronization...');
  syncDatabase()
    .then(() => console.log('Initial sync completed successfully.'))
    .catch(err => console.error('Initial sync failed during startup:', err));
});
