require('dotenv').config();
const fileService = require('../services/fileService');
const googleDriveService = require('../services/googleDriveService');
const prisma = require('../services/prismaService');

async function syncDatabase() {
  console.log('Starting full synchronization from Google Drive...');
  
  try {
    // 1. Fetch all files from the Database first to prevent race condition orphans
    const dbFiles = await fileService.getAllFiles();
    console.log(`Found ${dbFiles.length} records in the database.`);

    // 2. Fetch all files from Google Drive
    const driveFiles = await googleDriveService.listFiles();
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
      await fileService.upsertFile({
        driveFileId: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        thumbnailLink: file.thumbnailLink,
        size: file.size,
      });
      syncedCount++;
    }

    console.log('Full synchronization completed successfully.');
    console.log(`Summary: ${syncedCount} files synced, ${deletedCount} orphaned records removed.`);
  } catch (error) {
    console.error('An error occurred during synchronization:', error);
  }
}

// Export the function for use in other modules (like server.js)
module.exports = { syncDatabase };

// If the script is run directly, execute syncDatabase and then disconnect
if (require.main === module) {
  syncDatabase().finally(() => prisma.$disconnect());
}
