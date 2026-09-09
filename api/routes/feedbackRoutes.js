const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Any signed-in user can submit feedback and upload image attachments for it.
router.post('/', authenticateToken, feedbackController.createFeedbackHandler);
router.post('/attachments', authenticateToken, feedbackController.uploadAttachmentHandler);

// Review and triage is admin-only.
router.get('/', authenticateToken, isAdmin, feedbackController.listFeedbackHandler);
router.get(
  '/:id/attachments/:driveFileId',
  authenticateToken,
  isAdmin,
  feedbackController.getAttachmentHandler,
);
router.patch('/:id', authenticateToken, isAdmin, feedbackController.updateFeedbackHandler);
router.delete('/:id', authenticateToken, isAdmin, feedbackController.deleteFeedbackHandler);

module.exports = router;
