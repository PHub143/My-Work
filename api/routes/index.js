const express = require('express');
const router = express.Router();
const fileRoutes = require('./fileRoutes');
const configRoutes = require('./configRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');

// Public health check for uptime monitoring (e.g. UptimeRobot); no DB or Drive access
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Mount file-related routes
router.use('/', fileRoutes);

// Mount configuration and authentication routes
router.use('/config', configRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

module.exports = router;
