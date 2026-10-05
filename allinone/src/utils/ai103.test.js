import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { visualCodeHotspotConfigs } from '../data/ai103ExhibitConfigs.js';
import { AI_103_TRACK } from '../data/learningTracks.js';
import { getPracticeControlConfig, getPracticeQuestionDisplayParts } from './learning.js';

const content = JSON.parse(readFileSync(new URL('../data/ai103Content.json', import.meta.url), 'utf8'));

test('AI-103 questions are numbered contiguously and match the track card count', () => {
  const numbers = content.questions.map((question) => question.number);
  assert.deepEqual(numbers, numbers.map((_, index) => index + 1));
  assert.equal(content.questionCount, numbers.length);
  assert.equal(AI_103_TRACK.questionCount, numbers.length);
});

test('AI-103 choice questions have an answer key that points at real options', () => {
  content.questions
    .filter((question) => !getPracticeControlConfig(question.number))
    .forEach((question) => {
      const parts = getPracticeQuestionDisplayParts(question);
      if (!parts.options.length) return;
      assert.ok(parts.answerSelections.length > 0, `question ${question.number} has no answer`);
      parts.answerSelections.forEach((key) => {
        assert.ok(
          parts.options.some((option) => option.key === key),
          `question ${question.number} answer ${key} is not an option`,
        );
      });
    });
});

test('AI-103 structured hotspot answers stay in sync across practice and study configs', () => {
  Object.entries(visualCodeHotspotConfigs).forEach(([number, exhibit]) => {
    const control = getPracticeControlConfig(Number(number));
    if (!control) return;

    const practiceAnswers = control.controls.map((item) => control.correct[item.id]);
    control.controls.forEach((item) => {
      assert.ok(item.options.includes(control.correct[item.id]), `question ${number} ${item.id} answer not in options`);
    });

    const exhibitAnswers = exhibit.hotspotFields
      ? exhibit.hotspotFields.map((field) => field.answer)
      : exhibit.codeBlanks
        ? Object.values(exhibit.codeBlanks).map((blank) => blank.answer)
        : null;
    if (exhibitAnswers) {
      assert.deepEqual(exhibitAnswers, practiceAnswers, `question ${number} configs disagree`);
    }
  });
});
