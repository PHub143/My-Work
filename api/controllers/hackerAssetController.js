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

    if (req.get('If-None-Match') === `"${fileId}"`) {
      res.status(304).end();
      return;
    }

    const stream = await hackerAssetService.streamAsset(fileId);
    stream.on('error', (error) => next(error));
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAssetHandler };
