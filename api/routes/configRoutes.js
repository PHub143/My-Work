const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/drive', configController.getDriveConfigHandler);
router.post('/drive', authenticateToken, isAdmin, configController.upsertDriveConfigHandler);
router.post('/sync', authenticateToken, isAdmin, configController.syncDriveHandler);

module.exports = router;
