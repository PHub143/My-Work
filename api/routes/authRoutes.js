const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/google/url', authenticateToken, isAdmin, authController.getAuthUrlHandler);
router.post('/google/callback', authenticateToken, isAdmin, authController.googleCallbackHandler);

module.exports = router;
