import assert from 'node:assert/strict';
import test from 'node:test';
import readingContent from '../data/englishContent.json' with { type: 'json' };
import listeningContent from '../data/englishListeningContent.json' with { type: 'json' };
import vocabDecks from '../data/vocabDecks.json' with { type: 'json' };
import {
  createContentInventory,
  filterContentInventory,
  getInventoryFacets,
  getInventorySummary,
} from './englishContentAdmin.js';

const inventory = createContentInventory({ readingContent, listeningContent, vocabDecks });

test('createContentInventory flattens reading, listening, and vocabulary content', () => {
  const summary = getInventorySummary(inventory);

  assert.equal(summary.reading, 218);
  assert.equal(summary.listening, 54);
  assert.equal(summary.vocab, 300);
  assert.equal(summary.total, 572);
});

test('filterContentInventory filters by bank, part, tag, and query', () => {
  assert.equal(filterContentInventory(inventory, { bank: 'vocab' }).length, 300);
  assert.equal(filterContentInventory(inventory, { part: 'Part 7 Multi' }).length, 10);
  assert.equal(filterContentInventory(inventory, { tag: 'cross-reference' }).length, 10);
  assert.equal(filterContentInventory(inventory, { query: 'airport shuttle' }).length > 0, true);
});

test('getInventoryFacets exposes filter options from content', () => {
  const facets = getInventoryFacets(inventory);

  assert.equal(facets.banks.includes('reading'), true);
  assert.equal(facets.banks.includes('listening'), true);
  assert.equal(facets.banks.includes('vocab'), true);
  assert.equal(facets.parts.includes('Part 5'), true);
  assert.equal(facets.tags.includes('verb-tense'), true);
});
