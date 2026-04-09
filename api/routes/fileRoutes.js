const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// Define routes for file operations
router.post('/upload', fileController.uploadFileHandler);
router.get('/files', fileController.listFilesHandler);
router.get('/tags', fileController.getAllTagsHandler);
router.patch('/files/:fileId/tags', fileController.updateFileTagsHandler);
router.delete('/files/:fileId', fileController.deleteFileHandler);

module.exports = router;
