const fileService = require('../services/fileService');
const googleDriveService = require('../services/googleDriveService');
const prisma = require('../services/prismaService');

async function syncDatabase() {
  console.log('Starting full synchronization from Google Drive...');
  
  try {
    const driveFiles = await googleDriveService.listFiles();
    
    if (!driveFiles || driveFiles.length === 0) {
      console.log('No files found in the configured Google Drive folder.');
      return;
    }

    console.log(`Found ${driveFiles.length} files in Google Drive. Syncing...`);

    for (const file of driveFiles) {
      await fileService.upsertFile({
        driveFileId: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        size: file.size,
      });
      console.log(`Synced: ${file.name}`);
    }

    console.log('Full synchronization completed successfully.');
  } catch (error) {
    console.error('An error occurred during synchronization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncDatabase();
