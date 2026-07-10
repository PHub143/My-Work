import { useEffect, useState } from 'react';
import { API_URL } from '../config.js';
import bundledReadingContent from '../data/englishContent.json' with { type: 'json' };
import bundledListeningContent from '../data/englishListeningContent.json' with { type: 'json' };
import bundledVocabDecks from '../data/vocabDecks.json' with { type: 'json' };
import { test2ListeningContent, test2ReadingSingleSets } from '../data/englishTest2Content.js';

function appendUnique(entries = [], additions = []) {
  const ids = new Set(entries.map((entry) => entry.id));
  return [...entries, ...additions.filter((entry) => !ids.has(entry.id))];
}

function withTest2Content(readingContent, listeningContent) {
  if (!readingContent?.parts?.part7 || !listeningContent?.parts?.part1) {
    return { readingContent, listeningContent };
  }

  return {
    readingContent: {
      ...readingContent,
      parts: {
        ...readingContent.parts,
        part7: {
          ...readingContent.parts.part7,
          singleSets: appendUnique(readingContent.parts.part7.singleSets, test2ReadingSingleSets),
        },
      },
    },
    listeningContent: {
      ...listeningContent,
      parts: {
        part1: { items: appendUnique(listeningContent.parts.part1.items, test2ListeningContent.parts.part1.items) },
        part2: { items: appendUnique(listeningContent.parts.part2.items, test2ListeningContent.parts.part2.items) },
        part3: { sets: appendUnique(listeningContent.parts.part3.sets, test2ListeningContent.parts.part3.sets) },
        part4: { sets: appendUnique(listeningContent.parts.part4.sets, test2ListeningContent.parts.part4.sets) },
      },
    },
  };
}

const bundledTests = withTest2Content(bundledReadingContent, bundledListeningContent);

const BUNDLED_CONTENT = {
  ...bundledTests,
  vocabDecks: bundledVocabDecks,
  source: 'bundled',
  checksum: null,
  summary: null,
};

let cachedContent = BUNDLED_CONTENT;
let pendingContentRequest = null;

function normalizeSnapshot(snapshot) {
  const payload = snapshot?.payload;
  if (!payload?.reading || !payload?.listening || !payload?.vocab) return null;

  return {
    ...withTest2Content(payload.reading, payload.listening),
    vocabDecks: payload.vocab,
    source: 'api',
    checksum: snapshot.checksum || null,
    summary: snapshot.summary || null,
  };
}

export function getBundledEnglishContent() {
  return BUNDLED_CONTENT;
}

export function getCachedEnglishContent() {
  return cachedContent;
}

export async function fetchLatestEnglishContent({ fetchImpl = fetch } = {}) {
  if (typeof fetchImpl !== 'function') return BUNDLED_CONTENT;

  const response = await fetchImpl(`${API_URL}/learning/content/latest`);
  if (!response.ok) return BUNDLED_CONTENT;

  const data = await response.json().catch(() => null);
  const normalized = normalizeSnapshot(data?.snapshot);
  if (!normalized) return BUNDLED_CONTENT;

  cachedContent = normalized;
  return cachedContent;
}

export function useEnglishContent() {
  const [content, setContent] = useState(() => cachedContent);

  useEffect(() => {
    let isMounted = true;

    if (!pendingContentRequest) {
      pendingContentRequest = fetchLatestEnglishContent()
        .catch(() => BUNDLED_CONTENT)
        .finally(() => {
          pendingContentRequest = null;
        });
    }

    pendingContentRequest.then((nextContent) => {
      if (isMounted) setContent(nextContent);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return content;
}
