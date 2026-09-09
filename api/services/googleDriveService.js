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
 * Fetches credentials from the database for the specified drive config.
 * @param {string} [driveConfigId] - Optional drive config ID. Falls back to default.
 */
async function getDriveClient(driveConfigId) {
  const config = await configService.getDriveConfig(driveConfigId);
  
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
    driveFolderId: config.folderId,
    driveConfigId: config.id
  };
}

/**
 * Uploads a file to Google Drive using busboy for streaming.
 * @param {Object} req - Express request object.
 * @param {string} [driveConfigId] - Optional drive config ID.
 * @returns {Promise<Object>} - Resolves with the uploaded file data or rejects with an error.
 */
const uploadFile = async (req, driveConfigId) => {
  let drive, driveFolderId, resolvedDriveConfigId;
  try {
    ({ drive, driveFolderId, driveConfigId: resolvedDriveConfigId } = await getDriveClient(driveConfigId));
  } catch (error) {
    // If client initialization fails, we must consume/drain the request stream 
    // to prevent the connection from hanging.
    req.resume();
    throw error;
  }

  return new Promise((resolve, reject) => {
    const bb = busboy({ 
      headers: req.headers,
      // Multipart filenames are UTF-8 in browser uploads. Without this,
      // Busboy's latin1 default corrupts Vietnamese and other Unicode names.
      defParamCharset: 'utf8',
      limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10GB limit
    });
    let fileProcessed = false;
    let tags = [];

    bb.on('field', (name, val) => {
      if (name === 'tags') {
        try {
          tags = JSON.parse(val);
        } catch (e) {
          // Fallback if not JSON
          tags = val.split(',').map(t => t.trim()).filter(t => t);
        }
      }
      // driveConfigId can also come from form data — but we already have it from params
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
          tags: tags,
          driveConfigId: resolvedDriveConfigId
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

// Resolved Drive folder IDs for named subfolders, cached per
// `${driveConfigId}/${name}` for the life of the process. Subfolders are
// created once and then reused; they rarely change.
const subfolderCache = new Map();

/**
 * Resolves the Drive folder ID for a named subfolder of `parentId`, creating
 * the folder if it does not exist yet.
 * @param {Object} drive - Authenticated Drive client.
 * @param {string} parentId - Parent folder ID.
 * @param {string} name - Subfolder name.
 * @param {string} cacheKey - Stable key for the process-lifetime cache.
 * @returns {Promise<string>}
 */
async function getOrCreateSubfolder(drive, parentId, name, cacheKey) {
  if (subfolderCache.has(cacheKey)) {
    return subfolderCache.get(cacheKey);
  }

  const escapedName = name.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 1,
  });

  let folderId = existing.data.files && existing.data.files[0] && existing.data.files[0].id;

  if (!folderId) {
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    folderId = created.data.id;
  }

  subfolderCache.set(cacheKey, folderId);
  return folderId;
}

/**
 * Streams a single small image from a multipart request to Google Drive.
 * Purpose-built for feedback screenshots: enforces an `image/*` MIME type and
 * a byte cap, and drops the file into a named subfolder of the configured
 * Drive folder so it is never picked up by `listFiles`/`db:sync`.
 * @param {Object} req - Express request object.
 * @param {string} [driveConfigId] - Optional drive config ID.
 * @param {Object} [options]
 * @param {number} [options.maxBytes=5242880] - Maximum accepted file size.
 * @param {string} [options.subfolder='feedback'] - Target subfolder name.
 * @returns {Promise<{ driveFileId: string, mimeType: string, name: string }>}
 */
const uploadImage = async (req, driveConfigId, options = {}) => {
  const maxBytes = options.maxBytes || 5 * 1024 * 1024;
  const subfolderName = options.subfolder || 'feedback';

  let drive, driveFolderId, resolvedDriveConfigId;
  try {
    ({ drive, driveFolderId, driveConfigId: resolvedDriveConfigId } = await getDriveClient(driveConfigId));
  } catch (error) {
    req.resume();
    throw error;
  }

  let parentId;
  try {
    parentId = await getOrCreateSubfolder(
      drive,
      driveFolderId,
      subfolderName,
      `${resolvedDriveConfigId}/${subfolderName}`,
    );
  } catch (error) {
    req.resume();
    console.error('Error resolving Drive subfolder:', error);
    throw createServiceError(500, 'Error preparing upload folder on Google Drive.');
  }

  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: req.headers,
      defParamCharset: 'utf8',
      limits: { fileSize: maxBytes, files: 1 },
    });
    let fileHandled = false;

    bb.on('file', async (name, file, info) => {
      if (fileHandled) {
        file.resume();
        return;
      }
      fileHandled = true;

      const { filename, mimeType } = info;

      if (!mimeType || !mimeType.startsWith('image/')) {
        file.resume();
        reject(createServiceError(400, 'Only image attachments are allowed.'));
        return;
      }

      file.on('limit', () => {
        file.resume();
        reject(createServiceError(413, `Image exceeds the ${Math.round(maxBytes / (1024 * 1024))}MB limit.`));
      });

      try {
        const response = await drive.files.create({
          requestBody: { name: filename || 'attachment', parents: [parentId] },
          media: { mimeType, body: file },
          fields: 'id,name,mimeType',
          supportsAllDrives: true,
        });

        const driveFile = response.data;

        try {
          await drive.permissions.create({
            fileId: driveFile.id,
            requestBody: { role: 'reader', type: 'anyone' },
          });
        } catch (permError) {
          console.error(`Warning: Failed to set permissions for image ${driveFile.id}:`, permError.message);
        }

        resolve({ driveFileId: driveFile.id, mimeType: driveFile.mimeType, name: driveFile.name });
      } catch (error) {
        console.error('Error uploading image to Google Drive:', error);
        reject(createServiceError(500, 'Error uploading image to Google Drive.'));
      }
    });

    bb.on('error', (err) => {
      console.error('Busboy error:', err);
      reject(createServiceError(500, 'Error processing upload.'));
    });

    bb.on('finish', () => {
      if (!fileHandled) {
        reject(createServiceError(400, 'No image uploaded.'));
      }
    });

    req.pipe(bb);
  });
};

/**
 * Streams a file's bytes from Drive by file ID.
 * @param {string} fileId
 * @param {string} [driveConfigId] - Optional drive config ID.
 * @returns {Promise<NodeJS.ReadableStream>}
 */
const streamFile = async (fileId, driveConfigId) => {
  const { drive } = await getDriveClient(driveConfigId);
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' },
  );
  return response.data;
};

/**
 * Makes a file public (anyone with link can view).
 * @param {string} fileId - The ID of the file to make public.
 * @param {string} [driveConfigId] - Optional drive config ID.
 * @returns {Promise<void>}
 */
const makeFilePublic = async (fileId, driveConfigId) => {
  try {
    const { drive } = await getDriveClient(driveConfigId);
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
 * @param {string} [driveConfigId] - Optional drive config ID.
 * @returns {Promise<Array>} - Resolves with an array of file objects.
 */
const listFiles = async (driveConfigId) => {
  try {
    const { drive, driveFolderId } = await getDriveClient(driveConfigId);

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
 * @param {string} [driveConfigId] - Optional drive config ID.
 * @returns {Promise<void>}
 */
const deleteFile = async (fileId, driveConfigId) => {
  try {
    const { drive } = await getDriveClient(driveConfigId);

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
  getDriveClient,
  uploadFile,
  uploadImage,
  streamFile,
  listFiles,
  deleteFile,
  makeFilePublic
};
