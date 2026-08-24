const fs = require('fs');
const path = require('path');
const { Readable, PassThrough } = require('stream');
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
 * Resolves a YBM asset's Drive file ID from the manifest, without touching
 * Drive. fileId doubles as an ETag: a redigitized test gets a new Drive file
 * (old one deleted, not overwritten), so the id changes whenever content
 * does — letting the controller answer a conditional GET without streaming.
 * @param {string} testId - e.g. "vol-2-test-05".
 * @param {string} filename - e.g. "lc-p01.jpg" or "listening.mp3".
 * @returns {{ fileId: string, mimeType: string }}
 */
const resolveAsset = (testId, filename) => {
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

  return { fileId, mimeType };
};

// In-memory cache of previously-streamed Drive bytes, so repeat requests
// (other students opening the same test, a browser without a cached copy)
// are served from process memory instead of paying a live Drive round-trip
// each time. Bounded by total bytes rather than entry count since booklet
// pages and the listening track vary wildly in size; oldest entries evict
// first once the budget is exceeded. Resets on process restart — that's
// fine, it's a speed optimization, not a source of truth (Drive still is).
const CACHE_BUDGET_BYTES = Number(process.env.YBM_ASSET_CACHE_MB || 150) * 1024 * 1024;
const contentCache = new Map(); // fileId -> Buffer
let cachedBytes = 0;

function rememberAsset(fileId, buffer) {
  if (buffer.length > CACHE_BUDGET_BYTES) return;

  cachedBytes += buffer.length;
  contentCache.set(fileId, buffer);
  while (cachedBytes > CACHE_BUDGET_BYTES && contentCache.size > 0) {
    const oldestKey = contentCache.keys().next().value;
    cachedBytes -= contentCache.get(oldestKey).length;
    contentCache.delete(oldestKey);
  }
}

/**
 * Streams an asset's bytes from Drive by file ID, serving from the in-memory
 * cache when available.
 * @param {string} fileId
 * @returns {Promise<NodeJS.ReadableStream>}
 */
const streamAsset = async (fileId) => {
  const cached = contentCache.get(fileId);
  if (cached) {
    // Re-insert to refresh LRU order (Map iterates in insertion order).
    contentCache.delete(fileId);
    contentCache.set(fileId, cached);
    return Readable.from(cached);
  }

  const { drive } = await googleDriveService.getDriveClient();
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' },
  );

  // Tee the Drive stream: pipe it straight to the caller (no added latency
  // to first byte) while also buffering it to populate the cache once it
  // finishes, for the next request.
  const driveStream = response.data;
  const out = new PassThrough();
  const chunks = [];

  driveStream.on('data', (chunk) => chunks.push(chunk));
  driveStream.on('end', () => rememberAsset(fileId, Buffer.concat(chunks)));
  driveStream.on('error', (error) => out.emit('error', error));
  driveStream.pipe(out);

  return out;
};

module.exports = { resolveAsset, streamAsset };
