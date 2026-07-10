import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDrillResultPayload,
  buildListeningResultPayload,
  buildReadingResultPayload,
  getLocalProgressMigrationResult,
  normalizeLearningResult,
} from './learningResults.js';

function installLocalStorage(seed = {}) {
  const store = { ...seed };
  globalThis.window = {
    localStorage: {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: (key) => {
        delete store[key];
      },
    },
  };

  return store;
}

test('normalizeLearningResult keeps the backend contract compact', () => {
  assert.deepEqual(normalizeLearningResult({
    kind: 'reading',
    raw: 82,
    scaled: 405,
    total: 100,
    duration: 4380,
    perPart: { 5: { correct: 25, total: 30 } },
    perTag: { 'word-forms': { correct: 8, total: 10 } },
    payload: { mode: 'full' },
    ignored: true,
  }), {
    kind: 'reading',
    raw: 82,
    scaled: 405,
    total: 100,
    duration: 4380,
    perPart: { 5: { correct: 25, total: 30 } },
    perTag: { 'word-forms': { correct: 8, total: 10 } },
    payload: { mode: 'full' },
  });
});

test('buildReadingResultPayload stores mini and chained full-test results', () => {
  const reading = {
    correctCount: 45,
    scaledScore: 260,
    totalQuestions: 50,
    scorePercent: 90,
    perPart: { 5: { correct: 15, total: 15 } },
    perTag: { agreement: { correct: 4, total: 5 } },
  };

  assert.equal(buildReadingResultPayload(reading, { mode: 'mini' }).kind, 'mini');

  const full = buildReadingResultPayload(reading, {
    mode: 'full',
    listeningSummary: {
      correctCount: 30,
      scaledScore: 210,
      totalQuestions: 33,
    },
  });

  assert.equal(full.kind, 'full');
  assert.equal(full.raw, 75);
  assert.equal(full.scaled, 470);
  assert.equal(full.total, 83);
});

test('buildListeningResultPayload and buildDrillResultPayload normalize activity summaries', () => {
  const listening = buildListeningResultPayload({
    correctCount: 20,
    scaledScore: 240,
    totalQuestions: 33,
    scorePercent: 61,
    perPart: { 2: { correct: 8, total: 10 } },
    perTag: { inference: { correct: 2, total: 4 } },
  }, { chain: 'full' });

  assert.equal(listening.kind, 'listening');
  assert.equal(listening.payload.chain, 'full');

  const drill = buildDrillResultPayload({
    correctCount: 7,
    totalQuestions: 10,
    perTopic: { 'verb-tense': { correct: 7, total: 10 } },
    tags: ['verb-tense'],
  });

  assert.equal(drill.kind, 'drill');
  assert.equal(drill.payload.scorePercent, 70);
});

test('getLocalProgressMigrationResult converts local tag history into a drill summary', () => {
  installLocalStorage({
    'english.progress.student-1': JSON.stringify({
      version: 1,
      tags: {
        agreement: { correct: 4, total: 6 },
        'word-forms': { correct: 3, total: 5 },
      },
    }),
  });

  const migration = getLocalProgressMigrationResult('student-1');

  assert.equal(migration.kind, 'drill');
  assert.equal(migration.raw, 7);
  assert.equal(migration.total, 11);
  assert.deepEqual(migration.payload.tags, ['agreement', 'word-forms']);
});
