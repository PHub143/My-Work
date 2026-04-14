const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// List all drive configurations (public — needed for drive switcher)
router.get('/drives', configController.getAllDriveConfigsHandler);

// Get a specific drive configuration
router.get('/drive/:id', configController.getDriveConfigHandler);

// Get default drive configuration (backward compat)
router.get('/drive', configController.getDriveConfigHandler);

// Create or update a drive configuration
router.post('/drive', authenticateToken, isAdmin, configController.upsertDriveConfigHandler);

// Delete a drive configuration
router.delete('/drive/:id', authenticateToken, isAdmin, configController.deleteDriveConfigHandler);

// Set a drive as default
router.post('/drive/:id/default', authenticateToken, isAdmin, configController.setDefaultDriveHandler);

// Sync all drives
router.post('/sync', authenticateToken, isAdmin, configController.syncDriveHandler);

// Sync a specific drive
router.post('/sync/:driveConfigId', authenticateToken, isAdmin, configController.syncDriveHandler);

module.exports = router;
