const express = require('express');
const router = express.Router();
const learningResultController = require('../controllers/learningResultController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/results', authenticateToken, learningResultController.createResult);
router.get('/results', authenticateToken, learningResultController.listResults);

module.exports = router;
