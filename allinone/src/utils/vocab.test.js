import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEITNER_INTERVALS_DAYS,
  MAX_BOX,
  addCustomCards,
  createEmptyVocabState,
  demoteCard,
  getCardProgress,
  getDueCards,
  getMissedVocabCards,
  getVocabSummary,
  localDayKey,
  normalizeVocabState,
  promoteCard,
} from './vocab.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 8, 12, 0, 0); // fixed reference time

const cards = [
  { id: 'w1', word: 'invoice' },
  { id: 'w2', word: 'itinerary' },
  { id: 'w3', word: 'reimburse' },
];

test('new cards are due immediately and promote through Leitner boxes', () => {
  let state = createEmptyVocabState();

  assert.deepEqual(getDueCards(cards, state, NOW).map((card) => card.id), ['w1', 'w2', 'w3']);

  state = promoteCard(state, 'w1', NOW);
  assert.equal(getCardProgress(state, 'w1').box, 1);
  // box 1 interval is 0 days — still due today
  assert.deepEqual(getDueCards(cards, state, NOW).map((card) => card.id), ['w2', 'w3', 'w1']);

  state = promoteCard(state, 'w1', NOW);
  assert.equal(getCardProgress(state, 'w1').box, 2);
  // box 2 interval is 1 day — no longer due now, due tomorrow
  assert.deepEqual(getDueCards(cards, state, NOW).map((card) => card.id), ['w2', 'w3']);
  assert.deepEqual(
    getDueCards(cards, state, NOW + 1 * DAY_MS).map((card) => card.id),
    ['w2', 'w3', 'w1'],
  );
});

test('promoteCard caps at the top box and demoteCard resets to box 1', () => {
  let state = createEmptyVocabState();

  for (let i = 0; i < MAX_BOX + 2; i += 1) {
    state = promoteCard(state, 'w1', NOW);
  }
  assert.equal(getCardProgress(state, 'w1').box, MAX_BOX);
  assert.equal(
    getCardProgress(state, 'w1').due,
    NOW + LEITNER_INTERVALS_DAYS[MAX_BOX - 1] * DAY_MS,
  );

  state = demoteCard(state, 'w1', NOW);
  assert.equal(getCardProgress(state, 'w1').box, 1);
  assert.equal(getCardProgress(state, 'w1').due, NOW);
});

test('getVocabSummary counts due, started, and learned cards', () => {
  let state = createEmptyVocabState();
  for (let i = 0; i < MAX_BOX; i += 1) {
    state = promoteCard(state, 'w1', NOW);
  }
  state = promoteCard(state, 'w2', NOW); // box 1, due immediately

  const summary = getVocabSummary(cards, state, NOW);
  assert.equal(summary.total, 3);
  assert.equal(summary.started, 2);
  assert.equal(summary.learned, 1);
  assert.equal(summary.due, 2); // w2 (box 1, 0-day interval) and w3 (new)
});

test('reviewing updates the streak once per day and resets after a gap', () => {
  let state = createEmptyVocabState();

  state = promoteCard(state, 'w1', NOW);
  state = promoteCard(state, 'w2', NOW);
  assert.equal(state.streak.count, 1);
  assert.equal(state.streak.lastDay, localDayKey(NOW));

  state = promoteCard(state, 'w1', NOW + 1 * DAY_MS);
  assert.equal(state.streak.count, 2);

  state = promoteCard(state, 'w1', NOW + 5 * DAY_MS);
  assert.equal(state.streak.count, 1);
});

test('getMissedVocabCards mines wrong Part 5 answers into flashcards', () => {
  const questions = [
    {
      number: 101,
      part: 5,
      id: 'p5-013',
      prompt: 'The store will ______ customers for damaged items.',
      options: [{ key: 'A', text: 'reimburse' }, { key: 'B', text: 'renew' }],
      answer: 'A',
      explanation: 'Reimburse means to pay someone back.',
    },
    {
      number: 102,
      part: 7,
      id: 'p7-s01-q1',
      prompt: 'What is the purpose?',
      options: [{ key: 'A', text: 'x' }],
      answer: 'A',
      explanation: '',
    },
  ];
  const results = {
    items: [
      { number: 101, isCorrect: false },
      { number: 102, isCorrect: false },
    ],
  };

  const mined = getMissedVocabCards(questions, results);
  assert.equal(mined.length, 1); // only the Part 5 miss
  assert.equal(mined[0].word, 'reimburse');
  assert.equal(mined[0].example, 'The store will reimburse customers for damaged items.');
  assert.equal(mined[0].deckId, 'missed');

  let state = createEmptyVocabState();
  state = addCustomCards(state, mined);
  state = addCustomCards(state, mined); // duplicates are ignored
  assert.equal(state.custom.length, 1);
});

test('getMissedVocabCards returns nothing when no Part 5 questions were missed', () => {
  const questions = [
    {
      number: 200,
      part: 7,
      id: 'p7-s02-q1',
      prompt: 'Why was the meeting rescheduled?',
      options: [{ key: 'A', text: 'Travel delays' }],
      answer: 'A',
      explanation: 'Because of travel delays.',
    },
  ];
  const results = { items: [{ number: 200, isCorrect: false }] };

  assert.deepEqual(getMissedVocabCards(questions, results), []);
});

test('re-mining missed Part 5 words across submissions does not duplicate cards', () => {
  const questions = [
    {
      number: 301,
      part: 5,
      id: 'p5-020',
      prompt: 'The manager will ______ the new policy next week.',
      options: [{ key: 'A', text: 'implement' }, { key: 'B', text: 'ignore' }],
      answer: 'A',
      explanation: 'Implement means to put into effect.',
    },
    {
      number: 302,
      part: 5,
      id: 'p5-021',
      prompt: 'Please ______ your signature at the bottom of the form.',
      options: [{ key: 'A', text: 'inscribe' }, { key: 'B', text: 'erase' }],
      answer: 'A',
      explanation: 'Inscribe means to write or carve.',
    },
  ];

  // Two finished tests that both miss the same Part 5 words.
  const firstResults = { items: [{ number: 301, isCorrect: false }, { number: 302, isCorrect: false }] };
  const secondResults = { items: [{ number: 301, isCorrect: false }, { number: 302, isCorrect: false }] };

  const firstMining = getMissedVocabCards(questions, firstResults);
  const secondMining = getMissedVocabCards(questions, secondResults);

  assert.equal(firstMining.length, 2);
  assert.equal(secondMining.length, 2);

  let state = createEmptyVocabState();
  state = addCustomCards(state, firstMining);
  state = addCustomCards(state, secondMining); // simulating the auto-add effect re-running

  assert.equal(state.custom.length, 2);
  const ids = state.custom.map((card) => card.id).sort();
  assert.deepEqual(ids, ['missed-p5-020', 'missed-p5-021']);
});

test('normalizeVocabState repairs malformed persisted data', () => {
  assert.deepEqual(normalizeVocabState(null), createEmptyVocabState());
  assert.deepEqual(normalizeVocabState('junk'), createEmptyVocabState());

  const repaired = normalizeVocabState({ cards: { w1: { box: 2, due: 5 } }, streak: null, custom: 'bad' });
  assert.equal(repaired.cards.w1.box, 2);
  assert.deepEqual(repaired.streak, { count: 0, lastDay: null });
  assert.deepEqual(repaired.custom, []);
});
