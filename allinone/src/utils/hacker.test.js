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
  HACKER_VOLUMES,
  getOptionKeys,
  getPartForQuestion,
  getTest,
  getTestId,
} from '../data/hacker/manifest.js';
import { getScaledSectionScore, getFullTestScore } from './toeicScore.js';

const KEY_DIR = fileURLToPath(new URL('../data/hacker/keys/', import.meta.url));

// --- manifest ---

test('every volume exposes ten tests with stable ids', () => {
  assert.equal(HACKER_VOLUMES.length, 1);

  HACKER_VOLUMES.forEach((volume) => {
    assert.equal(volume.tests.length, 10);
    volume.tests.forEach((entry, index) => {
      assert.equal(entry.number, index + 1);
      assert.equal(entry.id, getTestId(volume.id, index + 1));
    });
  });
});

test('test ids are zero padded so asset paths sort correctly', () => {
  assert.equal(getTestId('vol-2', 1), 'vol-2-test-01');
  assert.equal(getTestId('vol-2', 10), 'vol-2-test-10');
});

test('getTest resolves by string route params', () => {
  const found = getTest('vol-2', '1');
  assert.equal(found.id, 'vol-2-test-01');
  assert.equal(getTest('vol-9', '1'), null);
});

test('undigitised tests stay unavailable rather than claiming a booklet', () => {
  assert.equal(getTest('vol-2', 1).listeningPages, 12);
  assert.equal(getTest('vol-2', 1).readingPages, 28);
  assert.equal(getTest('vol-2', 2).listeningPages, null);
  assert.equal(getTest('vol-2', 2).readingPages, null);
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
  const ids = new Set(HACKER_VOLUMES.flatMap((v) => v.tests.map((t) => t.id)));
  loadKeyFiles().forEach(({ data }) => {
    assert.ok(ids.has(data.testId), `${data.testId} is not in the manifest`);
  });
});

// --- scoring (shared toeicScore.js — smoke test only, full coverage lives in ybm.test.js) ---

test('scaled section scores stay inside the official 5-495 band', () => {
  assert.equal(getScaledSectionScore(0), 5);
  assert.equal(getScaledSectionScore(100), 495);
});

test('a full test totals both sections, capped at 990', () => {
  const perfect = getFullTestScore(100, 100);
  assert.equal(perfect.total, 990);
});
