import { API_URL } from '../config';

/**
 * Thin fetch wrapper for the admin-only /mail API (api/routes/mailRoutes.js).
 * Every call carries the bearer token and an optional AbortSignal. Failures
 * throw MailApiError {status, code, message}; aborts rethrow the DOM
 * AbortError untouched so callers can ignore them with isAbortError().
 *
 * Error codes: VALIDATION 400, SCOPE_REQUIRED 403, NOT_FOUND 404, CONFLICT 409,
 * MAIL_NOT_CONNECTED 412, MAIL_REAUTH_REQUIRED 412, RATE_LIMITED 429,
 * UPSTREAM 502. `NETWORK` (status 0) is client-side only.
 */
export class MailApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Request failed.' } = {}) {
    super(message);
    this.name = 'MailApiError';
    this.status = status;
    this.code = code;
  }
}

export const isAbortError = (error) => error?.name === 'AbortError';

const enc = encodeURIComponent;

const errorFromResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  return new MailApiError({
    status: response.status,
    code: data.code || (response.status === 429 ? 'RATE_LIMITED' : 'UNKNOWN'),
    message: data.message || data.error || `Request failed (${response.status}).`,
  });
};

const send = async (token, path, { method = 'GET', body, signal } = {}) => {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new MailApiError({ status: 0, code: 'NETWORK', message: 'Could not reach the server.' });
  }
  if (!response.ok) throw await errorFromResponse(response);
  return response;
};

const json = async (token, path, options) => {
  const response = await send(token, path, options);
  return response.json().catch(() => ({}));
};

const query = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

/** Bind the API to a bearer token. Cheap — create it inline or memoise it. */
export const createMailApi = (token) => {
  const acct = (accountId) => `/mail/accounts/${enc(accountId)}`;

  return {
    /* providers + accounts (Settings → Mail) */
    listProviders: (opts) => json(token, '/mail/providers', opts),
    listAccounts: (opts) => json(token, '/mail/accounts', opts),
    createAccount: (body, opts) => json(token, '/mail/accounts', { ...opts, method: 'POST', body }),
    updateAccount: (accountId, body, opts) =>
      json(token, acct(accountId), { ...opts, method: 'PUT', body }),
    deleteAccount: (accountId, opts) => json(token, acct(accountId), { ...opts, method: 'DELETE' }),
    setDefaultAccount: (accountId, opts) =>
      json(token, `${acct(accountId)}/default`, { ...opts, method: 'POST' }),
    disconnectAccount: (accountId, opts) =>
      json(token, `${acct(accountId)}/disconnect`, { ...opts, method: 'POST' }),

    /* OAuth */
    getOAuthUrl: (accountId, opts) => json(token, `${acct(accountId)}/oauth/url`, opts),
    completeOAuth: ({ code, state }, opts) =>
      json(token, '/mail/oauth/callback', { ...opts, method: 'POST', body: { code, state } }),

    /* mailbox */
    listFolders: (accountId, opts) => json(token, `${acct(accountId)}/folders`, opts),
    listThreads: (accountId, { folder, q, pageToken, pageSize } = {}, opts) =>
      json(token, `${acct(accountId)}/threads${query({ folder, q, pageToken, pageSize })}`, opts),
    getThread: (accountId, threadId, opts) =>
      json(token, `${acct(accountId)}/threads/${enc(threadId)}`, opts),
    getMessage: (accountId, messageId, opts) =>
      json(token, `${acct(accountId)}/messages/${enc(messageId)}`, opts),
    /** Resolves to a Blob; hints let the server resolve the filename/type. */
    fetchAttachment: async (accountId, messageId, attachmentId, hints = {}, opts) => {
      const response = await send(
        token,
        `${acct(accountId)}/messages/${enc(messageId)}/attachments/${enc(attachmentId)}${query({
          filename: hints.filename,
          mimeType: hints.mimeType,
        })}`,
        opts,
      );
      return response.blob();
    },

    /** action: archive|moveToInbox|trash|untrash|markRead|markUnread|star|unstar|deleteForever */
    threadAction: (accountId, { ids, action }, opts) =>
      json(token, `${acct(accountId)}/threads/actions`, {
        ...opts,
        method: 'POST',
        body: { ids, action },
      }),
    messageAction: (accountId, { ids, action }, opts) =>
      json(token, `${acct(accountId)}/messages/actions`, {
        ...opts,
        method: 'POST',
        body: { ids, action },
      }),

    /* drafts + send */
    listDrafts: (accountId, { pageToken, pageSize } = {}, opts) =>
      json(token, `${acct(accountId)}/drafts${query({ pageToken, pageSize })}`, opts),
    getDraft: (accountId, draftId, opts) =>
      json(token, `${acct(accountId)}/drafts/${enc(draftId)}`, opts),
    createDraft: (accountId, compose, opts) =>
      json(token, `${acct(accountId)}/drafts`, { ...opts, method: 'POST', body: compose }),
    updateDraft: (accountId, draftId, compose, opts) =>
      json(token, `${acct(accountId)}/drafts/${enc(draftId)}`, {
        ...opts,
        method: 'PUT',
        body: compose,
      }),
    deleteDraft: (accountId, draftId, opts) =>
      json(token, `${acct(accountId)}/drafts/${enc(draftId)}`, { ...opts, method: 'DELETE' }),
    sendDraft: (accountId, draftId, opts) =>
      json(token, `${acct(accountId)}/drafts/${enc(draftId)}/send`, { ...opts, method: 'POST' }),
    send: (accountId, compose, opts) =>
      json(token, `${acct(accountId)}/send`, { ...opts, method: 'POST', body: compose }),
  };
};
