import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

/**
 * DOMPurify only works with a DOM, so this file installs jsdom's window BEFORE
 * mailHtml.js (and therefore dompurify) is first imported. It covers the
 * attacker-controlled HTML path that mail.test.js cannot (it has no DOM).
 */
let sanitizeHtml;
let buildSrcdoc;
let hasRemoteImages;

before(async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  ({ sanitizeHtml, buildSrcdoc, hasRemoteImages } = await import('./mailHtml.js'));
});

/** Parse sanitised output back into a DOM for structural assertions. */
const parse = (html) => new JSDOM(`<body>${html}</body>`).window.document;

test('script tags and their contents are removed', () => {
  const out = sanitizeHtml('<p>hi</p><script>window.stolen = localStorage.token</script>');
  assert.ok(!/<script/i.test(out));
  assert.ok(!out.includes('localStorage'));
  assert.ok(out.includes('hi'));
});

test('inline event handlers are stripped', () => {
  const doc = parse(sanitizeHtml('<img src="data:image/png;base64,AAAA" onerror="alert(1)"><a href="https://a.example" onclick="alert(2)">x</a>'));
  assert.equal(doc.querySelectorAll('[onerror],[onclick]').length, 0);
});

test('javascript:, vbscript: and data:text/html URLs are removed', () => {
  const html = [
    '<a href="javascript:alert(1)">a</a>',
    '<a href="  JaVaScRiPt:alert(1)">b</a>',
    '<a href="vbscript:msgbox(1)">c</a>',
    '<a href="data:text/html;base64,PHNjcmlwdD4=">d</a>',
  ].join('');
  const doc = parse(sanitizeHtml(html));
  doc.querySelectorAll('a').forEach((a) => {
    assert.equal(a.getAttribute('href'), null, `href survived: ${a.outerHTML}`);
  });
});

test('every link opens in a new tab with noopener noreferrer', () => {
  const doc = parse(sanitizeHtml('<a href="https://example.com/x">go</a><a name="anchor">no href</a>'));
  const [withHref, withoutHref] = doc.querySelectorAll('a');
  assert.equal(withHref.getAttribute('target'), '_blank');
  assert.equal(withHref.getAttribute('rel'), 'noopener noreferrer');
  assert.equal(withoutHref.getAttribute('target'), null);
});

test('forms, frames, objects, media, svg, meta, link and base are forbidden', () => {
  const html = [
    '<form action="https://evil.example"><input name="pw"><button>go</button></form>',
    '<iframe src="https://evil.example"></iframe>',
    '<object data="x"></object><embed src="x">',
    '<video src="x"></video><audio src="x"></audio>',
    '<svg><script>alert(1)</script></svg>',
    '<meta http-equiv="refresh" content="0;url=https://evil.example">',
    '<link rel="stylesheet" href="https://evil.example/x.css">',
    '<base href="https://evil.example/">',
    '<p>kept</p>',
  ].join('');
  const doc = parse(sanitizeHtml(html));
  for (const tag of ['form', 'input', 'button', 'iframe', 'object', 'embed', 'video', 'audio', 'svg', 'meta', 'link', 'base']) {
    assert.equal(doc.querySelectorAll(tag).length, 0, `<${tag}> survived`);
  }
  assert.ok(doc.body.textContent.includes('kept'));
});

test('benign formatting survives', () => {
  const out = sanitizeHtml('<h1>Title</h1><p><strong>bold</strong> <em>it</em></p><ul><li>one</li></ul><table><tr><td>cell</td></tr></table>');
  for (const tag of ['<h1>', '<strong>', '<em>', '<ul>', '<li>', '<table>', '<td>']) {
    assert.ok(out.includes(tag), `${tag} was removed`);
  }
});

test('empty and non-string input yield an empty string', () => {
  assert.equal(sanitizeHtml(''), '');
  assert.equal(sanitizeHtml(null), '');
  assert.equal(sanitizeHtml(undefined), '');
  assert.equal(sanitizeHtml(42), '');
});

test('srcdoc starts <head> with the CSP then the referrer meta, images blocked by default', () => {
  const doc = buildSrcdoc('<p>x</p>');
  const head = doc.slice(doc.indexOf('<head>') + 6);
  assert.ok(head.startsWith('<meta http-equiv="Content-Security-Policy"'), 'CSP must be the first head child');
  assert.ok(head.indexOf('name="referrer"') > 0 && head.indexOf('name="referrer"') < head.indexOf('<style>'));
  assert.ok(doc.includes("default-src 'none'"));
  assert.ok(doc.includes('img-src data:;'));
  assert.ok(!doc.includes('img-src data: https:'));
  assert.ok(doc.includes("base-uri 'none'") && doc.includes("form-action 'none'"));
});

test('opting in to images widens only img-src', () => {
  const doc = buildSrcdoc('<p>x</p>', { allowRemoteImages: true });
  assert.ok(doc.includes('img-src data: https:'));
  assert.ok(doc.includes("default-src 'none'"));
});

test('remote image detection covers img src, srcset, background and css url()', () => {
  assert.equal(hasRemoteImages('<img src="https://t.example/p.gif">'), true);
  assert.equal(hasRemoteImages('<img src="//t.example/p.gif">'), true);
  assert.equal(hasRemoteImages('<img srcset="https://t.example/a.png 2x">'), true);
  assert.equal(hasRemoteImages('<td background="https://t.example/bg.png">'), true);
  assert.equal(hasRemoteImages('<div style="background:url(https://t.example/b.png)">'), true);
  assert.equal(hasRemoteImages('<img src="data:image/png;base64,AAAA">'), false);
});
