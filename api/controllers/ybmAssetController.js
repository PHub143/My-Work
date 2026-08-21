const ybmAssetService = require('../services/ybmAssetService');

/**
 * Streams a YBM booklet page/audio file from Google Drive.
 * Public — same access level as GET /files (no auth).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const getAssetHandler = async (req, res, next) => {
  const { testId, filename } = req.params;

  try {
    const { stream, mimeType } = await ybmAssetService.getAssetStream(testId, filename);

    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');

    stream.on('error', (error) => next(error));
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAssetHandler };
