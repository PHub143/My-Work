const test = require('node:test');
const assert = require('node:assert');

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);

const { _internals } = require('./mailController');
const { parseCompose, parseActionBody, parseListQuery, parseAddressField, contentDisposition, requireId } = _internals;

const isValidation = { code: 'VALIDATION', status: 400 };

// ------------------------------------------------------------------ ids

test('requireId accepts Gmail-style ids and rejects path/odd input', () => {
  assert.strictEqual(requireId('18c2f0a1b2c3d4e5', 'id'), '18c2f0a1b2c3d4e5');
  assert.strictEqual(requireId('r-123456789', 'id'), 'r-123456789');
  for (const bad of ['', '../etc', 'a/b', 'a b', 'x'.repeat(129), 42, null, undefined, {}]) {
    assert.throws(() => requireId(bad, 'id'), isValidation, `accepted ${JSON.stringify(bad)}`);
  }
});

// ----------------------------------------------------------- list query

test('parseListQuery applies defaults and bounds', () => {
  assert.deepStrictEqual(parseListQuery({}), { q: undefined, pageToken: undefined, pageSize: 25 });
  assert.strictEqual(parseListQuery({ pageSize: '50' }).pageSize, 50);
  assert.strictEqual(parseListQuery({ q: 'from:bob', pageToken: 'abc123' }).q, 'from:bob');
  for (const pageSize of ['0', '51', '-1', 'abc', '1.5', '1000']) {
    assert.throws(() => parseListQuery({ pageSize }), isValidation, `pageSize ${pageSize}`);
  }
  assert.throws(() => parseListQuery({ q: 'x'.repeat(501) }), isValidation);
  assert.throws(() => parseListQuery({ pageToken: 'a b' }), isValidation);
  assert.throws(() => parseListQuery({ pageToken: '../x' }), isValidation);
});

// --------------------------------------------------------- action body

test('parseActionBody validates ids and the action enum', () => {
  assert.deepStrictEqual(parseActionBody({ ids: ['a', 'b'], action: 'archive' }), { ids: ['a', 'b'], action: 'archive' });
  assert.deepStrictEqual(parseActionBody({ ids: ['a', 'a'], action: 'trash' }).ids, ['a'], 'duplicates collapse');
  for (const body of [
    null,
    [],
    {},
    { ids: [], action: 'archive' },
    { ids: ['a'], action: 'rm -rf' },
    { ids: ['a'] },
    { ids: 'a', action: 'archive' },
    { ids: ['a/b'], action: 'archive' },
  ]) {
    assert.throws(() => parseActionBody(body), isValidation, JSON.stringify(body));
  }
  assert.throws(() => parseActionBody({ ids: Array.from({ length: 101 }, (_, i) => `id${i}`), action: 'archive' }), isValidation);
  assert.strictEqual(parseActionBody({ ids: Array.from({ length: 100 }, (_, i) => `id${i}`), action: 'archive' }).ids.length, 100);
});

test('label action needs at least one valid label id', () => {
  assert.throws(() => parseActionBody({ ids: ['a'], action: 'label' }), isValidation);
  assert.throws(() => parseActionBody({ ids: ['a'], action: 'label', addLabelIds: ['bad id!'] }), isValidation);
  const ok = parseActionBody({ ids: ['a'], action: 'label', addLabelIds: ['Label_1'], removeLabelIds: ['INBOX'] });
  assert.deepStrictEqual(ok.addLabelIds, ['Label_1']);
  assert.deepStrictEqual(ok.removeLabelIds, ['INBOX']);
  // label ids are ignored for non-label actions
  assert.strictEqual(parseActionBody({ ids: ['a'], action: 'archive', addLabelIds: ['X'] }).addLabelIds, undefined);
});

// -------------------------------------------------------------- compose

const compose = (overrides) => ({ to: [{ email: 'a@example.com' }], subject: 'Hi', bodyText: 'Body', ...overrides });

test('parseCompose normalises recipients given as objects or "Name <addr>" strings', () => {
  const out = parseCompose(compose({ to: ['Ann <ann@example.com>', { name: 'Bo', email: 'bo@example.com' }] }), { requireRecipient: true });
  assert.deepStrictEqual(out.to, [
    { name: 'Ann', email: 'ann@example.com' },
    { name: 'Bo', email: 'bo@example.com' },
  ]);
});

test('send requires a recipient, drafts do not', () => {
  assert.throws(() => parseCompose({ subject: 'x', bodyText: 'y' }, { requireRecipient: true }), isValidation);
  assert.doesNotThrow(() => parseCompose({ subject: 'x', bodyText: 'y' }, { requireRecipient: false }));
  assert.doesNotThrow(() => parseCompose({}, { requireRecipient: false }));
});

test('header injection is rejected in subject, display name and address', () => {
  assert.throws(() => parseCompose(compose({ subject: 'Hi\r\nBcc: evil@example.com' }), { requireRecipient: true }), isValidation);
  assert.throws(() => parseCompose(compose({ to: [{ name: 'A\nBcc: x@y.co', email: 'a@example.com' }] }), { requireRecipient: true }), isValidation);
  assert.throws(() => parseCompose(compose({ to: [{ email: 'a@example.com\r\nBcc: x@y.co' }] }), { requireRecipient: true }), isValidation);
  assert.throws(() => parseCompose(compose({ subject: 'nul\0byte' }), { requireRecipient: true }), isValidation);
});

test('malformed addresses and wrong types are rejected', () => {
  for (const to of [[{ email: 'not-an-email' }], [{ email: 'a@b' }], [{ email: 5 }], 'a@example.com', [42], [null]]) {
    assert.throws(() => parseCompose(compose({ to }), { requireRecipient: true }), isValidation, JSON.stringify(to));
  }
  assert.throws(() => parseCompose(compose({ subject: 5 }), { requireRecipient: true }), isValidation);
  assert.throws(() => parseCompose(compose({ bodyText: 5 }), { requireRecipient: true }), isValidation);
});

test('body is capped at 90 KB (bytes, not characters)', () => {
  const limit = 90 * 1024;
  assert.doesNotThrow(() => parseCompose(compose({ bodyText: 'a'.repeat(limit) }), { requireRecipient: true }));
  assert.throws(() => parseCompose(compose({ bodyText: 'a'.repeat(limit + 1) }), { requireRecipient: true }), isValidation);
  // 3-byte characters: 30,000 chars = 90,000 bytes (ok); 31,000 chars = 93,000 bytes (too big)
  assert.doesNotThrow(() => parseCompose(compose({ bodyText: '€'.repeat(30000) }), { requireRecipient: true }));
  assert.throws(() => parseCompose(compose({ bodyText: '€'.repeat(31000) }), { requireRecipient: true }), isValidation);
});

test('recipient counts are bounded per field and in total', () => {
  const many = (n) => Array.from({ length: n }, (_, i) => ({ email: `u${i}@example.com` }));
  assert.throws(() => parseCompose(compose({ to: many(51) }), { requireRecipient: true }), isValidation);
  assert.throws(() => parseCompose(compose({ to: many(50), cc: many(50), bcc: many(1) }), { requireRecipient: true }), isValidation);
  assert.doesNotThrow(() => parseCompose(compose({ to: many(50), cc: many(50) }), { requireRecipient: true }));
});

test('parseAddressField treats undefined/null as empty and non-arrays as invalid', () => {
  assert.deepStrictEqual(parseAddressField(undefined, 'cc'), []);
  assert.deepStrictEqual(parseAddressField(null, 'cc'), []);
  assert.throws(() => parseAddressField('a@example.com', 'cc'), isValidation);
});

test('threadId / replyToMessageId must look like ids', () => {
  assert.strictEqual(parseCompose(compose({ threadId: 'abc123' }), { requireRecipient: true }).threadId, 'abc123');
  assert.throws(() => parseCompose(compose({ threadId: '../x' }), { requireRecipient: true }), isValidation);
  assert.throws(() => parseCompose(compose({ replyToMessageId: 'a b' }), { requireRecipient: true }), isValidation);
});

// ----------------------------------------------------- content disposition

test('contentDisposition is always an attachment with a safe ASCII fallback', () => {
  const v = contentDisposition('report "final"; v2.pdf');
  assert.ok(v.startsWith('attachment; filename="'));
  assert.ok(!/[\r\n]/.test(v));
  assert.ok(!/filename="[^"]*"[^;]*"/.test(v), 'inner quote must not break out of the filename');
  assert.ok(v.includes("filename*=UTF-8''"));
});

test('contentDisposition strips control chars and path separators and handles unicode', () => {
  const v = contentDisposition('..\\..//etc/pass\r\nwd\u0000.txt');
  assert.ok(!/[\r\n\0]/.test(v));
  assert.ok(!v.includes('/') || v.includes("UTF-8''"), 'no raw slash in the ASCII part');
  const vi = contentDisposition('Hình ảnh.png');
  assert.ok(vi.includes("UTF-8''H%C3%ACnh%20%E1%BA%A3nh.png"));
  assert.ok(/^attachment; filename="[\x20-\x7E]*";/.test(vi));
  assert.ok(contentDisposition('').includes('filename="attachment"'));
  assert.ok(contentDisposition(undefined).includes('filename="attachment"'));
});
