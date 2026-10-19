const test = require('node:test');
const assert = require('node:assert');
const { MailError, normaliseGoogleError, toMailError, scrubMessage } = require('./errors');

const gax = (status, data, message = 'Request failed') => {
  const e = new Error(message);
  e.name = 'GaxiosError';
  e.response = { status, data };
  e.config = { headers: { Authorization: 'Bearer ya29.SECRET' }, body: 'refresh_token=1//SECRETTOKEN' };
  return e;
};

test('invalid_grant maps to 412 MAIL_REAUTH_REQUIRED', () => {
  const e = normaliseGoogleError(gax(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, 'invalid_grant'));
  assert.ok(e instanceof MailError);
  assert.strictEqual(e.status, 412);
  assert.strictEqual(e.code, 'MAIL_REAUTH_REQUIRED');
});

test('invalid_grant detected from message only', () => {
  const e = normaliseGoogleError(new Error('invalid_grant'));
  assert.strictEqual(e.code, 'MAIL_REAUTH_REQUIRED');
});

test('Google 401 never surfaces as 401', () => {
  const e = normaliseGoogleError(gax(401, { error: { code: 401, message: 'Invalid Credentials' } }));
  assert.strictEqual(e.status, 412);
});

test('429 and 403 rateLimitExceeded map to RATE_LIMITED', () => {
  assert.strictEqual(normaliseGoogleError(gax(429, {})).code, 'RATE_LIMITED');
  const e = normaliseGoogleError(gax(403, { error: { code: 403, message: 'Rate Limit Exceeded', errors: [{ reason: 'rateLimitExceeded' }] } }));
  assert.strictEqual(e.code, 'RATE_LIMITED');
  assert.strictEqual(e.status, 429);
});

test('403 insufficientPermissions maps to SCOPE_REQUIRED', () => {
  const e = normaliseGoogleError(gax(403, { error: { code: 403, message: 'Insufficient Permission', errors: [{ reason: 'insufficientPermissions' }] } }));
  assert.strictEqual(e.code, 'SCOPE_REQUIRED');
  assert.strictEqual(e.status, 403);
});

test('404 -> NOT_FOUND, 400 -> VALIDATION, 500 -> UPSTREAM 502', () => {
  assert.strictEqual(normaliseGoogleError(gax(404, { error: { code: 404, message: 'Requested entity was not found.' } })).status, 404);
  assert.strictEqual(normaliseGoogleError(gax(400, { error: { code: 400, message: 'Invalid label' } })).code, 'VALIDATION');
  const e = normaliseGoogleError(gax(503, {}));
  assert.strictEqual(e.status, 502);
  assert.strictEqual(e.code, 'UPSTREAM');
});

test('normalised error never contains token material or config', () => {
  const raw = gax(500, { error: { message: 'boom Bearer ya29.SECRET refresh 1//0gABCDEFGHIJKLMNOPQRSTUV' } });
  const e = normaliseGoogleError(raw);
  const dump = JSON.stringify({ ...e, message: e.message, stack: undefined });
  assert.ok(!/SECRET/.test(dump));
  assert.ok(!/ya29/.test(dump));
  assert.strictEqual(e.config, undefined);
  assert.strictEqual(e.response, undefined);
});

test('toMailError: unknown error becomes generic INTERNAL', () => {
  const e = toMailError(new TypeError('cannot read x of undefined'));
  assert.strictEqual(e.status, 500);
  assert.strictEqual(e.code, 'INTERNAL');
  assert.ok(!/undefined/.test(e.message));
});

test('toMailError passes MailError through and maps network errors', () => {
  const m = new MailError('CONFLICT', 'x');
  assert.strictEqual(toMailError(m), m);
  const net = Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' });
  assert.strictEqual(toMailError(net).code, 'UPSTREAM');
});

test('scrubMessage trims and bounds', () => {
  assert.strictEqual(scrubMessage('a'.repeat(500)).length, 300);
  assert.strictEqual(scrubMessage('  hi \n there '), 'hi there');
});
