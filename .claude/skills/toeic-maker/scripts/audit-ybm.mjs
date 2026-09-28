#!/usr/bin/env node
// Read-only completeness audit for the YBM TOEIC tests (allinone/ + api/).
// Companion to ../SKILL.md — see "Audit a test" there for how to read the
// output and which repair each code points to. Touches nothing.
//
//   node .claude/skills/toeic-maker/scripts/audit-ybm.mjs                 # all 30 tests: matrix + problems
//   node .claude/skills/toeic-maker/scripts/audit-ybm.mjs vol-1           # one volume
//   node .claude/skills/toeic-maker/scripts/audit-ybm.mjs vol-1-test-01   # one test, every finding incl. INFO
//   add --json for machine-readable output
//
// Levels: ERROR  present but wrong/inconsistent (breaks or misleads at runtime)
//         TODO   a layer is absent
//         WARN   suspicious, or degrades the UX
//         INFO   context only (shown for a single test, or with --verbose)
// Exit code is 1 only when an ERROR exists.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const DATA = join(ROOT, 'allinone/src/data/ybm');
const PUBLIC = join(ROOT, 'allinone/public/ybm');
const DRIVE = join(ROOT, 'api/data/ybm-assets');
const RENDER_SCRIPT = join(ROOT, 'scripts/ybm/render-pages.mjs');

const { YBM_VOLUMES, PARTS } = await import(pathToFileURL(join(DATA, 'manifest.js')).href);

// Same pattern as parseTranscriptLine() in allinone/src/utils/ybm.js.
const SPEAKER_LINE = /^([A-Za-z]{1,3}(?:-[A-Za-z]{2,3})?)\|(.*)$/s;
const CHOICE_LINE = /^\(([A-D])\)/;
// ybmAssetService.js only serves these; anything else is a 400.
const SERVED_EXT = /\.(jpe?g|mp3)$/i;

// Known-bad key citations. Add a row when a source turns out to be the wrong
// edition; the audit then flags every key that cites it.
const SUSPECT_KEY_SOURCES = [
  {
    vol: 1,
    section: 'listening',
    re: /TRANSCRIPT\.pdf/,
    why: 'Vol 1/TRANSCRIPT.pdf is an older edition: its Part 1 questions and answers differ from the 2025 booklet/audio/script this app serves. Re-read the grid on sc-p01.jpg (first page of Script/TEST N.pdf) and cross-check the red-highlighted answers.',
  },
];

const readJson = (path) => {
  if (!existsSync(path)) return { missing: true };
  try {
    return { data: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (error) {
    return { error: error.message };
  }
};
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const pad = (n) => String(n).padStart(2, '0');
const sample = (list, max = 4) => (list.length > max ? `${list.slice(0, max).join(', ')} … +${list.length - max} more` : list.join(', '));

// "2,3,4,5,6,7" -> "2-7"; "2,4" -> "2,4"
function runs(numbers) {
  if (!numbers.length) return '—';
  const out = [];
  let start = numbers[0];
  for (let i = 1; i <= numbers.length; i += 1) {
    if (numbers[i] !== numbers[i - 1] + 1) {
      out.push(start === numbers[i - 1] ? `${start}` : `${start}-${numbers[i - 1]}`);
      start = numbers[i];
    }
  }
  return out.join(',');
}

// Which volumes have a Script/ source in render-pages.mjs (so transcripts are
// makeable). That file runs on import, so read it as text.
function volumesWithScriptSource() {
  const out = new Set();
  if (!existsSync(RENDER_SCRIPT)) return out;
  const text = readFileSync(RENDER_SCRIPT, 'utf8');
  const block = text.slice(text.indexOf('const VOLUME_SOURCES'), text.indexOf('function parseArgs'));
  for (const match of block.matchAll(/\n {2}(\d+): \{([\s\S]*?)\n {2}\},/g)) {
    if (/\n {4}script:/.test(match[2])) out.add(Number(match[1]));
  }
  return out;
}

function sectionState(content, section) {
  const partNumbers = PARTS.filter((p) => p.section === section).map((p) => p.part);
  const parts = content?.parts ?? {};
  return {
    partNumbers,
    transcribed: partNumbers.filter((n) => parts[String(n)]),
    missing: partNumbers.filter((n) => !parts[String(n)]),
  };
}

// Booklet pages the exam can actually request for a section (mirrors the
// image-viewer logic in YbmExam.jsx: imagePageCount = imageOnlyPages ?? all).
function requiredPages(content, section, pages) {
  if (!Number.isInteger(pages)) return 0;
  if (!content) return pages;
  if (!sectionState(content, section).missing.length) return 0; // structured view only
  return Math.min(content.imageOnlyPages?.[section] ?? pages, pages);
}

function walk(node, visit) {
  if (Array.isArray(node)) node.forEach((child) => walk(child, visit));
  else if (node && typeof node === 'object') {
    visit(node);
    Object.values(node).forEach((child) => walk(child, visit));
  }
}

function auditTest(test, scriptVolumes) {
  const id = test.id;
  const volNumber = Number(test.volumeId.replace('vol-', ''));
  const issues = [];
  const add = (level, code, message) => issues.push({ level, code, message });
  const cells = {};

  // ---- 3. page counts (manifest.js) ---------------------------------------
  const lPages = test.listeningPages;
  const rPages = test.readingPages;
  cells.pages = `${Number.isInteger(lPages) ? lPages : '—'}/${Number.isInteger(rPages) ? rPages : '—'}`;
  const unmapped = [!Number.isInteger(lPages) && 'listening', !Number.isInteger(rPages) && 'reading'].filter(Boolean);
  if (unmapped.length) add('TODO', 'MAN-UNMAPPED', `manifest.js has no page count for ${unmapped.join(' + ')} — that section is unavailable`);

  // ---- 4. answer keys -----------------------------------------------------
  const keyFile = readJson(join(DATA, 'keys', `${id}.json`));
  let keyL = false;
  let keyR = false;
  if (keyFile.missing) add('TODO', 'KEY-MISSING', 'no keys/<id>.json — the test cannot be scored');
  else if (keyFile.error) add('ERROR', 'KEY-BAD', `key JSON does not parse: ${keyFile.error}`);
  else {
    const key = keyFile.data;
    if (key.testId !== id) add('ERROR', 'KEY-BAD', `testId "${key.testId}" does not match the filename`);
    for (const section of ['listening', 'reading']) {
      const value = key[section];
      if (value == null) {
        add('TODO', 'KEY-SECTION-NULL', `${section} key is null — that section is unscored`);
        continue;
      }
      if (typeof value !== 'string' || value.length !== 100 || !/^[ABCD]+$/.test(value)) {
        add('ERROR', 'KEY-BAD', `${section} key must be 100 letters A-D (got ${typeof value === 'string' ? `${value.length} chars` : typeof value})`);
        continue;
      }
      if (section === 'listening') keyL = true;
      else keyR = true;
      const source = key[`${section}Source`];
      if (!source) add('WARN', 'KEY-NO-SOURCE', `${section}Source is missing — cite exactly where the grid was read`);
      for (const rule of SUSPECT_KEY_SOURCES) {
        if (rule.vol === volNumber && rule.section === section && rule.re.test(source || '')) {
          add('WARN', 'KEY-SRC-EDITION', `${section}Source "${source}" — ${rule.why}`);
        }
      }
    }
    if (keyL) {
      const bad = range(7, 31).filter((n) => key.listening[n - 1] === 'D');
      if (bad.length) add('ERROR', 'KEY-P2-D', `Part 2 has only three choices but the key answers D for Q${sample(bad)}`);
    }
  }
  cells.keys = `${keyL ? 'L' : '·'}${keyR ? 'R' : '·'}`;

  // ---- 5. structured content ---------------------------------------------
  const contentFile = readJson(join(DATA, 'content', `${id}.json`));
  let content = null;
  const graphicAssets = new Set();
  if (contentFile.missing) add('TODO', 'CONTENT-MISSING', 'no content/<id>.json — every part renders from scanned pages');
  else if (contentFile.error) add('ERROR', 'CONTENT-BAD', `content JSON does not parse: ${contentFile.error}`);
  else content = contentFile.data;

  if (content) {
    if (content.testId !== id) add('ERROR', 'CONTENT-BAD', `testId "${content.testId}" does not match the filename`);
    const parts = content.parts ?? {};

    for (const [partKey, part] of Object.entries(parts)) {
      const def = PARTS.find((p) => String(p.part) === partKey);
      if (!def || def.part === 1) {
        add('WARN', 'CONTENT-PART', `parts["${partKey}"] is not a transcribable part (Part 1 is photos — it stays on the scanned page)`);
        continue;
      }
      const items = part.type === 'passage-set' ? (part.sets ?? []).flatMap((s) => s.items ?? []) : (part.items ?? []);
      const numbers = items.map((i) => i.number);
      const missingN = range(def.from, def.to).filter((n) => !numbers.includes(n));
      const outside = numbers.filter((n) => n < def.from || n > def.to);
      const dupes = numbers.filter((n, i) => numbers.indexOf(n) !== i);
      if (missingN.length || outside.length || dupes.length) {
        add('ERROR', 'CONTENT-COVERAGE', `Part ${partKey} should be exactly Q${def.from}-${def.to}:${missingN.length ? ` missing ${sample(missingN)};` : ''}${outside.length ? ` outside range ${sample(outside)};` : ''}${dupes.length ? ` duplicate ${sample(dupes)};` : ''}`);
      }

      // The renderer builds units in array order, so a correctly numbered but shuffled list still reads wrong.
      if (part.type !== 'passage-set' && !missingN.length && !outside.length && !dupes.length
        && numbers.some((value, i) => i > 0 && value !== numbers[i - 1] + 1)) {
        add('ERROR', 'CONTENT-ORDER', `Part ${partKey} items are not in ascending question order (units render in array order)`);
      }

      const stemProblems = [];
      const choiceProblems = [];
      const need = partKey === '2' ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
      for (const item of items) {
        if (partKey !== '6' && !(typeof item.stem === 'string' && item.stem.trim())) stemProblems.push(`Q${item.number}`);
        if (item.choices == null) {
          if (partKey !== '2') choiceProblems.push(`Q${item.number} (none)`);
          continue;
        }
        const empty = need.filter((k) => !(typeof item.choices[k] === 'string' && item.choices[k].trim()));
        const extra = Object.keys(item.choices).filter((k) => !need.includes(k));
        if (empty.length || extra.length) choiceProblems.push(`Q${item.number} (missing ${empty.join('') || '—'}, extra ${extra.join('') || '—'})`);
      }
      if (stemProblems.length) add('ERROR', 'CONTENT-STEM', `Part ${partKey} items without a stem: ${sample(stemProblems)}`);
      if (choiceProblems.length) add('ERROR', 'CONTENT-CHOICES', `Part ${partKey} choices must be exactly ${need.join('')} (only Part 2 may omit them): ${sample(choiceProblems)}`);

      if (part.type === 'passage-set') {
        const setProblems = [];
        const blankProblems = [];
        const orderProblems = [];
        const instructionProblems = [];
        let expectedStart = def.from;
        for (const set of part.sets ?? []) {
          const setNums = (set.items ?? []).map((i) => i.number).sort((a, b) => a - b);
          const declared = [...(set.questions ?? [])].sort((a, b) => a - b);
          if (setNums.join() !== declared.join()) setProblems.push(`${set.id ?? '?'}: questions [${declared}] ≠ items [${setNums}]`);
          if (!set.passage && !set.passages?.length) setProblems.push(`${set.id ?? '?'}: no passage`);
          // sets must run in question order, and the printed "Questions X-Y refer to…" line must agree with them
          const first = set.questions?.[0];
          const last = set.questions?.at(-1);
          if (first !== expectedStart) orderProblems.push(`${set.id ?? '?'} starts at Q${first}, expected Q${expectedStart}`);
          expectedStart = (last ?? expectedStart) + 1;
          const printed = /Questions?\s+(\d+)(?:\s*[-–]\s*(\d+))?/i.exec(set.instruction ?? '');
          if (!printed) instructionProblems.push(`${set.id ?? '?'}: no parsable "Questions X-Y" instruction`);
          else if (Number(printed[1]) !== first || Number(printed[2] ?? printed[1]) !== last) {
            instructionProblems.push(`${set.id ?? '?'}: instruction says Q${printed[1]}${printed[2] ? `-${printed[2]}` : ''} but its questions are Q${first}-${last}`);
          }
          const idRange = /(\d+)-(\d+)$/.exec(set.id ?? '');
          if (idRange && (Number(idRange[1]) !== first || Number(idRange[2]) !== last)) instructionProblems.push(`${set.id}: id does not match its questions`);
          if (partKey === '6') {
            const text = JSON.stringify(set.passage ?? set.passages ?? '');
            for (const n of setNums) if (!text.includes(`[[${n}]]`)) blankProblems.push(`Q${n}`);
          }
        }
        if (setProblems.length) add('ERROR', 'CONTENT-SET', `Part ${partKey}: ${sample(setProblems, 3)}`);
        if (blankProblems.length) add('ERROR', 'CONTENT-P6-BLANK', `Part 6 passage has no [[n]] blank token for ${sample(blankProblems)}`);
        if (orderProblems.length) add('ERROR', 'CONTENT-ORDER', `Part ${partKey} sets are out of order or leave a gap: ${sample(orderProblems, 3)}`);
        if (instructionProblems.length) add('ERROR', 'CONTENT-INSTRUCTION', `Part ${partKey}: ${sample(instructionProblems, 3)}`);
      }

      for (const group of part.graphics ?? []) {
        const stray = (group.questions ?? []).filter((n) => !numbers.includes(n));
        if (stray.length || !group.passage) add('ERROR', 'CONTENT-GRAPHICS', `Part ${partKey} graphics group [${group.questions}] ${stray.length ? `references questions not in items: ${stray}` : 'has no passage'}`);
      }

      // Every "Look at the graphic" question needs its table/diagram, and every group needs such a question.
      if (partKey === '3' || partKey === '4') {
        const graphicQs = items.filter((i) => /^\s*look at the graphic/i.test(i.stem ?? '')).map((i) => i.number);
        const grouped = new Set((part.graphics ?? []).flatMap((g) => g.questions ?? []));
        const orphan = graphicQs.filter((q) => !grouped.has(q));
        if (orphan.length) add('ERROR', 'CONTENT-GRAPHIC-Q', `Q${sample(orphan)} say "Look at the graphic" but sit in no graphics group — the table/diagram is never shown`);
        const idle = (part.graphics ?? []).filter((g) => !(g.questions ?? []).some((q) => graphicQs.includes(q)));
        if (idle.length) add('WARN', 'CONTENT-GRAPHIC-Q', `graphics group [${idle.map((g) => `${g.questions}`).join('], [')}] contains no "Look at the graphic" question`);
      }
    }

    walk(parts, (node) => {
      if (node.kind !== 'graphic') return;
      if (!node.asset) add('ERROR', 'CONTENT-GRAPHIC-ASSET', 'a kind:"graphic" passage has no `asset`');
      else graphicAssets.add(node.asset);
      if (!node.alt) add('WARN', 'CONTENT-GRAPHIC-ALT', `graphic ${node.asset ?? '?'} has no descriptive \`alt\``);
    });

    // imageOnlyPages + which parts are transcribed, per section
    for (const section of ['listening', 'reading']) {
      const { partNumbers, transcribed, missing } = sectionState(content, section);
      const pages = section === 'listening' ? lPages : rPages;
      const n = content.imageOnlyPages?.[section];
      if (transcribed.length) {
        const tail = partNumbers.slice(partNumbers.length - transcribed.length);
        if (transcribed.join() !== tail.join()) {
          add('WARN', 'CONTENT-NOT-SUFFIX', `${section}: transcribed parts [${transcribed}] are not a run ending at Part ${partNumbers.at(-1)}, so untranscribed part(s) [${missing.filter((m) => m > transcribed[0])}] sit after transcribed ones — the exam only reaches them via the answer sheet, and imageOnlyPages hides their pages. Transcribe from the end of the section backwards.`);
        }
      }
      if (n != null && (!Number.isInteger(n) || n < 1 || (Number.isInteger(pages) && n > pages))) {
        add('ERROR', 'CONTENT-IMGONLY', `imageOnlyPages.${section} = ${JSON.stringify(n)} is not an integer in 1..${pages}`);
      } else if (!missing.length && n != null) {
        add('WARN', 'CONTENT-IMGONLY', `imageOnlyPages.${section} is stale — every part of the section is transcribed, so remove the key`);
      } else if (missing.length && !transcribed.length && n != null) {
        add('WARN', 'CONTENT-IMGONLY', `imageOnlyPages.${section} = ${n} caps the scanned viewer although no part of ${section} is transcribed — pages after ${n} become unreachable`);
      } else if (missing.length && transcribed.length && n == null) {
        add('WARN', 'CONTENT-IMGONLY', `${section} is partly transcribed (Part ${missing.join(', ')} missing) but imageOnlyPages.${section} is unset — the viewer pages through all ${pages} booklet pages, including ones now redundant. Set it to the last page the untranscribed leading part(s) still need`);
      }
    }
  }
  {
    const listeningParts = sectionState(content, 'listening').transcribed;
    const readingParts = sectionState(content, 'reading').transcribed;
    cells.content = content ? `${runs(listeningParts)} | ${runs(readingParts)}` : '—';
    cells.imgOnly = content?.imageOnlyPages
      ? Object.entries(content.imageOnlyPages).map(([s, v]) => `${s[0].toUpperCase()}${v}`).join(' ')
      : '—';
  }

  // ---- 1/2. assets: local folder + Drive manifest -------------------------
  const reqL = requiredPages(content, 'listening', lPages);
  const reqR = requiredPages(content, 'reading', rPages);
  const required = [
    ...range(1, reqL).map((n) => `lc-p${pad(n)}.jpg`),
    ...range(1, reqR).map((n) => `rc-p${pad(n)}.jpg`),
    ...(Number.isInteger(lPages) ? ['listening.mp3'] : []),
    ...graphicAssets,
  ];
  const driveFile = readJson(join(DRIVE, `${id}.json`));
  let driveFiles = null;
  if (driveFile.missing) {
    add('TODO', 'DRIVE-NO-MANIFEST', 'no api/data/ybm-assets/<id>.json — nothing is served in production (run api/scripts/upload-ybm-assets.js)');
    cells.drive = '—';
  } else if (driveFile.error || driveFile.data?.testId !== id || typeof driveFile.data?.files !== 'object') {
    add('ERROR', 'DRIVE-BAD-SHAPE', `Drive manifest must be { testId: "${id}", files: { name: driveFileId } }${driveFile.error ? ` (${driveFile.error})` : ''}`);
    cells.drive = '?';
  } else {
    driveFiles = driveFile.data.files;
    const names = Object.keys(driveFiles);
    const absent = required.filter((f) => !driveFiles[f]);
    if (absent.length) add('ERROR', 'DRIVE-MISSING-FILE', `the exam requests these but they are not on Drive (404 in production): ${sample(absent)}`);
    const unserved = names.filter((f) => !SERVED_EXT.test(f));
    if (unserved.length) add('ERROR', 'DRIVE-UNSERVED-EXT', `the asset route only serves .jpg/.jpeg/.mp3 (400 otherwise): ${sample(unserved)}`);
    const dead = names.filter((f) => /^sc-p/.test(f));
    if (dead.length) add('WARN', 'DRIVE-DEAD-WEIGHT', `${dead.length} script page(s) (sc-p*.jpg) were uploaded but are never served`);
    const extra = names.filter((f) => !required.includes(f) && !dead.includes(f));
    if (extra.length) add('INFO', 'DRIVE-REDUNDANT', `${extra.length} uploaded file(s) the exam never requests (${sample(extra, 3)}) — harmless, trim candidates`);
    cells.drive = absent.length ? `${names.length} ✗${absent.length}` : `${names.length} ✓`;
  }

  const localDir = join(PUBLIC, id);
  if (existsSync(localDir)) {
    const local = new Set(readdirSync(localDir));
    const absent = required.filter((f) => !local.has(f));
    if (absent.length) add('WARN', 'ASSET-LOCAL-MISSING', `needed by the exam but not in public/ybm/${id}/: ${sample(absent)} (regenerate with render-pages.mjs, re-crop, or re-encode the audio)`);
    const sc = [...local].filter((f) => /^sc-p\d+\.jpg$/.test(f));
    if (sc.length && driveFiles && !sc.some((f) => driveFiles[f])) {
      add('INFO', 'UPLOAD-WOULD-INCLUDE-SC', `${sc.length} script page(s) sit in the served folder; upload-ybm-assets.js uploads EVERY file there — delete them before uploading`);
    }
  } else {
    add('INFO', 'ASSET-NO-LOCAL-DIR', `public/ybm/${id}/ is absent (gitignored — normal on a fresh checkout; regenerate with render-pages.mjs)`);
  }

  // ---- 6. listening transcripts ------------------------------------------
  const trFile = readJson(join(DATA, 'transcripts', `${id}.json`));
  const canMakeTranscript = scriptVolumes.has(volNumber);
  if (trFile.missing) {
    if (canMakeTranscript) add('TODO', 'TR-MISSING', 'no transcripts/<id>.json although this volume has a Script/ source — see SKILL.md "Part 3"');
    else add('INFO', 'TR-MISSING', 'no transcript (this volume has no script source in render-pages.mjs)');
    cells.script = canMakeTranscript ? '✗' : 'n/a';
  } else if (trFile.error) {
    add('ERROR', 'TR-BAD', `transcript JSON does not parse: ${trFile.error}`);
    cells.script = '?';
  } else {
    const before = issues.filter((i) => i.level === 'ERROR').length;
    const tr = trFile.data;
    if (tr.testId !== id) add('ERROR', 'TR-BAD', `testId "${tr.testId}" does not match the filename`);
    const seen = new Map();
    const shape = [];
    const lineProblems = [];
    for (const entry of tr.entries ?? []) {
      const { from, to, lines } = entry;
      if (!Number.isInteger(from) || !Number.isInteger(to) || from > to || from < 1 || to > 100) {
        shape.push(`bad range ${JSON.stringify([from, to])}`);
        continue;
      }
      for (let n = from; n <= to; n += 1) seen.set(n, (seen.get(n) ?? 0) + 1);
      const def = PARTS.find((p) => from >= p.from && from <= p.to);
      if (to > def.to) shape.push(`Q${from}-${to} straddles Part ${def.part}`);
      const size = to - from + 1;
      if ((def.part <= 2 && size !== 1) || (def.part >= 3 && size !== 3)) shape.push(`Q${from}-${to}: Part ${def.part} entries cover ${def.part <= 2 ? 1 : 3} question(s), not ${size}`);
      if (!Array.isArray(lines) || !lines.length || lines.some((l) => typeof l !== 'string' || !l.trim())) {
        lineProblems.push(`Q${from}: empty/invalid lines`);
        continue;
      }
      const letters = lines.map((l) => SPEAKER_LINE.exec(l)?.[2] ?? l).map((t) => CHOICE_LINE.exec(t)?.[1]).filter(Boolean).join('');
      if (def.part === 1 && letters !== 'ABCD') lineProblems.push(`Q${from}: Part 1 needs (A)-(D) lines, found "${letters}"`);
      if (def.part === 2 && letters !== 'ABC') lineProblems.push(`Q${from}: Part 2 needs the question + (A)-(C), found "${letters}"`);
      if (def.part >= 3 && lines.some((l) => !SPEAKER_LINE.test(l))) lineProblems.push(`Q${from}: line without a "Speaker|" tag`);
    }
    const gaps = range(1, 100).filter((n) => !seen.has(n));
    const overlaps = [...seen].filter(([, count]) => count > 1).map(([n]) => n);
    if (gaps.length || overlaps.length) add('ERROR', 'TR-COVERAGE', `entries must cover Q1-100 exactly once:${gaps.length ? ` missing ${sample(gaps)};` : ''}${overlaps.length ? ` overlapping ${sample(overlaps)};` : ''}`);
    if (shape.length) add('ERROR', 'TR-GROUPING', sample(shape, 3));
    if (lineProblems.length) add('ERROR', 'TR-LINES', sample(lineProblems, 3));
    cells.script = issues.filter((i) => i.level === 'ERROR').length > before ? '✗!' : '✓';
  }

  // content `note` is free text and goes stale — flag the one pattern we have seen
  if (content && typeof content.note === 'string' && graphicAssets.size && driveFiles
    && /not yet uploaded|still needs? (?:a |the )?(?:drive )?upload/i.test(content.note)
    && [...graphicAssets].every((asset) => driveFiles[asset])) {
    add('WARN', 'CONTENT-STALE-NOTE', '`note` says assets are not uploaded, but they are on Drive — keep mutable status out of `note`');
  }

  return { id, cells, issues, required };
}

// ---- main -----------------------------------------------------------------

const args = process.argv.slice(2);
const json = args.includes('--json');
const verbose = args.includes('--verbose');
const target = args.find((a) => !a.startsWith('--')) ?? 'all';

const scriptVolumes = volumesWithScriptSource();
const tests = YBM_VOLUMES.flatMap((v) => v.tests).filter((t) => target === 'all' || t.id === target || t.volumeId === target);
if (!tests.length) {
  console.error(`No test matches "${target}". Use all | vol-N | vol-N-test-NN.`);
  process.exit(2);
}

const results = tests.map((t) => auditTest(t, scriptVolumes));
const count = (r, level) => r.issues.filter((i) => i.level === level).length;
const anyError = results.some((r) => count(r, 'ERROR') > 0);

if (json) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(anyError ? 1 : 0);
}

const single = results.length === 1;
const col = (value, width) => String(value).padEnd(width);
console.log(`${col('test', 15)}${col('pages L/R', 11)}${col('keys', 6)}${col('content L | R', 16)}${col('imgOnly', 9)}${col('script', 8)}${col('drive', 8)}E  W  T`);
for (const r of results) {
  const c = r.cells;
  console.log(`${col(r.id, 15)}${col(c.pages, 11)}${col(c.keys, 6)}${col(c.content, 16)}${col(c.imgOnly, 9)}${col(c.script, 8)}${col(c.drive, 8)}${count(r, 'ERROR')}  ${count(r, 'WARN')}  ${count(r, 'TODO')}`);
}
console.log('\ncolumns: pages = booklet pages in manifest.js · keys L/R = answer keys present · content = transcribed part runs per section');
console.log('         imgOnly = imageOnlyPages (L5 = Listening booklet pages 1-5 stay images) · script = listening transcript · drive = files on Drive (✗n = n required files missing)');

const order = ['ERROR', 'TODO', 'WARN', 'INFO'];
const shown = single || verbose ? order : order.slice(0, 3);
const perTest = results.filter((r) => r.issues.some((i) => shown.includes(i.level)));
if (!perTest.length) console.log('\nNo ERROR / TODO / WARN findings.');
for (const r of perTest) {
  console.log(`\n${r.id}`);
  for (const level of shown) {
    for (const issue of r.issues.filter((i) => i.level === level)) console.log(`  ${level.padEnd(5)} ${issue.code}  ${issue.message}`);
  }
}
if (single) console.log(`\nexam requests ${results[0].required.length} asset file(s): ${sample(results[0].required, 6)}`);
process.exit(anyError ? 1 : 0);
