// Shared feedback vocabulary for the submit dialog and the admin review page.
// Keep the ids in sync with api/controllers/feedbackController.js.

export const FEEDBACK_CATEGORIES = [
  { id: 'bug', label: 'Bug', hint: 'Something is broken or behaving wrong' },
  { id: 'idea', label: 'Idea', hint: 'A suggestion or feature request' },
  { id: 'content', label: 'Content issue', hint: 'A mistake in a lesson, test, or file' },
  { id: 'other', label: 'Other', hint: 'Anything else' },
];

export const FEEDBACK_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'wont_do', label: "Won't do" },
];

export const MAX_FEEDBACK_ATTACHMENTS = 3;
export const MAX_FEEDBACK_MESSAGE_LENGTH = 4000;
export const MAX_FEEDBACK_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const CATEGORY_LABELS = Object.fromEntries(FEEDBACK_CATEGORIES.map((c) => [c.id, c.label]));
const STATUS_LABELS = Object.fromEntries(FEEDBACK_STATUSES.map((s) => [s.id, s.label]));

export function categoryLabel(id) {
  return CATEGORY_LABELS[id] || 'Other';
}

export function statusLabel(id) {
  return STATUS_LABELS[id] || id;
}

/**
 * Filters a feedback list by status and/or category. Empty/null filters match
 * everything. Pure — safe to unit test and to call on every render.
 * @param {Array} items
 * @param {{ status?: string, category?: string }} [filters]
 * @returns {Array}
 */
export function filterFeedback(items, filters = {}) {
  if (!Array.isArray(items)) return [];

  const { status, category } = filters;

  return items.filter((item) => {
    if (status && item.status !== status) return false;
    if (category && item.category !== category) return false;
    return true;
  });
}

/**
 * Counts feedback items per status id, always returning a key for every known
 * status (zero when absent) plus a `total`.
 * @param {Array} items
 * @returns {Record<string, number>}
 */
export function countByStatus(items) {
  const counts = { total: Array.isArray(items) ? items.length : 0 };
  for (const status of FEEDBACK_STATUSES) {
    counts[status.id] = 0;
  }
  if (!Array.isArray(items)) return counts;

  for (const item of items) {
    if (Object.prototype.hasOwnProperty.call(counts, item.status)) {
      counts[item.status] += 1;
    }
  }

  return counts;
}
