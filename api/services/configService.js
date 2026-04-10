const prisma = require('./prismaService');
const { encrypt, decrypt } = require('../utils/encryption');

const configService = {
  /**
   * Retrieves the current Google Drive configuration.
   * Decrypts the sensitive fields before returning.
   * @returns {Promise<Object|null>}
   */
  getDriveConfig: async () => {
    const config = await prisma.driveConfig.findUnique({
      where: { id: 'singleton' }
    });

    if (config) {
      return {
        ...config,
        clientSecret: decrypt(config.clientSecret),
        refreshToken: decrypt(config.refreshToken)
      };
    }
    return null;
  },

  /**
   * Updates or creates the Google Drive configuration.
   * Encrypts the sensitive fields before saving.
   * @param {Object} data - Configuration data to save.
   * @returns {Promise<Object>}
   */
  upsertDriveConfig: async (data) => {
    const updateData = {
      clientId: data.clientId,
      clientSecret: encrypt(data.clientSecret),
      redirectUri: data.redirectUri,
      folderId: data.folderId
    };

    if (data.refreshToken) {
      updateData.refreshToken = encrypt(data.refreshToken);
    }

    return prisma.driveConfig.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: {
        id: 'singleton',
        ...updateData
      }
    });
  }
};

module.exports = configService;
