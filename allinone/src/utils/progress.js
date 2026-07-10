// Per-user English practice history: per-tag accuracy accumulated across
// reading tests, listening tests, and grammar drills. Pure functions plus
// localStorage persistence, mirroring vocab.js; moves to the DB in Phase 5.

export function createEmptyProgressState() {
  return {
    version: 1,
    tags: {},
  };
}

export function normalizeProgressState(raw) {
  if (!raw || typeof raw !== 'object') return createEmptyProgressState();

  return {
    version: 1,
    tags: raw.tags && typeof raw.tags === 'object' ? raw.tags : {},
  };
}

// Merges a results `perTag` map ({ tag: { correct, total } }) into the state.
export function recordTagResults(state, perTag) {
  const entries = Object.entries(perTag || {}).filter(([, stats]) => stats?.total > 0);
  if (!entries.length) return state;

  const tags = { ...state.tags };

  entries.forEach(([tag, stats]) => {
    const current = tags[tag] || { correct: 0, total: 0 };
    tags[tag] = {
      correct: current.correct + (stats.correct || 0),
      total: current.total + (stats.total || 0),
    };
  });

  return { ...state, tags };
}

// Weakest topics across the accumulated history. Pass `tags` to restrict the
// report to drillable topics; topics answered perfectly are left out.
export function getWeakestTopics(state, { tags = null, minTotal = 3, limit = 5 } = {}) {
  const allowed = tags ? new Set(tags) : null;

  return Object.entries(state?.tags || {})
    .filter(([tag, stats]) => stats.total >= minTotal && (!allowed || allowed.has(tag)))
    .map(([tag, stats]) => ({
      tag,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total ? stats.correct / stats.total : 0,
    }))
    .filter((entry) => entry.accuracy < 1)
    .sort((left, right) => left.accuracy - right.accuracy || right.total - left.total)
    .slice(0, limit);
}

const storageKey = (userId) => `english.progress.${userId || 'anonymous'}`;

export function loadProgressState(userId) {
  try {
    return normalizeProgressState(JSON.parse(window.localStorage.getItem(storageKey(userId))));
  } catch {
    return createEmptyProgressState();
  }
}

export function saveProgressState(userId, state) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Storage full or unavailable — the session still works without history.
  }
}
