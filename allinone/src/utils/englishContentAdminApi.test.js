import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createContentDraft,
  exportContentSnapshot,
  listContentSnapshots,
  publishContentDraft,
  updateContentDraft,
  validateContentDraft,
} from './englishContentAdminApi.js';

function createJsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test('listContentSnapshots sends auth and status filters', async () => {
  const calls = [];
  const result = await listContentSnapshots({
    token: 'token-1',
    status: 'draft',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return createJsonResponse({ snapshots: [] });
    },
  });

  assert.deepEqual(result, { snapshots: [] });
  assert.match(calls[0].url, /status=draft/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-1');
});

test('draft helpers call the expected endpoints', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return createJsonResponse({ snapshot: { id: 'draft-1' }, report: { valid: true } });
  };

  await createContentDraft({ token: 'token-1', baseSnapshotId: 'published-1', fetchImpl });
  await updateContentDraft({ token: 'token-1', id: 'draft-1', payload: { schemaVersion: 1 }, fetchImpl });
  await validateContentDraft({ token: 'token-1', id: 'draft-1', fetchImpl });
  await publishContentDraft({ token: 'token-1', id: 'draft-1', fetchImpl });

  assert.match(calls[0].url, /\/learning\/content\/drafts$/);
  assert.equal(JSON.parse(calls[1].options.body).payload.schemaVersion, 1);
  assert.match(calls[2].url, /\/drafts\/draft-1\/validate$/);
  assert.match(calls[3].url, /\/drafts\/draft-1\/publish$/);
});

test('exportContentSnapshot returns downloadable JSON text', async () => {
  const text = await exportContentSnapshot({
    token: 'token-1',
    id: 'snapshot-1',
    fetchImpl: async () => createJsonResponse({ schemaVersion: 1 }),
  });

  assert.equal(text, '{"schemaVersion":1}');
});
