import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIRST_READING_QUESTION,
  PARTS,
  QUESTIONS_PER_SECTION,
  TOTAL_QUESTIONS,
  YBM_VOLUMES,
  getOptionKeys,
  getPartForQuestion,
  getTest,
  getTestId,
} from '../data/ybm/manifest.js';
import { getScaledSectionScore, getFullTestScore } from './toeicScore.js';

const KEY_DIR = fileURLToPath(new URL('../data/ybm/keys/', import.meta.url));

// --- manifest ---

test('every volume exposes ten tests with stable ids', () => {
  assert.equal(YBM_VOLUMES.length, 3);

  YBM_VOLUMES.forEach((volume) => {
    assert.equal(volume.tests.length, 10);
    volume.tests.forEach((entry, index) => {
      assert.equal(entry.number, index + 1);
      assert.equal(entry.id, getTestId(volume.id, index + 1));
    });
  });
});

test('test ids are zero padded so asset paths sort correctly', () => {
  assert.equal(getTestId('vol-1', 1), 'vol-1-test-01');
  assert.equal(getTestId('vol-3', 10), 'vol-3-test-10');
});

test('getTest resolves by string route params', () => {
  const found = getTest('vol-1', '3');
  assert.equal(found.id, 'vol-1-test-03');
  assert.equal(getTest('vol-9', '1'), null);
});

test('vol 1 test 10 keeps its longer reading booklet', () => {
  assert.equal(getTest('vol-1', 1).readingPages, 30);
  assert.equal(getTest('vol-1', 10).readingPages, 34);
});

// --- part layout ---

test('parts tile the full 200 question range without gaps', () => {
  const covered = [];
  PARTS.forEach((part) => {
    for (let n = part.from; n <= part.to; n += 1) covered.push(n);
  });

  assert.equal(covered.length, TOTAL_QUESTIONS);
  assert.equal(covered[0], 1);
  assert.equal(covered[covered.length - 1], TOTAL_QUESTIONS);
  assert.equal(new Set(covered).size, TOTAL_QUESTIONS);
});

test('listening is 1-100 and reading starts at 101', () => {
  const listening = PARTS.filter((p) => p.section === 'listening');
  const reading = PARTS.filter((p) => p.section === 'reading');

  assert.equal(listening.at(-1).to, QUESTIONS_PER_SECTION);
  assert.equal(reading[0].from, FIRST_READING_QUESTION);
});

test('only part 2 offers three choices', () => {
  assert.deepEqual(getOptionKeys(7), ['A', 'B', 'C']);
  assert.deepEqual(getOptionKeys(31), ['A', 'B', 'C']);
  assert.deepEqual(getOptionKeys(6), ['A', 'B', 'C', 'D']);
  assert.deepEqual(getOptionKeys(32), ['A', 'B', 'C', 'D']);
  assert.deepEqual(getOptionKeys(150), ['A', 'B', 'C', 'D']);
});

test('getPartForQuestion maps boundaries to the right part', () => {
  assert.equal(getPartForQuestion(1).part, 1);
  assert.equal(getPartForQuestion(6).part, 1);
  assert.equal(getPartForQuestion(7).part, 2);
  assert.equal(getPartForQuestion(100).part, 4);
  assert.equal(getPartForQuestion(101).part, 5);
  assert.equal(getPartForQuestion(200).part, 7);
});

// --- answer keys on disk ---

function loadKeyFiles() {
  return readdirSync(KEY_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({ name, data: JSON.parse(readFileSync(join(KEY_DIR, name), 'utf8')) }));
}

test('every key file is well formed and matches its filename', () => {
  const files = loadKeyFiles();
  assert.ok(files.length > 0, 'expected at least one transcribed key');

  files.forEach(({ name, data }) => {
    assert.equal(`${data.testId}.json`, name);

    ['listening', 'reading'].forEach((section) => {
      const value = data[section];
      if (value === null) return;

      assert.equal(
        value.length,
        QUESTIONS_PER_SECTION,
        `${name} ${section} must have ${QUESTIONS_PER_SECTION} answers`,
      );
      assert.match(value, /^[ABCD]+$/, `${name} ${section} has a non A-D answer`);
    });
  });
});

test('listening keys never answer D inside part 2', () => {
  loadKeyFiles().forEach(({ name, data }) => {
    if (!data.listening) return;

    for (let number = 7; number <= 31; number += 1) {
      assert.notEqual(
        data.listening[number - 1],
        'D',
        `${name} question ${number} is in part 2, which has no D option`,
      );
    }
  });
});

test('a transcribed key resolves to a real test in the manifest', () => {
  const ids = new Set(YBM_VOLUMES.flatMap((v) => v.tests.map((t) => t.id)));
  loadKeyFiles().forEach(({ data }) => {
    assert.ok(ids.has(data.testId), `${data.testId} is not in the manifest`);
  });
});

// --- scoring ---

test('scaled section scores stay inside the official 5-495 band', () => {
  assert.equal(getScaledSectionScore(0), 5);
  assert.equal(getScaledSectionScore(100), 495);
  assert.ok(getScaledSectionScore(50) > 5 && getScaledSectionScore(50) < 495);
});

test('scaled scores are monotonic and reported in multiples of five', () => {
  let previous = -1;
  for (let correct = 0; correct <= 100; correct += 1) {
    const scaled = getScaledSectionScore(correct);
    assert.ok(scaled >= previous, `score dipped at ${correct} correct`);
    assert.equal(scaled % 5, 0, `${scaled} is not a multiple of 5`);
    previous = scaled;
  }
});

test('a full test totals both sections, capped at 990', () => {
  const perfect = getFullTestScore(100, 100);
  assert.equal(perfect.total, 990);

  const floor = getFullTestScore(0, 0);
  assert.equal(floor.total, 10);
});

test('an empty section scores the floor rather than throwing', () => {
  assert.equal(getScaledSectionScore(0, 0), 5);
});
