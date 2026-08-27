import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync } from 'fs';

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom' });
const { default: YbmReadingContent } = await server.ssrLoadModule('/src/pages/YbmReadingContent.jsx');
const { getReadingContent, getAnswerKey, getAssetUrl } = await server.ssrLoadModule('/src/utils/ybm.js');

const content = getReadingContent('vol-2-test-06');
const correctAnswers = getAnswerKey('vol-2-test-06').answers;

function renderAt(section, focus) {
  return renderToStaticMarkup(createElement(YbmReadingContent, {
    content, section, focus, onFocusChange: () => {}, selections: {},
    onSelect: () => {}, disabled: false, correctAnswers,
    assetUrl: (f) => `/ybm/vol-2-test-06/${f}`,
  }));
}

const css = readFileSync('./src/pages/YbmReadingContent.css', 'utf8');

const sections = [
  ['Part3 graphic 68-70 (bus map list)', renderAt('listening', 68)],
  ['Part4 graphic 98-100 (cropped park map)', renderAt('listening', 98)],
  ['Part6 set 131-134 (email + sentence insertion)', renderAt('reading', 131)],
  ['Part7 set 176-180 (webpage + form)', renderAt('reading', 176)],
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
body { background:#111; padding: 20px; }
.section-block { border: 2px solid orange; margin-bottom: 40px; }
.section-label { color: orange; font-family: sans-serif; padding: 8px; }
</style></head><body class="ybm-exam" data-theme="dark">
${sections.map(([label, h]) => `<div class="section-block"><div class="section-label">${label}</div>${h}</div>`).join('\n')}
</body></html>`;

writeFileSync('./scratch-visual-check.html', html);
console.log('wrote scratch-visual-check.html');
await server.close();
