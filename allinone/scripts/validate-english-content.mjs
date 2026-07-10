#!/usr/bin/env node
// Validates the English TOEIC content banks and optionally writes a normalized
// snapshot that future import/export tooling can diff or load into a database.
//
// Usage:
//   node scripts/validate-english-content.mjs
//   node scripts/validate-english-content.mjs --export /tmp/english-content.snapshot.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');
const dataDir = join(rootDir, 'src/data');
const assetDir = join(rootDir, 'src/assets/english');
const audioDir = join(assetDir, 'audio');

const readingPath = join(dataDir, 'englishContent.json');
const listeningPath = join(dataDir, 'englishListeningContent.json');
const vocabPath = join(dataDir, 'vocabDecks.json');

const args = process.argv.slice(2);
const exportIndex = args.indexOf('--export');
const exportPath = exportIndex >= 0 ? args[exportIndex + 1] : null;

if (exportIndex >= 0 && !exportPath) {
  console.error('Missing path after --export.');
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message, failures) {
  failures.push(message);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertUnique(values, label, failures) {
  const seen = new Set();

  values.forEach((value) => {
    if (seen.has(value)) fail(`Duplicate ${label}: ${value}`, failures);
    seen.add(value);
  });
}

function validateOptions(question, expectedCount, context, failures) {
  if (!question || typeof question !== 'object') {
    fail(`${context} is not an object`, failures);
    return;
  }

  if (!hasText(question.id)) fail(`${context} is missing id`, failures);
  if (!hasText(question.prompt)) fail(`${question.id || context} is missing prompt`, failures);
  if (!hasText(question.answer)) fail(`${question.id || context} is missing answer`, failures);
  if (!hasText(question.explanation)) fail(`${question.id || context} is missing explanation`, failures);
  if (hasText(question.explanation) && question.explanation.trim().length < 30) {
    fail(`${question.id || context} explanation is too short to be useful`, failures);
  }
  if (!Array.isArray(question.tags) || question.tags.length === 0) {
    fail(`${question.id || context} is missing tags`, failures);
  }

  const optionKeys = Object.keys(question.options || {});
  if (optionKeys.length !== expectedCount) {
    fail(`${question.id || context} should have ${expectedCount} options`, failures);
  }

  optionKeys.forEach((key) => {
    if (!hasText(question.options[key])) fail(`${question.id || context} has empty option ${key}`, failures);
  });

  const normalizedOptions = optionKeys.map((key) => String(question.options[key] || '').trim().toLowerCase());
  if (new Set(normalizedOptions).size !== normalizedOptions.length) {
    fail(`${question.id || context} has duplicate option text`, failures);
  }

  if (!Object.hasOwn(question.options || {}, question.answer)) {
    fail(`${question.id || context} answer key does not exist in options`, failures);
  }
}

function validateSegment(segment, segmentIds, failures) {
  if (!hasText(segment.id)) fail('Listening segment is missing id', failures);
  if (!hasText(segment.voice)) fail(`${segment.id || 'Listening segment'} is missing voice`, failures);
  if (!hasText(segment.text)) fail(`${segment.id || 'Listening segment'} is missing text`, failures);

  segmentIds.push(segment.id);

  const audioPath = join(audioDir, `${segment.id}.m4a`);
  if (!existsSync(audioPath)) fail(`Missing audio asset for segment ${segment.id}`, failures);
}

function validateReading(reading) {
  const failures = [];
  const { part5, part6, part7 } = reading.parts || {};
  const part5Questions = part5?.questions || [];
  const part6Sets = part6?.sets || [];
  const singleSets = part7?.singleSets || [];
  const multiSets = part7?.multiSets || [];
  const questionIds = [];
  const setIds = [];

  if (part5Questions.length < 180) fail(`Part 5 has ${part5Questions.length} items; expected at least 180`, failures);
  if (part6Sets.length < 8) fail(`Part 6 has ${part6Sets.length} sets; expected at least 8`, failures);
  if (singleSets.length < 20) fail(`Part 7 single has ${singleSets.length} sets; expected at least 20`, failures);
  if (multiSets.length < 10) fail(`Part 7 multi has ${multiSets.length} sets; expected at least 10`, failures);

  part5Questions.forEach((question) => {
    questionIds.push(question.id);
    validateOptions(question, 4, question.id || 'Part 5 question', failures);
  });

  part6Sets.forEach((set) => {
    setIds.push(set.id);
    if (!hasText(set.passageType)) fail(`${set.id} is missing passageType`, failures);
    if (!hasText(set.passage)) fail(`${set.id} is missing passage`, failures);
    if ((set.questions || []).length !== 4) fail(`${set.id} should have 4 questions`, failures);

    (set.questions || []).forEach((question) => {
      questionIds.push(question.id);
      validateOptions(question, 4, question.id || `${set.id} question`, failures);
      if (!set.passage.includes(`[${question.blank}]`)) {
        fail(`${set.id} passage is missing blank [${question.blank}]`, failures);
      }
    });
  });

  [...singleSets, ...multiSets].forEach((set) => {
    setIds.push(set.id);
    if (!Array.isArray(set.passages) || set.passages.length === 0) fail(`${set.id} is missing passages`, failures);
    if (!Array.isArray(set.questions) || set.questions.length === 0) fail(`${set.id} is missing questions`, failures);

    (set.passages || []).forEach((passage, index) => {
      if (!hasText(passage.type)) fail(`${set.id} passage ${index + 1} is missing type`, failures);
      if (!hasText(passage.text)) fail(`${set.id} passage ${index + 1} is missing text`, failures);
    });

    (set.questions || []).forEach((question) => {
      questionIds.push(question.id);
      validateOptions(question, 4, question.id || `${set.id} question`, failures);
    });
  });

  multiSets.forEach((set) => {
    if ((set.passages || []).length < 2) fail(`${set.id} should include multiple passages`, failures);
    if ((set.questions || []).length !== 5) fail(`${set.id} should have 5 questions`, failures);
    if (!(set.questions || []).some((question) => (question.tags || []).includes('cross-reference'))) {
      fail(`${set.id} should include at least one cross-reference question`, failures);
    }
  });

  assertUnique(questionIds, 'reading question id', failures);
  assertUnique(setIds, 'reading set id', failures);

  return {
    failures,
    summary: {
      part5: part5Questions.length,
      part6Sets: part6Sets.length,
      part6Questions: part6Sets.reduce((sum, set) => sum + (set.questions || []).length, 0),
      part7SingleSets: singleSets.length,
      part7SingleQuestions: singleSets.reduce((sum, set) => sum + (set.questions || []).length, 0),
      part7MultiSets: multiSets.length,
      part7MultiQuestions: multiSets.reduce((sum, set) => sum + (set.questions || []).length, 0),
    },
  };
}

function validateListening(listening) {
  const failures = [];
  const { part1, part2, part3, part4 } = listening.parts || {};
  const part1Items = part1?.items || [];
  const part2Items = part2?.items || [];
  const part3Sets = part3?.sets || [];
  const part4Sets = part4?.sets || [];
  const itemIds = [];
  const questionIds = [];
  const segmentIds = [];

  if (part1Items.length < 6) fail(`Part 1 has ${part1Items.length} items; expected at least 6`, failures);
  if (part2Items.length < 25) fail(`Part 2 has ${part2Items.length} items; expected at least 25`, failures);
  if (part3Sets.reduce((sum, set) => sum + (set.questions || []).length, 0) < 39) fail('Part 3 has fewer than 39 questions', failures);
  if (part4Sets.reduce((sum, set) => sum + (set.questions || []).length, 0) < 30) fail('Part 4 has fewer than 30 questions', failures);

  part1Items.forEach((item) => {
    itemIds.push(item.id);
    if (!hasText(item.image)) fail(`${item.id} is missing image`, failures);
    if (!existsSync(join(assetDir, item.image))) fail(`${item.id} image does not exist: ${item.image}`, failures);
    if (!hasText(item.answer)) fail(`${item.id} is missing answer`, failures);
    if (!hasText(item.explanation)) fail(`${item.id} is missing explanation`, failures);
    if (hasText(item.explanation) && item.explanation.trim().length < 30) {
      fail(`${item.id} explanation is too short to be useful`, failures);
    }
    if (!Array.isArray(item.tags) || item.tags.length === 0) fail(`${item.id} is missing tags`, failures);
    if ((item.segments || []).length !== 5) fail(`${item.id} should have narrator plus four statement segments`, failures);
    (item.segments || []).forEach((segment) => validateSegment(segment, segmentIds, failures));
    if (!['A', 'B', 'C', 'D'].includes(item.answer)) fail(`${item.id} has invalid answer key`, failures);
  });

  part2Items.forEach((item) => {
    itemIds.push(item.id);
    if (!hasText(item.answer)) fail(`${item.id} is missing answer`, failures);
    if (!hasText(item.explanation)) fail(`${item.id} is missing explanation`, failures);
    if (hasText(item.explanation) && item.explanation.trim().length < 30) {
      fail(`${item.id} explanation is too short to be useful`, failures);
    }
    if (!Array.isArray(item.tags) || item.tags.length === 0) fail(`${item.id} is missing tags`, failures);
    if ((item.segments || []).length !== 4) fail(`${item.id} should have question plus three response segments`, failures);
    (item.segments || []).forEach((segment) => validateSegment(segment, segmentIds, failures));
    if (!['A', 'B', 'C'].includes(item.answer)) fail(`${item.id} has invalid answer key`, failures);
  });

  [...part3Sets, ...part4Sets].forEach((set) => {
    itemIds.push(set.id);
    if ((set.questions || []).length !== 3) fail(`${set.id} should have 3 questions`, failures);
    (set.segments || []).forEach((segment) => validateSegment(segment, segmentIds, failures));
    (set.questions || []).forEach((question) => {
      questionIds.push(question.id);
      validateOptions(question, 4, question.id || `${set.id} question`, failures);
    });
  });

  assertUnique(itemIds, 'listening item or set id', failures);
  assertUnique(questionIds, 'listening question id', failures);
  assertUnique(segmentIds, 'listening segment id', failures);

  return {
    failures,
    summary: {
      part1: part1Items.length,
      part2: part2Items.length,
      part3Sets: part3Sets.length,
      part3Questions: part3Sets.reduce((sum, set) => sum + (set.questions || []).length, 0),
      part4Sets: part4Sets.length,
      part4Questions: part4Sets.reduce((sum, set) => sum + (set.questions || []).length, 0),
      audioSegments: segmentIds.length,
    },
  };
}

function validateVocab(vocab) {
  const failures = [];
  const decks = vocab.decks || [];
  const cardIds = [];

  if (decks.length < 10) fail(`Vocabulary has ${decks.length} decks; expected at least 10`, failures);

  decks.forEach((deck) => {
    if (!hasText(deck.id)) fail('Vocabulary deck is missing id', failures);
    if (!hasText(deck.label)) fail(`${deck.id || 'Vocabulary deck'} is missing label`, failures);
    if ((deck.cards || []).length < 30) fail(`${deck.id} has fewer than 30 cards`, failures);

    (deck.cards || []).forEach((card) => {
      cardIds.push(card.id);
      ['id', 'word', 'partOfSpeech', 'definition', 'example', 'vi'].forEach((field) => {
        if (!hasText(card[field])) fail(`${card.id || deck.id} is missing ${field}`, failures);
      });
    });
  });

  assertUnique(cardIds, 'vocabulary card id', failures);

  return {
    failures,
    summary: {
      decks: decks.length,
      cards: decks.reduce((sum, deck) => sum + (deck.cards || []).length, 0),
    },
  };
}

function createSnapshot(reading, listening, vocab, summaries) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      reading: 'src/data/englishContent.json',
      listening: 'src/data/englishListeningContent.json',
      vocab: 'src/data/vocabDecks.json',
      audio: 'src/assets/english/audio',
      images: 'src/assets/english',
    },
    summary: summaries,
    reading,
    listening,
    vocab,
  };
}

const reading = readJson(readingPath);
const listening = readJson(listeningPath);
const vocab = readJson(vocabPath);

const readingResult = validateReading(reading);
const listeningResult = validateListening(listening);
const vocabResult = validateVocab(vocab);
const failures = [
  ...readingResult.failures.map((message) => `reading: ${message}`),
  ...listeningResult.failures.map((message) => `listening: ${message}`),
  ...vocabResult.failures.map((message) => `vocab: ${message}`),
];

const summaries = {
  reading: readingResult.summary,
  listening: listeningResult.summary,
  vocab: vocabResult.summary,
};

if (failures.length > 0) {
  console.error(`English content validation failed with ${failures.length} issue(s):`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

if (exportPath) {
  const resolvedExportPath = resolve(process.cwd(), exportPath);
  mkdirSync(dirname(resolvedExportPath), { recursive: true });
  writeFileSync(
    resolvedExportPath,
    `${JSON.stringify(createSnapshot(reading, listening, vocab, summaries), null, 2)}\n`,
  );
  console.log(`Wrote normalized English content snapshot to ${resolvedExportPath}`);
}

console.log('English content validation passed.');
console.log(JSON.stringify(summaries, null, 2));
