const express = require('express');
const router = express.Router();
const ybmAssetController = require('../controllers/ybmAssetController');

// Public — booklet page images and listening audio for the YBM TOEIC feature.
router.get('/ybm/:testId/:filename', ybmAssetController.getAssetHandler);

module.exports = router;
