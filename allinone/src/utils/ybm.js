// Runtime helpers for the YBM full tests: asset resolution, answer keys,
// scoring, and in-progress attempt persistence.

import {
  FIRST_READING_QUESTION,
  PARTS,
  QUESTIONS_PER_SECTION,
  TOTAL_QUESTIONS,
  getOptionKeys,
  getPartForQuestion,
} from '../data/ybm/manifest.js';
import { getFullTestScore } from './toeicScore.js';

// Booklet scans and audio are far too large for the repo, so they are served
// from outside it. Set VITE_YBM_ASSET_BASE to the Drive-backed origin; the
// default points at a local folder so the feature can run in development.
// The app is served under a base path (/My-Work/allinone/ on Pages), so the
// local fallback has to be built from BASE_URL rather than assumed to be root.
export const ASSET_BASE = (
  import.meta.env?.VITE_YBM_ASSET_BASE
  || `${import.meta.env?.BASE_URL || '/'}ybm`
).replace(/\/$/, '');

export function getPageUrl(testId, section, pageNumber) {
  const page = String(pageNumber).padStart(2, '0');
  const prefix = section === 'listening' ? 'lc' : 'rc';
  return `${ASSET_BASE}/${testId}/${prefix}-p${page}.jpg`;
}

export function getAudioUrl(testId) {
  return `${ASSET_BASE}/${testId}/listening.mp3`;
}

// Per-question audio clips, cut from the full listening track by silence
// detection. Being split out is a per-test, per-question fact (some tests/
// parts aren't split yet), so this is an explicit allowlist rather than a
// blanket path formula like getPageUrl/getAudioUrl above.
const QUESTION_AUDIO = {
  'vol-1-test-01': [1, 2, 3, 4, 5, 6],
};

export function getQuestionAudioUrl(testId, questionNumber) {
  if (!QUESTION_AUDIO[testId]?.includes(questionNumber)) return null;
  const n = String(questionNumber).padStart(2, '0');
  return `${ASSET_BASE}/${testId}/lc-q${n}.mp3`;
}

// --- Answer keys -----------------------------------------------------------

const keyModules = import.meta.glob('../data/ybm/keys/*.json', {
  eager: true,
  import: 'default',
});

function keyFor(testId) {
  return keyModules[`../data/ybm/keys/${testId}.json`] || null;
}

// A key section is 100 characters, one per question, or null when that
// section's key has not been transcribed from the source book yet.
export function isValidKeySection(value) {
  return typeof value === 'string'
    && value.length === QUESTIONS_PER_SECTION
    && /^[ABCD]+$/.test(value);
}

function expandSection(value, firstNumber) {
  if (!isValidKeySection(value)) return null;

  const answers = {};
  for (let index = 0; index < value.length; index += 1) {
    answers[firstNumber + index] = value[index];
  }
  return answers;
}

// Returns { listening, reading, answers, hasListening, hasReading }.
// `answers` merges whichever sections exist.
export function getAnswerKey(testId) {
  const raw = keyFor(testId);
  const listening = expandSection(raw?.listening, 1);
  const reading = expandSection(raw?.reading, FIRST_READING_QUESTION);

  return {
    listening,
    reading,
    answers: { ...(listening || {}), ...(reading || {}) },
    hasListening: Boolean(listening),
    hasReading: Boolean(reading),
  };
}

// A test is playable when its booklet exists and at least one key section
// has been transcribed.
export function getTestReadiness(test) {
  const key = getAnswerKey(test.id);

  return {
    ...key,
    hasListeningBooklet: Number.isInteger(test.listeningPages),
    hasReadingBooklet: Number.isInteger(test.readingPages),
    isPlayable: (Number.isInteger(test.listeningPages) && key.hasListening)
      || (Number.isInteger(test.readingPages) && key.hasReading),
  };
}

// --- Scoring ---------------------------------------------------------------

export function scoreAttempt(testId, selections) {
  const { answers, hasListening, hasReading } = getAnswerKey(testId);

  const perPart = {};
  let listeningCorrect = 0;
  let readingCorrect = 0;
  let answered = 0;

  for (let number = 1; number <= TOTAL_QUESTIONS; number += 1) {
    const correct = answers[number];
    if (!correct) continue;

    const selected = selections?.[number] || null;
    if (selected) answered += 1;

    const part = getPartForQuestion(number);
    const bucket = perPart[part.part] || (perPart[part.part] = { correct: 0, total: 0 });
    bucket.total += 1;

    if (selected === correct) {
      bucket.correct += 1;
      if (number < FIRST_READING_QUESTION) listeningCorrect += 1;
      else readingCorrect += 1;
    }
  }

  const score = getFullTestScore(listeningCorrect, readingCorrect);

  return {
    listeningCorrect,
    readingCorrect,
    correctCount: listeningCorrect + readingCorrect,
    answered,
    perPart,
    // Only report a section score when that section was actually scoreable.
    listeningScaled: hasListening ? score.listening : null,
    readingScaled: hasReading ? score.reading : null,
    totalScaled: hasListening && hasReading ? score.total : null,
  };
}

export function getSectionQuestions(section) {
  return PARTS.filter((part) => part.section === section)
    .flatMap((part) => {
      const numbers = [];
      for (let n = part.from; n <= part.to; n += 1) numbers.push(n);
      return numbers;
    });
}

export { getOptionKeys, getPartForQuestion };

// --- Attempt persistence ---------------------------------------------------

const attemptKey = (userId, testId) => `ybm.attempt.${userId || 'anonymous'}.${testId}`;

export function loadAttempt(userId, testId) {
  try {
    const raw = JSON.parse(window.localStorage.getItem(attemptKey(userId, testId)));
    if (!raw || typeof raw !== 'object') return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveAttempt(userId, testId, attempt) {
  try {
    window.localStorage.setItem(attemptKey(userId, testId), JSON.stringify(attempt));
  } catch {
    // Storage unavailable — the attempt still works for this session.
  }
}

export function clearAttempt(userId, testId) {
  try {
    window.localStorage.removeItem(attemptKey(userId, testId));
  } catch {
    // Nothing to do.
  }
}
