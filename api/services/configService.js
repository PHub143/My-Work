const prisma = require('./prismaService');
const { encrypt, decrypt } = require('../utils/encryption');

const configService = {
  /**
   * Retrieves a specific Google Drive configuration by ID.
   * Falls back to the default drive if no ID is provided.
   * Decrypts the sensitive fields before returning.
   * @param {string} [id] - Optional drive config ID.
   * @returns {Promise<Object|null>}
   */
  getDriveConfig: async (id) => {
    let config;

    if (id) {
      config = await prisma.driveConfig.findUnique({
        where: { id }
      });
    } else {
      // Fall back to default drive
      config = await prisma.driveConfig.findFirst({
        where: { isDefault: true }
      });
      // If no default is set, pick the first one
      if (!config) {
        config = await prisma.driveConfig.findFirst({
          orderBy: { createdAt: 'asc' }
        });
      }
    }

    if (config) {
      return {
        ...config,
        clientSecret: decrypt(config.clientSecret),
        refreshToken: config.refreshToken ? decrypt(config.refreshToken) : null
      };
    }
    return null;
  },

  /**
   * Retrieves all Google Drive configurations.
   * Returns safe data only (no decrypted secrets).
   * @returns {Promise<Array>}
   */
  getAllDriveConfigs: async () => {
    const configs = await prisma.driveConfig.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { files: true }
        }
      }
    });

    return configs.map(config => ({
      id: config.id,
      name: config.name,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      folderId: config.folderId,
      isDefault: config.isDefault,
      hasClientSecret: !!config.clientSecret,
      hasRefreshToken: !!config.refreshToken,
      fileCount: config._count.files,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    }));
  },

  /**
   * Updates or creates a Google Drive configuration.
   * Encrypts the sensitive fields before saving.
   * @param {Object} data - Configuration data to save.
   * @returns {Promise<Object>}
   */
  upsertDriveConfig: async (data) => {
    const updateData = {
      name: data.name || 'Default Drive',
      clientId: data.clientId,
      clientSecret: encrypt(data.clientSecret),
      redirectUri: data.redirectUri,
      folderId: data.folderId
    };

    if (data.refreshToken) {
      updateData.refreshToken = encrypt(data.refreshToken);
    }

    if (data.isDefault !== undefined) {
      updateData.isDefault = data.isDefault;
    }

    // If updating an existing config
    if (data.id) {
      // If setting as default, unset all others first
      if (data.isDefault) {
        await prisma.driveConfig.updateMany({
          where: { id: { not: data.id } },
          data: { isDefault: false }
        });
      }

      return prisma.driveConfig.update({
        where: { id: data.id },
        data: updateData
      });
    }

    // Creating a new config
    // If this is the first config or marked as default, ensure it's default
    const existingCount = await prisma.driveConfig.count();
    if (existingCount === 0) {
      updateData.isDefault = true;
    } else if (data.isDefault) {
      await prisma.driveConfig.updateMany({
        data: { isDefault: false }
      });
    }

    return prisma.driveConfig.create({
      data: updateData
    });
  },

  /**
   * Deletes a Google Drive configuration.
   * Blocks deletion if files are associated with this config.
   * @param {string} id - Drive config ID.
   * @returns {Promise<Object>}
   */
  deleteDriveConfig: async (id) => {
    // Check if files exist for this drive
    const fileCount = await prisma.file.count({
      where: { driveConfigId: id }
    });

    if (fileCount > 0) {
      const error = new Error(`Cannot delete drive config: ${fileCount} files are still associated. Please sync and remove files first.`);
      error.status = 409;
      throw error;
    }

    const deleted = await prisma.driveConfig.delete({
      where: { id }
    });

    // If we deleted the default, promote another config
    if (deleted.isDefault) {
      const next = await prisma.driveConfig.findFirst({
        orderBy: { createdAt: 'asc' }
      });
      if (next) {
        await prisma.driveConfig.update({
          where: { id: next.id },
          data: { isDefault: true }
        });
      }
    }

    return deleted;
  },

  /**
   * Sets a drive config as the default.
   * Unsets all others.
   * @param {string} id - Drive config ID to set as default.
   * @returns {Promise<Object>}
   */
  setDefaultDrive: async (id) => {
    // Unset all defaults
    await prisma.driveConfig.updateMany({
      data: { isDefault: false }
    });

    // Set the specified one as default
    return prisma.driveConfig.update({
      where: { id },
      data: { isDefault: true }
    });
  }
};

module.exports = configService;
