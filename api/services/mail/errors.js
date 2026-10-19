/**
 * Mail error model + Google error normaliser.
 *
 * Google client errors (GaxiosError) carry the request config, including the
 * `Authorization: Bearer ...` header and sometimes the refresh token in the
 * body. They must never be logged or forwarded. Everything that leaves the
 * provider layer is a MailError holding only status / code / message.
 */

const CODES = Object.freeze({
  VALIDATION: { status: 400, code: 'VALIDATION' },
  SCOPE_REQUIRED: { status: 403, code: 'SCOPE_REQUIRED' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
  CONFLICT: { status: 409, code: 'CONFLICT' },
  MAIL_NOT_CONNECTED: { status: 412, code: 'MAIL_NOT_CONNECTED' },
  MAIL_REAUTH_REQUIRED: { status: 412, code: 'MAIL_REAUTH_REQUIRED' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED' },
  UPSTREAM: { status: 502, code: 'UPSTREAM' },
  INTERNAL: { status: 500, code: 'INTERNAL' },
});

class MailError extends Error {
  /**
   * @param {keyof typeof CODES} codeName
   * @param {string} message Safe, user-presentable message (no secrets).
   */
  constructor(codeName, message) {
    super(message);
    const def = CODES[codeName] || CODES.INTERNAL;
    this.name = 'MailError';
    this.status = def.status;
    this.code = def.code;
  }
}

const validation = (message) => new MailError('VALIDATION', message);
const notFound = (message = 'Not found.') => new MailError('NOT_FOUND', message);
const conflict = (message) => new MailError('CONFLICT', message);

/** Strip anything token-shaped and bound the length of upstream-provided text. */
function scrubMessage(text, max = 300) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\bya29\.[A-Za-z0-9._-]+/g, '[redacted]')
    .replace(/\b1\/\/[A-Za-z0-9._-]{20,}/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** True when `err` looks like a Google client (Gaxios) error. */
function looksLikeGoogleError(err) {
  if (!err || typeof err !== 'object') return false;
  return (
    err.name === 'GaxiosError' ||
    err.isGaxiosError === true ||
    (err.response && typeof err.response === 'object') ||
    (err.config && typeof err.config === 'object')
  );
}

/**
 * Convert a Google client error to a MailError. Reads only status, error
 * reason and message; never keeps a reference to the original error.
 * @param {any} err
 * @returns {MailError}
 */
function normaliseGoogleError(err) {
  if (err instanceof MailError) return err;

  const resp = err && err.response;
  const data = resp && resp.data;
  let status = Number(resp && resp.status) || 0;
  if (!status && err && typeof err.code === 'number') status = err.code;
  if (!status && err && Number.isInteger(Number(err.status))) status = Number(err.status);

  let oauthError = '';
  let reason = '';
  let upstreamMessage = '';
  if (data && typeof data === 'object') {
    if (typeof data.error === 'string') {
      oauthError = data.error;
      upstreamMessage = typeof data.error_description === 'string' ? data.error_description : '';
    } else if (data.error && typeof data.error === 'object') {
      upstreamMessage = typeof data.error.message === 'string' ? data.error.message : '';
      if (!status && Number.isInteger(data.error.code)) status = data.error.code;
      const first = Array.isArray(data.error.errors) ? data.error.errors[0] : null;
      reason = (first && typeof first.reason === 'string' && first.reason) ||
        (typeof data.error.status === 'string' ? data.error.status : '');
    }
  }
  const rawMessage = err && typeof err.message === 'string' ? err.message : '';
  const safeUpstream = scrubMessage(upstreamMessage) || scrubMessage(rawMessage);

  if (oauthError === 'invalid_grant' || /invalid_grant/i.test(rawMessage)) {
    return new MailError(
      'MAIL_REAUTH_REQUIRED',
      'Google rejected the stored authorization (expired or revoked). Reconnect the mailbox.'
    );
  }
  if (oauthError === 'invalid_client' || oauthError === 'unauthorized_client' || /invalid_client/i.test(rawMessage)) {
    return new MailError(
      'MAIL_REAUTH_REQUIRED',
      'Google rejected the OAuth client credentials. Check Client ID and Client Secret, then reconnect.'
    );
  }
  if (status === 401 || reason === 'authError') {
    return new MailError('MAIL_REAUTH_REQUIRED', 'Google rejected the access token. Reconnect the mailbox.');
  }
  if (status === 429 || /^(rateLimitExceeded|userRateLimitExceeded|rateLimit|RESOURCE_EXHAUSTED)$/i.test(reason)) {
    return new MailError('RATE_LIMITED', 'Gmail rate limit reached. Try again shortly.');
  }
  if (status === 403) {
    if (/insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT|PERMISSION_DENIED/i.test(reason) ||
        /insufficient (authentication )?scopes?/i.test(safeUpstream)) {
      return new MailError('SCOPE_REQUIRED', 'The connected authorization does not include the required permission. Reconnect the mailbox.');
    }
    return new MailError('UPSTREAM', safeUpstream || 'Google denied the request.');
  }
  if (status === 404) return new MailError('NOT_FOUND', 'Message, thread, draft or attachment not found.');
  if (status === 400) {
    return new MailError('VALIDATION', safeUpstream || 'Google rejected the request.');
  }
  return new MailError('UPSTREAM', safeUpstream || 'Mail provider request failed.');
}

/**
 * Normalise any thrown value for the HTTP layer. Unknown (non-Google) errors
 * become a generic INTERNAL error; their details are not exposed.
 * @param {any} err
 * @returns {MailError}
 */
function toMailError(err) {
  if (err instanceof MailError) return err;
  if (looksLikeGoogleError(err)) return normaliseGoogleError(err);
  if (err && (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'EAI_AGAIN')) {
    return new MailError('UPSTREAM', 'Mail provider is unreachable.');
  }
  return new MailError('INTERNAL', 'Internal server error.');
}

module.exports = {
  CODES,
  MailError,
  validation,
  notFound,
  conflict,
  scrubMessage,
  looksLikeGoogleError,
  normaliseGoogleError,
  toMailError,
};
