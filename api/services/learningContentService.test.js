const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const prismaPath = path.resolve(__dirname, './prismaService.js');
const servicePath = path.resolve(__dirname, './learningContentService.js');

function loadService(mockPrisma) {
  delete require.cache[servicePath];
  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: mockPrisma,
  };

  return require('./learningContentService');
}

function createValidPayload(overrides = {}) {
  return {
    schemaVersion: 1,
    source: { reading: 'json' },
    summary: {},
    reading: {
      parts: {
        part5: {
          questions: Array.from({ length: 30 }, (_, index) => ({
            id: `p5-${index}`,
            prompt: 'Prompt',
            answer: 'A',
          })),
        },
        part6: { sets: [{ questions: Array.from({ length: 16 }, () => ({})) }] },
        part7: { singleSets: [{ questions: Array.from({ length: 54 }, () => ({})) }], multiSets: [] },
      },
    },
    listening: {
      parts: {
        part1: { items: Array.from({ length: 6 }, () => ({})) },
        part2: { items: Array.from({ length: 25 }, () => ({})) },
        part3: { sets: [{ questions: Array.from({ length: 39 }, () => ({})) }] },
        part4: { sets: [{ questions: Array.from({ length: 30 }, () => ({})) }] },
      },
    },
    vocab: { decks: [{ cards: Array.from({ length: 300 }, () => ({})) }] },
    ...overrides,
  };
}

test('normalizeSnapshot can include or omit the heavy payload', () => {
  const { normalizeSnapshot } = loadService({ contentSnapshot: {} });
  const snapshot = {
    id: 'snapshot-1',
    kind: 'english',
    version: 1,
    status: 'published',
    checksum: 'abc',
    source: { reading: 'src/data/englishContent.json' },
    summary: { vocab: { cards: 300 } },
    payload: { reading: {} },
    createdAt: new Date('2026-07-09T00:00:00.000Z'),
    updatedAt: new Date('2026-07-09T00:00:00.000Z'),
  };

  assert.equal(normalizeSnapshot(snapshot).payload, snapshot.payload);
  assert.equal(Object.hasOwn(normalizeSnapshot(snapshot, { includePayload: false }), 'payload'), false);
  assert.equal(normalizeSnapshot(null), null);
});

test('getLatestContentSnapshot selects the newest published content snapshot', async () => {
  const calls = [];
  const service = loadService({
    contentSnapshot: {
      findFirst: async (query) => {
        calls.push(query);
        return {
          id: 'snapshot-1',
          kind: 'english',
          version: 1,
          status: 'published',
          checksum: 'abc',
          source: {},
          summary: {},
          payload: {},
          createdAt: new Date('2026-07-09T00:00:00.000Z'),
          updatedAt: new Date('2026-07-09T00:00:00.000Z'),
        };
      },
    },
  });

  const snapshot = await service.getLatestContentSnapshot({ includePayload: false });

  assert.equal(snapshot.id, 'snapshot-1');
  assert.equal(Object.hasOwn(snapshot, 'payload'), false);
  assert.deepEqual(calls[0].where, { kind: 'english', status: 'published' });
  assert.deepEqual(calls[0].orderBy, { createdAt: 'desc' });
});

test('validateSnapshotPayload reports summary and blocking issues', () => {
  const { validateSnapshotPayload } = loadService({ contentSnapshot: {} });

  const report = validateSnapshotPayload({
    schemaVersion: 1,
    source: {},
    reading: { parts: { part5: { questions: [] }, part6: { sets: [] }, part7: { singleSets: [], multiSets: [] } } },
    listening: { parts: { part1: { items: [] }, part2: { items: [] }, part3: { sets: [] }, part4: { sets: [] } } },
    vocab: { decks: [] },
  });

  assert.equal(report.valid, false);
  assert.equal(report.summary.reading.part5, 0);
  assert.equal(report.issues.some((issue) => issue.area === 'vocab'), true);
});

test('createDraftSnapshot clones the latest published snapshot as a draft', async () => {
  const calls = [];
  const baseSnapshot = {
    id: 'published-1',
    kind: 'english',
    version: 1,
    status: 'published',
    checksum: 'abc',
    source: { reading: 'json' },
    summary: { vocab: { cards: 300 } },
    payload: { schemaVersion: 1 },
    createdAt: new Date('2026-07-09T00:00:00.000Z'),
    updatedAt: new Date('2026-07-09T00:00:00.000Z'),
  };
  const service = loadService({
    contentSnapshot: {
      findFirst: async (query) => {
        calls.push(['findFirst', query]);
        return baseSnapshot;
      },
      create: async ({ data }) => {
        calls.push(['create', data]);
        return {
          ...baseSnapshot,
          ...data,
          id: 'draft-1',
          createdAt: new Date('2026-07-10T00:00:00.000Z'),
          updatedAt: new Date('2026-07-10T00:00:00.000Z'),
        };
      },
    },
  });

  const draft = await service.createDraftSnapshot();

  assert.equal(draft.id, 'draft-1');
  assert.equal(draft.status, 'draft');
  assert.equal(draft.source.draftFrom, 'published-1');
  assert.equal(calls[1][0], 'create');
});

test('publishDraftSnapshot archives duplicate drafts and returns existing published content', async () => {
  const payload = createValidPayload({ source: {} });
  const updated = [];
  const service = loadService({
    contentSnapshot: {
      findUnique: async (query) => {
        if (query.where.id === 'draft-1') {
          return {
            id: 'draft-1',
            kind: 'english',
            version: 1,
            status: 'draft',
            checksum: 'draft-1',
            source: {},
            summary: {},
            payload,
            createdAt: new Date('2026-07-10T00:00:00.000Z'),
            updatedAt: new Date('2026-07-10T00:00:00.000Z'),
          };
        }
        return {
          id: 'published-1',
          kind: 'english',
          version: 1,
          status: 'published',
          checksum: query.where.kind_checksum.checksum,
          source: {},
          summary: {},
          payload,
          createdAt: new Date('2026-07-09T00:00:00.000Z'),
          updatedAt: new Date('2026-07-09T00:00:00.000Z'),
        };
      },
      update: async (query) => {
        updated.push(query);
        return {};
      },
    },
  });

  const result = await service.publishDraftSnapshot('draft-1');

  assert.equal(result.deduped, true);
  assert.equal(result.snapshot.id, 'published-1');
  assert.deepEqual(updated[0], { where: { id: 'draft-1' }, data: { status: 'archived' } });
});

test('admin content workflow clones, edits, validates, publishes, and becomes latest', async () => {
  const snapshots = [{
    id: 'published-1',
    kind: 'english',
    version: 1,
    status: 'published',
    checksum: 'published-checksum',
    source: { reading: 'json' },
    summary: {},
    payload: createValidPayload(),
    createdAt: new Date('2026-07-09T00:00:00.000Z'),
    updatedAt: new Date('2026-07-09T00:00:00.000Z'),
  }];
  const service = loadService({
    contentSnapshot: {
      findFirst: async ({ where }) => snapshots
        .filter((snapshot) => (
          (!where.kind || snapshot.kind === where.kind)
          && (!where.status || snapshot.status === where.status)
        ))
        .sort((a, b) => b.createdAt - a.createdAt)[0] || null,
      findUnique: async ({ where }) => {
        if (where.id) return snapshots.find((snapshot) => snapshot.id === where.id) || null;
        if (where.kind_checksum) {
          return snapshots.find((snapshot) => (
            snapshot.kind === where.kind_checksum.kind
            && snapshot.checksum === where.kind_checksum.checksum
          )) || null;
        }
        return null;
      },
      create: async ({ data }) => {
        const snapshot = {
          ...data,
          id: 'draft-1',
          createdAt: new Date('2026-07-10T00:00:00.000Z'),
          updatedAt: new Date('2026-07-10T00:00:00.000Z'),
        };
        snapshots.push(snapshot);
        return snapshot;
      },
      update: async ({ where, data }) => {
        const index = snapshots.findIndex((snapshot) => snapshot.id === where.id);
        snapshots[index] = {
          ...snapshots[index],
          ...data,
          updatedAt: new Date('2026-07-10T00:01:00.000Z'),
        };
        return snapshots[index];
      },
    },
  });

  const draft = await service.createDraftSnapshot();
  const editedPayload = createValidPayload({
    source: { reading: 'edited-json' },
  });
  const updatedDraft = await service.updateDraftSnapshot(draft.id, editedPayload);
  const report = await service.validateDraftSnapshot(draft.id);
  const published = await service.publishDraftSnapshot(draft.id);
  const latest = await service.getLatestContentSnapshot();

  assert.equal(updatedDraft.status, 'draft');
  assert.equal(report.valid, true);
  assert.equal(published.deduped, false);
  assert.equal(published.snapshot.id, 'draft-1');
  assert.equal(published.snapshot.status, 'published');
  assert.equal(latest.id, 'draft-1');
  assert.equal(latest.payload.source.reading, 'edited-json');
});
