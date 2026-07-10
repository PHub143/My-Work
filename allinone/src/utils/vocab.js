// Leitner-box spaced repetition for the English vocabulary flashcards.
// Pure functions take `now` (ms epoch) so they stay testable; localStorage
// persistence is isolated in loadVocabState/saveVocabState.

export const LEITNER_INTERVALS_DAYS = [0, 1, 3, 7, 14]; // index = box - 1
export const MAX_BOX = LEITNER_INTERVALS_DAYS.length;

const DAY_MS = 24 * 60 * 60 * 1000;

export function createEmptyVocabState() {
  return {
    version: 1,
    cards: {},
    streak: { count: 0, lastDay: null },
    custom: [],
  };
}

export function normalizeVocabState(raw) {
  const empty = createEmptyVocabState();
  if (!raw || typeof raw !== 'object') return empty;

  return {
    version: 1,
    cards: raw.cards && typeof raw.cards === 'object' ? raw.cards : empty.cards,
    streak: raw.streak && typeof raw.streak === 'object'
      ? { count: raw.streak.count || 0, lastDay: raw.streak.lastDay || null }
      : empty.streak,
    custom: Array.isArray(raw.custom) ? raw.custom : empty.custom,
  };
}

export function getCardProgress(state, cardId) {
  return state?.cards?.[cardId] || { box: 0, due: null }; // box 0 = never reviewed
}

export function isCardDue(state, cardId, now) {
  const progress = getCardProgress(state, cardId);
  if (progress.box === 0) return true;
  return progress.due !== null && progress.due <= now;
}

export function getDueCards(cards, state, now) {
  return (cards || [])
    .filter((card) => isCardDue(state, card.id, now))
    .sort((left, right) => getCardProgress(state, left.id).box - getCardProgress(state, right.id).box);
}

export function localDayKey(now) {
  const date = new Date(now);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function recordStreak(streak, now) {
  const today = localDayKey(now);
  if (streak.lastDay === today) return streak;
  const yesterday = localDayKey(now - DAY_MS);

  return {
    count: streak.lastDay === yesterday ? (streak.count || 0) + 1 : 1,
    lastDay: today,
  };
}

function reviewCard(state, cardId, knewIt, now) {
  const progress = getCardProgress(state, cardId);
  const nextBox = knewIt ? Math.min(MAX_BOX, (progress.box || 0) + 1) : 1;
  const intervalDays = LEITNER_INTERVALS_DAYS[nextBox - 1];

  return {
    ...state,
    cards: {
      ...state.cards,
      [cardId]: { box: nextBox, due: now + intervalDays * DAY_MS },
    },
    streak: recordStreak(state.streak, now),
  };
}

export function promoteCard(state, cardId, now) {
  return reviewCard(state, cardId, true, now);
}

export function demoteCard(state, cardId, now) {
  return reviewCard(state, cardId, false, now);
}

export function getVocabSummary(cards, state, now) {
  let due = 0;
  let learned = 0;
  let started = 0;

  (cards || []).forEach((card) => {
    const progress = getCardProgress(state, card.id);
    if (progress.box > 0) started += 1;
    if (progress.box === MAX_BOX) learned += 1;
    if (isCardDue(state, card.id, now)) due += 1;
  });

  return {
    total: (cards || []).length,
    due,
    learned,
    started,
    streak: state?.streak?.count || 0,
  };
}

// Mines wrong Part 5 answers from a finished reading test into flashcards.
export function getMissedVocabCards(questions, results) {
  return (results?.items || [])
    .filter((item) => !item.isCorrect)
    .map((item) => (questions || []).find((question) => question.number === item.number))
    .filter((question) => question && question.part === 5)
    .map((question) => {
      const correctOption = (question.options || []).find((option) => option.key === question.answer);
      const word = correctOption?.text || '';

      return {
        id: `missed-${question.id}`,
        deckId: 'missed',
        word,
        partOfSpeech: '',
        definition: question.explanation || '',
        example: question.prompt.replace(/_{2,}/, word),
      };
    })
    .filter((card) => card.word);
}

export function addCustomCards(state, cards) {
  const existingIds = new Set(state.custom.map((card) => card.id));
  const additions = (cards || []).filter((card) => !existingIds.has(card.id));
  if (!additions.length) return state;

  return { ...state, custom: [...state.custom, ...additions] };
}

const storageKey = (userId) => `english.vocab.${userId || 'anonymous'}`;

export function loadVocabState(userId) {
  try {
    return normalizeVocabState(JSON.parse(window.localStorage.getItem(storageKey(userId))));
  } catch {
    return createEmptyVocabState();
  }
}

export function saveVocabState(userId, state) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Storage full or unavailable — reviewing still works for the session.
  }
}
