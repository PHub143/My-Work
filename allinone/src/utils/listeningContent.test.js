import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import test from 'node:test';
import { test2ListeningContent } from '../data/englishTest2Content.js';

const content = JSON.parse(readFileSync(join(cwd(), 'src/data/englishListeningContent.json'), 'utf8'));

function collectSegments(entries) {
  return (entries || []).flatMap((entry) => entry.segments || []);
}

test('english listening content supports a full TOEIC listening form', () => {
  const part1 = content.parts.part1.items;
  const part2 = content.parts.part2.items;
  const part3 = content.parts.part3.sets;
  const part4 = content.parts.part4.sets;

  assert.equal(part1.length, 6);
  assert.equal(part2.length, 25);
  assert.equal(part3.reduce((sum, set) => sum + set.questions.length, 0), 39);
  assert.equal(part4.reduce((sum, set) => sum + set.questions.length, 0), 30);
  assert.equal(part3.length, 13);
  assert.equal(part4.length, 10);
});

test('english listening content references existing audio and photo assets', () => {
  const segmentIds = [
    ...collectSegments(content.parts.part1.items),
    ...collectSegments(content.parts.part2.items),
    ...collectSegments(content.parts.part3.sets),
    ...collectSegments(content.parts.part4.sets),
  ].map((segment) => segment.id);
  const uniqueSegmentIds = new Set(segmentIds);

  assert.equal(uniqueSegmentIds.size, segmentIds.length);

  segmentIds.forEach((segmentId) => {
    assert.equal(
      existsSync(join(cwd(), `src/assets/english/audio/${segmentId}.m4a`)),
      true,
      `Missing audio segment ${segmentId}`,
    );
  });

  content.parts.part1.items.forEach((item) => {
    assert.equal(
      existsSync(join(cwd(), `src/assets/english/${item.image}`)),
      true,
      `Missing photo asset ${item.image}`,
    );
  });
});

test('Test 2 supports a distinct full TOEIC listening form and assets', () => {
  const { part1, part2, part3, part4 } = test2ListeningContent.parts;
  assert.equal(part1.items.length, 6);
  assert.equal(part2.items.length, 25);
  assert.equal(part3.sets.length, 13);
  assert.equal(part4.sets.length, 10);
  assert.equal(part3.sets.flatMap((entry) => entry.questions).length, 39);
  assert.equal(part4.sets.flatMap((entry) => entry.questions).length, 30);

  const entries = [...part1.items, ...part2.items, ...part3.sets, ...part4.sets];
  entries.flatMap((entry) => entry.segments).forEach(({ id }) => {
    assert.equal(existsSync(join(cwd(), `src/assets/english/audio/${id}.m4a`)), true, `Missing Test 2 audio ${id}`);
  });
  part1.items.forEach(({ image }) => {
    assert.equal(existsSync(join(cwd(), `src/assets/english/${image}`)), true, `Missing Test 2 photo ${image}`);
  });
});
