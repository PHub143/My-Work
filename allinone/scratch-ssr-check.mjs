import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom' });
const { default: YbmReadingContent } = await server.ssrLoadModule('/src/pages/YbmReadingContent.jsx');
const { getReadingContent, getAnswerKey, getAssetUrl } = await server.ssrLoadModule('/src/utils/ybm.js');

const content = getReadingContent('vol-2-test-06');
const correctAnswers = getAnswerKey('vol-2-test-06').answers;

function renderAt(section, focus) {
  return renderToStaticMarkup(createElement(YbmReadingContent, {
    content, section, focus, onFocusChange: () => {}, selections: {},
    onSelect: () => {}, disabled: false, correctAnswers,
    assetUrl: (f) => getAssetUrl('vol-2-test-06', f),
  }));
}

const checks = [
  ['listening', 7],
  ['listening', 31],
  ['listening', 32],
  ['listening', 62],
  ['listening', 68],
  ['listening', 95],
  ['listening', 98],
  ['listening', 100],
  ['reading', 101],
  ['reading', 130],
  ['reading', 131],
  ['reading', 134],
  ['reading', 146],
  ['reading', 147],
  ['reading', 176],
  ['reading', 186],
  ['reading', 191],
  ['reading', 196],
  ['reading', 200],
];

for (const [section, focus] of checks) {
  const html = renderAt(section, focus);
  const ok = html.includes(`ybr-q-${focus}`);
  console.log(`${ok ? 'OK' : 'MISSING'} ${section} ${focus}`);
}

// Boundary button checks
try {
  const htmlFirst = renderAt('listening', 7);
  console.log('listening focus 7 Prev disabled (should hand off to image viewer):', htmlFirst.includes('disabled') ? 'has-disabled-somewhere' : 'no-disabled-found');
} catch (e) {
  console.log('boundary check error', e.message);
}

await server.close();
