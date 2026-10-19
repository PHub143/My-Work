/**
 * Gmail provider (Gmail API v1 via googleapis).
 *
 * Contract (see providers/index.js): every method takes the decrypted account
 * as first argument and returns provider-neutral shapes. Gmail label
 * semantics (INBOX/TRASH/UNREAD/...) stay inside this file.
 *
 * Quota notes (units): threads.list 10, threads.get 40, messages.get 20,
 * messages.modify 5, batchModify 50, trash 20, untrash 5, send 100,
 * drafts.create 10 / update 15 / send 100 / delete 10, labels.get/list 1.
 * Gmail enforces an undocumented per-user concurrent-request limit, so
 * parallel calls are capped at CONCURRENCY and 429/403 rateLimit responses are
 * retried with exponential backoff.
 *
 * Errors: every Google error is converted with toMailError(); the original
 * GaxiosError (which carries bearer tokens in its config) is never rethrown,
 * logged, or attached as `cause`.
 */
const crypto = require('crypto');
const { google } = require('googleapis');
const mime = require('../mime');
const {
  MailError,
  validation,
  toMailError,
} = require('../errors');

const ID = 'gmail';
const SCOPE_MODIFY = 'https://www.googleapis.com/auth/gmail.modify';
const SCOPE_FULL = 'https://mail.google.com/';

const CONCURRENCY = 4;
const RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_OPTIONS = { timeout: 30000 };
const METADATA_HEADERS = ['From', 'To', 'Cc', 'Subject', 'Date', 'Message-ID'];
const MAX_INLINE_BYTES = 5 * 1024 * 1024;
const MAX_USER_LABEL_COUNTS = 25;
const INLINE_IMAGE_RE = /^image\/(png|jpe?g|gif|webp|bmp|avif|x-icon)$/i;
const SAFE_HEADERS = ['message-id', 'references', 'in-reply-to', 'list-unsubscribe', 'list-id'];

const SYSTEM_FOLDERS = [
  { id: 'INBOX', role: 'inbox', name: 'Inbox' },
  { id: 'STARRED', role: 'starred', name: 'Starred' },
  { id: 'IMPORTANT', role: 'important', name: 'Important' },
  { id: 'SENT', role: 'sent', name: 'Sent' },
  { id: 'DRAFT', role: 'drafts', name: 'Drafts' },
  { id: 'ALL', role: 'all', name: 'All Mail', synthetic: true },
  { id: 'SPAM', role: 'spam', name: 'Spam' },
  { id: 'TRASH', role: 'trash', name: 'Trash' },
];

// ------------------------------------------------------------------ utils

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn`, converting Google errors to MailError and retrying RATE_LIMITED
 * with exponential backoff (1s, 2s, 4s + jitter).
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{retries?: number, baseDelayMs?: number, sleep?: (ms:number)=>Promise<void>}} [opts]
 * @returns {Promise<T>}
 */
async function gcall(fn, opts = {}) {
  const retries = opts.retries != null ? opts.retries : RETRIES;
  const base = opts.baseDelayMs != null ? opts.baseDelayMs : BASE_DELAY_MS;
  const sleep = opts.sleep || defaultSleep;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      const mailErr = toMailError(err);
      if (mailErr.code === 'RATE_LIMITED' && attempt < retries) {
        await sleep(base * 2 ** attempt + Math.floor(Math.random() * 250));
        continue;
      }
      throw mailErr;
    }
  }
}

/**
 * Map with bounded concurrency; preserves input order, rejects on first error.
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        failed = true;
        throw err;
      }
    }
  };
  const workers = [];
  for (let w = 0; w < Math.min(limit, items.length); w += 1) workers.push(worker());
  await Promise.all(workers);
  return results;
}

const scopeSet = (account) => new Set(String((account && account.grantedScopes) || '').split(/\s+/).filter(Boolean));

// ----------------------------------------------------------------- client

const clientCache = new Map();

function newOAuthClient(account) {
  return new google.auth.OAuth2(account.clientId, account.clientSecret, account.redirectUri);
}

/** Cached Gmail client per account (refreshes the access token as needed). */
function gmailFor(account) {
  if (!account.clientId || !account.clientSecret || !account.refreshToken) {
    throw new MailError('MAIL_NOT_CONNECTED', 'Mailbox is not connected.');
  }
  const fp = crypto
    .createHash('sha256')
    .update([account.clientId, account.clientSecret, account.redirectUri || '', account.refreshToken].join('\n'))
    .digest('hex');
  const hit = account.id ? clientCache.get(account.id) : null;
  if (hit && hit.fp === fp) return hit.gmail;
  const auth = newOAuthClient(account);
  auth.setCredentials({ refresh_token: account.refreshToken });
  const gmail = google.gmail({ version: 'v1', auth });
  if (account.id) clientCache.set(account.id, { fp, gmail });
  return gmail;
}

// ---------------------------------------------------------------- parsing

function headerMap(headers) {
  const map = {};
  for (const h of headers || []) {
    if (!h || typeof h.name !== 'string') continue;
    const key = h.name.toLowerCase();
    if (!(key in map)) map[key] = typeof h.value === 'string' ? h.value : '';
  }
  return map;
}

const stripAngle = (v) => String(v || '').trim().replace(/^<|>$/g, '');

function messageDate(msg, hdrs) {
  const ms = Number(msg.internalDate);
  if (Number.isFinite(ms) && ms > 0) return new Date(ms).toISOString();
  const d = hdrs.date ? new Date(hdrs.date) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

const firstAddress = (list) => list[0] || { name: '', email: '' };

/**
 * Convert a Gmail API message resource (any format) to the neutral Message.
 * Pure. Also returns inline `cid:` parts and text bodies that Gmail delivered
 * as separate attachments (fetched later by the caller).
 * @param {object} msg
 * @returns {{message: object, cidParts: Map<string, object>, pendingBodies: object[]}}
 */
function parseGmailMessage(msg) {
  const payload = msg.payload || {};
  const hdrs = headerMap(payload.headers);
  const labelIds = Array.isArray(msg.labelIds) ? msg.labelIds : [];
  const texts = [];
  const htmls = [];
  const attachments = [];
  const cidParts = new Map();
  const pendingBodies = [];
  let counter = 0;

  const walk = (part) => {
    if (!part) return;
    if (Array.isArray(part.parts) && part.parts.length) {
      part.parts.forEach(walk);
      return;
    }
    const type = String(part.mimeType || '').toLowerCase();
    const pHdrs = headerMap(part.headers);
    const disposition = String(pHdrs['content-disposition'] || '').toLowerCase();
    const filename = part.filename || '';
    const body = part.body || {};
    const contentId = stripAngle(pHdrs['content-id']);
    const isText = type === 'text/plain' || type === 'text/html';

    if (isText && !filename && !disposition.startsWith('attachment')) {
      if (body.data) {
        const decoded = mime.decodeBody(mime.fromBase64Url(body.data), pHdrs['content-type'] || '');
        (type === 'text/html' ? htmls : texts).push(decoded);
      } else if (body.attachmentId) {
        pendingBodies.push({ type, attachmentId: body.attachmentId, contentType: pHdrs['content-type'] || '', order: htmls.length + texts.length });
      }
      return;
    }
    if (!body.attachmentId && !body.data) return;
    counter += 1;
    const inline = !!contentId || disposition.startsWith('inline');
    if (body.attachmentId) {
      attachments.push({
        id: body.attachmentId,
        filename: filename || (inline ? `inline-${counter}` : `attachment-${counter}`),
        mimeType: type || 'application/octet-stream',
        size: Number(body.size) || 0,
        contentId: contentId || null,
        inline,
      });
    }
    if (contentId && INLINE_IMAGE_RE.test(type)) {
      cidParts.set(contentId, {
        mimeType: type,
        attachmentId: body.attachmentId || null,
        data: body.data || null,
        size: Number(body.size) || 0,
      });
    }
  };
  walk(payload);

  const safeHeaders = {};
  for (const key of SAFE_HEADERS) if (hdrs[key]) safeHeaders[key] = hdrs[key].slice(0, 2000);

  const message = {
    id: msg.id,
    threadId: msg.threadId,
    labelIds,
    from: firstAddress(mime.parseAddressList(hdrs.from)),
    to: mime.parseAddressList(hdrs.to),
    cc: mime.parseAddressList(hdrs.cc),
    bcc: mime.parseAddressList(hdrs.bcc),
    replyTo: mime.parseAddressList(hdrs['reply-to']),
    subject: mime.decodeHeaderText(hdrs.subject || ''),
    date: messageDate(msg, hdrs),
    snippet: msg.snippet || '',
    unread: labelIds.includes('UNREAD'),
    starred: labelIds.includes('STARRED'),
    bodyText: texts.join('\n\n'),
    bodyHtml: htmls.join(''),
    attachments,
    headers: safeHeaders,
  };
  return { message, cidParts, pendingBodies };
}

/**
 * Build a ThreadSummary from a threads.get (format=metadata) resource.
 * `hasAttachments` is a heuristic (top-level multipart/mixed or a part with a
 * filename) because metadata responses do not include attachment parts.
 * @param {object} thread
 * @param {string} [listSnippet]
 */
function buildThreadSummary(thread, listSnippet) {
  const messages = Array.isArray(thread.messages) ? thread.messages : [];
  const labelSet = new Set();
  const participants = [];
  const seen = new Set();
  let hasAttachments = false;
  for (const m of messages) {
    (m.labelIds || []).forEach((l) => labelSet.add(l));
    const p = m.payload || {};
    const hdrs = headerMap(p.headers);
    for (const a of mime.parseAddressList(hdrs.from)) {
      const k = a.email.toLowerCase();
      if (!seen.has(k)) { seen.add(k); participants.push(a); }
    }
    if (/^multipart\/mixed/i.test(p.mimeType || '') || (p.parts || []).some((x) => x && x.filename)) hasAttachments = true;
  }
  const first = messages[0];
  const last = messages[messages.length - 1] || {};
  const firstHdrs = headerMap(first && first.payload && first.payload.headers);
  const lastHdrs = headerMap(last.payload && last.payload.headers);
  const labelIds = [...labelSet];
  return {
    id: thread.id,
    subject: mime.decodeHeaderText(firstHdrs.subject || ''),
    snippet: last.snippet || thread.snippet || listSnippet || '',
    from: firstAddress(mime.parseAddressList(lastHdrs.from)),
    participants,
    date: messageDate(last, lastHdrs),
    messageCount: messages.length,
    unread: labelSet.has('UNREAD'),
    starred: labelSet.has('STARRED'),
    hasAttachments,
    labelIds,
  };
}

// -------------------------------------------------------------- operations

const capabilities = (account) => ({
  send: true,
  drafts: true,
  labels: true,
  star: true,
  archive: true,
  trash: true,
  search: true,
  permanentDelete: scopeSet(account).has(SCOPE_FULL),
});

/**
 * @param {object} account decrypted account
 * @param {string} state signed state from oauthState.createState
 * @returns {string} consent URL
 */
function getAuthUrl(account, state) {
  const scope = [SCOPE_MODIFY];
  if (account.allowPermanentDelete) scope.push(SCOPE_FULL);
  const params = {
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: false,
    scope,
    state,
  };
  if (account.emailAddress) params.login_hint = account.emailAddress;
  return newOAuthClient(account).generateAuthUrl(params);
}

/**
 * Exchange an authorization code for tokens and read the mailbox address.
 * @returns {Promise<{refreshToken: string, grantedScopes: string, emailAddress: string}>}
 */
async function exchangeCode(account, code) {
  const client = newOAuthClient(account);
  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch (err) {
    const e = toMailError(err);
    if (e.code === 'MAIL_REAUTH_REQUIRED') {
      throw validation('Authorization code is invalid or expired, or the OAuth client credentials/redirect URI are wrong. Start the connection again.');
    }
    throw e;
  }
  if (!tokens || !tokens.refresh_token) {
    throw validation('No refresh token received. Remove the app from your Google account permissions and connect again.');
  }
  const granted = String(tokens.scope || '');
  const set = new Set(granted.split(/\s+/).filter(Boolean));
  if (!set.has(SCOPE_MODIFY) && !set.has(SCOPE_FULL)) {
    throw validation('The Gmail permission was not granted. Connect again and allow access to Gmail.');
  }
  client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: client });
  const profile = await gcall(() => gmail.users.getProfile({ userId: 'me' }, REQUEST_OPTIONS));
  const emailAddress = profile.data && profile.data.emailAddress;
  if (!emailAddress) throw new MailError('UPSTREAM', 'Could not determine the mailbox address.');
  return { refreshToken: tokens.refresh_token, grantedScopes: granted, emailAddress: emailAddress.toLowerCase() };
}

async function getProfile(account) {
  const gmail = gmailFor(account);
  const res = await gcall(() => gmail.users.getProfile({ userId: 'me' }, REQUEST_OPTIONS));
  const d = res.data || {};
  return { emailAddress: d.emailAddress, messagesTotal: d.messagesTotal, threadsTotal: d.threadsTotal };
}

/** @returns {Promise<Array<{id,name,type,role,unreadCount,totalCount}>>} */
async function listFolders(account) {
  const gmail = gmailFor(account);
  const listRes = await gcall(() => gmail.users.labels.list({ userId: 'me' }, REQUEST_OPTIONS));
  const labels = listRes.data.labels || [];
  const byId = new Map(labels.map((l) => [l.id, l]));

  const systemWanted = SYSTEM_FOLDERS.filter((f) => !f.synthetic && byId.has(f.id));
  const userLabels = labels
    .filter((l) => l.type === 'user')
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const toFetch = [...systemWanted.map((f) => f.id), ...userLabels.slice(0, MAX_USER_LABEL_COUNTS).map((l) => l.id)];
  const details = new Map();
  const [detailList, profile] = await Promise.all([
    mapLimit(toFetch, CONCURRENCY, (id) => gcall(() => gmail.users.labels.get({ userId: 'me', id }, REQUEST_OPTIONS))),
    gcall(() => gmail.users.getProfile({ userId: 'me' }, REQUEST_OPTIONS)),
  ]);
  detailList.forEach((r) => details.set(r.data.id, r.data));

  const counts = (id) => {
    const d = details.get(id);
    if (!d) return { unreadCount: null, totalCount: null };
    // Drafts are counted per message; everything else per conversation.
    if (id === 'DRAFT') return { unreadCount: d.messagesUnread ?? null, totalCount: d.messagesTotal ?? null };
    return { unreadCount: d.threadsUnread ?? null, totalCount: d.threadsTotal ?? null };
  };

  const folders = [];
  for (const f of SYSTEM_FOLDERS) {
    if (f.synthetic) {
      folders.push({ id: f.id, name: f.name, type: 'system', role: f.role, unreadCount: null, totalCount: (profile.data && profile.data.threadsTotal) ?? null });
    } else if (byId.has(f.id)) {
      folders.push({ id: f.id, name: f.name, type: 'system', role: f.role, ...counts(f.id) });
    }
  }
  for (const l of userLabels) {
    folders.push({ id: l.id, name: l.name, type: 'user', role: null, ...counts(l.id) });
  }
  return folders;
}

/**
 * @param {object} account
 * @param {{folderId?: string, q?: string, pageToken?: string, pageSize?: number}} opts
 */
async function listThreads(account, opts = {}) {
  const gmail = gmailFor(account);
  const folderId = opts.folderId || 'INBOX';
  const params = { userId: 'me', maxResults: opts.pageSize || 25 };
  if (folderId !== 'ALL') params.labelIds = [folderId];
  if (folderId === 'TRASH' || folderId === 'SPAM') params.includeSpamTrash = true;
  if (opts.q) params.q = opts.q;
  if (opts.pageToken) params.pageToken = opts.pageToken;

  const listRes = await gcall(() => gmail.users.threads.list(params, REQUEST_OPTIONS));
  const items = listRes.data.threads || [];

  const summaries = await mapLimit(items, CONCURRENCY, async (item) => {
    try {
      const res = await gcall(() => gmail.users.threads.get(
        { userId: 'me', id: item.id, format: 'metadata', metadataHeaders: METADATA_HEADERS },
        REQUEST_OPTIONS
      ));
      return buildThreadSummary(res.data, item.snippet);
    } catch (err) {
      if (err instanceof MailError && err.code === 'NOT_FOUND') return null; // deleted since listing
      throw err;
    }
  });

  return {
    threads: summaries.filter(Boolean),
    nextPageToken: listRes.data.nextPageToken || null,
    resultSizeEstimate: listRes.data.resultSizeEstimate || 0,
  };
}

async function fetchAttachmentData(gmail, messageId, attachmentId) {
  const res = await gcall(() => gmail.users.messages.attachments.get(
    { userId: 'me', messageId, id: attachmentId },
    REQUEST_OPTIONS
  ));
  return mime.fromBase64Url(res.data.data || '');
}

/** Resolve deferred body parts and inline cid: images (<= 5 MB total). */
async function hydrateMessage(gmail, parsed) {
  const { message, cidParts, pendingBodies } = parsed;

  for (const pb of pendingBodies) {
    const buf = await fetchAttachmentData(gmail, message.id, pb.attachmentId);
    const text = mime.decodeBody(buf, pb.contentType);
    if (pb.type === 'text/html') message.bodyHtml += text;
    else message.bodyText += (message.bodyText ? '\n\n' : '') + text;
  }

  if (message.bodyHtml && cidParts.size && /cid:/i.test(message.bodyHtml)) {
    const referenced = [];
    message.bodyHtml.replace(/cid:([^"'\s)>]+)/gi, (m, id) => {
      let key = id;
      try { key = decodeURIComponent(id); } catch (e) { /* keep raw */ }
      if (cidParts.has(key) && !referenced.includes(key)) referenced.push(key);
      return m;
    });
    let budget = MAX_INLINE_BYTES;
    const dataUris = new Map();
    for (const key of referenced) {
      const part = cidParts.get(key);
      if (part.size > budget) continue;
      let buf = null;
      if (part.data) buf = mime.fromBase64Url(part.data);
      else if (part.attachmentId) buf = await fetchAttachmentData(gmail, message.id, part.attachmentId);
      if (!buf || buf.length > budget) continue;
      budget -= buf.length;
      dataUris.set(key, `data:${part.mimeType};base64,${buf.toString('base64')}`);
    }
    if (dataUris.size) {
      message.bodyHtml = message.bodyHtml.replace(/cid:([^"'\s)>]+)/gi, (m, id) => {
        let key = id;
        try { key = decodeURIComponent(id); } catch (e) { /* keep raw */ }
        return dataUris.get(key) || m;
      });
    }
  }
  return message;
}

async function getThread(account, threadId) {
  const gmail = gmailFor(account);
  const res = await gcall(() => gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' }, REQUEST_OPTIONS));
  const summary = buildThreadSummary(res.data);
  // Hydration may fetch deferred bodies / cid: images per message; keep it parallel but bounded.
  const messages = await mapLimit(res.data.messages || [], CONCURRENCY, (m) =>
    hydrateMessage(gmail, parseGmailMessage(m))
  );
  summary.hasAttachments = messages.some((m) => m.attachments.some((a) => !a.inline));
  return { ...summary, messages };
}

async function getMessage(account, messageId) {
  const gmail = gmailFor(account);
  const res = await gcall(() => gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' }, REQUEST_OPTIONS));
  return hydrateMessage(gmail, parseGmailMessage(res.data));
}

/**
 * @param {object} account
 * @param {string} messageId
 * @param {string} attachmentId
 * @param {{filename?: string, mimeType?: string}} [hints] untrusted fallbacks
 * @returns {Promise<{data: Buffer, filename: string, mimeType: string}>}
 */
async function getAttachment(account, messageId, attachmentId, hints = {}) {
  const gmail = gmailFor(account);
  const data = await fetchAttachmentData(gmail, messageId, attachmentId);
  let filename = hints.filename || '';
  let mimeType = hints.mimeType || '';
  // The client echoes the filename/type it got from this same message, so the
  // extra full-message fetch (20 quota units + every body) is only needed when
  // a hint is missing. Hints are validated by the controller and the response
  // is always a forced download (nosniff + sandbox CSP).
  if (!filename || !mimeType) {
    try {
      const res = await gcall(() => gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' }, REQUEST_OPTIONS));
      const { message } = parseGmailMessage(res.data);
      const found = message.attachments.find((a) => a.id === attachmentId) ||
        (hints.filename ? message.attachments.find((a) => a.filename === hints.filename) : null);
      if (found) {
        filename = filename || found.filename;
        mimeType = mimeType || found.mimeType;
      }
    } catch (err) {
      if (!(err instanceof MailError) || err.code === 'MAIL_REAUTH_REQUIRED') throw err;
    }
  }
  return {
    data,
    filename: filename || 'attachment',
    mimeType: mimeType || 'application/octet-stream',
  };
}

const ACTION_LABELS = {
  archive: { remove: ['INBOX'] },
  moveToInbox: { add: ['INBOX'], remove: ['SPAM', 'TRASH'] },
  markRead: { remove: ['UNREAD'] },
  markUnread: { add: ['UNREAD'] },
  star: { add: ['STARRED'] },
  unstar: { remove: ['STARRED'] },
};

/**
 * Apply a state change to threads or messages.
 * @param {object} account
 * @param {{target: 'threads'|'messages', ids: string[], action: string, addLabelIds?: string[], removeLabelIds?: string[]}} req
 * @returns {Promise<{updated: number, failed: string[]}>}
 */
async function applyAction(account, req) {
  const gmail = gmailFor(account);
  const { target, ids, action } = req;
  const isThread = target === 'threads';
  const res = isThread ? gmail.users.threads : gmail.users.messages;

  if (action === 'deleteForever' && !scopeSet(account).has(SCOPE_FULL)) {
    throw new MailError('SCOPE_REQUIRED', 'Permanent delete requires the full Gmail permission. Enable it in settings and reconnect.');
  }

  // Messages: single-call batch operations where Gmail offers them.
  if (!isThread && action === 'deleteForever') {
    await gcall(() => gmail.users.messages.batchDelete({ userId: 'me', requestBody: { ids } }, REQUEST_OPTIONS));
    return { updated: ids.length, failed: [] };
  }
  let labelChange = null;
  if (ACTION_LABELS[action]) {
    labelChange = { addLabelIds: ACTION_LABELS[action].add || [], removeLabelIds: ACTION_LABELS[action].remove || [] };
  } else if (action === 'label') {
    labelChange = { addLabelIds: req.addLabelIds || [], removeLabelIds: req.removeLabelIds || [] };
  }
  if (!isThread && labelChange) {
    await gcall(() => gmail.users.messages.batchModify({ userId: 'me', requestBody: { ids, ...labelChange } }, REQUEST_OPTIONS));
    return { updated: ids.length, failed: [] };
  }

  const one = (id) => {
    if (labelChange) return res.modify({ userId: 'me', id, requestBody: labelChange }, REQUEST_OPTIONS);
    if (action === 'trash') return res.trash({ userId: 'me', id }, REQUEST_OPTIONS);
    if (action === 'untrash') return res.untrash({ userId: 'me', id }, REQUEST_OPTIONS);
    if (action === 'deleteForever') return res.delete({ userId: 'me', id }, REQUEST_OPTIONS);
    throw validation(`Unsupported action: ${action}`);
  };

  const failed = [];
  let firstError = null;
  await mapLimit(ids, CONCURRENCY, async (id) => {
    try {
      await gcall(() => one(id));
    } catch (err) {
      const e = toMailError(err);
      // Auth/scope problems affect every id: stop early instead of N failures.
      if (e.code === 'MAIL_REAUTH_REQUIRED' || e.code === 'SCOPE_REQUIRED') throw e;
      failed.push(id);
      if (!firstError) firstError = e;
    }
  });
  if (failed.length === ids.length && firstError) throw firstError;
  return { updated: ids.length - failed.length, failed };
}

// ----------------------------------------------------------- compose/send

/** Build Gmail `raw` (+ threadId) from a neutral Compose, resolving reply headers. */
async function composeToRaw(gmail, account, compose) {
  let threadId = compose.threadId;
  let inReplyTo;
  let references;
  if (compose.replyToMessageId) {
    const res = await gcall(() => gmail.users.messages.get(
      { userId: 'me', id: compose.replyToMessageId, format: 'metadata', metadataHeaders: ['Message-ID', 'References'] },
      REQUEST_OPTIONS
    ));
    const hdrs = headerMap(res.data.payload && res.data.payload.headers);
    const msgId = (hdrs['message-id'] || '').match(/<[^<>\s]{1,998}>/);
    const refs = (hdrs.references || '').match(/<[^<>\s]{1,998}>/g) || [];
    if (msgId) {
      inReplyTo = msgId[0];
      references = [...refs, msgId[0]].slice(-20).join(' ');
    }
    threadId = threadId || res.data.threadId;
  }
  const raw = mime.buildRawMessage({
    from: account.emailAddress ? { email: account.emailAddress } : undefined,
    to: compose.to,
    cc: compose.cc,
    bcc: compose.bcc,
    subject: compose.subject,
    bodyText: compose.bodyText,
    bodyHtml: compose.bodyHtml,
    inReplyTo,
    references,
  });
  return { raw, threadId };
}

/** Neutral Message reconstructed from compose input (no extra API call). */
function draftMessageFromCompose(account, compose, apiMessage) {
  const text = compose.bodyText || '';
  return {
    id: (apiMessage && apiMessage.id) || null,
    threadId: (apiMessage && apiMessage.threadId) || compose.threadId || null,
    labelIds: (apiMessage && apiMessage.labelIds) || ['DRAFT'],
    from: { name: '', email: account.emailAddress || '' },
    to: compose.to || [],
    cc: compose.cc || [],
    bcc: compose.bcc || [],
    replyTo: [],
    subject: compose.subject || '',
    date: new Date().toISOString(),
    snippet: text.replace(/\s+/g, ' ').trim().slice(0, 120),
    unread: false,
    starred: false,
    bodyText: text,
    bodyHtml: compose.bodyHtml || '',
    attachments: [],
    headers: {},
  };
}

async function createDraft(account, compose) {
  const gmail = gmailFor(account);
  const { raw, threadId } = await composeToRaw(gmail, account, compose);
  const message = { raw };
  if (threadId) message.threadId = threadId;
  const res = await gcall(() => gmail.users.drafts.create({ userId: 'me', requestBody: { message } }, REQUEST_OPTIONS));
  return { draftId: res.data.id, message: draftMessageFromCompose(account, compose, res.data.message) };
}

async function updateDraft(account, draftId, compose) {
  const gmail = gmailFor(account);
  const { raw, threadId } = await composeToRaw(gmail, account, compose);
  const message = { raw };
  if (threadId) message.threadId = threadId;
  const res = await gcall(() => gmail.users.drafts.update({ userId: 'me', id: draftId, requestBody: { id: draftId, message } }, REQUEST_OPTIONS));
  return { draftId: res.data.id || draftId, message: draftMessageFromCompose(account, compose, res.data.message) };
}

async function getDraft(account, draftId) {
  const gmail = gmailFor(account);
  const res = await gcall(() => gmail.users.drafts.get({ userId: 'me', id: draftId, format: 'full' }, REQUEST_OPTIONS));
  const message = await hydrateMessage(gmail, parseGmailMessage(res.data.message || {}));
  return { draftId: res.data.id, message };
}

async function listDrafts(account, opts = {}) {
  const gmail = gmailFor(account);
  const params = { userId: 'me', maxResults: opts.pageSize || 25 };
  if (opts.pageToken) params.pageToken = opts.pageToken;
  if (opts.q) params.q = opts.q;
  const listRes = await gcall(() => gmail.users.drafts.list(params, REQUEST_OPTIONS));
  const items = listRes.data.drafts || [];
  const drafts = await mapLimit(items, CONCURRENCY, async (d) => {
    try {
      const res = await gcall(() => gmail.users.messages.get(
        { userId: 'me', id: d.message.id, format: 'metadata', metadataHeaders: METADATA_HEADERS },
        REQUEST_OPTIONS
      ));
      return { draftId: d.id, message: parseGmailMessage(res.data).message };
    } catch (err) {
      if (err instanceof MailError && err.code === 'NOT_FOUND') return null;
      throw err;
    }
  });
  return { drafts: drafts.filter(Boolean), nextPageToken: listRes.data.nextPageToken || null };
}

async function deleteDraft(account, draftId) {
  const gmail = gmailFor(account);
  await gcall(() => gmail.users.drafts.delete({ userId: 'me', id: draftId }, REQUEST_OPTIONS));
}

async function sendDraft(account, draftId) {
  const gmail = gmailFor(account);
  const res = await gcall(() => gmail.users.drafts.send({ userId: 'me', requestBody: { id: draftId } }, REQUEST_OPTIONS));
  return { id: res.data.id, threadId: res.data.threadId, labelIds: res.data.labelIds || [] };
}

async function send(account, compose) {
  const gmail = gmailFor(account);
  const { raw, threadId } = await composeToRaw(gmail, account, compose);
  const requestBody = { raw };
  if (threadId) requestBody.threadId = threadId;
  const res = await gcall(() => gmail.users.messages.send({ userId: 'me', requestBody }, REQUEST_OPTIONS));
  return { id: res.data.id, threadId: res.data.threadId, labelIds: res.data.labelIds || [] };
}

module.exports = {
  id: ID,
  name: 'Gmail',
  // Permanent delete needs the broader https://mail.google.com/ scope (opt-in per account).
  supportsPermanentDelete: true,
  scopes: { modify: SCOPE_MODIFY, full: SCOPE_FULL },
  capabilities,
  getAuthUrl,
  exchangeCode,
  getProfile,
  listFolders,
  listThreads,
  getThread,
  getMessage,
  getAttachment,
  applyAction,
  listDrafts,
  getDraft,
  createDraft,
  updateDraft,
  deleteDraft,
  sendDraft,
  send,
  // Exposed for unit tests only.
  _internals: { gcall, mapLimit, parseGmailMessage, buildThreadSummary, hydrateMessage },
};
