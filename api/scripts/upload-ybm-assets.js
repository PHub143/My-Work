require('dotenv').config();
const fs = require('fs');
const path = require('path');
const googleDriveService = require('../services/googleDriveService');
const prisma = require('../services/prismaService');

// One-off migration: pushes a local YBM test's booklet images + audio into
// the configured Google Drive (under ybm/<testId>/), makes each file public,
// and writes a { filename: driveFileId } manifest the frontend can read
// instead of shipping the binaries in the repo. See allinone/.gitignore and
// allinone/src/utils/ybm.js for how the manifest is consumed.

const TEST_ID = process.argv[2] || 'vol-2-test-05';
const ASSET_DIR = path.join(__dirname, `../../allinone/public/ybm/${TEST_ID}`);
const MANIFEST_PATH = path.join(__dirname, `../../allinone/src/data/ybm/assets/${TEST_ID}.json`);

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

async function uploadOne(drive, folderId, filePath, name, mimeType) {
  const response = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body: fs.createReadStream(filePath) },
    fields: 'id, name',
    supportsAllDrives: true,
  });

  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return response.data.id;
}

async function main() {
  if (!fs.existsSync(ASSET_DIR)) {
    throw new Error(`No local assets at ${ASSET_DIR}`);
  }

  const { drive, driveFolderId } = await googleDriveService.getDriveClient();

  console.log(`Locating/creating ybm/${TEST_ID} folder in Drive...`);
  const ybmFolderId = await findOrCreateFolder(drive, 'ybm', driveFolderId);
  const testFolderId = await findOrCreateFolder(drive, TEST_ID, ybmFolderId);

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
