/**
 * Signed OAuth `state` for the mail connect flow (kept separate from the
 * Drive flow, whose state is an unsigned `{driveConfigId}` JSON).
 *
 * State string = JSON `{kind:'mail', provider, accountId, exp, sig}` where
 * sig = HMAC-SHA256(JWT_SECRET, `mail|provider|accountId|userId|exp`) and the
 * user id of the admin who started the flow is bound into the signature but
 * not transmitted, so a state minted for one admin is useless for another.
 */
const crypto = require('crypto');
const { validation } = require('./errors');

const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_STATE_LENGTH = 2048;

/**
 * Key for the state HMAC. Derived from JWT_SECRET with a purpose label so the
 * raw JWT signing key is never used directly for anything else (no new env var).
 */
function defaultSecret() {
  const jwtSecret = require('../../config/jwt').JWT_SECRET;
  return crypto.createHmac('sha256', jwtSecret).update('mail-oauth-state/v1').digest();
}

function computeSig(secret, provider, accountId, userId, exp) {
  return crypto
    .createHmac('sha256', secret)
    .update(['mail', provider, accountId, String(userId), String(exp)].join('|'))
    .digest('base64url');
}

/**
 * @param {{provider: string, accountId: string, userId: string|number}} p
 * @param {{secret?: string, now?: number}} [opts]
 * @returns {string} state string for the provider auth URL
 */
function createState({ provider, accountId, userId }, opts = {}) {
  const secret = opts.secret || defaultSecret();
  const now = opts.now != null ? opts.now : Date.now();
  const exp = now + STATE_TTL_MS;
  return JSON.stringify({
    kind: 'mail',
    provider,
    accountId,
    exp,
    sig: computeSig(secret, provider, accountId, userId, exp),
  });
}

/**
 * Verify a state string. Throws VALIDATION MailError (400) on any failure.
 * @param {string} state
 * @param {{userId: string|number, secret?: string, now?: number}} opts
 * @returns {{provider: string, accountId: string}}
 */
function verifyState(state, opts) {
  const fail = () => validation('Invalid or expired OAuth state. Start the connection again.');
  if (typeof state !== 'string' || !state || state.length > MAX_STATE_LENGTH) throw fail();
  let parsed;
  try {
    parsed = JSON.parse(state);
  } catch (e) {
    throw fail();
  }
  if (!parsed || typeof parsed !== 'object' || parsed.kind !== 'mail') throw fail();
  const { provider, accountId, exp, sig } = parsed;
  if (typeof provider !== 'string' || typeof accountId !== 'string' || typeof sig !== 'string' || !Number.isFinite(exp)) throw fail();
  if (opts == null || opts.userId == null || opts.userId === '') throw fail();

  const secret = opts.secret || defaultSecret();
  const now = opts.now != null ? opts.now : Date.now();
  if (exp < now || exp > now + STATE_TTL_MS + 60 * 1000) throw fail();

  const expected = Buffer.from(computeSig(secret, provider, accountId, opts.userId, exp));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) throw fail();
  return { provider, accountId };
}

module.exports = { createState, verifyState, STATE_TTL_MS };
