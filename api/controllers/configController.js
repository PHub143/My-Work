const configService = require('../services/configService');
const { syncDatabase } = require('../scripts/sync-drive');

/**
 * Handles GET requests for all Drive configurations.
 * Returns safe data only (no decrypted secrets).
 */
const getAllDriveConfigsHandler = async (req, res, next) => {
  try {
    const configs = await configService.getAllDriveConfigs();
    res.status(200).json({ configs });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles GET requests for a specific Drive configuration.
 * Masks sensitive fields.
 */
const getDriveConfigHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    const config = await configService.getDriveConfig(id);
    if (!config) {
      return res.status(200).json({ config: null });
    }

    // Return safe data only
    const safeConfig = {
      id: config.id,
      name: config.name,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      folderId: config.folderId,
      isDefault: config.isDefault,
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
  const { id, name, clientId, clientSecret, redirectUri, folderId, isDefault } = req.body;

  if (!clientId || !redirectUri || !folderId) {
    return res.status(400).json({ message: 'Missing required configuration fields.' });
  }

  try {
    let finalClientSecret = clientSecret;

    // If updating an existing config, allow keeping the old secret
    if (id) {
      const existingConfig = await configService.getDriveConfig(id);
      if (!clientSecret || clientSecret === '********') {
        if (existingConfig && existingConfig.clientSecret) {
          finalClientSecret = existingConfig.clientSecret;
        } else {
          return res.status(400).json({ message: 'Client Secret is required for initial configuration.' });
        }
      }
    } else {
      // Creating new — secret is required
      if (!clientSecret || clientSecret === '********') {
        return res.status(400).json({ message: 'Client Secret is required for new drive configuration.' });
      }
    }

    const config = await configService.upsertDriveConfig({
      id,
      name: name || 'Default Drive',
      clientId,
      clientSecret: finalClientSecret,
      redirectUri,
      folderId,
      isDefault: isDefault || false
    });

    res.status(200).json({ 
      message: id ? 'Drive configuration updated successfully.' : 'Drive configuration created successfully.',
      config: {
        id: config.id,
        name: config.name,
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        folderId: config.folderId,
        isDefault: config.isDefault
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles DELETE requests to remove a Drive configuration.
 */
const deleteDriveConfigHandler = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Drive config ID is required.' });
  }

  try {
    await configService.deleteDriveConfig(id);
    res.status(200).json({ message: 'Drive configuration deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles POST requests to set a drive as the default.
 */
const setDefaultDriveHandler = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Drive config ID is required.' });
  }

  try {
    const config = await configService.setDefaultDrive(id);
    res.status(200).json({ 
      message: 'Default drive updated successfully.',
      config: {
        id: config.id,
        name: config.name,
        isDefault: config.isDefault
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles manual sync request.
 * Supports syncing a specific drive or all drives.
 */
const syncDriveHandler = async (req, res, next) => {
  try {
    const driveConfigId = req.params.driveConfigId;
    const result = await syncDatabase(driveConfigId);
    res.status(200).json({
      message: 'Sync completed successfully.',
      syncedCount: result.syncedCount,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDriveConfigsHandler,
  getDriveConfigHandler,
  upsertDriveConfigHandler,
  deleteDriveConfigHandler,
  setDefaultDriveHandler,
  syncDriveHandler
};
