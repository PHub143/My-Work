/**
 * Pure MIME / RFC 5322 helpers for the mail module (no I/O).
 *
 * Outgoing: header-injection guards, RFC 2047 encoding, raw message builder,
 * base64url. Incoming: RFC 2047 decoding, address-list parsing, charset-aware
 * body decoding.
 */
const crypto = require('crypto');
const { domainToASCII } = require('url');
const { validation } = require('./errors');

const MAX_EMAIL_LENGTH = 254;
const LOCAL_PART_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}$/;
const DOMAIN_RE = /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const FORBIDDEN_CHARS_RE = /[\r\n\0]/;

/**
 * Throw a VALIDATION MailError when a header value contains CR, LF or NUL.
 * @param {string} value
 * @param {string} field Name used in the error message.
 * @returns {string} the same value
 */
function assertNoHeaderInjection(value, field = 'header') {
  if (typeof value !== 'string') throw validation(`${field} must be a string.`);
  if (FORBIDDEN_CHARS_RE.test(value)) throw validation(`${field} must not contain line breaks.`);
  return value;
}

/** @param {Buffer|string} input @returns {string} base64url without padding */
function toBase64Url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {string} str base64url (padding optional) @returns {Buffer} */
function fromBase64Url(str) {
  const s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(s, 'base64');
}

const isPrintableAscii = (s) => /^[\x20-\x7E]*$/.test(s);

/**
 * Split a string into chunks whose UTF-8 size is <= maxBytes without cutting
 * through a code point.
 */
function chunkUtf8(str, maxBytes) {
  const chunks = [];
  let current = '';
  let currentBytes = 0;
  for (const ch of str) {
    const b = Buffer.byteLength(ch, 'utf8');
    if (currentBytes + b > maxBytes && current) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += ch;
    currentBytes += b;
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * RFC 2047 "B" encode free text for use in an unstructured header (Subject) or
 * a display name. Pure printable ASCII is returned unchanged. Multiple encoded
 * words are joined with CRLF + space (header folding).
 * @param {string} text
 * @returns {string}
 */
function encodeHeaderText(text) {
  assertNoHeaderInjection(text, 'Header text');
  if (isPrintableAscii(text)) return text;
  return chunkUtf8(text, 42)
    .map((c) => `=?UTF-8?B?${Buffer.from(c, 'utf8').toString('base64')}?=`)
    .join('\r\n ');
}

/**
 * Validate an addr-spec. Domains are converted to ASCII (punycode).
 * @param {string} email
 * @returns {string} normalised address
 */
function normaliseEmail(email) {
  assertNoHeaderInjection(email, 'Email address');
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at < 1 || trimmed.length > MAX_EMAIL_LENGTH) throw validation(`Invalid email address: ${trimmed.slice(0, 80)}`);
  const local = trimmed.slice(0, at);
  const domain = domainToASCII(trimmed.slice(at + 1)) || '';
  if (!LOCAL_PART_RE.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') || !DOMAIN_RE.test(domain)) {
    throw validation(`Invalid email address: ${trimmed.slice(0, 80)}`);
  }
  return `${local}@${domain}`;
}

/**
 * Format `{ name, email }` as an RFC 5322 mailbox.
 * @param {{name?: string, email: string}} address
 * @returns {string}
 */
function formatAddress(address) {
  if (!address || typeof address !== 'object') throw validation('Invalid address.');
  const email = normaliseEmail(String(address.email || ''));
  const name = address.name == null ? '' : String(address.name).trim();
  if (!name) return email;
  assertNoHeaderInjection(name, 'Display name');
  let display;
  if (!isPrintableAscii(name)) {
    display = encodeHeaderText(name);
  } else if (/^[A-Za-z0-9 !#$%&'*+\-/=?^_`{|}~]+$/.test(name)) {
    display = name;
  } else {
    display = `"${name.replace(/(["\\])/g, '\\$1')}"`;
  }
  return `${display} <${email}>`;
}

/** @param {Array<{name?: string, email: string}>} list @returns {string} */
function formatAddressList(list) {
  return (list || []).map(formatAddress).join(',\r\n ');
}

// ---------------------------------------------------------------- decoding

function decodeBytes(buf, charset) {
  const cs = String(charset || 'utf-8').trim().toLowerCase().replace(/^["']|["']$/g, '');
  try {
    return new TextDecoder(cs === 'utf8' ? 'utf-8' : cs).decode(buf);
  } catch (e) {
    return buf.toString('utf8');
  }
}

/**
 * Decode RFC 2047 encoded-words (B and Q) found in a header value.
 * @param {string} value
 * @returns {string}
 */
function decodeHeaderText(value) {
  if (!value || typeof value !== 'string') return '';
  const collapsed = value.replace(/(\?=)[ \t\r\n]+(?==\?)/g, '$1');
  return collapsed.replace(/=\?([^?\s]+)\?([BbQq])\?([^?\s]*)\?=/g, (m, charset, enc, text) => {
    try {
      let buf;
      if (enc.toUpperCase() === 'B') {
        buf = Buffer.from(text, 'base64');
      } else {
        const bytes = [];
        const s = text.replace(/_/g, ' ');
        for (let i = 0; i < s.length; i++) {
          if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
            bytes.push(parseInt(s.slice(i + 1, i + 3), 16));
            i += 2;
          } else {
            bytes.push(s.charCodeAt(i) & 0xff);
          }
        }
        buf = Buffer.from(bytes);
      }
      return decodeBytes(buf, charset);
    } catch (e) {
      return m;
    }
  });
}

/**
 * Parse an address-list header (From/To/Cc/Reply-To) into `{name, email}`.
 * Tolerant: invalid entries and group syntax without an address are skipped.
 * @param {string} header
 * @returns {Array<{name: string, email: string}>}
 */
function parseAddressList(header) {
  if (!header || typeof header !== 'string') return [];
  const pieces = [];
  let buf = '';
  let inQuote = false;
  let angle = 0;
  let comment = 0;
  for (let i = 0; i < header.length; i++) {
    const c = header[i];
    if (inQuote) {
      buf += c;
      if (c === '\\' && i + 1 < header.length) { buf += header[++i]; } else if (c === '"') inQuote = false;
      continue;
    }
    if (comment > 0) {
      if (c === '(') comment++;
      else if (c === ')') comment--;
      continue;
    }
    if (c === '"') { inQuote = true; buf += c; continue; }
    if (c === '(') { comment++; continue; }
    if (c === '<') angle++;
    if (c === '>') angle = Math.max(0, angle - 1);
    if ((c === ',' || c === ';') && angle === 0) { pieces.push(buf); buf = ''; continue; }
    buf += c;
  }
  if (buf.trim()) pieces.push(buf);

  const out = [];
  for (const raw of pieces) {
    const piece = raw.trim();
    if (!piece) continue;
    let name = '';
    let email = '';
    const m = piece.match(/^(.*?)<([^<>]*)>\s*$/s);
    if (m) {
      name = m[1].trim();
      email = m[2].trim();
    } else {
      email = piece.replace(/^"|"$/g, '').trim();
    }
    // Drop group prefix like `undisclosed-recipients:` / `Team: a@b.c`.
    if (email.includes(':')) email = email.slice(email.lastIndexOf(':') + 1).trim();
    if (!email.includes('@') || /\s/.test(email)) continue;
    if (name.startsWith('"') && name.endsWith('"') && name.length >= 2) {
      name = name.slice(1, -1).replace(/\\(.)/g, '$1');
    }
    out.push({ name: decodeHeaderText(name).trim(), email });
  }
  return out;
}

/**
 * Decode a body buffer using the charset declared in a Content-Type value.
 * @param {Buffer} buf
 * @param {string} [contentType]
 * @returns {string}
 */
function decodeBody(buf, contentType) {
  const m = /charset\s*=\s*"?([^";\s]+)"?/i.exec(contentType || '');
  return decodeBytes(buf, m ? m[1] : 'utf-8');
}

// ---------------------------------------------------------------- building

function base64Wrapped(buf) {
  return buf.toString('base64').replace(/.{1,76}/g, '$&\r\n').replace(/\r\n$/, '');
}

const toCrlf = (s) => String(s).replace(/\r\n|\r|\n/g, '\r\n');

/**
 * Header value that is a list of `<msg-id>` tokens (In-Reply-To, References).
 * @param {string} value
 * @param {string} field
 */
function assertMessageIdList(value, field) {
  assertNoHeaderInjection(value, field);
  const v = value.trim();
  if (v.length > 4000 || !/^(<[^<>\s]{1,998}>\s*)+$/.test(v)) throw validation(`${field} is malformed.`);
  return v.replace(/\s+/g, ' ');
}

/**
 * Build an RFC 5322 message and return it base64url-encoded (Gmail `raw`).
 * All header values are validated against CR/LF injection; non-ASCII Subject
 * and display names are RFC 2047 encoded; bodies are UTF-8 base64.
 *
 * @param {object} p
 * @param {{name?: string, email: string}} [p.from]
 * @param {Array<{name?: string, email: string}>} [p.to]
 * @param {Array<{name?: string, email: string}>} [p.cc]
 * @param {Array<{name?: string, email: string}>} [p.bcc]
 * @param {string} [p.subject]
 * @param {string} [p.bodyText]
 * @param {string} [p.bodyHtml]
 * @param {string} [p.inReplyTo]  `<id>` of the replied-to message
 * @param {string} [p.references] space separated `<id>` list
 * @param {Date} [p.date]
 * @returns {string} base64url raw message
 */
function buildRawMessage(p) {
  const headers = [];
  headers.push(`Date: ${(p.date || new Date()).toUTCString().replace('GMT', '+0000')}`);
  if (p.from) headers.push(`From: ${formatAddress(p.from)}`);
  if (p.to && p.to.length) headers.push(`To: ${formatAddressList(p.to)}`);
  if (p.cc && p.cc.length) headers.push(`Cc: ${formatAddressList(p.cc)}`);
  if (p.bcc && p.bcc.length) headers.push(`Bcc: ${formatAddressList(p.bcc)}`);
  headers.push(`Subject: ${encodeHeaderText(p.subject || '')}`);
  if (p.inReplyTo) headers.push(`In-Reply-To: ${assertMessageIdList(p.inReplyTo, 'In-Reply-To')}`);
  if (p.references) headers.push(`References: ${assertMessageIdList(p.references, 'References')}`);
  headers.push('MIME-Version: 1.0');

  const text = Buffer.from(toCrlf(p.bodyText || ''), 'utf8');
  let body;
  if (p.bodyHtml) {
    const boundary = `=_mail_${crypto.randomBytes(16).toString('hex')}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const html = Buffer.from(toCrlf(p.bodyHtml), 'utf8');
    body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      base64Wrapped(text),
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      base64Wrapped(html),
      `--${boundary}--`,
      '',
    ].join('\r\n');
  } else {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    headers.push('Content-Transfer-Encoding: base64');
    body = base64Wrapped(text) + '\r\n';
  }
  return toBase64Url(`${headers.join('\r\n')}\r\n\r\n${body}`);
}

module.exports = {
  assertNoHeaderInjection,
  assertMessageIdList,
  toBase64Url,
  fromBase64Url,
  encodeHeaderText,
  normaliseEmail,
  formatAddress,
  formatAddressList,
  decodeHeaderText,
  parseAddressList,
  decodeBody,
  decodeBytes,
  buildRawMessage,
};
