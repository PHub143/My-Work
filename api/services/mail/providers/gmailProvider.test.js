const test = require('node:test');
const assert = require('node:assert');
const gmail = require('./gmailProvider');
const { MailError } = require('../errors');

const { gcall, mapLimit, parseGmailMessage, buildThreadSummary, hydrateMessage } = gmail._internals;
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64url');

const sample = () => ({
  id: 'm1',
  threadId: 't1',
  labelIds: ['INBOX', 'UNREAD', 'STARRED'],
  snippet: 'Hello there',
  internalDate: '1760000000000',
  payload: {
    mimeType: 'multipart/mixed',
    headers: [
      { name: 'From', value: '=?UTF-8?B?SsOzemVm?= <jozef@example.pl>' },
      { name: 'To', value: 'Me <me@example.com>, other@example.com' },
      { name: 'Subject', value: '=?UTF-8?Q?Za=C5=BC=C3=B3=C5=82=C4=87?=' },
      { name: 'Message-ID', value: '<abc@example.pl>' },
      { name: 'X-Secret-Header', value: 'nope' },
    ],
    parts: [
      {
        mimeType: 'multipart/related',
        parts: [
          {
            mimeType: 'multipart/alternative',
            parts: [
              { mimeType: 'text/plain', filename: '', headers: [{ name: 'Content-Type', value: 'text/plain; charset="UTF-8"' }], body: { size: 5, data: b64('hello') } },
              { mimeType: 'text/html', filename: '', headers: [{ name: 'Content-Type', value: 'text/html; charset=UTF-8' }], body: { size: 40, data: b64('<p>hi</p><img src="cid:logo@x"><img src="cid:missing">') } },
            ],
          },
          { mimeType: 'image/png', filename: 'logo.png', headers: [{ name: 'Content-ID', value: '<logo@x>' }, { name: 'Content-Disposition', value: 'inline; filename="logo.png"' }], body: { attachmentId: 'ATT_LOGO', size: 4 } },
        ],
      },
      { mimeType: 'application/pdf', filename: 'doc.pdf', headers: [{ name: 'Content-Disposition', value: 'attachment; filename="doc.pdf"' }], body: { attachmentId: 'ATT_PDF', size: 1234 } },
    ],
  },
});

test('parseGmailMessage maps headers, bodies, attachments, flags', () => {
  const { message, cidParts } = parseGmailMessage(sample());
  assert.deepStrictEqual(message.from, { name: 'Józef', email: 'jozef@example.pl' });
  assert.strictEqual(message.subject, 'Zażółć');
  assert.strictEqual(message.to.length, 2);
  assert.strictEqual(message.bodyText, 'hello');
  assert.match(message.bodyHtml, /<p>hi<\/p>/);
  assert.strictEqual(message.unread, true);
  assert.strictEqual(message.starred, true);
  assert.strictEqual(message.date, new Date(1760000000000).toISOString());
  assert.deepStrictEqual(Object.keys(message.headers), ['message-id']);
  assert.strictEqual(message.attachments.length, 2);
  assert.deepStrictEqual(message.attachments.map((a) => [a.id, a.inline]), [['ATT_LOGO', true], ['ATT_PDF', false]]);
  assert.ok(cidParts.has('logo@x'));
});

test('hydrateMessage inlines referenced cid images only, within budget', async () => {
  const fakeGmail = {
    users: { messages: { attachments: { get: async ({ id }) => ({ data: { data: Buffer.from('PNGDATA').toString('base64url') } }) } } },
  };
  const msg = await hydrateMessage(fakeGmail, parseGmailMessage(sample()));
  assert.match(msg.bodyHtml, /src="data:image\/png;base64,UE5HREFUQQ=="/);
  assert.match(msg.bodyHtml, /cid:missing/);
  assert.ok(!/cid:logo@x/.test(msg.bodyHtml));
});

test('hydrateMessage skips images above the 5 MB budget', async () => {
  const s = sample();
  s.payload.parts[0].parts[1].body.size = 6 * 1024 * 1024;
  const fakeGmail = { users: { messages: { attachments: { get: async () => { throw new Error('should not fetch'); } } } } };
  const msg = await hydrateMessage(fakeGmail, parseGmailMessage(s));
  assert.match(msg.bodyHtml, /cid:logo@x/);
});

test('buildThreadSummary aggregates labels, participants, last message', () => {
  const thread = {
    id: 't1',
    messages: [
      { id: 'a', labelIds: ['INBOX'], snippet: 's1', internalDate: '1000', payload: { mimeType: 'text/plain', headers: [{ name: 'Subject', value: 'Re: x' }, { name: 'From', value: 'A <a@x.co>' }] } },
      { id: 'b', labelIds: ['INBOX', 'UNREAD'], snippet: 's2', internalDate: '2000', payload: { mimeType: 'multipart/mixed', headers: [{ name: 'From', value: 'B <b@x.co>' }] } },
    ],
  };
  const s = buildThreadSummary(thread, 'listsnip');
  assert.strictEqual(s.subject, 'Re: x');
  assert.strictEqual(s.snippet, 's2');
  assert.strictEqual(s.messageCount, 2);
  assert.strictEqual(s.unread, true);
  assert.strictEqual(s.starred, false);
  assert.strictEqual(s.hasAttachments, true);
  assert.deepStrictEqual(s.from, { name: 'B', email: 'b@x.co' });
  assert.deepStrictEqual(s.participants.map((p) => p.email), ['a@x.co', 'b@x.co']);
  assert.deepStrictEqual(s.labelIds.sort(), ['INBOX', 'UNREAD']);
});

test('gcall retries RATE_LIMITED with exponential backoff then succeeds', async () => {
  const delays = [];
  let calls = 0;
  const rl = () => { const e = new Error('rate'); e.response = { status: 429, data: {} }; return e; };
  const result = await gcall(async () => { calls += 1; if (calls < 3) throw rl(); return 'ok'; }, { sleep: async (ms) => delays.push(ms), baseDelayMs: 1000 });
  assert.strictEqual(result, 'ok');
  assert.strictEqual(calls, 3);
  assert.ok(delays[0] >= 1000 && delays[0] < 1250);
  assert.ok(delays[1] >= 2000 && delays[1] < 2250);
});

test('gcall gives up after retries and never retries other errors', async () => {
  let calls = 0;
  const rl = new Error('rate'); rl.response = { status: 429, data: {} };
  await assert.rejects(gcall(async () => { calls += 1; throw rl; }, { sleep: async () => {}, retries: 2 }), { code: 'RATE_LIMITED' });
  assert.strictEqual(calls, 3);
  calls = 0;
  const nf = new Error('nf'); nf.response = { status: 404, data: {} };
  await assert.rejects(gcall(async () => { calls += 1; throw nf; }, { sleep: async () => {} }), (e) => e instanceof MailError && e.code === 'NOT_FOUND');
  assert.strictEqual(calls, 1);
});

test('mapLimit caps concurrency at 4 and keeps order', async () => {
  let active = 0;
  let peak = 0;
  const out = await mapLimit(Array.from({ length: 20 }, (_, i) => i), 4, async (i) => {
    active += 1; peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 2));
    active -= 1;
    return i * 2;
  });
  assert.strictEqual(peak, 4);
  assert.deepStrictEqual(out, Array.from({ length: 20 }, (_, i) => i * 2));
});

test('capabilities: permanentDelete only with full mail scope', () => {
  assert.strictEqual(gmail.capabilities({ grantedScopes: 'https://www.googleapis.com/auth/gmail.modify' }).permanentDelete, false);
  assert.strictEqual(gmail.capabilities({ grantedScopes: 'https://www.googleapis.com/auth/gmail.modify https://mail.google.com/' }).permanentDelete, true);
  assert.strictEqual(gmail.capabilities({}).permanentDelete, false);
});

test('getAuthUrl: offline + consent, no granted-scope inclusion, scopes follow opt-in', () => {
  const base = { clientId: 'cid.apps.googleusercontent.com', clientSecret: 'x', redirectUri: 'http://localhost:5173/' };
  const url = new URL(gmail.getAuthUrl({ ...base, allowPermanentDelete: false }, '{"kind":"mail"}'));
  assert.strictEqual(url.searchParams.get('access_type'), 'offline');
  assert.strictEqual(url.searchParams.get('prompt'), 'consent');
  assert.strictEqual(url.searchParams.get('include_granted_scopes'), 'false');
  assert.strictEqual(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/gmail.modify');
  assert.strictEqual(url.searchParams.get('state'), '{"kind":"mail"}');
  const full = new URL(gmail.getAuthUrl({ ...base, allowPermanentDelete: true }, 's'));
  assert.strictEqual(full.searchParams.get('scope'), 'https://www.googleapis.com/auth/gmail.modify https://mail.google.com/');
});

test('applyAction deleteForever without mail.google.com scope -> 403 SCOPE_REQUIRED before any API call', async () => {
  const account = { id: 'a', clientId: 'c', clientSecret: 's', refreshToken: 'r', grantedScopes: 'https://www.googleapis.com/auth/gmail.modify' };
  await assert.rejects(gmail.applyAction(account, { target: 'threads', ids: ['1'], action: 'deleteForever' }), { code: 'SCOPE_REQUIRED', status: 403 });
});
