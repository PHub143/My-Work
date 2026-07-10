function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function optionText(options = {}) {
  return Object.entries(options)
    .map(([key, value]) => `${key}. ${value}`)
    .join(' ');
}

function readingQuestionSearch(question) {
  return [
    question.prompt,
    optionText(question.options),
    question.answer,
    question.explanation,
    ...(question.tags || []),
  ].filter(Boolean).join(' ');
}

function makeReadingItems(readingContent) {
  const { part5, part6, part7 } = readingContent.parts || {};
  const items = [];

  (part5?.questions || []).forEach((question) => {
    items.push({
      id: question.id,
      bank: 'reading',
      part: 'Part 5',
      type: 'Incomplete sentence',
      title: question.prompt,
      tags: question.tags || [],
      countLabel: '1 question',
      searchText: readingQuestionSearch(question),
      data: question,
    });
  });

  (part6?.sets || []).forEach((set) => {
    const tags = unique((set.questions || []).flatMap((question) => question.tags || []));
    items.push({
      id: set.id,
      bank: 'reading',
      part: 'Part 6',
      type: set.passageType || 'Text completion',
      title: set.passage.split('\n').find(Boolean) || set.id,
      tags,
      countLabel: `${set.questions?.length || 0} questions`,
      searchText: [
        set.passage,
        set.passageType,
        ...(set.questions || []).map(readingQuestionSearch),
      ].filter(Boolean).join(' '),
      data: set,
    });
  });

  (part7?.singleSets || []).forEach((set) => {
    const tags = unique((set.questions || []).flatMap((question) => question.tags || []));
    const firstPassage = set.passages?.[0];
    items.push({
      id: set.id,
      bank: 'reading',
      part: 'Part 7 Single',
      type: firstPassage?.type || 'Single passage',
      title: firstPassage?.text?.split('\n').find(Boolean) || set.id,
      tags,
      countLabel: `${set.questions?.length || 0} questions`,
      searchText: [
        ...(set.passages || []).map((passage) => `${passage.type} ${passage.text}`),
        ...(set.questions || []).map(readingQuestionSearch),
      ].filter(Boolean).join(' '),
      data: set,
    });
  });

  (part7?.multiSets || []).forEach((set) => {
    const tags = unique((set.questions || []).flatMap((question) => question.tags || []));
    items.push({
      id: set.id,
      bank: 'reading',
      part: 'Part 7 Multi',
      type: `${set.passages?.length || 0} passages`,
      title: set.passages?.[0]?.text?.split('\n').find(Boolean) || set.id,
      tags,
      countLabel: `${set.questions?.length || 0} questions`,
      searchText: [
        ...(set.passages || []).map((passage) => `${passage.type} ${passage.text}`),
        ...(set.questions || []).map(readingQuestionSearch),
      ].filter(Boolean).join(' '),
      data: set,
    });
  });

  return items;
}

function listeningQuestionSearch(question) {
  return [
    question.prompt,
    optionText(question.options),
    question.answer,
    question.explanation,
    ...(question.tags || []),
  ].filter(Boolean).join(' ');
}

function segmentSearch(segments = []) {
  return segments.map((segment) => segment.text).join(' ');
}

function makeListeningItems(listeningContent) {
  const { part1, part2, part3, part4 } = listeningContent.parts || {};
  const items = [];

  (part1?.items || []).forEach((item) => {
    items.push({
      id: item.id,
      bank: 'listening',
      part: 'Part 1',
      type: 'Photograph',
      title: item.image || item.id,
      tags: item.tags || [],
      countLabel: `${item.segments?.length || 0} clips`,
      searchText: [item.image, item.explanation, segmentSearch(item.segments), ...(item.tags || [])].join(' '),
      data: item,
    });
  });

  (part2?.items || []).forEach((item) => {
    items.push({
      id: item.id,
      bank: 'listening',
      part: 'Part 2',
      type: 'Question-response',
      title: item.segments?.[0]?.text || item.id,
      tags: item.tags || [],
      countLabel: `${item.segments?.length || 0} clips`,
      searchText: [item.explanation, segmentSearch(item.segments), ...(item.tags || [])].join(' '),
      data: item,
    });
  });

  [...(part3?.sets || []), ...(part4?.sets || [])].forEach((set) => {
    const isPart3 = set.id?.startsWith('l3-');
    const tags = unique((set.questions || []).flatMap((question) => question.tags || []));
    items.push({
      id: set.id,
      bank: 'listening',
      part: isPart3 ? 'Part 3' : 'Part 4',
      type: isPart3 ? 'Conversation' : 'Talk',
      title: set.segments?.[1]?.text || set.id,
      tags,
      countLabel: `${set.questions?.length || 0} questions`,
      searchText: [
        segmentSearch(set.segments),
        ...(set.questions || []).map(listeningQuestionSearch),
      ].filter(Boolean).join(' '),
      data: set,
    });
  });

  return items;
}

function makeVocabItems(vocabDecks) {
  return (vocabDecks.decks || []).flatMap((deck) => (
    (deck.cards || []).map((card) => ({
      id: card.id,
      bank: 'vocab',
      part: deck.label || deck.id,
      type: card.partOfSpeech,
      title: card.word,
      tags: [deck.id],
      countLabel: card.vi,
      searchText: [
        deck.label,
        deck.id,
        card.word,
        card.partOfSpeech,
        card.definition,
        card.example,
        card.vi,
      ].filter(Boolean).join(' '),
      data: { ...card, deckId: deck.id, deckLabel: deck.label },
    }))
  ));
}

export function createContentInventory({ readingContent, listeningContent, vocabDecks }) {
  return [
    ...makeReadingItems(readingContent || {}),
    ...makeListeningItems(listeningContent || {}),
    ...makeVocabItems(vocabDecks || {}),
  ];
}

export function getInventorySummary(items) {
  return items.reduce(
    (summary, item) => ({
      ...summary,
      total: summary.total + 1,
      [item.bank]: (summary[item.bank] || 0) + 1,
    }),
    { total: 0, reading: 0, listening: 0, vocab: 0 },
  );
}

export function filterContentInventory(items, { bank = 'all', part = 'all', query = '', tag = 'all' } = {}) {
  const normalizedQuery = query.trim().toLowerCase();

  return items.filter((item) => {
    if (bank !== 'all' && item.bank !== bank) return false;
    if (part !== 'all' && item.part !== part) return false;
    if (tag !== 'all' && !(item.tags || []).includes(tag)) return false;
    if (!normalizedQuery) return true;
    return [item.id, item.title, item.type, item.countLabel, item.searchText]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function getInventoryFacets(items) {
  return {
    banks: unique(items.map((item) => item.bank)),
    parts: unique(items.map((item) => item.part)),
    tags: unique(items.flatMap((item) => item.tags || [])),
  };
}
