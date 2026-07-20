import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import test from 'node:test';

const content = JSON.parse(readFileSync(join(cwd(), 'src/data/vocabDecks.json'), 'utf8'));

function collectCards() {
  return content.decks.flatMap((deck) => deck.cards.map((card) => ({ ...card, deckId: deck.id })));
}

test('vocabulary decks meet the Phase 6 growth target', () => {
  assert.equal(content.decks.length, 10);
  assert.ok(collectCards().length >= 300, `expected at least 300 cards, got ${collectCards().length}`);

  content.decks.forEach((deck) => {
    assert.ok(deck.cards.length >= 30, `${deck.id} should contain at least 30 cards`);
  });
});

test('vocabulary cards have unique ids and complete learning fields', () => {
  const cards = collectCards();
  const ids = cards.map((card) => card.id);

  assert.equal(new Set(ids).size, ids.length);

  cards.forEach((card) => {
    assert.ok(card.deckId, `${card.id} is missing a deck id`);
    assert.ok(card.word, `${card.id} is missing a word`);
    assert.ok(card.partOfSpeech, `${card.id} is missing a part of speech`);
    assert.ok(card.definition, `${card.id} is missing a definition`);
    assert.ok(card.example, `${card.id} is missing an example`);
    assert.ok(card.vi, `${card.id} is missing a Vietnamese gloss`);
  });
});
