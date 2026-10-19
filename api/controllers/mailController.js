const mailService = require('../services/mailService');
const mime = require('../services/mail/mime');
const { validation, toMailError, scrubMessage } = require('../services/mail/errors');

/**
 * Inbox data endpoints (folders, threads, messages, drafts, send, actions).
 * All errors are returned as `{ message, code }` (the global error handler
 * drops `code`, so this controller responds itself).
 */

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const ATTACHMENT_ID_RE = /^[A-Za-z0-9_=.-]{1,2048}$/;
const PAGE_TOKEN_RE = /^[A-Za-z0-9_=.-]{1,1024}$/;
const MIME_TYPE_RE = /^[A-Za-z0-9!#$&^_.+-]{1,64}\/[A-Za-z0-9!#$&^_.+-]{1,100}$/;
const ACTIONS = ['archive', 'moveToInbox', 'trash', 'untrash', 'markRead', 'markUnread', 'star', 'unstar', 'label', 'deleteForever'];

const MAX_IDS = 100;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 25;
const MAX_QUERY_LENGTH = 500;
const MAX_SUBJECT_LENGTH = 500;
const MAX_BODY_BYTES = 90 * 1024; // express.json() global limit is 100 KB
const MAX_RECIPIENTS_PER_FIELD = 50;
const MAX_RECIPIENTS_TOTAL = 100;
const MAX_LABEL_IDS = 20;

/**
 * Send a MailError (or any error) as `{message, code}`.
 * @param {import('express').Response} res
 * @param {any} err
 */
function handleError(res, err) {
  const mailErr = toMailError(err);
  if (mailErr.status >= 500) {
    console.error('[mail]', mailErr.code, scrubMessage(mailErr.message, 200),
      mailErr.code === 'INTERNAL' && err ? `(${err.name}${err.code ? ` ${err.code}` : ''})` : '');
  }
  if (res.headersSent) return;
  res.status(mailErr.status).json({ message: mailErr.message, code: mailErr.code });
}

// --------------------------------------------------------------- validators

function requireId(value, field) {
  if (typeof value !== 'string' || !ID_RE.test(value)) throw validation(`Invalid ${field}.`);
  return value;
}

function optionalString(value, field, max) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw validation(`${field} must be a string.`);
  if (value.length > max) throw validation(`${field} must be at most ${max} characters.`);
  if (value.includes('\0')) throw validation(`${field} contains invalid characters.`);
  return value;
}

function parsePageSize(value) {
  if (value === undefined || value === '') return DEFAULT_PAGE_SIZE;
  const n = typeof value === 'string' && /^\d{1,3}$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > MAX_PAGE_SIZE) throw validation(`pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}.`);
  return n;
}

function parsePageToken(value) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !PAGE_TOKEN_RE.test(value)) throw validation('Invalid pageToken.');
  return value;
}

/** Validate list query parameters shared by threads and drafts. */
function parseListQuery(query) {
  const q = optionalString(query.q, 'q', MAX_QUERY_LENGTH);
  return { q, pageToken: parsePageToken(query.pageToken), pageSize: parsePageSize(query.pageSize) };
}

function parseAddressField(value, field) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw validation(`${field} must be an array of addresses.`);
  if (value.length > MAX_RECIPIENTS_PER_FIELD) throw validation(`${field} has too many recipients.`);
  return value.map((item) => {
    let name = '';
    let email;
    if (typeof item === 'string') {
      const parsed = mime.parseAddressList(item);
      if (parsed.length !== 1) throw validation(`Invalid address in ${field}.`);
      ({ name, email } = parsed[0]);
    } else if (item && typeof item === 'object') {
      email = item.email;
      name = item.name == null ? '' : item.name;
    } else {
      throw validation(`Invalid address in ${field}.`);
    }
    if (typeof email !== 'string' || typeof name !== 'string') throw validation(`Invalid address in ${field}.`);
    if (name.length > 200) throw validation(`Display name in ${field} is too long.`);
    mime.assertNoHeaderInjection(name, `${field} display name`);
    return { name: name.trim(), email: mime.normaliseEmail(email) };
  });
}

/**
 * Validate a Compose body. `requireRecipient` is true for send, false for drafts.
 * @returns {{to,cc,bcc,subject,bodyText,bodyHtml,threadId,replyToMessageId}}
 */
function parseCompose(body, { requireRecipient }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validation('Request body must be a JSON object.');
  const to = parseAddressField(body.to, 'to');
  const cc = parseAddressField(body.cc, 'cc');
  const bcc = parseAddressField(body.bcc, 'bcc');
  if (to.length + cc.length + bcc.length > MAX_RECIPIENTS_TOTAL) throw validation('Too many recipients.');
  if (requireRecipient && to.length + cc.length + bcc.length === 0) throw validation('At least one recipient is required.');

  const subject = body.subject === undefined || body.subject === null ? '' : body.subject;
  if (typeof subject !== 'string') throw validation('subject must be a string.');
  if (subject.length > MAX_SUBJECT_LENGTH) throw validation(`subject must be at most ${MAX_SUBJECT_LENGTH} characters.`);
  mime.assertNoHeaderInjection(subject, 'subject');

  const bodyText = body.bodyText === undefined || body.bodyText === null ? '' : body.bodyText;
  const bodyHtml = body.bodyHtml === undefined || body.bodyHtml === null || body.bodyHtml === '' ? undefined : body.bodyHtml;
  if (typeof bodyText !== 'string') throw validation('bodyText must be a string.');
  if (bodyHtml !== undefined && typeof bodyHtml !== 'string') throw validation('bodyHtml must be a string.');
  const bytes = Buffer.byteLength(bodyText, 'utf8') + (bodyHtml ? Buffer.byteLength(bodyHtml, 'utf8') : 0);
  if (bytes > MAX_BODY_BYTES) throw validation(`Message body is too large (limit ${Math.floor(MAX_BODY_BYTES / 1024)} KB).`);

  const threadId = body.threadId == null || body.threadId === '' ? undefined : requireId(body.threadId, 'threadId');
  const replyToMessageId = body.replyToMessageId == null || body.replyToMessageId === ''
    ? undefined
    : requireId(body.replyToMessageId, 'replyToMessageId');

  return { to, cc, bcc, subject, bodyText, bodyHtml, threadId, replyToMessageId };
}

function parseLabelIds(value, field) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_LABEL_IDS) throw validation(`${field} must be an array of at most ${MAX_LABEL_IDS} label ids.`);
  return value.map((v) => {
    if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(v)) throw validation(`Invalid label id in ${field}.`);
    return v;
  });
}

function parseActionBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validation('Request body must be a JSON object.');
  const { ids, action } = body;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_IDS) throw validation(`ids must be an array of 1 to ${MAX_IDS} items.`);
  const cleanIds = [...new Set(ids.map((id) => requireId(id, 'id')))];
  if (typeof action !== 'string' || !ACTIONS.includes(action)) throw validation(`action must be one of: ${ACTIONS.join(', ')}.`);
  const req = { ids: cleanIds, action };
  if (action === 'label') {
    req.addLabelIds = parseLabelIds(body.addLabelIds, 'addLabelIds');
    req.removeLabelIds = parseLabelIds(body.removeLabelIds, 'removeLabelIds');
    if (req.addLabelIds.length + req.removeLabelIds.length === 0) throw validation('label action requires addLabelIds or removeLabelIds.');
  }
  return req;
}

/** Content-Disposition value with ASCII fallback + RFC 5987 filename*. */
function contentDisposition(filename) {
  const clean = String(filename || 'attachment').replace(/[\u0000-\u001f\u007f]/g, '').replace(/[\\/]/g, '_').slice(0, 200) || 'attachment';
  const ascii = clean.replace(/[^\x20-\x7E]/g, '_').replace(/["\;]/g, '_');
  const encoded = encodeURIComponent(clean).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

// ---------------------------------------------------------------- handlers

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    handleError(res, err);
  }
};

const listFoldersHandler = wrap(async (req, res) => {
  const folders = await mailService.listFolders(requireId(req.params.id, 'account id'));
  res.status(200).json({ folders });
});

const listThreadsHandler = wrap(async (req, res) => {
  const accountId = requireId(req.params.id, 'account id');
  const folderId = req.query.folder === undefined || req.query.folder === '' ? 'INBOX' : requireId(req.query.folder, 'folder');
  const { q, pageToken, pageSize } = parseListQuery(req.query);
  const result = await mailService.listThreads(accountId, { folderId, q, pageToken, pageSize });
  res.status(200).json({
    threads: result.threads,
    nextPageToken: result.nextPageToken,
    resultSizeEstimate: result.resultSizeEstimate,
  });
});

const getThreadHandler = wrap(async (req, res) => {
  const thread = await mailService.getThread(requireId(req.params.id, 'account id'), requireId(req.params.threadId, 'thread id'));
  res.status(200).json({ thread });
});

const getMessageHandler = wrap(async (req, res) => {
  const message = await mailService.getMessage(requireId(req.params.id, 'account id'), requireId(req.params.messageId, 'message id'));
  res.status(200).json({ message });
});

const getAttachmentHandler = wrap(async (req, res) => {
  const accountId = requireId(req.params.id, 'account id');
  const messageId = requireId(req.params.messageId, 'message id');
  const attachmentId = req.params.attachmentId;
  if (typeof attachmentId !== 'string' || !ATTACHMENT_ID_RE.test(attachmentId)) throw validation('Invalid attachment id.');
  const filename = optionalString(req.query.filename, 'filename', 255);
  const hintType = optionalString(req.query.mimeType, 'mimeType', 170);
  if (hintType !== undefined && !MIME_TYPE_RE.test(hintType)) throw validation('Invalid mimeType.');

  const file = await mailService.getAttachment(accountId, messageId, attachmentId, { filename, mimeType: hintType });
  const type = MIME_TYPE_RE.test(file.mimeType) ? file.mimeType : 'application/octet-stream';
  res.status(200);
  res.set({
    'Content-Type': type,
    'Content-Disposition': contentDisposition(file.filename),
    'Content-Length': String(file.data.length),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  res.end(file.data);
});

const makeActionHandler = (target) => wrap(async (req, res) => {
  const accountId = requireId(req.params.id, 'account id');
  const parsed = parseActionBody(req.body);
  const result = await mailService.applyAction(accountId, { ...parsed, target });
  res.status(200).json({ updated: result.updated, failed: result.failed });
});

const listDraftsHandler = wrap(async (req, res) => {
  const { q, pageToken, pageSize } = parseListQuery(req.query);
  const result = await mailService.listDrafts(requireId(req.params.id, 'account id'), { q, pageToken, pageSize });
  res.status(200).json({ drafts: result.drafts, nextPageToken: result.nextPageToken });
});

const getDraftHandler = wrap(async (req, res) => {
  const draft = await mailService.getDraft(requireId(req.params.id, 'account id'), requireId(req.params.draftId, 'draft id'));
  res.status(200).json({ draft });
});

const createDraftHandler = wrap(async (req, res) => {
  const accountId = requireId(req.params.id, 'account id');
  const compose = parseCompose(req.body, { requireRecipient: false });
  const draft = await mailService.createDraft(accountId, compose);
  res.status(201).json({ draft });
});

const updateDraftHandler = wrap(async (req, res) => {
  const accountId = requireId(req.params.id, 'account id');
  const draftId = requireId(req.params.draftId, 'draft id');
  const compose = parseCompose(req.body, { requireRecipient: false });
  const draft = await mailService.updateDraft(accountId, draftId, compose);
  res.status(200).json({ draft });
});

const deleteDraftHandler = wrap(async (req, res) => {
  await mailService.deleteDraft(requireId(req.params.id, 'account id'), requireId(req.params.draftId, 'draft id'));
  res.status(200).json({ message: 'Draft deleted.' });
});

const sendDraftHandler = wrap(async (req, res) => {
  const message = await mailService.sendDraft(requireId(req.params.id, 'account id'), requireId(req.params.draftId, 'draft id'));
  res.status(200).json({ message });
});

const sendHandler = wrap(async (req, res) => {
  const accountId = requireId(req.params.id, 'account id');
  const compose = parseCompose(req.body, { requireRecipient: true });
  const message = await mailService.send(accountId, compose);
  res.status(200).json({ message });
});

module.exports = {
  // Exposed for unit tests only.
  _internals: { parseCompose, parseActionBody, parseListQuery, parseAddressField, contentDisposition, requireId },
  handleError,
  wrap,
  requireId,
  parseCompose,
  parseActionBody,
  parseListQuery,
  contentDisposition,
  listFoldersHandler,
  listThreadsHandler,
  getThreadHandler,
  getMessageHandler,
  getAttachmentHandler,
  applyThreadActionHandler: makeActionHandler('threads'),
  applyMessageActionHandler: makeActionHandler('messages'),
  listDraftsHandler,
  getDraftHandler,
  createDraftHandler,
  updateDraftHandler,
  deleteDraftHandler,
  sendDraftHandler,
  sendHandler,
};
