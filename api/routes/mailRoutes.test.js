const test = require('node:test');
const assert = require('node:assert');

// ENCRYPTION_KEY is read when utils/encryption.js loads; routes pull it in
// transitively, so give it a throwaway key (dotenv never overrides an
// existing variable).
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);

const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');
const router = require('./mailRoutes');

test('every /mail route sits behind authenticateToken then isAdmin', () => {
  const stack = router.stack;
  assert.ok(stack.length > 2, 'router has layers');
  // router.use(authenticateToken, isAdmin) is registered before any route, so
  // no route layer can run without passing both.
  assert.strictEqual(stack[0].handle, authenticateToken, 'first layer authenticates');
  assert.strictEqual(stack[1].handle, isAdmin, 'second layer checks the admin role');

  const routeLayers = stack.filter((layer) => layer.route);
  assert.ok(routeLayers.length >= 20, `expected the mail endpoints, got ${routeLayers.length}`);
  routeLayers.forEach((layer) => {
    assert.ok(stack.indexOf(layer) > 1, `route ${layer.route.path} is registered after the guards`);
  });
});

test('mail routes expose no public (unauthenticated) endpoint', () => {
  const guardIndex = router.stack.findIndex((layer) => layer.handle === isAdmin);
  const before = router.stack.slice(0, guardIndex).filter((layer) => layer.route);
  assert.deepStrictEqual(before, [], 'no route is registered ahead of the guards');
});
