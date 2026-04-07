const googleDriveService = require('../services/googleDriveService');
const fileService = require('../services/fileService');

/**
 * Handles file upload requests.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const uploadFileHandler = async (req, res, next) => {
  let driveFileData = null;
  try {
    driveFileData = await googleDriveService.uploadFile(req);
    
    // Cache metadata in the application database
    const dbFile = await fileService.createFile({
      driveFileId: driveFileData.id,
      name: driveFileData.name,
      mimeType: driveFileData.mimeType,
      webViewLink: driveFileData.webViewLink,
      size: driveFileData.size,
    });

    res.status(200).json({ 
      message: 'File uploaded to Google Drive and cached successfully', 
      file: dbFile 
    });
  } catch (error) {
    // Rollback: if DB insert fails, remove the file from Drive
    if (driveFileData && driveFileData.id) {
      try {
        await googleDriveService.deleteFile(driveFileData.id);
        console.warn(`Rolled back orphaned Drive file: ${driveFileData.id}`);
      } catch (rollbackError) {
        console.error('Critical: Failed to rollback Drive file', rollbackError);
      }
    }
    next(error);
  }
};

/**
 * Handles requests to list files.
 * Reads from the application database for high performance.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const listFilesHandler = async (req, res, next) => {
  try {
    // Set sensible defaults for pagination and filtering
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const { includeType, excludeType } = req.query;
    
    // Fetch both the files and the total count in parallel with filters
    const [files, total] = await Promise.all([
      fileService.getAllFiles({ limit, offset, includeType, excludeType }),
      fileService.countFiles({ includeType, excludeType })
    ]);
    
    res.status(200).json({ 
      files, 
      total,
      limit,
      offset
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles file deletion requests.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const deleteFileHandler = async (req, res, next) => {
  const { fileId } = req.params;
  
  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({ message: 'A valid fileId is required.' });
  }

  try {
    // 1. Delete from Google Drive
    try {
      await googleDriveService.deleteFile(fileId);
    } catch (driveError) {
      // If the file is already gone from Drive, we should still try to clean up the DB
      if (driveError.status === 404) {
        console.warn(`File ${fileId} not found in Google Drive, proceeding with database cleanup.`);
      } else {
        throw driveError;
      }
    }
    
    // 2. Delete from the application database (using driveFileId)
    try {
      await fileService.deleteFileByDriveId(fileId);
      res.status(200).json({ 
        message: 'File deleted successfully from Google Drive and the application database.' 
      });
    } catch (dbError) {
      console.error(`File ${fileId} deleted from Drive but failed to delete from DB`, dbError);
      res.status(500).json({ 
        message: 'Partial Success: File removed from Google Drive, but database update failed. A background sync will be required.',
        error: dbError.message
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFileHandler,
  listFilesHandler,
  deleteFileHandler
};
