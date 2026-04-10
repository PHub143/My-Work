const express = require('express');
const router = express.Router();
const fileRoutes = require('./fileRoutes');
const configRoutes = require('./configRoutes');
const authRoutes = require('./authRoutes');

// Mount file-related routes
router.use('/', fileRoutes);

// Mount configuration and authentication routes
router.use('/config', configRoutes);
router.use('/auth', authRoutes);

module.exports = router;
