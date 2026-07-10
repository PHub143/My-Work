const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '../services/learningResultService.js');
const controllerPath = path.resolve(__dirname, './learningResultController.js');

function loadController(mockService) {
  delete require.cache[controllerPath];
  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: mockService,
  };

  return require('./learningResultController');
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('createResult validates and stores a learning result for req.user.id', async () => {
  const calls = [];
  const controller = loadController({
    createLearningResult: async (userId, data) => {
      calls.push({ userId, data });
      return { id: 'result-1', userId, ...data };
    },
  });
  const req = {
    user: { id: 'student-1' },
    body: {
      kind: 'reading',
      raw: 82,
      scaled: 405,
      total: 100,
      duration: 4380,
      perPart: { 5: { correct: 25, total: 30 } },
      perTag: { 'word-forms': { correct: 8, total: 10 } },
      payload: { mode: 'full' },
    },
  };
  const res = createResponse();

  await controller.createResult(req, res, assert.fail);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.result.id, 'result-1');
  assert.deepEqual(calls, [{
    userId: 'student-1',
    data: req.body,
  }]);
});

test('createResult rejects invalid kinds and malformed JSON fields', async () => {
  const controller = loadController({
    createLearningResult: async () => assert.fail('service should not be called'),
  });

  const invalidKindResponse = createResponse();
  await controller.createResult({
    user: { id: 'student-1' },
    body: { kind: 'quiz' },
  }, invalidKindResponse, assert.fail);
  assert.equal(invalidKindResponse.statusCode, 400);

  const invalidShapeResponse = createResponse();
  await controller.createResult({
    user: { id: 'student-1' },
    body: { kind: 'reading', perTag: [] },
  }, invalidShapeResponse, assert.fail);
  assert.equal(invalidShapeResponse.statusCode, 400);
});

test('listResults filters by kind and caps the result limit', async () => {
  const calls = [];
  const controller = loadController({
    getLearningResults: async (userId, query) => {
      calls.push({ userId, query });
      return [{ id: 'result-1', kind: query.kind }];
    },
  });
  const res = createResponse();

  await controller.listResults({
    user: { id: 'student-1' },
    query: { kind: 'listening', limit: '500' },
  }, res, assert.fail);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { results: [{ id: 'result-1', kind: 'listening' }] });
  assert.deepEqual(calls, [{
    userId: 'student-1',
    query: { kind: 'listening', limit: 100 },
  }]);
});
