const mailAccountService = require('../services/mailAccountService');
const mailService = require('../services/mailService');
const providers = require('../services/mail/providers');
const { validation } = require('../services/mail/errors');
const { wrap, requireId } = require('./mailController');

/**
 * Mail account management + OAuth connect endpoints. Secrets are never
 * returned: responses contain `hasClientSecret` / `isConnected` / `status` only.
 */

const MASK = '********';

function str(value, field, { min = 0, max }) {
  if (typeof value !== 'string') throw validation(`${field} must be a string.`);
  const v = value.trim();
  if (v.length < min || v.length > max) throw validation(`${field} must be ${min ? `${min} to ` : 'at most '}${max} characters.`);
  if (/[\u0000-\u001f]/.test(v)) throw validation(`${field} contains invalid characters.`);
  return v;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The OAuth redirect must land on this app's own frontend: the origins already
 * trusted by CORS (FRONTEND_URL, comma-separated) plus localhost for dev.
 * Google also rejects unregistered URIs; this stops pointing the code elsewhere.
 * @param {string} uri
 * @param {string} [frontendUrls] comma-separated origins (defaults to FRONTEND_URL)
 */
function isAllowedRedirectUri(uri, frontendUrls = process.env.FRONTEND_URL) {
  let url;
  try {
    url = new URL(uri);
  } catch (e) {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (LOCAL_HOSTS.has(url.hostname)) return true;
  return String(frontendUrls || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      try {
        return new URL(entry).origin === url.origin;
      } catch (e) {
        return false;
      }
    });
}

function redirectUri(value) {
  const v = str(value, 'redirectUri', { min: 1, max: 500 });
  let url;
  try {
    url = new URL(v);
  } catch (e) {
    throw validation('redirectUri must be a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw validation('redirectUri must be an http(s) URL.');
  if (!isAllowedRedirectUri(v)) {
    throw validation('redirectUri must be on this app\'s own origin (FRONTEND_URL) or localhost.');
  }
  return v;
}

function bool(value, field) {
  if (typeof value !== 'boolean') throw validation(`${field} must be a boolean.`);
  return value;
}

function requireBodyObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validation('Request body must be a JSON object.');
  return body;
}

const isBlankSecret = (v) => v === undefined || v === null || v === '' || v === MASK;

const listProvidersHandler = wrap(async (req, res) => {
  res.status(200).json({ providers: mailService.listProviders() });
});

const listAccountsHandler = wrap(async (req, res) => {
  res.status(200).json({ accounts: await mailAccountService.listAccounts() });
});

const getAccountHandler = wrap(async (req, res) => {
  res.status(200).json({ account: await mailAccountService.getAccount(requireId(req.params.id, 'account id')) });
});

const createAccountHandler = wrap(async (req, res) => {
  const body = requireBodyObject(req.body);
  const provider = body.provider === undefined ? 'gmail' : body.provider;
  if (!providers.hasProvider(provider)) throw validation('Unsupported mail provider.');
  if (isBlankSecret(body.clientSecret)) throw validation('clientSecret is required.');
  const data = {
    provider,
    name: body.name === undefined || body.name === '' ? 'Gmail' : str(body.name, 'name', { min: 1, max: 100 }),
    clientId: str(body.clientId, 'clientId', { min: 1, max: 300 }),
    clientSecret: str(body.clientSecret, 'clientSecret', { min: 1, max: 500 }),
    redirectUri: redirectUri(body.redirectUri),
    allowPermanentDelete: body.allowPermanentDelete === undefined ? false : bool(body.allowPermanentDelete, 'allowPermanentDelete'),
    isDefault: body.isDefault === undefined ? false : bool(body.isDefault, 'isDefault'),
  };
  res.status(201).json({ account: await mailAccountService.createAccount(data) });
});

const updateAccountHandler = wrap(async (req, res) => {
  const id = requireId(req.params.id, 'account id');
  const body = requireBodyObject(req.body);
  const data = {};
  if (body.name !== undefined) data.name = str(body.name, 'name', { min: 1, max: 100 });
  if (body.clientId !== undefined) data.clientId = str(body.clientId, 'clientId', { min: 1, max: 300 });
  if (body.redirectUri !== undefined) data.redirectUri = redirectUri(body.redirectUri);
  if (body.allowPermanentDelete !== undefined) data.allowPermanentDelete = bool(body.allowPermanentDelete, 'allowPermanentDelete');
  // Blank or masked secret means "keep the stored ciphertext".
  if (!isBlankSecret(body.clientSecret)) data.clientSecret = str(body.clientSecret, 'clientSecret', { min: 1, max: 500 });
  res.status(200).json({ account: await mailAccountService.updateAccount(id, data) });
});

const deleteAccountHandler = wrap(async (req, res) => {
  await mailAccountService.deleteAccount(requireId(req.params.id, 'account id'));
  res.status(200).json({ message: 'Mail account deleted.' });
});

const setDefaultHandler = wrap(async (req, res) => {
  res.status(200).json({ account: await mailAccountService.setDefault(requireId(req.params.id, 'account id')) });
});

const disconnectHandler = wrap(async (req, res) => {
  res.status(200).json({ account: await mailAccountService.disconnect(requireId(req.params.id, 'account id')) });
});

const getAuthUrlHandler = wrap(async (req, res) => {
  const url = await mailService.getAuthUrl(requireId(req.params.id, 'account id'), req.user.id);
  res.status(200).json({ url });
});

const oauthCallbackHandler = wrap(async (req, res) => {
  const body = requireBodyObject(req.body);
  const code = str(body.code, 'code', { min: 1, max: 2048 });
  const state = str(body.state, 'state', { min: 1, max: 2048 });
  const account = await mailService.completeOAuth({ code, state, userId: req.user.id });
  res.status(200).json({ account });
});

module.exports = {
  listProvidersHandler,
  listAccountsHandler,
  getAccountHandler,
  createAccountHandler,
  updateAccountHandler,
  deleteAccountHandler,
  setDefaultHandler,
  disconnectHandler,
  getAuthUrlHandler,
  oauthCallbackHandler,
  // Exposed for unit tests only.
  _internals: { isAllowedRedirectUri },
};
