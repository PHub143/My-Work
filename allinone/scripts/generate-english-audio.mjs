#!/usr/bin/env node
// Generates TTS audio for the English listening bank (macOS only: uses `say`
// and `afconvert`). Reads segment transcripts from
// src/data/englishListeningContent.json and writes one .m4a per segment to
// src/assets/english/audio/. Existing files are skipped unless --force.
//
// Usage: node scripts/generate-english-audio.mjs [--force]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test2ListeningContent } from '../src/data/englishTest2Content.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const contentPath = join(scriptDir, '../src/data/englishListeningContent.json');
const outputDir = join(scriptDir, '../src/assets/english/audio');
const force = process.argv.includes('--force');

// Voice roles map to macOS voices approximating TOEIC's accent mix.
// Fallbacks apply when a voice is not installed.
const VOICE_CANDIDATES = {
  narrator: ['Daniel', 'Samantha'],
  'man-us': ['Reed (English (US))', 'Fred', 'Samantha'],
  'woman-us': ['Samantha'],
  'man-uk': ['Daniel', 'Reed (English (UK))', 'Samantha'],
  'woman-au': ['Karen', 'Samantha'],
};

function installedVoices() {
  const output = execFileSync('say', ['-v', '?'], { encoding: 'utf8' });
  return new Set(
    output
      .split('\n')
      .map((line) => line.split(/ {2,}/)[0].trim())
      .filter(Boolean),
  );
}

function resolveVoices() {
  const installed = installedVoices();
  const resolved = {};

  Object.entries(VOICE_CANDIDATES).forEach(([role, candidates]) => {
    resolved[role] = candidates.find((voice) => installed.has(voice)) || null;
    if (!resolved[role]) {
      console.warn(`No installed voice for role "${role}" — using system default.`);
    }
  });

  return resolved;
}

function collectSegments(content) {
  const segments = [];
  const push = (list) => (list || []).forEach((entry) => segments.push(...(entry.segments || [])));

  push(content.parts.part1.items);
  push(content.parts.part2.items);
  push(content.parts.part3.sets);
  push(content.parts.part4.sets);

  return segments;
}

const content = JSON.parse(readFileSync(contentPath, 'utf8'));
const segments = [...collectSegments(content), ...collectSegments(test2ListeningContent)];
const voices = resolveVoices();
mkdirSync(outputDir, { recursive: true });

let generated = 0;
let skipped = 0;

segments.forEach((segment) => {
  const outputPath = join(outputDir, `${segment.id}.m4a`);

  if (!force && existsSync(outputPath)) {
    skipped += 1;
    return;
  }

  const aiffPath = join(outputDir, `${segment.id}.aiff`);
  const voice = voices[segment.voice];
  const sayArgs = voice ? ['-v', voice] : [];

  execFileSync('say', [...sayArgs, '-o', aiffPath, segment.text]);
  execFileSync('afconvert', [aiffPath, outputPath, '-f', 'm4af', '-d', 'aac', '-b', '32000', '-c', '1']);
  rmSync(aiffPath);
  generated += 1;
});

console.log(`Generated ${generated} segment(s), skipped ${skipped} existing. Output: ${outputDir}`);
