const test = require('node:test');
const assert = require('node:assert');

// Replace googleapis with a controllable fake BEFORE the provider loads.
const state = { gmail: null, credentials: [] };
const googlePath = require.resolve('googleapis');
require.cache[googlePath] = {
  id: googlePath,
  filename: googlePath,
  loaded: true,
  exports: {
    google: {
      auth: {
        OAuth2: class {
          setCredentials(c) { state.credentials.push(c); }
          generateAuthUrl() { return 'https://accounts.google.com/o/oauth2/v2/auth'; }
        },
      },
      gmail: () => state.gmail,
    },
  },
};

const provider = require('./gmailProvider');

// No `id` => the provider skips its per-account client cache, so every test
// gets the fake client it installed.
const account = {
  clientId: 'client',
  clientSecret: 'secret',
  redirectUri: 'http://localhost:5173/',
  refreshToken: 'refresh',
  emailAddress: 'me@example.com',
  grantedScopes: 'https://www.googleapis.com/auth/gmail.modify',
};
const fullScopeAccount = { ...account, grantedScopes: 'https://mail.google.com/' };

const gerr = (status, extra = {}) => Object.assign(new Error('google error'), {
  name: 'GaxiosError',
  response: { status, data: { error: { code: status, message: 'nope', ...extra } } },
});

const thread = (id, { labelIds = ['INBOX'], subject = `Subject ${id}`, from = 'Ann <ann@example.com>' } = {}) => ({
  id,
  snippet: `snippet ${id}`,
  messages: [{
    id: `${id}-m1`,
    threadId: id,
    labelIds,
    snippet: `snippet ${id}`,
    internalDate: '1760400000000',
    payload: { mimeType: 'text/plain', headers: [{ name: 'From', value: from }, { name: 'Subject', value: subject }] },
  }],
});

// ------------------------------------------------------------ applyAction

test('thread trash: partial failure reports failed ids and the rest succeed', async () => {
  const seen = [];
  state.gmail = { users: { threads: {
    trash: async ({ id }) => {
      seen.push(id);
      if (id === 't2') throw gerr(404);
      return { data: {} };
    },
  } } };
  const result = await provider.applyAction(account, { target: 'threads', ids: ['t1', 't2', 't3'], action: 'trash' });
  assert.deepStrictEqual(result, { updated: 2, failed: ['t2'] });
  assert.deepStrictEqual(seen.sort(), ['t1', 't2', 't3']);
});

test('thread action where every id fails throws instead of reporting success', async () => {
  state.gmail = { users: { threads: { trash: async () => { throw gerr(404); } } } };
  await assert.rejects(
    provider.applyAction(account, { target: 'threads', ids: ['a', 'b'], action: 'trash' }),
    { code: 'NOT_FOUND' }
  );
});

test('an auth failure aborts the whole action as reauth-required', async () => {
  let attempts = 0;
  state.gmail = { users: { threads: { trash: async () => { attempts += 1; throw gerr(401); } } } };
  await assert.rejects(
    provider.applyAction(account, { target: 'threads', ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], action: 'trash' }),
    { code: 'MAIL_REAUTH_REQUIRED' }
  );
  assert.ok(attempts < 8, `stopped early after ${attempts} calls`);
});

test('archive maps to removing INBOX and uses threads.modify per id', async () => {
  const bodies = [];
  state.gmail = { users: { threads: { modify: async ({ id, requestBody }) => { bodies.push([id, requestBody]); return { data: {} }; } } } };
  const result = await provider.applyAction(account, { target: 'threads', ids: ['t1'], action: 'archive' });
  assert.deepStrictEqual(result, { updated: 1, failed: [] });
  assert.deepStrictEqual(bodies, [['t1', { addLabelIds: [], removeLabelIds: ['INBOX'] }]]);
});

test('message actions use one batchModify call', async () => {
  const batches = [];
  state.gmail = { users: { messages: { batchModify: async ({ requestBody }) => { batches.push(requestBody); return { data: {} }; } } } };
  const result = await provider.applyAction(account, { target: 'messages', ids: ['m1', 'm2'], action: 'markRead' });
  assert.deepStrictEqual(result, { updated: 2, failed: [] });
  assert.deepStrictEqual(batches, [{ ids: ['m1', 'm2'], addLabelIds: [], removeLabelIds: ['UNREAD'] }]);
});

test('deleteForever without the full-mail scope is refused before any API call', async () => {
  let called = false;
  state.gmail = { users: { threads: { delete: async () => { called = true; } }, messages: { batchDelete: async () => { called = true; } } } };
  await assert.rejects(
    provider.applyAction(account, { target: 'threads', ids: ['t1'], action: 'deleteForever' }),
    { code: 'SCOPE_REQUIRED' }
  );
  assert.strictEqual(called, false);
});

test('deleteForever with the scope: threads.delete per id, messages.batchDelete once', async () => {
  const deleted = [];
  const batched = [];
  state.gmail = { users: {
    threads: { delete: async ({ id }) => { deleted.push(id); return { data: {} }; } },
    messages: { batchDelete: async ({ requestBody }) => { batched.push(requestBody.ids); return { data: {} }; } },
  } };
  await provider.applyAction(fullScopeAccount, { target: 'threads', ids: ['t1', 't2'], action: 'deleteForever' });
  await provider.applyAction(fullScopeAccount, { target: 'messages', ids: ['m1', 'm2'], action: 'deleteForever' });
  assert.deepStrictEqual(deleted.sort(), ['t1', 't2']);
  assert.deepStrictEqual(batched, [['m1', 'm2']]);
});

// ------------------------------------------------------------ listThreads

test('listThreads builds the query, summarises threads and drops ones deleted meanwhile', async () => {
  let listParams;
  state.gmail = { users: { threads: {
    list: async (params) => {
      listParams = params;
      return { data: { threads: [{ id: 't1' }, { id: 't2' }, { id: 't3' }], nextPageToken: 'NEXT', resultSizeEstimate: 99 } };
    },
    get: async ({ id }) => {
      if (id === 't2') throw gerr(404);
      return { data: thread(id, { labelIds: id === 't1' ? ['INBOX', 'UNREAD'] : ['INBOX'] }) };
    },
  } } };
  const out = await provider.listThreads(account, { folderId: 'INBOX', q: 'from:ann', pageToken: 'TOKEN', pageSize: 10 });
  assert.deepStrictEqual(listParams, { userId: 'me', maxResults: 10, labelIds: ['INBOX'], q: 'from:ann', pageToken: 'TOKEN' });
  assert.deepStrictEqual(out.threads.map((t) => t.id), ['t1', 't3']);
  assert.strictEqual(out.threads[0].unread, true);
  assert.strictEqual(out.threads[1].unread, false);
  assert.strictEqual(out.threads[0].from.email, 'ann@example.com');
  assert.strictEqual(out.nextPageToken, 'NEXT');
  assert.strictEqual(out.resultSizeEstimate, 99);
});

test('listThreads: TRASH/SPAM include spam+trash, ALL sends no label filter', async () => {
  const seen = [];
  state.gmail = { users: { threads: { list: async (params) => { seen.push(params); return { data: {} }; } } } };
  await provider.listThreads(account, { folderId: 'TRASH' });
  await provider.listThreads(account, { folderId: 'SPAM' });
  await provider.listThreads(account, { folderId: 'ALL' });
  await provider.listThreads(account, {});
  assert.strictEqual(seen[0].includeSpamTrash, true);
  assert.strictEqual(seen[1].includeSpamTrash, true);
  assert.strictEqual(seen[2].labelIds, undefined);
  assert.strictEqual(seen[2].includeSpamTrash, undefined);
  assert.deepStrictEqual(seen[3].labelIds, ['INBOX'], 'defaults to INBOX');
  assert.strictEqual(seen[3].maxResults, 25);
});

test('listThreads never runs more than 4 thread fetches at once', async () => {
  let active = 0;
  let peak = 0;
  state.gmail = { users: { threads: {
    list: async () => ({ data: { threads: Array.from({ length: 12 }, (_, i) => ({ id: `t${i}` })) } }),
    get: async ({ id }) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return { data: thread(id) };
    },
  } } };
  const out = await provider.listThreads(account, { folderId: 'INBOX' });
  assert.strictEqual(out.threads.length, 12);
  assert.ok(peak <= 4, `peak concurrency was ${peak}`);
  assert.ok(peak > 1, 'fetches should overlap');
});

// ---------------------------------------------------------- getAttachment

test('getAttachment with both hints does not re-fetch the message', async () => {
  let messageFetches = 0;
  state.gmail = { users: { messages: {
    attachments: { get: async () => ({ data: { data: Buffer.from('hello').toString('base64url') } }) },
    get: async () => { messageFetches += 1; return { data: {} }; },
  } } };
  const file = await provider.getAttachment(account, 'm1', 'att1', { filename: 'a.txt', mimeType: 'text/plain' });
  assert.strictEqual(file.data.toString(), 'hello');
  assert.strictEqual(file.filename, 'a.txt');
  assert.strictEqual(file.mimeType, 'text/plain');
  assert.strictEqual(messageFetches, 0, 'no extra full-message fetch (20 quota units)');
});

test('getAttachment without hints recovers filename and type from the message', async () => {
  state.gmail = { users: { messages: {
    attachments: { get: async () => ({ data: { data: Buffer.from('pdf-bytes').toString('base64url') } }) },
    get: async () => ({ data: {
      id: 'm1',
      payload: { mimeType: 'multipart/mixed', headers: [], parts: [
        { mimeType: 'text/plain', body: { data: Buffer.from('hi').toString('base64url') }, headers: [] },
        { mimeType: 'application/pdf', filename: 'Invoice.pdf', headers: [], body: { attachmentId: 'att1', size: 9 } },
      ] },
    } }),
  } } };
  const file = await provider.getAttachment(account, 'm1', 'att1', {});
  assert.strictEqual(file.filename, 'Invoice.pdf');
  assert.strictEqual(file.mimeType, 'application/pdf');
});

test('getAttachment falls back to a generic type when nothing is known', async () => {
  state.gmail = { users: { messages: {
    attachments: { get: async () => ({ data: { data: '' } }) },
    get: async () => { throw gerr(404); },
  } } };
  const file = await provider.getAttachment(account, 'm1', 'att1', {});
  assert.strictEqual(file.filename, 'attachment');
  assert.strictEqual(file.mimeType, 'application/octet-stream');
});

// -------------------------------------------------------------- getThread

test('getThread returns messages in order, hydrated', async () => {
  const msg = (id, text) => ({
    id,
    threadId: 'T',
    labelIds: ['INBOX'],
    snippet: text,
    internalDate: '1760400000000',
    payload: { mimeType: 'text/plain', headers: [{ name: 'From', value: 'a@example.com' }, { name: 'Subject', value: 'S' }], body: { data: Buffer.from(text).toString('base64url') } },
  });
  state.gmail = { users: { threads: { get: async () => ({ data: { id: 'T', messages: [msg('m1', 'first'), msg('m2', 'second'), msg('m3', 'third')] } }) } } };
  const out = await provider.getThread(account, 'T');
  assert.deepStrictEqual(out.messages.map((m) => m.id), ['m1', 'm2', 'm3']);
  assert.deepStrictEqual(out.messages.map((m) => m.bodyText), ['first', 'second', 'third']);
  assert.strictEqual(out.messageCount, 3);
});

// ------------------------------------------------------- provider metadata

test('provider declares its permanent-delete support and scope-derived capability', () => {
  assert.strictEqual(provider.supportsPermanentDelete, true);
  assert.strictEqual(provider.capabilities(account).permanentDelete, false);
  assert.strictEqual(provider.capabilities(fullScopeAccount).permanentDelete, true);
});

test('a missing refresh token reports MAIL_NOT_CONNECTED', async () => {
  await assert.rejects(provider.listFolders({ ...account, refreshToken: null }), { code: 'MAIL_NOT_CONNECTED' });
});
