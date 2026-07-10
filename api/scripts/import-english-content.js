require('dotenv').config();

const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { existsSync, mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const prisma = require('../services/prismaService');

function getArgValue(args, name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function hasArg(args, name) {
  return args.includes(name);
}

function loadSnapshot(args) {
  const scriptDir = __dirname;
  const repoRoot = resolve(scriptDir, '../..');
  const frontendRoot = join(repoRoot, 'allinone');
  const validatorPath = join(frontendRoot, 'scripts/validate-english-content.mjs');
  const snapshotPath = getArgValue(args, '--snapshot');

  if (snapshotPath) {
    const resolvedSnapshotPath = resolve(process.cwd(), snapshotPath);
    if (!existsSync(resolvedSnapshotPath)) {
      const error = new Error(`Snapshot file not found: ${resolvedSnapshotPath}`);
      error.status = 400;
      throw error;
    }

    return {
      snapshot: JSON.parse(readFileSync(resolvedSnapshotPath, 'utf8')),
      snapshotPath: resolvedSnapshotPath,
      generated: false,
    };
  }

  if (!existsSync(validatorPath)) {
    throw new Error(`Frontend validator not found: ${validatorPath}`);
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'english-content-'));
  const generatedSnapshotPath = join(tempDir, 'snapshot.json');

  try {
    execFileSync(process.execPath, [validatorPath, '--export', generatedSnapshotPath], {
      cwd: frontendRoot,
      stdio: 'inherit',
    });

    return {
      snapshot: JSON.parse(readFileSync(generatedSnapshotPath, 'utf8')),
      snapshotPath: generatedSnapshotPath,
      generated: true,
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function getChecksum(snapshot) {
  const stableSnapshot = {
    schemaVersion: snapshot.schemaVersion,
    source: snapshot.source,
    summary: snapshot.summary,
    reading: snapshot.reading,
    listening: snapshot.listening,
    vocab: snapshot.vocab,
  };

  return createHash('sha256')
    .update(JSON.stringify(stableSnapshot))
    .digest('hex');
}

function validateSnapshot(snapshot) {
  const requiredFields = ['schemaVersion', 'source', 'summary', 'reading', 'listening', 'vocab'];
  const missing = requiredFields.filter((field) => !Object.hasOwn(snapshot || {}, field));

  if (missing.length > 0) {
    const error = new Error(`Snapshot is missing required field(s): ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

async function importSnapshot({ snapshot, checksum, kind, status }) {
  return prisma.contentSnapshot.upsert({
    where: {
      kind_checksum: {
        kind,
        checksum,
      },
    },
    update: {
      status,
      version: snapshot.schemaVersion,
      source: snapshot.source,
      summary: snapshot.summary,
      payload: snapshot,
    },
    create: {
      kind,
      status,
      version: snapshot.schemaVersion,
      checksum,
      source: snapshot.source,
      summary: snapshot.summary,
      payload: snapshot,
    },
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = hasArg(args, '--dry-run');
  const kind = getArgValue(args, '--kind', 'english');
  const status = getArgValue(args, '--status', 'published');
  const loaded = loadSnapshot(args);

  try {
    validateSnapshot(loaded.snapshot);
    const checksum = getChecksum(loaded.snapshot);

    console.log('English content snapshot ready.');
    console.log(JSON.stringify({
      kind,
      status,
      checksum,
      summary: loaded.snapshot.summary,
      source: loaded.generated ? 'generated-from-json' : loaded.snapshotPath,
    }, null, 2));

    if (dryRun) {
      console.log('Dry run only; database was not changed.');
      return;
    }

    const result = await importSnapshot({
      snapshot: loaded.snapshot,
      checksum,
      kind,
      status,
    });

    console.log(`Imported content snapshot ${result.id}.`);
  } finally {
    if (loaded.cleanup) loaded.cleanup();
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = {
  getChecksum,
  importSnapshot,
  loadSnapshot,
  validateSnapshot,
};
