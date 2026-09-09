import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  categoryLabel,
  statusLabel,
  filterFeedback,
  countByStatus,
} from './feedback.js';

const sample = [
  { id: '1', status: 'new', category: 'bug' },
  { id: '2', status: 'new', category: 'idea' },
  { id: '3', status: 'resolved', category: 'bug' },
  { id: '4', status: 'in_progress', category: 'other' },
];

test('category and status ids have labels', () => {
  FEEDBACK_CATEGORIES.forEach((c) => assert.equal(categoryLabel(c.id), c.label));
  FEEDBACK_STATUSES.forEach((s) => assert.equal(statusLabel(s.id), s.label));
});

test('categoryLabel falls back to Other for unknown ids', () => {
  assert.equal(categoryLabel('nope'), 'Other');
});

test('filterFeedback with no filters returns everything', () => {
  assert.deepEqual(filterFeedback(sample), sample);
  assert.deepEqual(filterFeedback(sample, {}), sample);
});

test('filterFeedback narrows by status and category', () => {
  assert.deepEqual(
    filterFeedback(sample, { status: 'new' }).map((i) => i.id),
    ['1', '2'],
  );
  assert.deepEqual(
    filterFeedback(sample, { category: 'bug' }).map((i) => i.id),
    ['1', '3'],
  );
  assert.deepEqual(
    filterFeedback(sample, { status: 'new', category: 'bug' }).map((i) => i.id),
    ['1'],
  );
});

test('filterFeedback tolerates non-array input', () => {
  assert.deepEqual(filterFeedback(null), []);
  assert.deepEqual(filterFeedback(undefined), []);
});

test('countByStatus reports every status plus a total', () => {
  const counts = countByStatus(sample);
  assert.equal(counts.total, 4);
  assert.equal(counts.new, 2);
  assert.equal(counts.in_progress, 1);
  assert.equal(counts.resolved, 1);
  assert.equal(counts.wont_do, 0);
});
