const hackerAssetService = require('../services/hackerAssetService');

/**
 * Streams a Hacker booklet page/audio file from Google Drive.
 * Public — same access level as GET /files (no auth).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const getAssetHandler = async (req, res, next) => {
  const { testId, filename } = req.params;

  try {
    const { fileId, mimeType } = hackerAssetService.resolveAsset(testId, filename);

    // fileId is the ETag: a redigitized test uploads a new Drive file (old
    // one deleted, not overwritten), so it changes exactly when content
    // does. A long max-age here would mean a fixed re-digitization is
    // invisible to already-cached clients for up to a year — cache
    // aggressively but always let the client confirm the id first.
    res.set('Content-Type', mimeType);
    res.set('ETag', `"${fileId}"`);
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
    // Advertised unconditionally so the browser knows up front that it can
    // seek this resource with Range requests, not just after a successful one.
    res.set('Accept-Ranges', 'bytes');

    if (req.get('If-None-Match') === `"${fileId}"`) {
      res.status(304).end();
      return;
    }

    const { status, stream, contentLength, contentRange } = await hackerAssetService.streamAsset(
      fileId,
      req.get('Range'),
    );

    if (contentLength !== undefined) res.set('Content-Length', String(contentLength));
    if (contentRange) res.set('Content-Range', contentRange);
    res.status(status);

    stream.on('error', (error) => next(error));
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAssetHandler };
