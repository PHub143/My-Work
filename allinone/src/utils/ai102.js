export function splitText(text) {
  if (!text || !text.trim()) return [];
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function getQuestionParts(question) {
  const lines = (question?.prompt || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const optionStart = lines.findIndex((line) => /^[A-Z]\.\s*\S/.test(line));
  const promptLines = optionStart === -1 ? lines : lines.slice(0, optionStart);
  const options = optionStart === -1
    ? []
    : lines.slice(optionStart).reduce((items, line) => {
      const match = line.match(/^([A-Z])\.\s*(.+)$/);
      if (match) items.push({ letter: match[1], text: match[2] });
      else if (items.length) items[items.length - 1].text += ` ${line}`;
      return items;
    }, []);

  return {
    promptParagraphs: splitText(promptLines.join('\n')),
    options,
    answerLetters: getAnswerLetters(question?.answer),
    explanationParagraphs: splitText(question?.explanation),
  };
}

export function getAnswerLetters(answer) {
  const normalized = (answer || '').replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]+$/.test(normalized) && normalized.length <= 6
    ? normalized.split('')
    : [];
}

export function formatQuestionType(type) {
  return type === 'DRAG DROP'
    ? 'Drag and Drop'
    : type === 'HOTSPOT'
      ? 'Hotspot'
      : type === 'CASE STUDY'
        ? 'Case Study'
        : type === 'SIMULATION'
          ? 'Simulation'
          : 'Multiple Choice';
}

export function matchesQuestion(question, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [
    question.number,
    question.type,
    question.prompt,
    question.answer,
    question.explanation,
  ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
}

export function answerKey(question) {
  return getAnswerLetters(question?.answer).join('');
}

export function getPdfPageUrl(pageNumber) {
  return `${import.meta.env.BASE_URL}ai102/pages/page-${pageNumber}.jpg`;
}
