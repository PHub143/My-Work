require('dotenv').config();
const fileService = require('../services/fileService');
const googleDriveService = require('../services/googleDriveService');
const configService = require('../services/configService');
const prisma = require('../services/prismaService');

/**
 * Syncs files from Google Drive to the local database.
 * If driveConfigId is provided, syncs only that drive.
 * Otherwise, syncs all configured drives.
 * @param {string} [driveConfigId] - Optional drive config ID.
 * @returns {Promise<{syncedCount: number, deletedCount: number}>}
 */
async function syncDatabase(driveConfigId) {
  if (driveConfigId) {
    return syncSingleDrive(driveConfigId);
  }

  // Sync all drives
  const configs = await configService.getAllDriveConfigs();
  let totalSynced = 0;
  let totalDeleted = 0;

  for (const config of configs) {
    if (!config.hasRefreshToken) {
      console.log(`Skipping drive "${config.name}" (${config.id}) — not authenticated.`);
      continue;
    }

    try {
      const result = await syncSingleDrive(config.id);
      totalSynced += result.syncedCount;
      totalDeleted += result.deletedCount;
    } catch (error) {
      console.error(`Error syncing drive "${config.name}" (${config.id}):`, error.message);
    }
  }

  return { syncedCount: totalSynced, deletedCount: totalDeleted };
}

/**
 * Syncs a single drive configuration.
 * @param {string} driveConfigId - Drive config ID to sync.
 * @returns {Promise<{syncedCount: number, deletedCount: number}>}
 */
async function syncSingleDrive(driveConfigId) {
  console.log(`Starting synchronization for drive config: ${driveConfigId}...`);
  
  try {
    // 1. Fetch all files from the Database for this drive to prevent race condition orphans
    const dbFiles = await fileService.getAllFiles({ driveConfigId });
    console.log(`Found ${dbFiles.length} records in the database for this drive.`);

    // 2. Fetch all files from Google Drive
    const driveFiles = await googleDriveService.listFiles(driveConfigId);
    const driveFileIds = new Set(driveFiles.map(file => file.id));
    
    console.log(`Found ${driveFiles.length} files in Google Drive.`);

    // 3. Identify and delete orphaned database records
    let deletedCount = 0;
    for (const dbFile of dbFiles) {
      if (!driveFileIds.has(dbFile.driveFileId)) {
        try {
          await fileService.deleteFileByDriveId(dbFile.driveFileId);
          console.log(`Deleted orphaned record: ${dbFile.name} (${dbFile.driveFileId})`);
          deletedCount++;
        } catch (delError) {
          console.warn(`Failed to delete orphaned record ${dbFile.driveFileId}:`, delError.message);
        }
      }
    }

    // 4. Upsert all files from Google Drive into the Database
    let syncedCount = 0;
    for (const file of driveFiles) {
      // Ensure the file is public during sync
      try {
        await googleDriveService.makeFilePublic(file.id, driveConfigId);
      } catch (permError) {
        console.warn(`Failed to set public permissions for ${file.name} (${file.id}):`, permError.message);
      }

      await fileService.upsertFile({
        driveFileId: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        thumbnailLink: file.thumbnailLink,
        size: file.size,
        driveConfigId: driveConfigId,
      });
      syncedCount++;
    }

    console.log(`Synchronization completed for drive ${driveConfigId}.`);
    console.log(`Summary: ${syncedCount} files synced, ${deletedCount} orphaned records removed.`);
    
    return { syncedCount, deletedCount };
  } catch (error) {
    console.error(`An error occurred during synchronization for drive ${driveConfigId}:`, error);
    throw error;
  }
}

// Export the function for use in other modules (like server.js)
module.exports = { syncDatabase };

// If the script is run directly, execute syncDatabase and then disconnect
if (require.main === module) {
  syncDatabase().finally(() => prisma.$disconnect());
}
