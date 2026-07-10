import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmptyProgressState,
  normalizeProgressState,
  recordTagResults,
  getWeakestTopics,
} from './progress.js';

test('normalizeProgressState falls back to an empty state for bad input', () => {
  assert.deepEqual(normalizeProgressState(null), createEmptyProgressState());
  assert.deepEqual(normalizeProgressState('junk'), createEmptyProgressState());
  assert.deepEqual(normalizeProgressState({ tags: 4 }).tags, {});

  const kept = normalizeProgressState({ tags: { preposition: { correct: 1, total: 2 } } });
  assert.deepEqual(kept.tags, { preposition: { correct: 1, total: 2 } });
});

test('recordTagResults accumulates per-tag stats across sessions', () => {
  let state = createEmptyProgressState();

  state = recordTagResults(state, {
    'verb-tense': { correct: 1, total: 3 },
    preposition: { correct: 2, total: 2 },
  });
  state = recordTagResults(state, {
    'verb-tense': { correct: 2, total: 2 },
    conjunction: { correct: 0, total: 1 },
  });

  assert.deepEqual(state.tags, {
    'verb-tense': { correct: 3, total: 5 },
    preposition: { correct: 2, total: 2 },
    conjunction: { correct: 0, total: 1 },
  });
});

test('recordTagResults ignores empty results and returns the same state', () => {
  const state = recordTagResults(createEmptyProgressState(), { detail: { correct: 0, total: 0 } });
  assert.deepEqual(state.tags, {});

  const unchanged = createEmptyProgressState();
  assert.equal(recordTagResults(unchanged, {}), unchanged);
});

test('getWeakestTopics ranks by accuracy, honors minTotal, and skips perfect topics', () => {
  const state = {
    version: 1,
    tags: {
      'verb-tense': { correct: 1, total: 4 },
      preposition: { correct: 3, total: 4 },
      conjunction: { correct: 0, total: 1 }, // below minTotal
      pronoun: { correct: 4, total: 4 }, // perfect — not weak
    },
  };

  const weakest = getWeakestTopics(state, { minTotal: 3, limit: 5 });
  assert.deepEqual(weakest.map((entry) => entry.tag), ['verb-tense', 'preposition']);
  assert.equal(weakest[0].accuracy, 0.25);
});

test('getWeakestTopics can restrict the report to drillable tags', () => {
  const state = {
    version: 1,
    tags: {
      'verb-tense': { correct: 1, total: 4 },
      'cross-reference': { correct: 0, total: 4 }, // not drillable
    },
  };

  const weakest = getWeakestTopics(state, { tags: ['verb-tense'], minTotal: 3 });
  assert.deepEqual(weakest.map((entry) => entry.tag), ['verb-tense']);
});
