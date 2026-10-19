import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseOAuthState,
  isMailOAuthState,
  splitAddressList,
  parseAddress,
  parseAddressList,
  formatAddress,
  formatAddressList,
  senderLabel,
  dedupeAddresses,
  sortFolders,
  actionsForRole,
  formatListDate,
  cleanSnippet,
  decodeEntities,
  pagerLabel,
  describeMailError,
  readInboxParams,
  patchInboxParams,
  shouldIgnoreShortcut,
  htmlToText,
  buildReplyDraft,
  bodyUsage,
  validateCompose,
  toComposePayload,
  MAIL_BODY_LIMIT_BYTES,
} from './mail.js';
import { buildSrcdoc, buildCsp, hasRemoteImages, sanitizeHtml } from './mailHtml.js';

/* ── OAuth state ── */

test('parseOAuthState decodes JSON and recognises mail states', () => {
  const state = JSON.stringify({ kind: 'mail', provider: 'gmail', accountId: 'a1', exp: 1, sig: 'x' });
  assert.equal(parseOAuthState(state).accountId, 'a1');
  assert.equal(isMailOAuthState(state), true);
});

test('parseOAuthState decodes base64url JSON', () => {
  const b64 = btoa(JSON.stringify({ kind: 'mail', accountId: 'z' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  assert.equal(isMailOAuthState(b64), true);
});

test('Drive, bare-id, empty and garbage states are not mail states', () => {
  assert.equal(isMailOAuthState(JSON.stringify({ driveConfigId: 'd1' })), false);
  assert.equal(isMailOAuthState('cku1234'), false);
  assert.equal(isMailOAuthState(''), false);
  assert.equal(isMailOAuthState(null), false);
  assert.equal(isMailOAuthState('[1,2]'), false);
  assert.equal(parseOAuthState('{not json'), null);
});

/* ── addresses ── */

test('parseAddress handles name+angle, bare, quoted names', () => {
  assert.deepEqual(parseAddress('Ada Lovelace <ada@x.io>'), { name: 'Ada Lovelace', email: 'ada@x.io' });
  assert.deepEqual(parseAddress('"Lovelace, Ada" <ada@x.io>'), { name: 'Lovelace, Ada', email: 'ada@x.io' });
  assert.deepEqual(parseAddress('ada@x.io'), { name: '', email: 'ada@x.io' });
  assert.equal(parseAddress('   '), null);
});

test('splitAddressList respects quotes and angle brackets', () => {
  assert.deepEqual(splitAddressList('"A, B" <a@x.io>, c@x.io; d@x.io'), [
    '"A, B" <a@x.io>',
    'c@x.io',
    'd@x.io',
  ]);
  assert.equal(parseAddressList('a@x.io, , b@x.io').length, 2);
});

test('formatAddress quotes names with specials and round-trips', () => {
  const addr = { name: 'Lovelace, Ada', email: 'ada@x.io' };
  const text = formatAddress(addr);
  assert.equal(text, '"Lovelace, Ada" <ada@x.io>');
  assert.deepEqual(parseAddress(text), addr);
  assert.equal(formatAddress({ name: '', email: 'a@x.io' }), 'a@x.io');
  assert.equal(formatAddress({ name: 'a@x.io', email: 'a@x.io' }), 'a@x.io');
  assert.equal(formatAddressList([{ name: 'A', email: 'a@x.io' }, { email: 'b@x.io' }]), 'A <a@x.io>, b@x.io');
});

test('senderLabel prefers name, falls back to email', () => {
  assert.equal(senderLabel({ name: 'Ada', email: 'a@x.io' }), 'Ada');
  assert.equal(senderLabel({ name: '', email: 'a@x.io' }), 'a@x.io');
  assert.equal(senderLabel(null), '');
});

test('dedupeAddresses is case-insensitive and honours the exclude list', () => {
  const out = dedupeAddresses(
    [{ email: 'A@x.io' }, { email: 'a@x.io' }, { email: 'me@x.io' }, { email: 'b@x.io' }],
    ['ME@x.io'],
  );
  assert.deepEqual(out.map((a) => a.email), ['A@x.io', 'b@x.io']);
});

/* ── folders ── */

test('sortFolders: system folders in Gmail order, user labels alphabetical, input untouched', () => {
  const input = [
    { id: 'L2', name: 'Zeta', type: 'user', role: null },
    { id: 'TRASH', name: 'Trash', type: 'system', role: 'trash' },
    { id: 'L1', name: 'alpha', type: 'user', role: null },
    { id: 'SENT', name: 'Sent', type: 'system', role: 'sent' },
    { id: 'INBOX', name: 'Inbox', type: 'system', role: 'inbox' },
    { id: 'DRAFT', name: 'Drafts', type: 'system', role: 'drafts' },
    { id: 'SPAM', name: 'Spam', type: 'system', role: 'spam' },
  ];
  const copy = input.map((f) => f.id);
  const sorted = sortFolders(input).map((f) => f.id);
  assert.deepEqual(sorted, ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'L1', 'L2']);
  assert.deepEqual(input.map((f) => f.id), copy);
  assert.deepEqual(sortFolders(null), []);
});

test('actionsForRole gates archive / restore / deleteForever by folder', () => {
  assert.equal(actionsForRole('inbox').archive, true);
  assert.equal(actionsForRole('inbox').deleteForever, false);
  assert.equal(actionsForRole('trash').restore, true);
  assert.equal(actionsForRole('trash').trash, false);
  assert.equal(actionsForRole('trash').deleteForever, true);
  assert.equal(actionsForRole('spam').notSpam, true);
  assert.equal(actionsForRole('spam').deleteForever, true);
  assert.equal(actionsForRole('drafts').archive, false);
});

/* ── dates & snippets ── */

test('formatListDate: today → time, same year → month/day, other year → with year', () => {
  const now = new Date(2026, 9, 14, 18, 0, 0);
  const today = formatListDate(new Date(2026, 9, 14, 9, 5), now, 'en-US');
  assert.match(today, /9:05/);
  assert.equal(formatListDate(new Date(2026, 2, 4, 9, 5), now, 'en-US'), 'Mar 4');
  assert.equal(formatListDate(new Date(2024, 2, 4, 9, 5), now, 'en-US'), 'Mar 4, 2024');
  assert.equal(formatListDate('not a date', now, 'en-US'), '');
});

test('cleanSnippet decodes entities, collapses whitespace and truncates', () => {
  assert.equal(cleanSnippet('Tom &amp; Jerry&#39;s   &quot;day&quot;\n out'), 'Tom & Jerry\'s "day" out');
  assert.equal(decodeEntities('&#x1F600;'), '\u{1F600}');
  assert.equal(decodeEntities('&unknown;'), '&unknown;');
  const long = cleanSnippet('x'.repeat(300), 20);
  assert.equal(long.length, 20);
  assert.ok(long.endsWith('…'));
});

test('pagerLabel renders "start–end" and 0 for empty pages', () => {
  assert.equal(pagerLabel({ pageIndex: 0, pageSize: 25, count: 25 }), '1–25');
  assert.equal(pagerLabel({ pageIndex: 2, pageSize: 25, count: 10 }), '51–60');
  assert.equal(pagerLabel({ pageIndex: 0, pageSize: 25, count: 0 }), '0');
});

/* ── errors ── */

test('describeMailError maps API codes to UI kinds', () => {
  assert.equal(describeMailError({ code: 'MAIL_NOT_CONNECTED' }).kind, 'not_connected');
  assert.match(describeMailError({ code: 'MAIL_NOT_CONNECTED' }).title, /Settings → Mail/);
  assert.equal(describeMailError({ code: 'MAIL_REAUTH_REQUIRED' }).kind, 'reauth');
  assert.equal(describeMailError({ code: 'RATE_LIMITED' }).retryable, true);
  assert.equal(describeMailError({ code: 'SCOPE_REQUIRED' }).kind, 'scope');
  assert.equal(describeMailError({ code: 'UPSTREAM', message: 'boom' }).message, 'boom');
});

/* ── url state ── */

test('readInboxParams / patchInboxParams round-trip and drop empties', () => {
  const sp = new URLSearchParams('account=a1&folder=INBOX&q=from%3Ax&thread=t9');
  assert.deepEqual(readInboxParams(sp), { account: 'a1', folder: 'INBOX', q: 'from:x', thread: 't9' });
  const next = patchInboxParams(sp, { thread: '', q: 'is:unread' });
  assert.equal(next.get('thread'), null);
  assert.equal(next.get('q'), 'is:unread');
  assert.equal(next.get('account'), 'a1');
  assert.equal(sp.get('thread'), 't9', 'input is not mutated');
});

/* ── shortcuts ── */

test('shouldIgnoreShortcut ignores typing targets and modifier chords', () => {
  assert.equal(shouldIgnoreShortcut({ target: { tagName: 'INPUT' } }), true);
  assert.equal(shouldIgnoreShortcut({ target: { tagName: 'TEXTAREA' } }), true);
  assert.equal(shouldIgnoreShortcut({ target: { tagName: 'DIV', isContentEditable: true } }), true);
  assert.equal(shouldIgnoreShortcut({ metaKey: true, target: { tagName: 'BODY' } }), true);
  assert.equal(shouldIgnoreShortcut({ target: { tagName: 'BODY' } }), false);
  assert.equal(
    shouldIgnoreShortcut({ target: { tagName: 'BUTTON', closest: () => ({}) } }),
    true,
    'inside an open dialog',
  );
});

/* ── reply / forward ── */

const original = {
  id: 'm1',
  threadId: 't1',
  from: { name: 'Ada', email: 'ada@x.io' },
  to: [{ name: '', email: 'me@x.io' }, { name: 'Bob', email: 'bob@x.io' }],
  cc: [{ name: 'Cy', email: 'cy@x.io' }, { name: '', email: 'ME@x.io' }],
  replyTo: [],
  subject: 'Lunch?',
  date: '2026-10-10T12:30:00Z',
  bodyText: 'Line one\n> already quoted\nLine three',
  bodyHtml: '',
};

test('buildReplyDraft reply: to sender, Re: once, quoted body, thread ids', () => {
  const draft = buildReplyDraft(original, 'reply', { selfEmail: 'me@x.io', locale: 'en-US' });
  assert.deepEqual(draft.to, [original.from]);
  assert.deepEqual(draft.cc, []);
  assert.equal(draft.subject, 'Re: Lunch?');
  assert.equal(draft.threadId, 't1');
  assert.equal(draft.replyToMessageId, 'm1');
  assert.match(draft.bodyText, /^\n\nOn .*2026.*Ada <ada@x\.io> wrote:\n> Line one\n>> already quoted\n> Line three$/s);
  assert.equal(buildReplyDraft({ ...original, subject: 'RE: Lunch?' }, 'reply').subject, 'RE: Lunch?');
});

test('buildReplyDraft reply honours Reply-To', () => {
  const draft = buildReplyDraft({ ...original, replyTo: [{ name: 'List', email: 'list@x.io' }] }, 'reply');
  assert.equal(draft.to[0].email, 'list@x.io');
});

test('buildReplyDraft replyAll drops self and duplicates', () => {
  const draft = buildReplyDraft(original, 'replyAll', { selfEmail: 'me@x.io' });
  assert.deepEqual(draft.to.map((a) => a.email), ['ada@x.io', 'bob@x.io']);
  assert.deepEqual(draft.cc.map((a) => a.email), ['cy@x.io']);
});

test('buildReplyDraft forward: Fwd: once, header block, no recipients', () => {
  const draft = buildReplyDraft(original, 'forward', { locale: 'en-US' });
  assert.deepEqual(draft.to, []);
  assert.equal(draft.subject, 'Fwd: Lunch?');
  assert.match(draft.bodyText, /---------- Forwarded message ---------\nFrom: Ada <ada@x\.io>\nDate: .*\nSubject: Lunch\?\nTo: me@x\.io, Bob <bob@x\.io>/);
  assert.match(draft.bodyText, /Line one\n> already quoted\nLine three$/);
  assert.equal(buildReplyDraft({ ...original, subject: 'Fwd: Lunch?' }, 'forward').subject, 'Fwd: Lunch?');
});

test('buildReplyDraft falls back to HTML text when there is no plain body', () => {
  const draft = buildReplyDraft(
    { ...original, bodyText: '', bodyHtml: '<p>Hi &amp; bye</p><style>p{}</style><div>x</div>' },
    'reply',
  );
  assert.match(draft.bodyText, /> Hi & bye\n> x$/);
  assert.equal(htmlToText('a<br>b'), 'a\nb');
});

/* ── compose validation ── */

test('bodyUsage / validateCompose enforce the ~90 KB cap and recipient rules', () => {
  const ok = { to: [{ name: '', email: 'a@x.io' }], subject: 's', bodyText: 'hi' };
  assert.equal(bodyUsage(ok).over, false);
  assert.equal(validateCompose(ok).ok, true);

  const big = { ...ok, bodyText: 'x'.repeat(MAIL_BODY_LIMIT_BYTES + 1) };
  assert.equal(bodyUsage(big).over, true);
  assert.equal(validateCompose(big).ok, false);

  assert.equal(validateCompose({ ...ok, to: [] }).ok, false);
  assert.equal(validateCompose({ ...ok, to: [] }, { forSend: false }).ok, true);
  assert.equal(validateCompose({ ...ok, to: [{ email: 'nope' }] }).ok, false);

  // multi-byte text counts bytes, not characters
  const multi = { ...ok, bodyText: 'é'.repeat(MAIL_BODY_LIMIT_BYTES / 2 + 10) };
  assert.equal(bodyUsage(multi).over, true);
});

test('toComposePayload omits empty optional fields', () => {
  const payload = toComposePayload({
    to: [{ name: '', email: 'a@x.io' }],
    cc: [],
    bcc: [],
    subject: 'S',
    bodyText: 'B',
    threadId: '',
  });
  assert.deepEqual(Object.keys(payload).sort(), ['bodyText', 'subject', 'to']);
});

/* ── srcdoc / sanitiser seam ── */

test('buildSrcdoc puts CSP then referrer meta as the first children of <head>', () => {
  const doc = buildSrcdoc('<p>hi</p>');
  const head = doc.slice(doc.indexOf('<head>') + '<head>'.length);
  assert.ok(head.startsWith('<meta http-equiv="Content-Security-Policy"'));
  const afterCsp = head.slice(head.indexOf('>') + 1);
  assert.ok(afterCsp.startsWith('<meta name="referrer" content="no-referrer">'));
  assert.ok(doc.includes('<body><p>hi</p></body>'));
});

test('CSP blocks remote images until opted in', () => {
  assert.match(buildCsp(), /default-src 'none'/);
  assert.match(buildCsp(), /img-src data:(;|$)/);
  assert.doesNotMatch(buildCsp(), /https:/);
  assert.match(buildCsp({ allowRemoteImages: true }), /img-src data: https:/);
  assert.match(buildSrcdoc('', { allowRemoteImages: true }), /img-src data: https:/);
  assert.doesNotMatch(buildSrcdoc(''), /img-src data: https:/);
  assert.match(buildCsp(), /base-uri 'none'/);
  assert.match(buildCsp(), /form-action 'none'/);
});

test('hasRemoteImages detects remote img/background urls only', () => {
  assert.equal(hasRemoteImages('<img src="https://t.example/p.gif">'), true);
  assert.equal(hasRemoteImages('<img src="//t.example/p.gif">'), true);
  assert.equal(hasRemoteImages('<div style="background:url(http://t.example/a.png)">'), true);
  assert.equal(hasRemoteImages('<img src="data:image/png;base64,AAAA">'), false);
  assert.equal(hasRemoteImages('<p>hello</p>'), false);
});

test('sanitizeHtml fails closed when there is no DOM', () => {
  // node:test has no window, so DOMPurify.isSupported is false.
  assert.equal(sanitizeHtml('<img src=x onerror=alert(1)>'), '');
  assert.equal(sanitizeHtml(null), '');
});
