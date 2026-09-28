#!/usr/bin/env node
// Self-test for audit-ybm.mjs: breaks a temp copy of vol-1-test-01 one way at a
// time and checks that the audit reports the intended code (and nothing else).
// Run it after editing the audit:
//
//   node .claude/skills/toeic-maker/scripts/audit-ybm.selftest.mjs
//
// Works on a copy under the OS temp dir and deletes it afterwards — the real
// repo is never touched. Assumes vol-1-test-01 stays a complete reference test
// (all seven layers present); if that changes, update the cases below.

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REAL = fileURLToPath(new URL('../../../../', import.meta.url));
const ID = 'vol-1-test-01';
const M = mkdtempSync(join(tmpdir(), 'audit-ybm-selftest-'));
const AUDIT = join(M, '.claude/skills/toeic-maker/scripts/audit-ybm.mjs');
const P = (path) => join(M, path);

function fresh() {
  for (const dir of [
    '.claude/skills/toeic-maker/scripts', 'allinone/src/data/ybm/content', 'allinone/src/data/ybm/keys',
    'allinone/src/data/ybm/transcripts', 'allinone/public/ybm', 'api/data/ybm-assets', 'scripts/ybm',
  ]) mkdirSync(P(dir), { recursive: true });
  cpSync(join(REAL, '.claude/skills/toeic-maker/scripts/audit-ybm.mjs'), AUDIT);
  cpSync(join(REAL, 'allinone/src/data/ybm/manifest.js'), P('allinone/src/data/ybm/manifest.js'));
  cpSync(join(REAL, 'scripts/ybm/render-pages.mjs'), P('scripts/ybm/render-pages.mjs'));
  cpSync(join(REAL, 'api/data/ybm-assets', `${ID}.json`), P(`api/data/ybm-assets/${ID}.json`));
  for (const dir of ['content', 'keys', 'transcripts']) {
    cpSync(join(REAL, 'allinone/src/data/ybm', dir, `${ID}.json`), P(`allinone/src/data/ybm/${dir}/${ID}.json`));
  }
  writeFileSync(P('allinone/package.json'), '{"type":"module"}'); // so manifest.js loads as ESM
  rmSync(P('allinone/public/ybm'), { recursive: true, force: true });
  mkdirSync(P('allinone/public/ybm'), { recursive: true });
}

const edit = (path, fn) => {
  const json = JSON.parse(readFileSync(path, 'utf8'));
  fn(json);
  writeFileSync(path, JSON.stringify(json));
};
const content = (fn) => edit(P(`allinone/src/data/ybm/content/${ID}.json`), fn);
const keys = (fn) => edit(P(`allinone/src/data/ybm/keys/${ID}.json`), fn);
const transcript = (fn) => edit(P(`allinone/src/data/ybm/transcripts/${ID}.json`), fn);
const drive = (fn) => edit(P(`api/data/ybm-assets/${ID}.json`), fn);
const remove = (path) => rmSync(P(path), { force: true });
const localFile = (name) => {
  mkdirSync(P(`allinone/public/ybm/${ID}`), { recursive: true });
  writeFileSync(P(`allinone/public/ybm/${ID}/${name}`), '');
};

function findings(withInfo) {
  let out;
  try {
    out = execFileSync('node', [AUDIT, ID, '--json'], { encoding: 'utf8' });
  } catch (error) {
    out = error.stdout; // exit code 1 when an ERROR is found
  }
  return JSON.parse(out)[0].issues.filter((i) => withInfo || i.level !== 'INFO').map((i) => i.code);
}

// Findings the real data may legitimately carry today; they are tolerated, not required.
const TOLERATED = new Set(['KEY-SRC-EDITION', 'CONTENT-STALE-NOTE']);

// [name, breakage, codes that must appear, { info: true } to also inspect INFO findings]
const cases = [
  ['baseline: unmodified copy', () => {}, []],

  ['content: drop Part 4', () => content((c) => { delete c.parts['4']; }), ['CONTENT-NOT-SUFFIX']],
  ['content: imageOnlyPages removed', () => content((c) => { delete c.imageOnlyPages; }), ['CONTENT-IMGONLY']],
  ['content: imageOnlyPages beyond the page count', () => content((c) => { c.imageOnlyPages.listening = 99; }), ['CONTENT-IMGONLY']],
  ['content: stale imageOnlyPages.reading on a fully transcribed section', () => content((c) => { c.imageOnlyPages.reading = 3; }), ['CONTENT-IMGONLY']],
  ['content: Part 5 item Q101 deleted', () => content((c) => { c.parts['5'].items.shift(); }), ['CONTENT-COVERAGE']],
  ['content: Part 3 item duplicated', () => content((c) => { c.parts['3'].items.push(c.parts['3'].items[0]); }), ['CONTENT-COVERAGE']],
  ['content: Part 3 item loses choice D', () => content((c) => { delete c.parts['3'].items[0].choices.D; }), ['CONTENT-CHOICES']],
  ['content: Part 3 item loses its stem', () => content((c) => { c.parts['3'].items[1].stem = ''; }), ['CONTENT-STEM']],
  ['content: Part 6 blank token [[132]] renamed', () => content((c) => {
    const set = c.parts['6'].sets[0];
    set.passage = JSON.parse(JSON.stringify(set.passage).replace('[[132]]', '[[999]]'));
  }), ['CONTENT-P6-BLANK']],
  ['content: Part 7 set questions disagree with its items', () => content((c) => { c.parts['7'].sets[0].questions = [147, 149]; }), ['CONTENT-SET', 'CONTENT-ORDER', 'CONTENT-INSTRUCTION']],
  ['content: graphics group points at a missing item', () => content((c) => { c.parts['3'].graphics[0].questions = [62, 63, 999]; }), ['CONTENT-GRAPHICS']],
  ['content: graphic image loses its alt text', () => content((c) => { delete c.parts['4'].graphics[0].passage.alt; }), ['CONTENT-GRAPHIC-ALT']],
  ['content: file removed', () => remove(`allinone/src/data/ybm/content/${ID}.json`), ['CONTENT-MISSING']],
  ['content: testId mismatch', () => content((c) => { c.testId = 'vol-1-test-02'; }), ['CONTENT-BAD']],
  ['content: corrupt JSON', () => writeFileSync(P(`allinone/src/data/ybm/content/${ID}.json`), '{ nope'), ['CONTENT-BAD']],
  ['content: valid partial state — Part 2 not done yet (suffix 3-4)', () => content((c) => { delete c.parts['2']; c.imageOnlyPages.listening = 6; }), []],
  ['content: valid partial state — only Part 7 done, imageOnlyPages.reading set', () => content((c) => { delete c.parts['5']; delete c.parts['6']; c.imageOnlyPages.reading = 14; }), []],
  ['content: only Part 7 done but imageOnlyPages.reading unset', () => content((c) => { delete c.parts['5']; delete c.parts['6']; }), ['CONTENT-IMGONLY']],
  ['content: Part 7 missing while Parts 5-6 exist (prefix, not suffix)', () => content((c) => { delete c.parts['7']; }), ['CONTENT-NOT-SUFFIX', 'CONTENT-IMGONLY']],
  ['content: Part 7 instruction disagrees with its questions', () => content((c) => { c.parts['7'].sets[0].instruction = 'Questions 149-150 refer to the following notice.'; }), ['CONTENT-INSTRUCTION']],
  ['content: Part 7 set id disagrees with its questions', () => content((c) => { c.parts['7'].sets[0].id = 'p7-set-149-150'; }), ['CONTENT-INSTRUCTION']],
  ['content: Part 6 sets in the wrong order', () => content((c) => { c.parts['6'].sets.reverse(); }), ['CONTENT-ORDER']],
  ['content: Part 3 items shuffled but still complete', () => content((c) => { c.parts['3'].items.reverse(); }), ['CONTENT-ORDER']],
  ['content: "Look at the graphic" question with no graphics group', () => content((c) => { c.parts['3'].graphics.shift(); }), ['CONTENT-GRAPHIC-Q']],
  ['content: graphics group without a "Look at the graphic" question', () => content((c) => {
    c.parts['3'].items.find((i) => i.number === 63).stem = 'Where will the speakers go next?';
  }), ['CONTENT-GRAPHIC-Q']],

  ['keys: listening key null', () => keys((k) => { k.listening = null; }), ['KEY-SECTION-NULL']],
  ['keys: reading key 99 chars', () => keys((k) => { k.reading = k.reading.slice(1); }), ['KEY-BAD']],
  ['keys: Part 2 answer D', () => keys((k) => { k.listening = `${k.listening.slice(0, 8)}D${k.listening.slice(9)}`; }), ['KEY-P2-D']],
  ['keys: listeningSource removed', () => keys((k) => { delete k.listeningSource; }), ['KEY-NO-SOURCE']],
  ['keys: file removed', () => remove(`allinone/src/data/ybm/keys/${ID}.json`), ['KEY-MISSING']],
  ['keys: listening cites the old-edition TRANSCRIPT.pdf', () => keys((k) => { k.listeningSource = 'Vol 1/TRANSCRIPT.pdf, page 2 (TEST 1 answer grid)'; }), ['KEY-SRC-EDITION']],

  ['drive: graphic crop missing from the manifest', () => drive((d) => { delete d.files['lc-graphic-096.jpg']; }), ['DRIVE-MISSING-FILE']],
  ['drive: required booklet page missing from the manifest', () => drive((d) => { delete d.files['lc-p03.jpg']; }), ['DRIVE-MISSING-FILE']],
  ['drive: non-jpg/mp3 file in the manifest', () => drive((d) => { d.files['lc-graphic-096.png'] = 'x'; }), ['DRIVE-UNSERVED-EXT']],
  ['drive: script page uploaded', () => drive((d) => { d.files['sc-p01.jpg'] = 'x'; }), ['DRIVE-DEAD-WEIGHT']],
  ['drive: flat manifest shape', () => drive((d) => {
    const files = d.files;
    for (const key of Object.keys(d)) delete d[key];
    Object.assign(d, files);
  }), ['DRIVE-BAD-SHAPE']],
  ['drive: manifest removed', () => remove(`api/data/ybm-assets/${ID}.json`), ['DRIVE-NO-MANIFEST']],
  ['drive: content removed AND an rc page missing (all pages then required)', () => {
    remove(`allinone/src/data/ybm/content/${ID}.json`);
    drive((d) => { delete d.files['rc-p17.jpg']; });
  }, ['CONTENT-MISSING', 'DRIVE-MISSING-FILE']],

  ['assets: local folder present but a required page absent', () => localFile('lc-p01.jpg'), ['ASSET-LOCAL-MISSING']],
  ['assets: script pages in the served folder (upload trap)', () => localFile('sc-p01.jpg'), ['ASSET-LOCAL-MISSING', 'UPLOAD-WOULD-INCLUDE-SC', 'DRIVE-REDUNDANT'], { info: true }],

  ['transcript: entry for Q10 removed', () => transcript((t) => { t.entries = t.entries.filter((e) => e.from !== 10); }), ['TR-COVERAGE']],
  ['transcript: Part 3 entry covers 2 questions', () => transcript((t) => { t.entries.find((e) => e.from === 32).to = 33; }), ['TR-GROUPING', 'TR-COVERAGE']],
  ['transcript: Part 3 line loses its speaker tag', () => transcript((t) => {
    const entry = t.entries.find((e) => e.from === 32);
    entry.lines[0] = entry.lines[0].replace(/^[^|]+\|/, '');
  }), ['TR-LINES']],
  ['transcript: Part 2 entry loses (C)', () => transcript((t) => { t.entries.find((e) => e.from === 7).lines.pop(); }), ['TR-LINES']],
  ['transcript: Part 1 entry loses (D)', () => transcript((t) => { t.entries.find((e) => e.from === 1).lines.pop(); }), ['TR-LINES']],
  ['transcript: file removed', () => remove(`allinone/src/data/ybm/transcripts/${ID}.json`), ['TR-MISSING']],
];

let failed = 0;
try {
  for (const [name, breakIt, expected, options] of cases) {
    fresh();
    breakIt();
    const codes = [...new Set(findings(Boolean(options?.info)))];
    const unexpected = codes.filter((code) => !TOLERATED.has(code) && !expected.includes(code));
    const ok = expected.every((code) => codes.includes(code)) && !unexpected.length;
    if (!ok) failed += 1;
    const shown = codes.filter((code) => !TOLERATED.has(code));
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(74)} → ${shown.join(', ') || '(clean)'}${ok ? '' : `   expected ${expected.join(', ') || '(clean)'}`}`);
  }
} finally {
  rmSync(M, { recursive: true, force: true });
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
