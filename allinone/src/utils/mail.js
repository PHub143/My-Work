/**
 * Pure helpers for the admin Inbox (Gmail provider). No DOM, no React, no
 * network — everything here is unit-tested in mail.test.js with node:test.
 *
 * Shapes mirror the API contract (see api/routes/mailRoutes.js):
 *   Address{name,email}  Folder{id,name,type,role,unreadCount,totalCount}
 *   ThreadSummary{id,subject,snippet,from,participants,date,messageCount,
 *                 unread,starred,hasAttachments,labelIds}
 *   Message{id,threadId,from,to,cc,bcc,replyTo,subject,date,bodyText,bodyHtml,…}
 */

/* ── limits ── */

/** express.json() on the API is capped at 100 KB; keep headroom for the envelope. */
export const MAIL_BODY_LIMIT_BYTES = 90 * 1024;
export const MAIL_PAGE_SIZE = 25;
export const MAIL_AUTOSAVE_DELAY_MS = 3000;
const MAX_QUOTE_CHARS = 30000;

/* ── OAuth state (Drive vs Gmail callback discrimination) ── */

const decodeBase64Url = (value) => {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/**
 * Decode an OAuth `state` query value into an object, or null when it is not
 * JSON (e.g. the legacy bare-driveConfigId form the Drive callback tolerates).
 * Accepts plain JSON and base64url-encoded JSON.
 */
export const parseOAuthState = (stateParam) => {
  if (typeof stateParam !== 'string' || !stateParam.trim()) return null;
  const raw = stateParam.trim();
  const attempts = [() => JSON.parse(raw), () => JSON.parse(decodeBase64Url(raw))];
  for (const attempt of attempts) {
    try {
      const parsed = attempt();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      /* try next decoding */
    }
  }
  return null;
};

/** True only for a Gmail/mail OAuth state; every other state is a Drive flow. */
export const isMailOAuthState = (stateParam) => parseOAuthState(stateParam)?.kind === 'mail';

/* ── addresses ── */

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

export const isValidEmail = (value) => EMAIL_RE.test(String(value || '').trim());

/** Split "A <a@x.y>, \"B, C\" <b@x.y>" on top-level commas/semicolons only. */
export const splitAddressList = (input) => {
  const text = String(input || '');
  const parts = [];
  let current = '';
  let inQuotes = false;
  let inAngle = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\\' && inQuotes) {
      current += ch + (text[i + 1] || '');
      i += 1;
      continue;
    }
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === '<') inAngle = true;
    else if (!inQuotes && ch === '>') inAngle = false;
    if ((ch === ',' || ch === ';') && !inQuotes && !inAngle) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

export const parseAddress = (input) => {
  const text = String(input || '').trim();
  if (!text) return null;
  const match = text.match(/^(.*?)<([^<>]*)>\s*$/);
  if (match) {
    const name = match[1]
      .trim()
      .replace(/^"(.*)"$/, '$1')
      .replace(/\\(["\\])/g, '$1')
      .trim();
    return { name, email: match[2].trim() };
  }
  return { name: '', email: text };
};

export const parseAddressList = (input) =>
  splitAddressList(input).map(parseAddress).filter(Boolean);

export const formatAddress = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  const email = address.email || '';
  const name = (address.name || '').trim();
  if (!name || name === email) return email;
  const safe = /[",;<>()@[\]\\]/.test(name) ? `"${name.replace(/(["\\])/g, '\\$1')}"` : name;
  return email ? `${safe} <${email}>` : safe;
};

export const formatAddressList = (list) =>
  (Array.isArray(list) ? list : []).map(formatAddress).filter(Boolean).join(', ');

/** Short human label: display name, else the address. */
export const senderLabel = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return (address.name || '').trim() || address.email || '';
};

/** "Alice, Bob" style label for a list row. */
export const participantsLabel = (thread) => {
  const list = Array.isArray(thread?.participants) && thread.participants.length > 0
    ? thread.participants
    : thread?.from
      ? [thread.from]
      : [];
  const names = list.map((p) => {
    const label = senderLabel(p);
    return label.includes('@') && !(p && p.name) ? label.split('@')[0] : label.split(/\s+/)[0] || label;
  });
  return names.filter(Boolean).slice(0, 3).join(', ');
};

export const dedupeAddresses = (list, exclude = []) => {
  const skip = new Set(exclude.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean));
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((address) => {
    const email = String(address?.email || '').trim().toLowerCase();
    if (!email || skip.has(email) || seen.has(email)) return;
    seen.add(email);
    out.push(address);
  });
  return out;
};

/* ── folders ── */

const ROLE_ORDER = [
  'inbox',
  'starred',
  'important',
  'sent',
  'drafts',
  'all',
  'archive',
  'spam',
  'trash',
];

export const folderRole = (folder) => String(folder?.role || '').toLowerCase();

const isUserFolder = (folder) =>
  folder?.type === 'user' || (!folderRole(folder) && folder?.type !== 'system');

/** System folders in Gmail's order, then user labels A→Z. Never mutates input. */
export const sortFolders = (folders) => {
  const list = Array.isArray(folders) ? [...folders] : [];
  const rank = (folder) => {
    if (isUserFolder(folder)) return ROLE_ORDER.length + 1;
    const idx = ROLE_ORDER.indexOf(folderRole(folder));
    return idx === -1 ? ROLE_ORDER.length : idx;
  };
  return list.sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
      sensitivity: 'base',
    });
  });
};

export const findFolder = (folders, id) =>
  (Array.isArray(folders) ? folders : []).find((f) => f.id === id) || null;

export const findFolderByRole = (folders, role) =>
  (Array.isArray(folders) ? folders : []).find((f) => folderRole(f) === role) || null;

/** Which bulk/reader actions make sense in a folder with this role. */
export const actionsForRole = (role) => {
  const r = String(role || '').toLowerCase();
  const inTrash = r === 'trash';
  const inSpam = r === 'spam';
  return {
    archive: !inTrash && !inSpam && !['drafts', 'archive', 'sent'].includes(r),
    trash: !inTrash,
    restore: inTrash, // untrash
    notSpam: inSpam, // moveToInbox
    deleteForever: inTrash || inSpam,
    markRead: true,
    markUnread: true,
    star: true,
  };
};

/* ── dates & snippets ── */

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** List-row date: time today, "Mar 4" this year, "Mar 4, 2024" otherwise. */
export const formatListDate = (value, now = new Date(), locale) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (sameDay(date, now)) {
    return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
};

/** Full date for the reader header and quote lines. */
export const formatFullDate = (value, locale) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export const decodeEntities = (text) =>
  String(text || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      try {
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      } catch {
        return match;
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? match : named;
  });

/** Gmail snippets are HTML-entity-escaped; make them display text. */
export const cleanSnippet = (snippet, maxLength = 140) => {
  const text = decodeEntities(snippet).replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

export const displaySubject = (subject) => (String(subject || '').trim() ? subject : '(no subject)');

/** "1–25" for the pager; "0" when the page is empty. */
export const pagerLabel = ({ pageIndex = 0, pageSize = MAIL_PAGE_SIZE, count = 0 }) => {
  if (!count) return '0';
  const start = pageIndex * pageSize + 1;
  return `${start}–${start + count - 1}`;
};

export const formatBytes = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

/* ── errors → UI ── */

/**
 * Map an API error {status, code, message} to a UI treatment.
 * kind: not_connected | reauth | rate_limited | scope | not_found | conflict | other
 */
export const describeMailError = (error) => {
  const code = error?.code;
  const message = error?.message || 'Something went wrong.';
  switch (code) {
    case 'MAIL_NOT_CONNECTED':
      return { kind: 'not_connected', title: 'Connect a Gmail account in Settings → Mail', message, retryable: false };
    case 'MAIL_REAUTH_REQUIRED':
      return { kind: 'reauth', title: 'Gmail needs to be reconnected', message, retryable: false };
    case 'RATE_LIMITED':
      return {
        kind: 'rate_limited',
        title: 'Gmail is rate limiting requests',
        message: 'Wait a minute, then try again.',
        retryable: true,
      };
    case 'SCOPE_REQUIRED':
      return {
        kind: 'scope',
        title: 'Permission missing',
        message: 'Enable permanent delete for this account in Settings → Mail and reconnect.',
        retryable: false,
      };
    case 'NOT_FOUND':
      return { kind: 'not_found', title: 'Not found', message, retryable: false };
    case 'CONFLICT':
      return { kind: 'conflict', title: 'Out of date', message, retryable: true };
    default:
      return { kind: 'other', title: 'Could not reach Gmail', message, retryable: true };
  }
};

/* ── search params (page state lives in the URL) ── */

export const readInboxParams = (searchParams) => ({
  account: searchParams.get('account') || '',
  folder: searchParams.get('folder') || '',
  q: searchParams.get('q') || '',
  thread: searchParams.get('thread') || '',
});

/** Returns a new URLSearchParams with `patch` applied; empty values are dropped. */
export const patchInboxParams = (searchParams, patch) => {
  const next = new URLSearchParams(searchParams);
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, String(value));
  });
  return next;
};

/* ── keyboard shortcuts ── */

/** True when a key event should NOT trigger a single-key shortcut. */
export const shouldIgnoreShortcut = (event) => {
  if (!event) return true;
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  if (event.isComposing) return true;
  const target = event.target;
  if (!target) return false;
  const tag = String(target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (typeof target.closest === 'function' && target.closest('dialog[open]')) return true;
  return false;
};

/* ── body → text, reply / forward builders ── */

export const htmlToText = (html) => {
  const withBreaks = String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(withBreaks)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const plainBodyOf = (message) => {
  if (!message) return '';
  if (typeof message.bodyText === 'string' && message.bodyText.trim()) return message.bodyText;
  if (typeof message.bodyHtml === 'string' && message.bodyHtml.trim()) return htmlToText(message.bodyHtml);
  return '';
};

const prefixSubject = (subject, prefix) => {
  const base = String(subject || '').trim();
  const re = new RegExp(`^\\s*${prefix}\\s*:\\s*`, 'i');
  return re.test(base) ? base : `${prefix}: ${base}`.trim();
};

const quoteLines = (text) =>
  String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => (line.startsWith('>') ? `>${line}` : `> ${line}`.trimEnd()))
    .join('\n');

const limitQuote = (text) =>
  text.length > MAX_QUOTE_CHARS ? `${text.slice(0, MAX_QUOTE_CHARS)}\n[… quoted text truncated]` : text;

/**
 * Build the Compose payload for reply / replyAll / forward from a Message.
 * Pure: `selfEmail` removes the user's own address from reply-all recipients.
 */
export const buildReplyDraft = (message, mode, { selfEmail = '', locale } = {}) => {
  const from = message?.from || null;
  const when = formatFullDate(message?.date, locale);
  const body = limitQuote(plainBodyOf(message));
  const base = {
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    bodyText: '',
    threadId: message?.threadId || undefined,
    replyToMessageId: message?.id || undefined,
  };

  if (mode === 'forward') {
    const header = [
      '---------- Forwarded message ---------',
      `From: ${formatAddress(from)}`,
      `Date: ${when}`,
      `Subject: ${message?.subject || ''}`,
      `To: ${formatAddressList(message?.to)}`,
    ];
    if (Array.isArray(message?.cc) && message.cc.length > 0) {
      header.push(`Cc: ${formatAddressList(message.cc)}`);
    }
    return {
      ...base,
      subject: prefixSubject(message?.subject, 'Fwd'),
      bodyText: `\n\n${header.join('\n')}\n\n${body}`,
      // A forward starts a fresh recipient list but stays attached to the thread.
      replyToMessageId: message?.id || undefined,
    };
  }

  const replyTo = Array.isArray(message?.replyTo) ? message.replyTo[0] : message?.replyTo;
  const primaryAddress = replyTo?.email ? replyTo : from;
  const quoted = `On ${when}, ${formatAddress(from)} wrote:\n${quoteLines(body)}`;
  const reply = {
    ...base,
    subject: prefixSubject(message?.subject, 'Re'),
    bodyText: `\n\n${quoted}`,
  };

  if (mode === 'replyAll') {
    const to = dedupeAddresses(
      [primaryAddress, ...(Array.isArray(message?.to) ? message.to : [])].filter(Boolean),
      [selfEmail],
    );
    const toEmails = to.map((a) => a.email);
    const cc = dedupeAddresses(Array.isArray(message?.cc) ? message.cc : [], [selfEmail, ...toEmails]);
    // Reply-all to your own sent message: keep the original recipients.
    return { ...reply, to: to.length > 0 ? to : primaryAddress ? [primaryAddress] : [], cc };
  }

  return { ...reply, to: primaryAddress ? [primaryAddress] : [] };
};

/* ── compose validation ── */

export const utf8Length = (text) => {
  return new TextEncoder().encode(String(text ?? '')).length;
};

/** Size of the JSON payload that will be POSTed — what express.json() limits. */
export const composePayloadBytes = (compose) => utf8Length(JSON.stringify(compose || {}));

export const bodyUsage = (compose, limit = MAIL_BODY_LIMIT_BYTES) => {
  const bytes = composePayloadBytes(compose);
  return { bytes, limit, over: bytes > limit, ratio: Math.min(1, bytes / limit) };
};

/** → { ok, errors: string[] }. `forSend=false` is the lenient draft check. */
export const validateCompose = (compose, { forSend = true } = {}) => {
  const errors = [];
  const recipients = [
    ...(compose?.to || []),
    ...(compose?.cc || []),
    ...(compose?.bcc || []),
  ];
  if (forSend && (compose?.to || []).length === 0) errors.push('Add at least one recipient.');
  recipients.forEach((a) => {
    if (!isValidEmail(a?.email)) errors.push(`"${a?.email || ''}" is not a valid email address.`);
  });
  if (bodyUsage(compose).over) errors.push('Message is too large (limit about 90 KB, attachments are not supported yet).');
  return { ok: errors.length === 0, errors };
};

/** Compose → what the draft/send endpoints receive. Drops empty optional fields. */
export const toComposePayload = (state) => {
  const payload = {
    to: state.to || [],
    subject: state.subject || '',
    bodyText: state.bodyText || '',
  };
  if (state.cc?.length) payload.cc = state.cc;
  if (state.bcc?.length) payload.bcc = state.bcc;
  if (state.threadId) payload.threadId = state.threadId;
  if (state.replyToMessageId) payload.replyToMessageId = state.replyToMessageId;
  return payload;
};
