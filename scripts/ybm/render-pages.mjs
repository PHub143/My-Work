#!/usr/bin/env node
// Render YBM scanned booklet pages into web-sized JPEGs, one folder per test.
//
// The source books are 300dpi scans with no text layer, so a test is delivered
// as page images plus the original recording. This script only rasterises —
// it never modifies anything under the source directory.
//
// Usage:
//   node scripts/ybm/render-pages.mjs --vol 1 --test 1 [--out <dir>] [--dpi 150]
//   node scripts/ybm/render-pages.mjs --vol 1 --all

import { execFile } from 'node:child_process';
import { mkdir, readdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = '/Volumes/Samsung_T5/Download/YBM';
const DEFAULT_OUT = join(ROOT, 'allinone/public/ybm');

// Where each volume's per-test booklets come from. `perTest` volumes have one
// PDF per test; the others need page ranges that have not been mapped yet.
const VOLUME_SOURCES = {
  1: {
    perTest: true,
    listening: (n) => `${SOURCE}/Vol 1/2025 edition/YBM TOEIC Vol.1 2025/LC/TEST ${n}.pdf`,
    reading: (n) => `${SOURCE}/Vol 1/2025 edition/YBM TOEIC Vol.1 2025/RC/TEST ${n}.pdf`,
    audio: (n) => `${SOURCE}/Vol 1/Audio/YBM - Test ${n}.mp3`,
  },
  2: {
    perTest: false,
    audio: (n) => `${SOURCE}/Vol 2/Test ${String(n).padStart(2, '0')}.mp3`,
  },
  3: {
    perTest: false,
    audio: (n) => `${SOURCE}/Vol 3/Audio/Test ${String(n).padStart(2, '0')}.mp3`,
  },
};

function parseArgs(argv) {
  const args = { dpi: 150, out: DEFAULT_OUT };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--all') args.all = true;
    else if (flag === '--vol') args.vol = Number(argv[++i]);
    else if (flag === '--test') args.test = Number(argv[++i]);
    else if (flag === '--dpi') args.dpi = Number(argv[++i]);
    else if (flag === '--out') args.out = argv[++i];
  }
  return args;
}

function testId(vol, test) {
  return `vol-${vol}-test-${String(test).padStart(2, '0')}`;
}

// pdftoppm names output <prefix>-<n>.jpg with a variable-width counter;
// normalise to a fixed two-digit page number the frontend can predict.
async function normaliseNames(dir, prefix) {
  const files = (await readdir(dir)).filter((f) => f.startsWith(`${prefix}-`) && f.endsWith('.jpg'));

  for (const file of files) {
    const match = file.match(/-(\d+)\.jpg$/);
    if (!match) continue;
    const target = `${prefix}-p${String(Number(match[1])).padStart(2, '0')}.jpg`;
    if (file !== target) await rename(join(dir, file), join(dir, target));
  }

  return files.length;
}

async function renderSection(pdfPath, outDir, prefix, dpi) {
  if (!existsSync(pdfPath)) {
    console.warn(`  ! missing source: ${pdfPath}`);
    return 0;
  }

  await run('pdftoppm', ['-jpeg', '-r', String(dpi), pdfPath, join(outDir, prefix)]);
  const count = await normaliseNames(outDir, prefix);
  console.log(`  ${prefix}: ${count} pages`);
  return count;
}

async function renderTest(vol, test, args) {
  const source = VOLUME_SOURCES[vol];
  if (!source) throw new Error(`Unknown volume ${vol}`);

  if (!source.perTest) {
    console.warn(`Vol ${vol} has no per-test booklet mapping yet — skipping test ${test}.`);
    return;
  }

  const id = testId(vol, test);
  const outDir = join(args.out, id);
  await mkdir(outDir, { recursive: true });

  console.log(`${id}:`);
  await renderSection(source.listening(test), outDir, 'lc', args.dpi);
  await renderSection(source.reading(test), outDir, 'rc', args.dpi);

  const audio = source.audio(test);
  console.log(existsSync(audio) ? `  audio ready: ${audio}` : `  ! missing audio: ${audio}`);
}

const args = parseArgs(process.argv);

if (!args.vol) {
  console.error('Usage: node scripts/ybm/render-pages.mjs --vol <1|2|3> [--test <n> | --all]');
  process.exit(1);
}

const tests = args.all ? Array.from({ length: 10 }, (_, i) => i + 1) : [args.test || 1];
for (const test of tests) {
  await renderTest(args.vol, test, args);
}
