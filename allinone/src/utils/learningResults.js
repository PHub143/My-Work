import { API_URL } from '../config.js';
import { createEmptyProgressState, loadProgressState } from './progress.js';

const MIGRATION_KEY_PREFIX = 'english.progressMigration';

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}

function getMigrationKey(userId) {
  return `${MIGRATION_KEY_PREFIX}.${userId || 'guest'}`;
}

function cleanInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function cleanObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export function normalizeLearningResult(result) {
  if (!result?.kind) return null;

  return {
    kind: result.kind,
    raw: cleanInteger(result.raw),
    scaled: cleanInteger(result.scaled),
    total: cleanInteger(result.total),
    duration: cleanInteger(result.duration),
    perPart: cleanObject(result.perPart),
    perTag: cleanObject(result.perTag),
    payload: cleanObject(result.payload),
  };
}

export function buildReadingResultPayload(results, {
  mode = 'full',
  formNumber = null,
  duration = null,
  listeningSummary = null,
} = {}) {
  if (!results) return null;

  if (listeningSummary) {
    const listeningScaled = cleanInteger(listeningSummary.scaledScore) || 0;
    const readingScaled = cleanInteger(results.scaledScore) || 0;

    return normalizeLearningResult({
      kind: 'full',
      raw: (cleanInteger(listeningSummary.correctCount) || 0) + (cleanInteger(results.correctCount) || 0),
      scaled: listeningScaled + readingScaled,
      total: (cleanInteger(listeningSummary.totalQuestions) || 0) + (cleanInteger(results.totalQuestions) || 0),
      duration,
      perPart: results.perPart,
      perTag: results.perTag,
      payload: {
        sections: {
          listening: listeningSummary,
          reading: {
            raw: results.correctCount,
            scaled: results.scaledScore,
            total: results.totalQuestions,
          },
        },
        scorePercent: results.scorePercent,
        mode,
        formNumber,
      },
    });
  }

  return normalizeLearningResult({
    kind: mode === 'mini' ? 'mini' : 'reading',
    raw: results.correctCount,
    scaled: results.scaledScore,
    total: results.totalQuestions,
    duration,
    perPart: results.perPart,
    perTag: results.perTag,
    payload: {
      mode,
      formNumber,
      scorePercent: results.scorePercent,
    },
  });
}

export function buildListeningResultPayload(results, {
  mode = 'listening',
  formNumber = null,
  duration = null,
  chain = null,
} = {}) {
  if (!results) return null;

  return normalizeLearningResult({
    kind: 'listening',
    raw: results.correctCount,
    scaled: results.scaledScore,
    total: results.totalQuestions,
    duration,
    perPart: results.perPart,
    perTag: results.perTag,
    payload: {
      mode,
      formNumber,
      chain,
      scorePercent: results.scorePercent,
    },
  });
}

export function buildDrillResultPayload({ correctCount, totalQuestions, perTopic, tags }) {
  return normalizeLearningResult({
    kind: 'drill',
    raw: correctCount,
    total: totalQuestions,
    perTag: perTopic,
    payload: {
      tags,
      scorePercent: totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0,
    },
  });
}

export async function saveLearningResult(result, { token = getStoredToken() } = {}) {
  const normalized = normalizeLearningResult(result);
  if (!normalized || !token) {
    return { ok: false, error: 'Learning result was not saved because no authenticated session is available.' };
  }

  try {
    const response = await fetch(`${API_URL}/learning/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(normalized),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.message || 'Learning result could not be saved.' };
    }

    return { ok: true, result: data.result };
  } catch (error) {
    return { ok: false, error: error.message || 'Learning result could not be saved.' };
  }
}

export async function getLearningResults({ kind, limit = 20, token = getStoredToken() } = {}) {
  if (!token) return [];

  const params = new URLSearchParams();
  if (kind) params.set('kind', kind);
  if (limit) params.set('limit', String(limit));

  try {
    const response = await fetch(`${API_URL}/learning/results?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

export function getLocalProgressMigrationResult(userId) {
  const progress = loadProgressState(userId);
  const source = progress || createEmptyProgressState();
  const tags = cleanObject(source.tags) || {};
  const totals = Object.values(tags).reduce(
    (acc, stats) => ({
      correct: acc.correct + (cleanInteger(stats?.correct) || 0),
      total: acc.total + (cleanInteger(stats?.total) || 0),
    }),
    { correct: 0, total: 0 },
  );

  if (!totals.total) return null;

  return buildDrillResultPayload({
    correctCount: totals.correct,
    totalQuestions: totals.total,
    perTopic: tags,
    tags: Object.keys(tags),
  });
}

export async function migrateLocalLearningProgress(userId, { token = getStoredToken() } = {}) {
  if (!userId || !token || typeof window === 'undefined') {
    return { ok: false, skipped: true };
  }

  const key = getMigrationKey(userId);
  if (window.localStorage.getItem(key) === 'done') {
    return { ok: true, skipped: true };
  }

  const result = getLocalProgressMigrationResult(userId);
  if (!result) {
    window.localStorage.setItem(key, 'done');
    return { ok: true, skipped: true };
  }

  const response = await saveLearningResult({
    ...result,
    payload: {
      ...(result.payload || {}),
      migration: 'local-progress',
      migratedAt: new Date().toISOString(),
    },
  }, { token });

  if (response.ok) {
    window.localStorage.setItem(key, 'done');
  }

  return response;
}
