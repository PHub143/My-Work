const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Define routes for file operations - all protected
router.post('/upload', authenticateToken, fileController.uploadFileHandler);
router.get('/files', authenticateToken, fileController.listFilesHandler);
router.get('/tags', authenticateToken, fileController.getAllTagsHandler);
router.patch('/files/:fileId/tags', authenticateToken, fileController.updateFileTagsHandler);
router.delete('/files/:fileId', authenticateToken, fileController.deleteFileHandler);

module.exports = router;
