const fs = require('fs');
const path = require('path');
const googleDriveService = require('./googleDriveService');

function createServiceError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const MANIFEST_DIR = path.join(__dirname, '../data/ybm-assets');
const MIME_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg' };

// Manifests are small and rarely change, so cache them per testId for the
// life of the process instead of hitting the filesystem on every request.
const manifestCache = new Map();

function loadManifest(testId) {
  if (manifestCache.has(testId)) return manifestCache.get(testId);

  const manifestPath = path.join(MANIFEST_DIR, `${testId}.json`);
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }

  manifestCache.set(testId, manifest);
  return manifest;
}

/**
 * Resolves a YBM asset's Drive file ID and streams its bytes.
 * @param {string} testId - e.g. "vol-2-test-05".
 * @param {string} filename - e.g. "lc-p01.jpg" or "listening.mp3".
 * @returns {Promise<{ stream: NodeJS.ReadableStream, mimeType: string }>}
 */
const getAssetStream = async (testId, filename) => {
  const extension = path.extname(filename).toLowerCase();
  const mimeType = MIME_TYPES[extension];
  if (!mimeType) {
    throw createServiceError(400, 'Unsupported asset type.');
  }

  const manifest = loadManifest(testId);
  const fileId = manifest?.files?.[filename];
  if (!fileId) {
    throw createServiceError(404, 'YBM asset not found.');
  }

  const { drive } = await googleDriveService.getDriveClient();
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' },
  );

  return { stream: response.data, mimeType };
};

module.exports = { getAssetStream };
