const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);

// In-memory stand-in for the Prisma client: no database is touched.
const rows = new Map();
const fakePrisma = {
  mailAccount: {
    findUnique: async ({ where }) => rows.get(where.id) || null,
    update: async ({ where, data }) => {
      const next = { ...rows.get(where.id), ...data };
      rows.set(where.id, next);
      return next;
    },
  },
};
const prismaPath = require.resolve(path.join(__dirname, 'prismaService.js'));
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };

const { encrypt } = require('../utils/encryption');
const mailAccountService = require('./mailAccountService');

const seed = (overrides = {}) => {
  const row = {
    id: 'acc_1',
    provider: 'gmail',
    name: 'Work',
    emailAddress: 'admin@example.com',
    clientId: 'client-a',
    clientSecret: encrypt('super-secret'),
    redirectUri: 'http://localhost:5173',
    refreshToken: encrypt('refresh-token'),
    grantedScopes: 'https://www.googleapis.com/auth/gmail.modify',
    allowPermanentDelete: false,
    status: 'connected',
    providerConfig: {},
    isDefault: true,
    connectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  rows.set(row.id, row);
  return row;
};

test('updateAccount without a secret keeps the stored ciphertext untouched', async () => {
  const original = seed();
  await mailAccountService.updateAccount('acc_1', { name: 'Renamed' });
  const after = rows.get('acc_1');
  assert.strictEqual(after.name, 'Renamed');
  assert.strictEqual(after.clientSecret, original.clientSecret, 'clientSecret ciphertext unchanged');
  assert.strictEqual(after.refreshToken, original.refreshToken, 'refreshToken ciphertext unchanged');
});

test('updateAccount with a new secret stores it encrypted, never as plaintext', async () => {
  const original = seed();
  await mailAccountService.updateAccount('acc_1', { clientSecret: 'brand-new-secret' });
  const after = rows.get('acc_1');
  assert.notStrictEqual(after.clientSecret, original.clientSecret);
  assert.ok(!after.clientSecret.includes('brand-new-secret'), 'plaintext must not be stored');
  assert.strictEqual(after.clientSecret.split(':').length, 3, 'AES-GCM iv:tag:data format');
});

test('changing clientId disconnects the account (token is bound to the OAuth client)', async () => {
  seed();
  await mailAccountService.updateAccount('acc_1', { clientId: 'client-b' });
  const after = rows.get('acc_1');
  assert.strictEqual(after.clientId, 'client-b');
  assert.strictEqual(after.refreshToken, null);
  assert.strictEqual(after.grantedScopes, null);
  assert.strictEqual(after.status, 'disconnected');
});

test('re-saving the same clientId does not disconnect the account', async () => {
  seed();
  await mailAccountService.updateAccount('acc_1', { clientId: 'client-a' });
  assert.strictEqual(rows.get('acc_1').status, 'connected');
  assert.ok(rows.get('acc_1').refreshToken);
});

test('the safe account projection never carries secrets', async () => {
  seed();
  const safe = await mailAccountService.updateAccount('acc_1', { name: 'Again' });
  const text = JSON.stringify(safe);
  assert.ok(!('clientSecret' in safe) && !('refreshToken' in safe));
  assert.ok(!text.includes('super-secret') && !text.includes('refresh-token'));
  assert.strictEqual(safe.hasClientSecret, true);
});
