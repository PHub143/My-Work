const test = require('node:test');
const assert = require('node:assert');

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);

const { _internals } = require('./mailAccountController');
const { isAllowedRedirectUri } = _internals;

const FRONTENDS = 'https://thinh.github.io, https://app.example.com/';

test('localhost redirect URIs are always allowed (development)', () => {
  assert.strictEqual(isAllowedRedirectUri('http://localhost:5173/', ''), true);
  assert.strictEqual(isAllowedRedirectUri('http://127.0.0.1:5173/#/oauth/callback', ''), true);
  assert.strictEqual(isAllowedRedirectUri('http://localhost/', undefined), true);
});

test('configured frontend origins are allowed with any path', () => {
  assert.strictEqual(isAllowedRedirectUri('https://thinh.github.io/My-Work/allinone/', FRONTENDS), true);
  assert.strictEqual(isAllowedRedirectUri('https://app.example.com/', FRONTENDS), true);
  assert.strictEqual(isAllowedRedirectUri('https://app.example.com/some/path?x=1', FRONTENDS), true);
});

test('other origins are rejected', () => {
  assert.strictEqual(isAllowedRedirectUri('https://evil.example/', FRONTENDS), false);
  assert.strictEqual(isAllowedRedirectUri('https://thinh.github.io.evil.example/', FRONTENDS), false);
  assert.strictEqual(isAllowedRedirectUri('http://thinh.github.io/', FRONTENDS), false, 'scheme must match');
  assert.strictEqual(isAllowedRedirectUri('https://thinh.github.io:8443/', FRONTENDS), false, 'port must match');
  assert.strictEqual(isAllowedRedirectUri('https://evil.example/', ''), false);
});

test('non-http(s) and malformed URIs are rejected', () => {
  assert.strictEqual(isAllowedRedirectUri('javascript:alert(1)', FRONTENDS), false);
  assert.strictEqual(isAllowedRedirectUri('ftp://thinh.github.io/', FRONTENDS), false);
  assert.strictEqual(isAllowedRedirectUri('not a url', FRONTENDS), false);
  assert.strictEqual(isAllowedRedirectUri('', FRONTENDS), false);
});

test('a malformed FRONTEND_URL entry does not break the others', () => {
  assert.strictEqual(isAllowedRedirectUri('https://app.example.com/', 'nonsense, https://app.example.com'), true);
});
