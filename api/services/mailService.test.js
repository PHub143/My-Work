const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);

const { MailError } = require('./mail/errors');
const oauthState = require('./mail/oauthState');

// ---- stand-ins for the persistence layer and the provider registry --------

const calls = { exchange: [], connect: [], reauth: [], applyAction: [] };
const reset = () => {
  Object.keys(calls).forEach((k) => { calls[k] = []; });
};

let account = {
  id: 'acc_1',
  provider: 'gmail',
  status: 'connected',
  clientId: 'c',
  clientSecret: 's',
  refreshToken: 'r',
  redirectUri: 'http://localhost:5173/',
  grantedScopes: 'https://www.googleapis.com/auth/gmail.modify',
};

const fakeProvider = {
  capabilities: (a) => ({ permanentDelete: String(a.grantedScopes || '').includes('https://mail.google.com/') }),
  exchangeCode: async (a, code) => {
    calls.exchange.push([a.id, code]);
    return { refreshToken: 'new-refresh', grantedScopes: 'scope', emailAddress: 'me@example.com' };
  },
  applyAction: async (a, req) => {
    calls.applyAction.push(req);
    return { updated: req.ids.length, failed: [] };
  },
  listFolders: async () => {
    throw fakeProvider.nextError;
  },
  nextError: null,
};

const stub = (rel, exports) => {
  const resolved = require.resolve(path.join(__dirname, rel));
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
};

stub('mailAccountService.js', {
  getAccountWithSecrets: async () => account,
  getConnectedAccount: async () => account,
  completeConnection: async (id, result) => {
    calls.connect.push([id, result]);
    return { id, emailAddress: result.emailAddress, status: 'connected' };
  },
  markReauthRequired: async (id) => {
    calls.reauth.push(id);
  },
});
stub('mail/providers/index.js', {
  getProvider: () => fakeProvider,
  hasProvider: () => true,
  listProviders: () => [],
});

const mailService = require('./mailService');

const googleError = (status, data) => Object.assign(new Error('boom'), { name: 'GaxiosError', response: { status, data } });

// ------------------------------------------------------------ completeOAuth

test('completeOAuth exchanges the code and stores the connection', async () => {
  reset();
  const state = oauthState.createState({ provider: 'gmail', accountId: 'acc_1', userId: 'admin_1' });
  const result = await mailService.completeOAuth({ code: 'the-code', state, userId: 'admin_1' });
  assert.deepStrictEqual(calls.exchange, [['acc_1', 'the-code']]);
  assert.strictEqual(calls.connect.length, 1);
  assert.strictEqual(calls.connect[0][1].refreshToken, 'new-refresh');
  assert.strictEqual(result.emailAddress, 'me@example.com');
});

test('completeOAuth rejects a state minted for a different admin', async () => {
  reset();
  const state = oauthState.createState({ provider: 'gmail', accountId: 'acc_1', userId: 'admin_1' });
  await assert.rejects(mailService.completeOAuth({ code: 'c', state, userId: 'admin_2' }), { code: 'VALIDATION', status: 400 });
  assert.strictEqual(calls.exchange.length, 0, 'no code exchange may happen');
  assert.strictEqual(calls.connect.length, 0);
});

test('completeOAuth rejects a tampered or foreign state', async () => {
  reset();
  const good = JSON.parse(oauthState.createState({ provider: 'gmail', accountId: 'acc_1', userId: 'admin_1' }));
  const tampered = JSON.stringify({ ...good, accountId: 'acc_other' });
  await assert.rejects(mailService.completeOAuth({ code: 'c', state: tampered, userId: 'admin_1' }), { code: 'VALIDATION' });
  // A Drive-style state has no kind:'mail'
  await assert.rejects(mailService.completeOAuth({ code: 'c', state: JSON.stringify({ driveConfigId: 'd1' }), userId: 'admin_1' }), { code: 'VALIDATION' });
  assert.strictEqual(calls.exchange.length, 0);
});

test('completeOAuth rejects when the state provider does not match the account row', async () => {
  reset();
  const state = oauthState.createState({ provider: 'outlook', accountId: 'acc_1', userId: 'admin_1' });
  await assert.rejects(mailService.completeOAuth({ code: 'c', state, userId: 'admin_1' }), { code: 'VALIDATION' });
  assert.strictEqual(calls.exchange.length, 0);
});

// -------------------------------------------------- reauth flagging / scopes

test('invalid_grant from Google flags the account and surfaces MAIL_REAUTH_REQUIRED', async () => {
  reset();
  fakeProvider.nextError = googleError(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' });
  await assert.rejects(mailService.listFolders('acc_1'), { code: 'MAIL_REAUTH_REQUIRED', status: 412 });
  assert.deepStrictEqual(calls.reauth, ['acc_1']);
});

test('ordinary upstream failures do not flag the account', async () => {
  reset();
  fakeProvider.nextError = googleError(500, { error: { message: 'backend error', code: 500 } });
  await assert.rejects(mailService.listFolders('acc_1'), { code: 'UPSTREAM', status: 502 });
  assert.deepStrictEqual(calls.reauth, []);
});

test('provider errors never leak the original Google error object', async () => {
  reset();
  const err = googleError(403, { error: { message: 'Bearer ya29.SECRETSECRETSECRET denied', errors: [{ reason: 'forbidden' }] } });
  err.config = { headers: { Authorization: 'Bearer ya29.SECRETSECRETSECRET' } };
  fakeProvider.nextError = err;
  try {
    await mailService.listFolders('acc_1');
    assert.fail('should throw');
  } catch (e) {
    assert.ok(e instanceof MailError);
    assert.ok(!JSON.stringify({ m: e.message, c: e.code }).includes('SECRETSECRET'));
    assert.strictEqual(e.config, undefined);
    assert.strictEqual(e.response, undefined);
  }
});

test('deleteForever is refused before reaching the provider without the full-mail scope', async () => {
  reset();
  await assert.rejects(
    mailService.applyAction('acc_1', { target: 'threads', ids: ['t1'], action: 'deleteForever' }),
    { code: 'SCOPE_REQUIRED', status: 403 }
  );
  assert.strictEqual(calls.applyAction.length, 0);

  account = { ...account, grantedScopes: 'https://mail.google.com/' };
  const ok = await mailService.applyAction('acc_1', { target: 'threads', ids: ['t1'], action: 'deleteForever' });
  assert.strictEqual(ok.updated, 1);
  assert.strictEqual(calls.applyAction.length, 1);
});
