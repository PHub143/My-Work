const configService = require('../services/configService');

/**
 * Handles GET requests for the Drive configuration.
 * Masks sensitive fields.
 */
const getDriveConfigHandler = async (req, res, next) => {
  try {
    const config = await configService.getDriveConfig();
    if (!config) {
      return res.status(200).json({ config: null });
    }

    // Return safe data only
    const safeConfig = {
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      folderId: config.folderId,
      hasClientSecret: !!config.clientSecret,
      hasRefreshToken: !!config.refreshToken,
      updatedAt: config.updatedAt
    };

    res.status(200).json({ config: safeConfig });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles POST requests to upsert Drive configuration.
 */
const upsertDriveConfigHandler = async (req, res, next) => {
  const { clientId, clientSecret, redirectUri, folderId } = req.body;

  if (!clientId || !redirectUri || !folderId) {
    return res.status(400).json({ message: 'Missing required configuration fields.' });
  }

  try {
    const existingConfig = await configService.getDriveConfig();
    
    // Only update clientSecret if it's provided and not the masked indicator
    let finalClientSecret = clientSecret;
    if (!clientSecret || clientSecret === '********') {
      if (existingConfig && existingConfig.clientSecret) {
        finalClientSecret = existingConfig.clientSecret;
      } else {
        return res.status(400).json({ message: 'Client Secret is required for initial configuration.' });
      }
    }

    const config = await configService.upsertDriveConfig({
      clientId,
      clientSecret: finalClientSecret,
      redirectUri,
      folderId,
      refreshToken: existingConfig ? existingConfig.refreshToken : null
    });

    res.status(200).json({ 
      message: 'Drive configuration updated successfully.',
      config: {
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        folderId: config.folderId
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDriveConfigHandler,
  upsertDriveConfigHandler
};
