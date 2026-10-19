const test = require('node:test');
const assert = require('node:assert');
const { createState, verifyState, STATE_TTL_MS } = require('./oauthState');

const secret = 'unit-test-secret';
const base = { provider: 'gmail', accountId: 'acc_1', userId: 'user_1' };

test('round trip returns provider and accountId', () => {
  const state = createState(base, { secret, now: 1000 });
  const parsed = JSON.parse(state);
  assert.strictEqual(parsed.kind, 'mail');
  assert.strictEqual(parsed.userId, undefined, 'user id must not be transmitted');
  assert.deepStrictEqual(verifyState(state, { userId: 'user_1', secret, now: 2000 }), { provider: 'gmail', accountId: 'acc_1' });
});

test('expired state rejected (10 minute TTL)', () => {
  const state = createState(base, { secret, now: 0 });
  assert.doesNotThrow(() => verifyState(state, { userId: 'user_1', secret, now: STATE_TTL_MS - 1 }));
  assert.throws(() => verifyState(state, { userId: 'user_1', secret, now: STATE_TTL_MS + 1 }), { code: 'VALIDATION', status: 400 });
});

test('state bound to the user that created it', () => {
  const state = createState(base, { secret, now: 0 });
  assert.throws(() => verifyState(state, { userId: 'user_2', secret, now: 1 }), { code: 'VALIDATION' });
});

test('tampered accountId / exp / sig rejected', () => {
  const p = JSON.parse(createState(base, { secret, now: 0 }));
  for (const patch of [{ accountId: 'acc_2' }, { exp: p.exp + 1 }, { provider: 'yahoo' }, { sig: p.sig.slice(0, -1) + (p.sig.endsWith('A') ? 'B' : 'A') }, { sig: 'x' }]) {
    assert.throws(() => verifyState(JSON.stringify({ ...p, ...patch }), { userId: 'user_1', secret, now: 1 }), { code: 'VALIDATION' });
  }
});

test('wrong secret, junk, drive-style state and non-string rejected', () => {
  const state = createState(base, { secret, now: 0 });
  assert.throws(() => verifyState(state, { userId: 'user_1', secret: 'other', now: 1 }));
  for (const bad of ['', 'not json', '{"driveConfigId":"abc"}', '{"kind":"drive"}', null, undefined, 42, 'x'.repeat(5000)]) {
    assert.throws(() => verifyState(bad, { userId: 'user_1', secret, now: 1 }), { code: 'VALIDATION' });
  }
  assert.throws(() => verifyState(state, { secret, now: 1 }), { code: 'VALIDATION' });
});

test('exp far in the future (forged TTL) rejected', () => {
  const p = JSON.parse(createState(base, { secret, now: 0 }));
  const forged = { ...p, exp: 10 * 365 * 24 * 3600 * 1000 };
  assert.throws(() => verifyState(JSON.stringify(forged), { userId: 'user_1', secret, now: 1 }));
});

test('the default key is derived, not the raw JWT secret', () => {
  const { JWT_SECRET } = require('../../config/jwt');
  const state = createState(base, { now: 1000 }); // default key
  assert.deepStrictEqual(verifyState(state, { userId: 'user_1', now: 2000 }), { provider: 'gmail', accountId: 'acc_1' });
  // A state signed directly with the JWT secret (the old behaviour) must not verify.
  const legacy = createState(base, { secret: JWT_SECRET, now: 1000 });
  assert.throws(() => verifyState(legacy, { userId: 'user_1', now: 2000 }), { code: 'VALIDATION' });
});
