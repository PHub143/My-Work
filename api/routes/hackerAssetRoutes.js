const express = require('express');
const router = express.Router();
const hackerAssetController = require('../controllers/hackerAssetController');

// Public — booklet page images and listening audio for the Hacker TOEIC feature.
router.get('/hacker/:testId/:filename', hackerAssetController.getAssetHandler);

module.exports = router;
