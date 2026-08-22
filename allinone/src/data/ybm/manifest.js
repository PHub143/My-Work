// YBM 실전토익 1000 test manifest.
//
// Each volume is a "1000" book: 10 full TOEIC tests of 200 questions
// (Listening 1-100, Reading 101-200). Question content is not digitised —
// the source books are 300dpi scans with no text layer — so a test is
// delivered the way the paper exam is: scanned booklet pages + the original
// audio recording + an answer sheet, scored against the printed key.
//
// Assets (page images + audio) live outside the repo; see utils/ybm.js for
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
    id: 'vol-1',
    label: 'Vol 1',
    title: 'YBM 실전토익 1000 Vol. 1',
    listeningPages: 14,
    readingPages: 30,
    // Test 10's reading booklet runs four pages longer than the others.
    readingPageOverrides: { 10: 34 },
  },
  {
    id: 'vol-2',
    label: 'Vol 2',
    title: 'YBM 실전토익 1000 Vol. 2',
    listeningPages: null,
    readingPages: null,
    // Tests are being digitised one at a time; only mapped tests get a page
    // count here, so the rest stay unavailable until their booklets exist.
    listeningPageOverrides: { 1: 12, 2: 12, 3: 12, 4: 12, 5: 12, 6: 12, 7: 12, 8: 12, 9: 12, 10: 12 },
    // Content length genuinely varies test to test (e.g. test 2's reading
    // section runs 2 pages shorter than tests 1 and 5) — verified per test
    // against the source PDF, not assumed uniform.
    readingPageOverrides: { 1: 30, 2: 28, 3: 30, 4: 28, 5: 30, 6: 30, 7: 28, 8: 28, 9: 30, 10: 30 },
  },
  {
    id: 'vol-3',
    label: 'Vol 3',
    title: 'YBM 실전토익 1000 Vol. 3',
    // Vol 3 ships no listening booklet, only the recordings and the key.
    listeningPages: null,
    readingPages: null,
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

export const YBM_VOLUMES = VOLUMES.map((volume) => ({
  ...volume,
  tests: Array.from({ length: TESTS_PER_VOLUME }, (_, index) => buildTest(volume, index + 1)),
}));

export function getVolume(volumeId) {
  return YBM_VOLUMES.find((volume) => volume.id === volumeId) || null;
}

export function getTest(volumeId, testNumber) {
  const volume = getVolume(volumeId);
  if (!volume) return null;

  return volume.tests.find((test) => test.number === Number(testNumber)) || null;
}
