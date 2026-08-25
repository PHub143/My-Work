// Hackers 해커스 신토익 실전 1000제 test manifest.
//
// Second TOEIC book collection alongside YBM (see ../ybm/manifest.js), built
// the same way: each volume is a "1000" book with 10 full TOEIC tests of 200
// questions (Listening 1-100, Reading 101-200). Question content is not
// digitised — the source books are 300dpi scans with no text layer — so a
// test is delivered the way the paper exam is: scanned booklet pages + the
// original audio recording + an answer sheet, scored against the printed key.
//
// This module intentionally duplicates YBM's constants (PARTS, timing, etc.)
// rather than importing them — the two collections are meant to stay fully
// independent, mirroring how YBM's own per-volume data already duplicates
// rather than shares.
//
// Assets (page images + audio) live outside the repo; see utils/hacker.js for
// how a page/audio URL is resolved from the ids below.

export const TESTS_PER_VOLUME = 10;

// Real TOEIC timing. Listening is paced by the recording (~45 min) and
// Reading is a hard 75-minute limit, for 120 minutes total.
export const LISTENING_MINUTES = 45;
export const READING_MINUTES = 75;

export const FIRST_READING_QUESTION = 101;
export const QUESTIONS_PER_SECTION = 100;
export const TOTAL_QUESTIONS = QUESTIONS_PER_SECTION * 2;

// Part 2 prints only three choices; every other part prints four.
export const PART2_RANGE = [7, 31];

export const PARTS = [
  { part: 1, section: 'listening', from: 1, to: 6, label: 'Photographs' },
  { part: 2, section: 'listening', from: 7, to: 31, label: 'Question-Response' },
  { part: 3, section: 'listening', from: 32, to: 70, label: 'Conversations' },
  { part: 4, section: 'listening', from: 71, to: 100, label: 'Talks' },
  { part: 5, section: 'reading', from: 101, to: 130, label: 'Incomplete Sentences' },
  { part: 6, section: 'reading', from: 131, to: 146, label: 'Text Completion' },
  { part: 7, section: 'reading', from: 147, to: 200, label: 'Reading Comprehension' },
];

export function getPartForQuestion(number) {
  return PARTS.find((entry) => number >= entry.from && number <= entry.to) || null;
}

export function getOptionKeys(number) {
  const [from, to] = PART2_RANGE;
  return number >= from && number <= to ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
}

// Per-volume source inventory. `listeningPages`/`readingPages` are the page
// counts of the scanned booklet for one test; null means that booklet does not
// exist in the source material and the section cannot be rendered.
const VOLUMES = [
  {
    id: 'vol-2',
    label: 'Vol 2',
    // Digitised from "해커스 신토익 실전 1000제 2" (source folder "Bộ đề 1
    // (HACKER 2)"). Unlike YBM's combined-PDF books, this book's per-test
    // template is perfectly uniform — confirmed directly against both Test 1
    // and Test 10 in the source scans (every listening booklet is 12 pages,
    // every reading booklet is 28 pages) — but that only tells us the page
    // *count* a future render would produce, not that the images already
    // exist. Tests are digitised one at a time, so `listeningPages`/
    // `readingPages` stay null and only digitised tests get an override,
    // same mechanism as YBM's in-progress volumes — otherwise an undigitised
    // test would show as playable with no booklet behind it.
    listeningPages: null,
    readingPages: null,
    title: '해커스 신토익 실전 1000제 2 (Hackers New TOEIC 1000 Vol. 2)',
    listeningPageOverrides: { 1: 12 },
    readingPageOverrides: { 1: 28 },
  },
];

function padTestNumber(number) {
  return String(number).padStart(2, '0');
}

export function getTestId(volumeId, testNumber) {
  return `${volumeId}-test-${padTestNumber(testNumber)}`;
}

function buildTest(volume, number) {
  const listeningPages = volume.listeningPageOverrides?.[number] ?? volume.listeningPages;
  const readingPages = volume.readingPageOverrides?.[number] ?? volume.readingPages;

  return {
    id: getTestId(volume.id, number),
    volumeId: volume.id,
    number,
    label: `Test ${padTestNumber(number)}`,
    listeningPages,
    readingPages,
    listeningMinutes: LISTENING_MINUTES,
    readingMinutes: READING_MINUTES,
  };
}

export const HACKER_VOLUMES = VOLUMES.map((volume) => ({
  ...volume,
  tests: Array.from({ length: TESTS_PER_VOLUME }, (_, index) => buildTest(volume, index + 1)),
}));

export function getVolume(volumeId) {
  return HACKER_VOLUMES.find((volume) => volume.id === volumeId) || null;
}

export function getTest(volumeId, testNumber) {
  const volume = getVolume(volumeId);
  if (!volume) return null;

  return volume.tests.find((test) => test.number === Number(testNumber)) || null;
}
