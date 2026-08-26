// Runtime helpers for the Hacker full tests: asset resolution, answer keys,
// scoring, and in-progress attempt persistence. Mirrors utils/ybm.js for the
// second TOEIC book collection — see data/hacker/manifest.js for why the two
// stay independent rather than sharing a manifest module.

import {
  FIRST_READING_QUESTION,
  PARTS,
  QUESTIONS_PER_SECTION,
  TOTAL_QUESTIONS,
  getOptionKeys,
  getPartForQuestion,
} from '../data/hacker/manifest.js';
import { getFullTestScore } from './toeicScore.js';
import { API_URL } from '../config.js';

// Booklet scans and audio are far too large for the repo, so they are served
// from outside it. In dev, that's a local `public/hacker/` folder a developer
// fills in by hand while digitising a test. Once a test is pushed to Drive
// (via api/scripts/upload-hacker-assets.js), the API streams it back out at
// GET /hacker/:testId/:filename (see api/routes/hackerAssetRoutes.js) — a
// Drive link can't be embedded directly in <img>/<audio>, Google's CDN sets a
// same-site Cross-Origin-Resource-Policy header that blocks cross-origin
// embeds — so whenever the app is talking to the real API (prod build, or
// `npm run dev:prod`), asset requests go through it too, mirroring how
// config.js picks API_URL. VITE_HACKER_ASSET_BASE overrides both.
const USES_PROD_API = import.meta.env?.VITE_USE_PROD_API === 'true' || import.meta.env?.PROD;

export const ASSET_BASE = (
  import.meta.env?.VITE_HACKER_ASSET_BASE
  || (USES_PROD_API ? `${API_URL}/hacker` : `${import.meta.env?.BASE_URL || '/'}hacker`)
).replace(/\/$/, '');

export function getPageUrl(testId, section, pageNumber) {
  const page = String(pageNumber).padStart(2, '0');
  const prefix = section === 'listening' ? 'lc' : 'rc';
  return `${ASSET_BASE}/${testId}/${prefix}-p${page}.jpg`;
}

export function getAudioUrl(testId) {
  return `${ASSET_BASE}/${testId}/listening.mp3`;
}

// A `kind: "graphic"` passage in transcribed content (a cropped chart/map
// image that isn't text-representable) points at a plain filename under the
// test's asset folder, alongside the page images.
export function getAssetUrl(testId, filename) {
  return `${ASSET_BASE}/${testId}/${filename}`;
}

// Per-question audio clips are not split out for this collection yet, so
// every test plays its one full listening.mp3 (see the equivalent note in
// utils/ybm.js).
const QUESTION_AUDIO = {};

export function getQuestionAudioUrl(testId, questionNumber) {
  if (!QUESTION_AUDIO[testId]?.includes(questionNumber)) return null;
  const n = String(questionNumber).padStart(2, '0');
  return `${ASSET_BASE}/${testId}/lc-q${n}.mp3`;
}

// --- Answer keys -----------------------------------------------------------

const keyModules = import.meta.glob('../data/hacker/keys/*.json', {
  eager: true,
  import: 'default',
});

function keyFor(testId) {
  return keyModules[`../data/hacker/keys/${testId}.json`] || null;
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

// --- Transcribed reading content --------------------------------------------

// Structured Part 5/6/7 content (question text, choices, and passages
// transcribed from the source PDF's text layer, cross-checked against the
// booklet scans) — see data/hacker/content/AGENTS.md. Not every test has
// this yet; callers must handle a null return and fall back to the scanned
// booklet image.
const contentModules = import.meta.glob('../data/hacker/content/*.json', {
  eager: true,
  import: 'default',
});

export function getReadingContent(testId) {
  return contentModules[`../data/hacker/content/${testId}.json`] || null;
}

// --- Attempt persistence ---------------------------------------------------

const attemptKey = (userId, testId) => `hacker.attempt.${userId || 'anonymous'}.${testId}`;

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
