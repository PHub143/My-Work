const { google } = require('googleapis');
const busboy = require('busboy');
const configService = require('./configService');

function createServiceError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Gets a configured Google Drive client.
 * Fetches credentials from the database.
 */
async function getDriveClient() {
  const config = await configService.getDriveConfig();
  
  if (!config || !config.clientId || !config.clientSecret || !config.redirectUri || !config.refreshToken) {
    throw createServiceError(
      412,
      'Google Drive is not fully configured. Please complete the setup in the Settings page.'
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  oauth2Client.setCredentials({ refresh_token: config.refreshToken });

  return {
    drive: google.drive({ 
      version: 'v3', 
      auth: oauth2Client,
      timeout: 120 * 60 * 1000 // 2 hours global timeout
    }),
    driveFolderId: config.folderId
  };
}

/**
 * Uploads a file to Google Drive using busboy for streaming.
 * @param {Object} req - Express request object.
 * @returns {Promise<Object>} - Resolves with the uploaded file data or rejects with an error.
 */
const uploadFile = async (req) => {
  let drive, driveFolderId;
  try {
    ({ drive, driveFolderId } = await getDriveClient());
  } catch (error) {
    // If client initialization fails, we must consume/drain the request stream 
    // to prevent the connection from hanging.
    req.resume();
    throw error;
  }

  return new Promise((resolve, reject) => {
    const bb = busboy({ 
      headers: req.headers,
      limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10GB limit
    });
    let fileProcessed = false;
    let tags = [];

    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Video
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/gzip',
    ];

    bb.on('field', (name, val) => {
      if (name === 'tags') {
        try {
          tags = JSON.parse(val);
        } catch (e) {
          // Fallback if not JSON
          tags = val.split(',').map(t => t.trim()).filter(t => t);
        }
      }
    });

    bb.on('file', async (name, file, info) => {
      // If a file is already being processed, discard any additional files
      if (fileProcessed) {
        file.resume();
        return;
      }

      const { filename, mimeType } = info;

      file.on('limit', () => {
        fileProcessed = true;
        file.resume();
        reject(createServiceError(413, 'File size limit exceeded (max 10GB).'));
      });

      if (!allowedTypes.includes(mimeType)) {
        file.resume(); // Discard the file data
        fileProcessed = true;
        return reject(createServiceError(400, `Invalid file type: ${mimeType}. Supported: images, videos, audio, documents, and archives.`));
      }

      fileProcessed = true;

      try {
        const fileMetadata = {
          name: filename,
          parents: [driveFolderId]
        };

        const media = {
          mimeType: mimeType,
          body: file, // Directly pipe the stream from busboy to Google Drive API
        };

        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id,name,webViewLink,mimeType,size,thumbnailLink',
          supportsAllDrives: true,
        });

        const driveFile = response.data;

        // Make the file public (anyone with link can view) to ensure thumbnailLink works
        try {
          await drive.permissions.create({
            fileId: driveFile.id,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
          });
        } catch (permError) {
          console.error(`Warning: Failed to set permissions for file ${driveFile.id}:`, permError.message);
        }

        resolve({
          ...driveFile,
          tags: tags
        });
      } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        reject(createServiceError(500, 'Error uploading file to Google Drive.'));
      }
    });

    bb.on('limit', () => {
      if (fileProcessed) return;
      fileProcessed = true;
      reject(createServiceError(413, 'File size limit exceeded (max 10GB).'));
    });

    bb.on('error', (err) => {
      console.error('Busboy error:', err);
      reject(createServiceError(500, 'Error processing upload.'));
    });

    bb.on('finish', () => {
      if (!fileProcessed) {
        reject(createServiceError(400, 'No file uploaded.'));
      }
    });

    req.pipe(bb);
  });
};

/**
 * Makes a file public (anyone with link can view).
 * @param {string} fileId - The ID of the file to make public.
 * @returns {Promise<void>}
 */
const makeFilePublic = async (fileId) => {
  try {
    const { drive } = await getDriveClient();
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (error) {
    console.error(`Error making file ${fileId} public:`, error);
    throw error.status ? error : createServiceError(500, 'Error making file public on Google Drive.');
  }
};

/**
 * Lists files from the specified Google Drive folder.
 * @returns {Promise<Array>} - Resolves with an array of file objects.
 */
const listFiles = async () => {
  try {
    const { drive, driveFolderId } = await getDriveClient();

    const files = [];
    let pageToken;

    do {
      const response = await drive.files.list({
        pageSize: 100,
        pageToken,
        fields: 'nextPageToken, files(id, name, webViewLink, mimeType, size, thumbnailLink)',
        q: `'${driveFolderId}' in parents and trashed = false`,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      files.push(...(response.data.files || []));
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    return files;
  } catch (error) {
    console.error('Error fetching files from Google Drive:', error);
    throw error.status ? error : createServiceError(500, 'Error fetching files from Google Drive.');
  }
};

/**
 * Deletes a file from Google Drive.
 * @param {string} fileId - The ID of the file to delete.
 * @returns {Promise<void>}
 */
const deleteFile = async (fileId) => {
  try {
    const { drive } = await getDriveClient();

    await drive.files.delete({
      fileId: fileId,
      supportsAllDrives: true,
    });
  } catch (error) {
    if (error.code === 404) {
      throw createServiceError(404, 'File not found in Google Drive.');
    }
    console.error('Error deleting file from Google Drive:', error);
    throw error.status ? error : createServiceError(500, 'Error deleting file from Google Drive.');
  }
};

module.exports = {
  uploadFile,
  listFiles,
  deleteFile,
  makeFilePublic
};
