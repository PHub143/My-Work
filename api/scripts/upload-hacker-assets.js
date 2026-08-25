require('dotenv').config();
const fs = require('fs');
const path = require('path');
const googleDriveService = require('../services/googleDriveService');
const prisma = require('../services/prismaService');

// One-off migration: pushes a local Hacker test's booklet images + audio into
// the configured Google Drive (under hacker/<testId>/) and writes a
// { filename: driveFileId } manifest to data/hacker-assets/<testId>.json.
// GET /hacker/:testId/:filename (routes/hackerAssetRoutes.js) reads that
// manifest and streams the matching Drive file — the frontend never sees
// Drive file IDs or talks to Drive directly (see allinone/src/utils/hacker.js
// ASSET_BASE). Files are NOT made public here: the API streams them itself,
// so a Drive "anyone with the link" grant is unnecessary attack surface.
// Mirrors scripts/upload-ybm-assets.js for the Hacker collection.

const TEST_ID = process.argv[2] || 'vol-2-test-01';
const ASSET_DIR = path.join(__dirname, `../../allinone/public/hacker/${TEST_ID}`);
const MANIFEST_PATH = path.join(__dirname, `../data/hacker-assets/${TEST_ID}.json`);

async function findOrCreateFolder(drive, name, parentId) {
  const existing = await drive.files.list({
    q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (existing.data.files?.length) return existing.data.files[0].id;

  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
    supportsAllDrives: true,
  });
  return created.data.id;
}

async function findExistingFile(drive, name, folderId) {
  const existing = await drive.files.list({
    q: `name = '${name}' and '${folderId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return existing.data.files?.[0]?.id;
}

async function uploadOne(drive, folderId, filePath, name, mimeType) {
  const existingId = await findExistingFile(drive, name, folderId);
  if (existingId) return existingId;

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await drive.files.create({
        requestBody: { name, parents: [folderId] },
        media: { mimeType, body: fs.createReadStream(filePath) },
        fields: 'id, name',
        supportsAllDrives: true,
      });
      return response.data.id;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      const delayMs = 2000 * attempt;
      console.log(`\n  retrying ${name} after transient error (attempt ${attempt}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return undefined;
}

async function main() {
  if (!fs.existsSync(ASSET_DIR)) {
    throw new Error(`No local assets at ${ASSET_DIR}`);
  }

  const { drive, driveFolderId } = await googleDriveService.getDriveClient();

  console.log(`Locating/creating hacker/${TEST_ID} folder in Drive...`);
  const hackerFolderId = await findOrCreateFolder(drive, 'hacker', driveFolderId);
  const testFolderId = await findOrCreateFolder(drive, TEST_ID, hackerFolderId);

  const filenames = fs.readdirSync(ASSET_DIR).sort();
  const manifest = { testId: TEST_ID, files: {} };

  for (const filename of filenames) {
    const filePath = path.join(ASSET_DIR, filename);
    const mimeType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'image/jpeg';
    process.stdout.write(`Uploading ${filename}... `);
    const fileId = await uploadOne(drive, testFolderId, filePath, filename, mimeType);
    manifest.files[filename] = fileId;
    console.log(fileId);
  }

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nManifest written to ${MANIFEST_PATH}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
