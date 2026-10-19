const test = require('node:test');
const assert = require('node:assert');
const mime = require('./mime');

const raw = (p) => mime.fromBase64Url(mime.buildRawMessage(p)).toString('utf8');

test('base64url round trip has no padding or +/ characters', () => {
  const buf = Buffer.from([0xfb, 0xff, 0xfe, 0x01, 0x02]);
  const enc = mime.toBase64Url(buf);
  assert.ok(!/[+/=]/.test(enc));
  assert.deepStrictEqual(mime.fromBase64Url(enc), buf);
});

test('CR/LF/NUL rejected in header values', () => {
  assert.throws(() => mime.assertNoHeaderInjection('a\r\nBcc: x@y.z', 'Subject'), /line breaks/);
  assert.throws(() => mime.assertNoHeaderInjection('a\nb'), /line breaks/);
  assert.throws(() => mime.assertNoHeaderInjection('a\0b'), /line breaks/);
  assert.strictEqual(mime.assertNoHeaderInjection('ok'), 'ok');
});

test('subject with CRLF injection is refused by buildRawMessage', () => {
  assert.throws(() => mime.buildRawMessage({ to: [{ email: 'a@b.co' }], subject: 'hi\r\nBcc: evil@x.co', bodyText: 'x' }), { code: 'VALIDATION' });
  assert.throws(() => mime.buildRawMessage({ to: [{ name: 'A\nB', email: 'a@b.co' }], subject: 's', bodyText: 'x' }), { code: 'VALIDATION' });
  assert.throws(() => mime.buildRawMessage({ to: [{ email: 'a@b.co\r\nBcc: e@x.co' }], subject: 's', bodyText: 'x' }), { code: 'VALIDATION' });
  assert.throws(() => mime.buildRawMessage({ to: [{ email: 'a@b.co' }], subject: 's', bodyText: 'x', inReplyTo: '<a@b>\r\nX: y' }), { code: 'VALIDATION' });
});

test('non-ASCII subject and display name are RFC 2047 encoded and decode back', () => {
  const subject = 'Zażółć gęślą jaźń — a long subject with ünïcödé characters that needs several encoded words';
  const out = raw({ from: { email: 'me@example.com' }, to: [{ name: 'Józef Łoś', email: 'jozef@example.com' }], subject, bodyText: 'cześć' });
  const headerBlock = out.split('\r\n\r\n')[0];
  assert.ok(/Subject: =\?UTF-8\?B\?/.test(headerBlock));
  assert.ok(/To: =\?UTF-8\?B\?[^ ]+ <jozef@example\.com>/.test(headerBlock));
  assert.ok(!/[^\x00-\x7F]/.test(headerBlock), 'headers must be pure ASCII');
  for (const line of headerBlock.split('\r\n')) assert.ok(line.length <= 78, `line too long: ${line.length}`);
  const unfolded = headerBlock.replace(/\r\n[ \t]/g, ' ');
  const subjectLine = unfolded.split('\r\n').find((l) => l.startsWith('Subject: '));
  assert.strictEqual(mime.decodeHeaderText(subjectLine.slice(9)), subject);
});

test('encoded words never split a UTF-8 code point', () => {
  const s = '😀'.repeat(40);
  const enc = mime.encodeHeaderText(s);
  assert.strictEqual(mime.decodeHeaderText(enc.replace(/\r\n /g, ' ')), s);
});

test('ASCII display names with specials are quoted and escaped', () => {
  assert.strictEqual(mime.formatAddress({ name: 'Doe, John "JD"', email: 'j@example.com' }), '"Doe, John \\"JD\\"" <j@example.com>');
  assert.strictEqual(mime.formatAddress({ name: 'John Doe', email: 'j@example.com' }), 'John Doe <j@example.com>');
  assert.strictEqual(mime.formatAddress({ email: 'j@example.com' }), 'j@example.com');
});

test('invalid email addresses rejected', () => {
  for (const bad of ['', 'plain', 'a@b', '@x.com', 'a b@x.com', 'a@x..com', '<a@x.com>', 'a@x.com,b@y.com']) {
    assert.throws(() => mime.normaliseEmail(bad), { code: 'VALIDATION' }, bad);
  }
  assert.strictEqual(mime.normaliseEmail(' User.Name+tag@Example.com '), 'User.Name+tag@example.com');
});

test('buildRawMessage: text only and multipart/alternative', () => {
  const plain = raw({ to: [{ email: 'a@b.co' }], subject: 'S', bodyText: 'line1\nline2' });
  assert.match(plain, /Content-Type: text\/plain; charset="UTF-8"/);
  assert.match(plain, /MIME-Version: 1\.0/);
  const body = plain.split('\r\n\r\n')[1];
  assert.strictEqual(Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8'), 'line1\r\nline2');

  const alt = raw({ to: [{ email: 'a@b.co' }], cc: [{ email: 'c@d.co' }], bcc: [{ email: 'e@f.co' }], subject: 'S', bodyText: 'hi', bodyHtml: '<p>hi</p>', inReplyTo: '<x@y>', references: '<w@y> <x@y>' });
  assert.match(alt, /Content-Type: multipart\/alternative; boundary="/);
  assert.match(alt, /Cc: c@d\.co/);
  assert.match(alt, /Bcc: e@f\.co/);
  assert.match(alt, /In-Reply-To: <x@y>/);
  assert.match(alt, /References: <w@y> <x@y>/);
  assert.match(alt, /Content-Type: text\/html; charset="UTF-8"/);
});

test('parseAddressList handles quoted names, commas, RFC 2047 and groups', () => {
  const list = mime.parseAddressList('"Doe, John" <john@x.com>, =?UTF-8?B?SsOzemVm?= <jozef@y.pl>, plain@z.org, undisclosed-recipients:;');
  assert.deepStrictEqual(list, [
    { name: 'Doe, John', email: 'john@x.com' },
    { name: 'Józef', email: 'jozef@y.pl' },
    { name: '', email: 'plain@z.org' },
  ]);
  assert.deepStrictEqual(mime.parseAddressList(''), []);
  assert.deepStrictEqual(mime.parseAddressList(undefined), []);
});

test('decodeHeaderText handles Q encoding, adjacent words, other charsets', () => {
  assert.strictEqual(mime.decodeHeaderText('=?UTF-8?Q?Caf=C3=A9_au_lait?='), 'Café au lait');
  assert.strictEqual(mime.decodeHeaderText('=?UTF-8?B?SGVsbG8g?= =?UTF-8?B?V29ybGQ=?='), 'Hello World');
  assert.strictEqual(mime.decodeHeaderText('=?ISO-8859-1?Q?Andr=E9?='), 'André');
  assert.strictEqual(mime.decodeHeaderText('no encoding'), 'no encoding');
});

test('decodeBody honours declared charset', () => {
  assert.strictEqual(mime.decodeBody(Buffer.from([0x63, 0x61, 0x66, 0xe9]), 'text/plain; charset="iso-8859-1"'), 'café');
  assert.strictEqual(mime.decodeBody(Buffer.from('żółć', 'utf8'), 'text/plain; charset=UTF-8'), 'żółć');
  assert.strictEqual(mime.decodeBody(Buffer.from('x'), 'text/plain; charset=bogus-xyz'), 'x');
});
