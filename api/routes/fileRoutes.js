const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Define routes for file operations - Listing is public, others are restricted to Admin
router.post('/upload', authenticateToken, isAdmin, fileController.uploadFileHandler);
router.get('/files', fileController.listFilesHandler);
router.get('/tags', fileController.getAllTagsHandler);
router.patch('/files/:fileId/tags', authenticateToken, isAdmin, fileController.updateFileTagsHandler);
router.delete('/files/:fileId', authenticateToken, isAdmin, fileController.deleteFileHandler);

module.exports = router;
