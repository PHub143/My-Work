import DOMPurify from 'dompurify';

/**
 * HTML mail safety. The ONLY place mail HTML is sanitised and wrapped.
 *
 * Defence in depth (all three are required, none is sufficient alone):
 *   1. sanitizeHtml()  — DOMPurify strips scripts/handlers/dangerous URLs.
 *   2. buildSrcdoc()   — CSP + referrer <meta> are the FIRST children of <head>;
 *                        `default-src 'none'` blocks anything the sanitiser missed.
 *   3. MailBody renders the result in a sandboxed iframe (no scripts, no
 *      same-origin), so even a bypass cannot reach the admin session token.
 *
 * `sanitizeHtml` is the single seam: swap the implementation here, nowhere else.
 */

const FORBID_TAGS = [
  'script',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'meta',
  'link',
  'base',
  'svg',
  'math',
  'audio',
  'video',
  'source',
  'track',
];

const FORBID_ATTR = ['formaction', 'action', 'srcdoc', 'ping', 'autofocus'];

const DANGEROUS_URL_RE = /^\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i;

let hooksInstalled = false;

const installHooks = () => {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!node || typeof node.tagName !== 'string') return;
    // Belt and braces on URL-bearing attributes (DOMPurify already filters).
    ['href', 'src', 'xlink:href', 'background', 'poster'].forEach((attr) => {
      const value = node.getAttribute && node.getAttribute(attr);
      if (value && DANGEROUS_URL_RE.test(value)) node.removeAttribute(attr);
    });
    if (node.tagName === 'A' || node.tagName === 'AREA') {
      if (node.hasAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      } else {
        node.removeAttribute('target');
        node.removeAttribute('rel');
      }
    }
  });
};

/** Sanitise untrusted mail HTML → safe HTML fragment string. Browser-only. */
export const sanitizeHtml = (html) => {
  const input = typeof html === 'string' ? html : '';
  if (!input) return '';
  if (!DOMPurify.isSupported) {
    // No DOM available (SSR/tests): fail closed, never return raw markup.
    return '';
  }
  installHooks();
  return DOMPurify.sanitize(input, {
    FORBID_TAGS,
    FORBID_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    // Keep leading <style> blocks (newsletters) instead of dropping them.
    FORCE_BODY: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
};

/** CSP for the srcdoc. Remote images only after the per-message opt-in. */
export const buildCsp = ({ allowRemoteImages = false } = {}) =>
  [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    allowRemoteImages ? 'img-src data: https:' : 'img-src data:',
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');

const escapeAttr = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const BASE_STYLE = [
  'html{color-scheme:light}',
  'body{margin:0;padding:14px 16px;background:#ffffff;color:#1d2125;',
  'font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
  'overflow-wrap:anywhere}',
  'img{max-width:100%;height:auto}',
  'table{max-width:100%}',
  'a{color:#1a56db}',
  'blockquote{margin:0 0 0 .5em;padding-left:.8em;border-left:3px solid #d0d7de}',
  'pre{white-space:pre-wrap}',
].join('');

/**
 * Wrap already-sanitised HTML in a complete document. The CSP meta and the
 * referrer meta MUST be the first two children of <head> — a CSP only governs
 * content that follows it.
 */
export const buildSrcdoc = (cleanHtml, { allowRemoteImages = false } = {}) =>
  '<!doctype html><html><head>' +
  `<meta http-equiv="Content-Security-Policy" content="${escapeAttr(buildCsp({ allowRemoteImages }))}">` +
  '<meta name="referrer" content="no-referrer">' +
  '<meta charset="utf-8">' +
  `<style>${BASE_STYLE}</style>` +
  '</head><body>' +
  String(cleanHtml || '') +
  '</body></html>';

/** Does sanitised HTML reference remote (http/https/protocol-relative) images? */
export const hasRemoteImages = (cleanHtml) => {
  const html = String(cleanHtml || '');
  if (/<img\b[^>]*\ssrc\s*=\s*["']?\s*(?:https?:)?\/\//i.test(html)) return true;
  if (/<img\b[^>]*\ssrcset\s*=\s*["'][^"']*(?:https?:)?\/\//i.test(html)) return true;
  if (/\sbackground\s*=\s*["']?\s*(?:https?:)?\/\//i.test(html)) return true;
  return /url\(\s*["']?\s*(?:https?:)?\/\//i.test(html);
};
