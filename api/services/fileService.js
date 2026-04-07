const prisma = require('./prismaService');

/**
 * File Service for database CRUD operations.
 */
const fileService = {
  /**
   * Retrieves file records from the application database with optional filtering.
   * @param {Object} [options] - Pagination and filtering options.
   * @param {number} [options.limit] - Number of records to return.
   * @param {number} [options.offset] - Number of records to skip.
   * @param {string} [options.includeType] - MIME type prefix to include (e.g., 'image').
   * @param {string} [options.excludeType] - MIME type prefix to exclude (e.g., 'image').
   * @returns {Promise<Array>}
   */
  getAllFiles: async ({ limit, offset, includeType, excludeType } = {}) => {
    const where = {};
    
    if (includeType) {
      where.mimeType = { startsWith: `${includeType}/` };
    } else if (excludeType) {
      where.NOT = { mimeType: { startsWith: `${excludeType}/` } };
    }

    return prisma.file.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Counts the total number of file records in the database with optional filtering.
   * @param {Object} [options] - Filtering options.
   * @param {string} [options.includeType] - MIME type prefix to include (e.g., 'image').
   * @param {string} [options.excludeType] - MIME type prefix to exclude (e.g., 'image').
   * @returns {Promise<number>}
   */
  countFiles: async ({ includeType, excludeType } = {}) => {
    const where = {};
    
    if (includeType) {
      where.mimeType = { startsWith: `${includeType}/` };
    } else if (excludeType) {
      where.NOT = { mimeType: { startsWith: `${excludeType}/` } };
    }

    return prisma.file.count({ where });
  },

  /**
   * Finds a file record by its Google Drive ID.
   * @param {string} driveFileId - The ID of the file in Google Drive.
   * @returns {Promise<Object|null>}
   */
  findFileByDriveId: async (driveFileId) => {
    return prisma.file.findUnique({
      where: {
        driveFileId: driveFileId,
      },
    });
  },

  /**
   * Creates a new file record in the application database.
   * @param {Object} data - File metadata.
   * @returns {Promise<Object>}
   */
  createFile: async (data) => {
    return prisma.file.create({
      data: {
        driveFileId: data.driveFileId,
        name: data.name,
        mimeType: data.mimeType,
        webViewLink: data.webViewLink,
        size: data.size ? parseInt(data.size) : null,
      },
    });
  },

  /**
   * Updates an existing file record by its Google Drive ID.
   * @param {string} driveFileId - The ID of the file in Google Drive.
   * @param {Object} data - Updated metadata.
   * @returns {Promise<Object>}
   */
  updateFile: async (driveFileId, data) => {
    return prisma.file.update({
      where: {
        driveFileId: driveFileId,
      },
      data: {
        name: data.name,
        mimeType: data.mimeType,
        webViewLink: data.webViewLink,
        size: data.size ? parseInt(data.size) : null,
      },
    });
  },

  /**
   * Deletes a file record from the application database by its Google Drive ID.
   * @param {string} driveFileId - The ID of the file in Google Drive.
   * @returns {Promise<Object>}
   */
  deleteFileByDriveId: async (driveFileId) => {
    return prisma.file.delete({
      where: {
        driveFileId: driveFileId,
      },
    });
  },

  /**
   * Upserts a file record in the application database.
   * Useful for synchronization logic.
   * @param {Object} data - File metadata.
   * @returns {Promise<Object>}
   */
  upsertFile: async (data) => {
    return prisma.file.upsert({
      where: {
        driveFileId: data.driveFileId,
      },
      update: {
        name: data.name,
        mimeType: data.mimeType,
        webViewLink: data.webViewLink,
        size: data.size ? parseInt(data.size) : null,
      },
      create: {
        driveFileId: data.driveFileId,
        name: data.name,
        mimeType: data.mimeType,
        webViewLink: data.webViewLink,
        size: data.size ? parseInt(data.size) : null,
      },
    });
  },
};

module.exports = fileService;
