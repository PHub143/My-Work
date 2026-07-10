import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchLatestEnglishContent,
  getBundledEnglishContent,
} from './englishContent.js';

test('fetchLatestEnglishContent returns normalized API snapshot content', async () => {
  const snapshot = {
    checksum: 'abc',
    summary: { vocab: { cards: 300 } },
    payload: {
      reading: { title: 'Reading from DB' },
      listening: { title: 'Listening from DB' },
      vocab: { title: 'Vocab from DB', decks: [] },
    },
  };

  const content = await fetchLatestEnglishContent({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ snapshot }),
    }),
  });

  assert.equal(content.source, 'api');
  assert.equal(content.checksum, 'abc');
  assert.equal(content.readingContent.title, 'Reading from DB');
  assert.equal(content.listeningContent.title, 'Listening from DB');
  assert.equal(content.vocabDecks.title, 'Vocab from DB');
});

test('fetchLatestEnglishContent falls back to bundled content when API is unavailable', async () => {
  const bundled = getBundledEnglishContent();
  const content = await fetchLatestEnglishContent({
    fetchImpl: async () => ({ ok: false }),
  });

  assert.equal(content.source, 'bundled');
  assert.equal(content.readingContent, bundled.readingContent);
});

test('fetchLatestEnglishContent ignores malformed snapshots', async () => {
  const content = await fetchLatestEnglishContent({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ snapshot: { payload: { reading: {} } } }),
    }),
  });

  assert.equal(content.source, 'bundled');
});
