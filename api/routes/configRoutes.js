const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

router.get('/drive', configController.getDriveConfigHandler);
router.post('/drive', configController.upsertDriveConfigHandler);
router.post('/sync', configController.syncDriveHandler);

module.exports = router;
