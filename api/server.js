const express = require('express');
const cors = require('cors');
require('dotenv').config();
const routes = require('./routes');

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

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
});
