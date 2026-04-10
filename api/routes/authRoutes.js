const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/google/url', authController.getAuthUrlHandler);
router.post('/google/callback', authController.googleCallbackHandler);

module.exports = router;
