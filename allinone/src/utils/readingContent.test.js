import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import test from 'node:test';
import { test2ReadingSingleSets } from '../data/englishTest2Content.js';

const content = JSON.parse(readFileSync(join(cwd(), 'src/data/englishContent.json'), 'utf8'));

function collectReadingQuestions() {
  const { part5, part6, part7 } = content.parts;

  return [
    ...part5.questions,
    ...part6.sets.flatMap((set) => set.questions),
    ...part7.singleSets.flatMap((set) => set.questions),
    ...part7.multiSets.flatMap((set) => set.questions),
  ];
}

test('english reading content meets current Phase 6 variety targets', () => {
  const { part5, part6, part7 } = content.parts;

  assert.equal(part5.questions.length, 180);
  assert.equal(part6.sets.length, 8);
  assert.equal(part6.sets.reduce((sum, set) => sum + set.questions.length, 0), 32);
  assert.equal(part7.singleSets.length, 20);
  assert.equal(part7.singleSets.reduce((sum, set) => sum + set.questions.length, 0), 47);
  assert.equal(part7.multiSets.length, 10);
  assert.equal(part7.multiSets.reduce((sum, set) => sum + set.questions.length, 0), 50);
});

test('english reading content has unique question ids and valid answer keys', () => {
  const questions = collectReadingQuestions();
  const ids = questions.map((question) => question.id);

  assert.equal(new Set(ids).size, ids.length);

  questions.forEach((question) => {
    assert.ok(question.prompt, `${question.id} is missing a prompt`);
    assert.ok(question.explanation, `${question.id} is missing an explanation`);
    assert.ok(Array.isArray(question.tags) && question.tags.length > 0, `${question.id} is missing tags`);
    assert.ok(Object.hasOwn(question.options, question.answer), `${question.id} has an invalid answer key`);
  });
});

test('part 6 sets use four-question TOEIC text-completion groups', () => {
  content.parts.part6.sets.forEach((set) => {
    assert.equal(set.questions.length, 4, `${set.id} must contain four questions`);

    set.questions.forEach((question) => {
      assert.equal(
        set.passage.includes(`[${question.blank}]`),
        true,
        `${set.id} passage is missing blank [${question.blank}]`,
      );
    });
  });
});

test('part 7 multi-passage sets include cross-reference practice', () => {
  content.parts.part7.multiSets.forEach((set) => {
    assert.equal(set.passages.length >= 2, true, `${set.id} must include multiple passages`);
    assert.equal(set.questions.length, 5, `${set.id} must contain five questions`);
    assert.equal(
      set.questions.some((question) => question.tags.includes('cross-reference')),
      true,
      `${set.id} must include at least one cross-reference question`,
    );
  });
});

test('Test 2 supplement completes a second 29-question single-passage pool', () => {
  const originalSecondPool = content.parts.part7.singleSets.slice(11);
  const total = [...originalSecondPool, ...test2ReadingSingleSets]
    .reduce((sum, set) => sum + set.questions.length, 0);

  assert.equal(test2ReadingSingleSets.length, 5);
  assert.equal(total, 29);
});
