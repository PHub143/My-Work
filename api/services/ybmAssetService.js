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

// Parses a single-range `Range: bytes=start-end` request header (what
// <audio>/<video> elements send to seek) against a known total size. Returns
// null for a missing, multi-range, or unsatisfiable header — callers fall
// back to serving the whole thing, same as before Range support existed.
function parseRange(rangeHeader, size) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=') || rangeHeader.includes(',')) return null;

  const [startRaw, endRaw] = rangeHeader.slice('bytes='.length).split('-');
  let start = startRaw === '' ? NaN : Number(startRaw);
  let end = endRaw === '' ? NaN : Number(endRaw);

  if (Number.isNaN(start)) {
    // Suffix range, e.g. "bytes=-500" means the last 500 bytes.
    if (Number.isNaN(end)) return null;
    start = Math.max(size - end, 0);
    end = size - 1;
  } else if (Number.isNaN(end) || end >= size) {
    end = size - 1;
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end) return null;
  return { start, end };
}

/**
 * Streams an asset's bytes from Drive by file ID, serving from the in-memory
 * cache when available. Honors a byte-range request (how a scrubbed <audio>
 * seek is expressed over HTTP) so a listening track can be seeked to an
 * arbitrary time instead of only playing linearly.
 * @param {string} fileId
 * @param {string} [rangeHeader] - the request's raw `Range` header, if any.
 * @returns {Promise<{ status: number, stream: NodeJS.ReadableStream, contentLength?: number, contentRange?: string|null }>}
 */
const streamAsset = async (fileId, rangeHeader) => {
  const cached = contentCache.get(fileId);
  if (cached) {
    // Re-insert to refresh LRU order (Map iterates in insertion order).
    contentCache.delete(fileId);
    contentCache.set(fileId, cached);

    const range = parseRange(rangeHeader, cached.length);
    if (range) {
      return {
        status: 206,
        stream: Readable.from(cached.subarray(range.start, range.end + 1)),
        contentLength: range.end - range.start + 1,
        contentRange: `bytes ${range.start}-${range.end}/${cached.length}`,
      };
    }
    return { status: 200, stream: Readable.from(cached), contentLength: cached.length, contentRange: null };
  }

  const { drive } = await googleDriveService.getDriveClient();
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream', headers: rangeHeader ? { Range: rangeHeader } : {} },
  );

  const driveStream = response.data;

  // A seek to a byte offset we haven't cached yet — Drive honored the Range
  // request, so pipe its partial response straight through instead of
  // waiting on a full download. Not cached: caching a partial byte range
  // would corrupt the full-file cache used for later whole-file requests.
  if (response.status === 206) {
    const contentLength = response.headers['content-length'];
    return {
      status: 206,
      stream: driveStream,
      contentLength: contentLength ? Number(contentLength) : undefined,
      contentRange: response.headers['content-range'] || null,
    };
  }

  // Full response — tee the Drive stream: pipe it straight to the caller (no
  // added latency to first byte) while also buffering it to populate the
  // cache once it finishes, for the next request.
  const out = new PassThrough();
  const chunks = [];

  driveStream.on('data', (chunk) => chunks.push(chunk));
  driveStream.on('end', () => rememberAsset(fileId, Buffer.concat(chunks)));
  driveStream.on('error', (error) => out.emit('error', error));
  driveStream.pipe(out);

  const contentLength = response.headers['content-length'];
  return {
    status: 200,
    stream: out,
    contentLength: contentLength ? Number(contentLength) : undefined,
    contentRange: null,
  };
};

module.exports = { resolveAsset, streamAsset };
