require('dotenv').config();
const fs = require('fs');
const path = require('path');
const googleDriveService = require('../services/googleDriveService');
const prisma = require('../services/prismaService');

// Counterpart to upload-ybm-assets.js: removes a digitised test's folder
// (and every file in it) from Drive, and deletes the local
// data/ybm-assets/<testId>.json manifest. Used to wipe a bad digitization
// before re-running the pipeline — does not touch allinone/public/ybm/,
// which the caller should clean up separately if needed.

const TEST_ID = process.argv[2];
if (!TEST_ID) {
  console.error('Usage: node scripts/delete-ybm-assets.js <testId>');
  process.exit(1);
}
const MANIFEST_PATH = path.join(__dirname, `../data/ybm-assets/${TEST_ID}.json`);

async function findFolder(drive, name, parentId) {
  const existing = await drive.files.list({
    q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return existing.data.files?.[0]?.id;
}

async function main() {
  const { drive, driveFolderId } = await googleDriveService.getDriveClient();

  const ybmFolderId = await findFolder(drive, 'ybm', driveFolderId);
  const testFolderId = ybmFolderId && (await findFolder(drive, TEST_ID, ybmFolderId));

  if (!testFolderId) {
    console.log(`No ybm/${TEST_ID} folder found in Drive — nothing to delete.`);
  } else {
    const { data } = await drive.files.list({
      q: `'${testFolderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const file of data.files || []) {
      process.stdout.write(`Deleting ${file.name}... `);
      await drive.files.delete({ fileId: file.id, supportsAllDrives: true });
      console.log('done');
    }
    console.log(`Deleting ybm/${TEST_ID} folder...`);
    await drive.files.delete({ fileId: testFolderId, supportsAllDrives: true });
  }

  if (fs.existsSync(MANIFEST_PATH)) {
    fs.unlinkSync(MANIFEST_PATH);
    console.log(`Removed ${MANIFEST_PATH}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
