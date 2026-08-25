#!/usr/bin/env node
// Render Hacker scanned booklet pages into web-sized JPEGs, one folder per
// test. Mirrors scripts/ybm/render-pages.mjs for the second TOEIC book
// collection — see that file's header comment for the shared rationale.
//
// Usage:
//   node scripts/hacker/render-pages.mjs --vol 2 --test 1 [--out <dir>] [--dpi 150]
//   node scripts/hacker/render-pages.mjs --vol 2 --all

import { execFile } from 'node:child_process';
import { mkdir, readdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = '/Volumes/Samsung_T5/Download/Hacker';
const DEFAULT_OUT = join(ROOT, 'allinone/public/hacker');

// Where each volume's per-test booklets come from. Unlike YBM's combined
// PDFs, this book's per-test template turned out to be perfectly uniform —
// confirmed directly against both Test 1 and Test 10 in the source scans,
// not assumed from one anchor: every listening test block is 14 PDF pages
// (1 cover + 12 content + 1 self-check divider) and every reading test block
// is 30 PDF pages (1 cover + 28 content + 1 divider). The ranges below are
// that formula applied to all 10 tests, content-only (cover/divider excluded).
const VOLUME_SOURCES = {
  2: {
    perTest: false,
    listeningSource: `${SOURCE}/Bộ đề 1 (HACKER 2)/HACKER 2 LISTENING.pdf`,
    readingSource: `${SOURCE}/Bộ đề 1 (HACKER 2)/HACKER 2 READING.pdf`,
    pageRanges: {
      1: { listening: [2, 13], reading: [2, 29] },
      2: { listening: [16, 27], reading: [32, 59] },
      3: { listening: [30, 41], reading: [62, 89] },
      4: { listening: [44, 55], reading: [92, 119] },
      5: { listening: [58, 69], reading: [122, 149] },
      6: { listening: [72, 83], reading: [152, 179] },
      7: { listening: [86, 97], reading: [182, 209] },
      8: { listening: [100, 111], reading: [212, 239] },
      9: { listening: [114, 125], reading: [242, 269] },
      10: { listening: [128, 139], reading: [272, 299] },
    },
    // Per-test recordings are already split. Every file is `TEST <n>.mp3`
    // except test 8, which ships lower-cased as `Test 8.mp3` — confirmed
    // directly against the source folder listing, not assumed.
    audio: (n) => (
      n === 8
        ? `${SOURCE}/Bộ đề 1 (HACKER 2)/AUDIO HACKER/Test 8.mp3`
        : `${SOURCE}/Bộ đề 1 (HACKER 2)/AUDIO HACKER/TEST ${n}.mp3`
    ),
  },
  // Vol 3 boundaries were hunted page-by-page against the scans (cover pages
  // found via per-page brightness — TEST NN covers render as solid dark
  // pages, ~29pt content pages don't), confirmed at both ends of every range
  // by the printed instructions/"end of test" text. Two gaps are real holes
  // in the source scan, not extraction bugs: Test 4's Part 1 photos for
  // questions 1-2 are simply absent from HAKER 3 LISTENING.pdf (content
  // jumps straight from the Test 4 cover to question 3), and Test 5 has no
  // cover page in the scan at all (its content follows Test 4's directly) —
  // confirmed by the printed footer page numbers skipping accordingly in
  // both cases. Test 5's questions 1-100 and every other test are otherwise
  // complete.
  3: {
    perTest: false,
    listeningSource: `${SOURCE}/Bộ đề 2 (HACKER 3)/LC/HAKER 3 LISTENING.pdf`,
    readingSource: `${SOURCE}/Bộ đề 2 (HACKER 3)/RC/HACKER 3 READING_.pdf`,
    pageRanges: {
      1: { listening: [2, 13], reading: [2, 29] },
      2: { listening: [15, 26], reading: [31, 58] },
      3: { listening: [28, 39], reading: [60, 87] },
      // Content-only: 8 pages, not the usual 12 — see note above.
      4: { listening: [41, 48], reading: [89, 116] },
      5: { listening: [49, 60], reading: [118, 145] },
      6: { listening: [62, 73], reading: [147, 174] },
      7: { listening: [75, 86], reading: [176, 203] },
      8: { listening: [88, 99], reading: [205, 232] },
      9: { listening: [101, 112], reading: [234, 261] },
      10: { listening: [114, 125], reading: [263, 290] },
    },
    // Per-test recordings are already split, uniformly named `TEST <n>.mp3`
    // — confirmed directly against the source folder listing, no casing
    // quirks like vol 2's test 8.
    audio: (n) => `${SOURCE}/Bộ đề 2 (HACKER 3)/LC/AUDIO/TEST ${n}.mp3`,
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

  const pdftoppmArgs = ['-jpeg', '-cropbox', '-r', String(dpi)];
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
  console.error('Usage: node scripts/hacker/render-pages.mjs --vol <2> [--test <n> | --all]');
  process.exit(1);
}

const tests = args.all ? Array.from({ length: 10 }, (_, i) => i + 1) : [args.test || 1];
for (const test of tests) {
  await renderTest(args.vol, test, args);
}
