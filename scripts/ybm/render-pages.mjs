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
// PDF per test. `pageRanges` volumes share one combined PDF per section across
// all 10 tests; each test's [firstPage, lastPage] (1-indexed, inclusive) has to
// be located by hand in the combined scan (cover + content, up to the page
// before the next test's cover/divider) and added here before it can render.
const VOLUME_SOURCES = {
  1: {
    perTest: true,
    listening: (n) => `${SOURCE}/Vol 1/2025 edition/YBM TOEIC Vol.1 2025/LC/TEST ${n}.pdf`,
    reading: (n) => `${SOURCE}/Vol 1/2025 edition/YBM TOEIC Vol.1 2025/RC/TEST ${n}.pdf`,
    audio: (n) => `${SOURCE}/Vol 1/Audio/YBM - Test ${n}.mp3`,
  },
  2: {
    perTest: false,
    listeningSource: `${SOURCE}/Vol 2/YBM TOEIC 2/lc 1000 - 2.pdf`,
    readingSource: `${SOURCE}/Vol 2/YBM TOEIC 2/rc 1000 - 2.pdf`,
    // Content-only ranges (cover/divider pages excluded), located by hand.
    pageRanges: {
      1: { listening: [19, 30], reading: [19, 48] },
      2: { listening: [33, 44], reading: [51, 78] },
      3: { listening: [47, 58], reading: [81, 110] },
      5: { listening: [75, 86], reading: [143, 172] },
    },
    audio: (n) => `${SOURCE}/Vol 2/YBM TOEIC 2/file nghe/Test ${String(n).padStart(2, '0')}.mp3`,
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

// pdftoppm names output <prefix>-<n>.jpg with a variable-width counter, using
// the source PDF's absolute page number. Normalise to a fixed two-digit page
// number the frontend can predict, relative to `offset` (the page before the
// range's first page, 0 when rendering a whole per-test PDF from page 1).
async function normaliseNames(dir, prefix, offset) {
  const files = (await readdir(dir)).filter((f) => f.startsWith(`${prefix}-`) && f.endsWith('.jpg'));

  for (const file of files) {
    const match = file.match(/-(\d+)\.jpg$/);
    if (!match) continue;
    const relative = Number(match[1]) - offset;
    const target = `${prefix}-p${String(relative).padStart(2, '0')}.jpg`;
    if (file !== target) await rename(join(dir, file), join(dir, target));
  }

  return files.length;
}

// `range`, when given, is a [firstPage, lastPage] 1-indexed inclusive slice of
// a combined multi-test PDF; omitted for a PDF that is already one test.
async function renderSection(pdfPath, outDir, prefix, dpi, range) {
  if (!existsSync(pdfPath)) {
    console.warn(`  ! missing source: ${pdfPath}`);
    return 0;
  }

  const pdftoppmArgs = ['-jpeg', '-r', String(dpi)];
  if (range) pdftoppmArgs.push('-f', String(range[0]), '-l', String(range[1]));
  pdftoppmArgs.push(pdfPath, join(outDir, prefix));

  await run('pdftoppm', pdftoppmArgs);
  const count = await normaliseNames(outDir, prefix, range ? range[0] - 1 : 0);
  console.log(`  ${prefix}: ${count} pages`);
  return count;
}

async function renderTest(vol, test, args) {
  const source = VOLUME_SOURCES[vol];
  if (!source) throw new Error(`Unknown volume ${vol}`);

  const id = testId(vol, test);
  const outDir = join(args.out, id);

  if (source.perTest) {
    await mkdir(outDir, { recursive: true });
    console.log(`${id}:`);
    await renderSection(source.listening(test), outDir, 'lc', args.dpi);
    await renderSection(source.reading(test), outDir, 'rc', args.dpi);
  } else if (source.pageRanges?.[test]) {
    const range = source.pageRanges[test];
    await mkdir(outDir, { recursive: true });
    console.log(`${id}:`);
    await renderSection(source.listeningSource, outDir, 'lc', args.dpi, range.listening);
    await renderSection(source.readingSource, outDir, 'rc', args.dpi, range.reading);
  } else {
    console.warn(`Vol ${vol} test ${test} has no page mapping yet — skipping.`);
    return;
  }

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
