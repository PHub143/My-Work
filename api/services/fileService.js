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
  getAllFiles: async ({ limit, offset, includeType, excludeType, tag } = {}) => {
    const where = {};
    
    if (includeType) {
      const types = includeType.split(',').map(t => t.trim());
      where.OR = types.map(t => ({
        mimeType: { startsWith: `${t}/` }
      }));
    } else if (excludeType) {
      const types = excludeType.split(',').map(t => t.trim());
      where.NOT = types.map(t => ({
        mimeType: { startsWith: `${t}/` }
      }));
    }

    if (tag) {
      where.tags = {
        some: {
          name: tag
        }
      };
    }

    return prisma.file.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        tags: true
      }
    });
  },

  /**
   * Counts the total number of file records in the database with optional filtering.
   * @param {Object} [options] - Filtering options.
   * @param {string} [options.includeType] - MIME type prefix(es) to include (e.g., 'image' or 'image,video').
   * @param {string} [options.excludeType] - MIME type prefix(es) to exclude (e.g., 'image' or 'image,video').
   * @param {string} [options.tag] - Tag name to filter by.
   * @returns {Promise<number>}
   */
  countFiles: async ({ includeType, excludeType, tag } = {}) => {
    const where = {};
    
    if (includeType) {
      const types = includeType.split(',').map(t => t.trim());
      where.OR = types.map(t => ({
        mimeType: { startsWith: `${t}/` }
      }));
    } else if (excludeType) {
      const types = excludeType.split(',').map(t => t.trim());
      where.NOT = types.map(t => ({
        mimeType: { startsWith: `${t}/` }
      }));
    }

    if (tag) {
      where.tags = {
        some: {
          name: tag
        }
      };
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
      include: {
        tags: true
      }
    });
  },

  /**
   * Creates a new file record in the application database.
   * @param {Object} data - File metadata.
   * @param {Array<string>} [tags] - Array of tag names.
   * @returns {Promise<Object>}
   */
  createFile: async (data, tags = []) => {
    const uniqueTags = [...new Set(tags)];
    const tagData = uniqueTags.map(tag => ({
      where: { name: tag },
      create: { name: tag }
    }));

    return prisma.file.create({
      data: {
        driveFileId: data.driveFileId,
        name: data.name,
        mimeType: data.mimeType,
        webViewLink: data.webViewLink,
        thumbnailLink: data.thumbnailLink,
        size: data.size ? parseInt(data.size) : null,
        tags: {
          connectOrCreate: tagData
        }
      },
      include: {
        tags: true
      }
    });
  },

  /**
   * Retrieves all unique tags from the database with optional file type filtering.
   * @param {Object} [options] - Filtering options.
   * @param {string} [options.includeType] - MIME type prefix to include (e.g., 'image').
   * @param {string} [options.excludeType] - MIME type prefix to exclude (e.g., 'image').
   * @returns {Promise<Array>}
   */
  getAllTags: async ({ includeType, excludeType } = {}) => {
    const where = {};

    if (includeType) {
      const types = includeType.split(',').map(t => t.trim());
      where.files = {
        some: {
          OR: types.map(t => ({
            mimeType: { startsWith: `${t}/` }
          }))
        }
      };
    } else if (excludeType) {
      const types = excludeType.split(',').map(t => t.trim());
      where.files = {
        some: {
          NOT: types.map(t => ({
            mimeType: { startsWith: `${t}/` }
          }))
        }
      };
    }

    return prisma.tag.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });
  },

  /**
   * Updates an existing file record by its Google Drive ID.
   * @param {string} driveFileId - The ID of the file in Google Drive.
   * @param {Object} data - Updated metadata.
   * @param {Array<string>} [tags] - Array of tag names to set.
   * @returns {Promise<Object>}
   */
  updateFile: async (driveFileId, data = {}, tags) => {
    const updateData = {
      name: data.name,
      mimeType: data.mimeType,
      webViewLink: data.webViewLink,
      thumbnailLink: data.thumbnailLink,
      size: data.size ? parseInt(data.size) : null,
    };

    if (tags) {
      const uniqueTags = [...new Set(tags)];
      updateData.tags = {
        set: [], // Disconnect all current tags first
        connectOrCreate: uniqueTags.map(tag => ({
          where: { name: tag },
          create: { name: tag }
        }))
      };
    }

    return prisma.file.update({
      where: {
        driveFileId: driveFileId,
      },
      data: updateData,
      include: {
        tags: true
      }
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
        thumbnailLink: data.thumbnailLink,
        size: data.size ? parseInt(data.size) : null,
      },
      create: {
        driveFileId: data.driveFileId,
        name: data.name,
        mimeType: data.mimeType,
        webViewLink: data.webViewLink,
        thumbnailLink: data.thumbnailLink,
        size: data.size ? parseInt(data.size) : null,
      },
    });
  },
};

module.exports = fileService;
