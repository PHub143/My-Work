const express = require('express');
const router = express.Router();
const fileRoutes = require('./fileRoutes');

// Mount file-related routes
router.use('/', fileRoutes);

module.exports = router;
