const express = require('express');
const router = express.Router();
const learningContentController = require('../controllers/learningContentController');
const learningResultController = require('../controllers/learningResultController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/content/latest', learningContentController.getLatestSnapshot);
router.get('/content/snapshots', authenticateToken, isAdmin, learningContentController.listSnapshots);
router.post('/content/drafts', authenticateToken, isAdmin, learningContentController.createDraft);
router.get('/content/snapshots/:id', authenticateToken, isAdmin, learningContentController.getSnapshot);
router.get('/content/snapshots/:id/export', authenticateToken, isAdmin, learningContentController.exportSnapshot);
router.patch('/content/drafts/:id', authenticateToken, isAdmin, learningContentController.updateDraft);
router.post('/content/drafts/:id/validate', authenticateToken, isAdmin, learningContentController.validateDraft);
router.post('/content/drafts/:id/publish', authenticateToken, isAdmin, learningContentController.publishDraft);
router.post('/results', authenticateToken, learningResultController.createResult);
router.get('/results', authenticateToken, learningResultController.listResults);

module.exports = router;
