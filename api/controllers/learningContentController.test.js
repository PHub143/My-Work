const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '../services/learningContentService.js');
const controllerPath = path.resolve(__dirname, './learningContentController.js');

function loadController(mockService) {
  delete require.cache[controllerPath];
  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: mockService,
  };

  return require('./learningContentController');
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    sent: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.sent = payload;
      return this;
    },
  };
}

test('getLatestSnapshot returns the latest published snapshot with payload by default', async () => {
  const calls = [];
  const controller = loadController({
    getLatestContentSnapshot: async (query) => {
      calls.push(query);
      return { id: 'snapshot-1', payload: { reading: {} } };
    },
  });
  const res = createResponse();

  await controller.getLatestSnapshot({ query: {} }, res, assert.fail);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { snapshot: { id: 'snapshot-1', payload: { reading: {} } } });
  assert.deepEqual(calls, [{ kind: 'english', includePayload: true }]);
});

test('getLatestSnapshot can omit payload for lightweight summary calls', async () => {
  const calls = [];
  const controller = loadController({
    getLatestContentSnapshot: async (query) => {
      calls.push(query);
      return { id: 'snapshot-1', summary: { vocab: { cards: 300 } } };
    },
  });
  const res = createResponse();

  await controller.getLatestSnapshot({
    query: { kind: 'english', includePayload: 'false' },
  }, res, assert.fail);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, [{ kind: 'english', includePayload: false }]);
});

test('getLatestSnapshot validates query params and handles missing snapshots', async () => {
  const controller = loadController({
    getLatestContentSnapshot: async () => null,
  });

  const badKindResponse = createResponse();
  await controller.getLatestSnapshot({ query: { kind: 'math' } }, badKindResponse, assert.fail);
  assert.equal(badKindResponse.statusCode, 400);

  const badPayloadResponse = createResponse();
  await controller.getLatestSnapshot({ query: { includePayload: 'maybe' } }, badPayloadResponse, assert.fail);
  assert.equal(badPayloadResponse.statusCode, 400);

  const missingResponse = createResponse();
  await controller.getLatestSnapshot({ query: {} }, missingResponse, assert.fail);
  assert.equal(missingResponse.statusCode, 404);
});

test('listSnapshots validates admin filters and returns snapshots', async () => {
  const calls = [];
  const controller = loadController({
    listContentSnapshots: async (query) => {
      calls.push(query);
      return [{ id: 'snapshot-1', status: 'draft' }];
    },
  });
  const res = createResponse();

  await controller.listSnapshots({
    query: { status: 'draft', includePayload: 'false' },
  }, res, assert.fail);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { snapshots: [{ id: 'snapshot-1', status: 'draft' }] });
  assert.deepEqual(calls, [{ kind: 'english', status: 'draft', includePayload: false }]);

  const badStatusResponse = createResponse();
  await controller.listSnapshots({ query: { status: 'live' } }, badStatusResponse, assert.fail);
  assert.equal(badStatusResponse.statusCode, 400);
});

test('draft endpoints create, validate, publish, and return validation reports', async () => {
  const controller = loadController({
    createDraftSnapshot: async (query) => ({ id: 'draft-1', ...query }),
    updateDraftSnapshot: async () => {
      const error = new Error('Draft content validation failed.');
      error.status = 400;
      error.details = { valid: false, issues: [{ area: 'reading', message: 'Missing.' }] };
      throw error;
    },
    validateDraftSnapshot: async () => ({ valid: true, issues: [] }),
    publishDraftSnapshot: async () => ({ snapshot: { id: 'published-1' }, deduped: false }),
  });

  const createResponseBody = createResponse();
  await controller.createDraft({
    body: { kind: 'english', baseSnapshotId: 'published-1' },
  }, createResponseBody, assert.fail);
  assert.equal(createResponseBody.statusCode, 201);
  assert.equal(createResponseBody.body.snapshot.id, 'draft-1');

  const updateResponse = createResponse();
  await controller.updateDraft({
    params: { id: 'draft-1' },
    body: { payload: { schemaVersion: 1 } },
  }, updateResponse, assert.fail);
  assert.equal(updateResponse.statusCode, 400);
  assert.equal(updateResponse.body.report.valid, false);

  const validateResponse = createResponse();
  await controller.validateDraft({ params: { id: 'draft-1' } }, validateResponse, assert.fail);
  assert.deepEqual(validateResponse.body, { report: { valid: true, issues: [] } });

  const publishResponse = createResponse();
  await controller.publishDraft({ params: { id: 'draft-1' } }, publishResponse, assert.fail);
  assert.deepEqual(publishResponse.body, { snapshot: { id: 'published-1' }, deduped: false });
});

test('exportSnapshot sends the raw payload as downloadable JSON', async () => {
  const controller = loadController({
    getContentSnapshotById: async () => ({
      id: 'snapshot-1',
      payload: { schemaVersion: 1, reading: {} },
    }),
  });
  const res = createResponse();

  await controller.exportSnapshot({ params: { id: 'snapshot-1' } }, res, assert.fail);

  assert.equal(res.headers['Content-Type'], 'application/json');
  assert.match(res.headers['Content-Disposition'], /english-content-snapshot-1\.json/);
  assert.equal(res.sent, '{\n  "schemaVersion": 1,\n  "reading": {}\n}\n');
});
