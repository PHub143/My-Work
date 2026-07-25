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

// The source PDF stores the selected answer for answer-area questions inside
// the screenshot. Keep the selections that have no extracted explanation here
// so both Learning and Practice can show a useful answer instead of a generic
// placeholder.
const answerAreaAnswers = {
  111: 'HTTP method: POST. Query parameter: imageType.',
  112: 'Set enabled to false to exclude the custom brand.',
  165: 'Step 1: From the original Language service instance, export the existing project.\nStep 2: From the new Language service instance, import the project.\nStep 3: From the new Language service instance, import and publish the project.',
  167: 'speechTranslationConfig.speechRecognitionLanguage; speech_translation_config.AddTargetLanguage.',
  172: 'AudioStreamFormat.GetCompressedFormat; SpeechRecognizer',
  173: 'Configure autocorrect, classify, and the Ocp-Apim-Subscription-Key header.',
  181: "languages = ['fr', 'de', 'es']; use TranslationRecognizer.",
  186: "languages = ['fr', 'de', 'es']; use TranslationRecognizer.",
  191: "languages = ['fr', 'de', 'es']; use TranslationRecognizer.",
  210: 'Use FormRecognizer with the Standard (S0) SKU in eastus.',
  212: "Use the prebuilt-document model and a handwritten confidence threshold of 0.75.",
  214: 'Resource type: Microsoft.CognitiveServices. Resource kind: FormRecognizer.',
  218: 'Analyze lesson plans with Azure AI Document Intelligence; analyze learning content with Immersive Reader.',
  219: 'Use the prebuilt-layout model and the Ocp-Apim-Subscription-Key header.',
  221: 'Expenditure request authorization forms: Custom template. Structured employment application forms: Prebuilt contract. Structured and unstructured survey forms: Custom neural.',
  224: "Use the prebuilt-document model and a handwritten confidence threshold of 0.75.",
  225: 'Upload five sample documents → create a custom model project and link it to sa1 → apply labels to the sample documents → train and test the model.',
  226: 'Retrieve the access key for sa1 → upload the forms and JSON files to blob1 → call the Build model REST API → call the Get model REST API.',
  283: 'Configure Temperature and Top P.',
  290: 'Call openai.ChatCompletion.create and print response.choices[0].text.',
  291: 'Call GetCompletions and print response.Value.Choices[0].Text.',
  293: 'Use ChatCompletionsOptions with AzureCognitiveSearchChatExtensionConfiguration.',
  294: 'Use the subscription ID as the credential and text-embedding-ada-002 as the model/deployment value.',
  295: 'Configure Temperature and Frequency penalty.',
  307: 'Path segment: contentsafety/. Operation: text/blocklists.',
  314: 'ContentSafetyClient; AnalyzeTextOptions.',
  316: 'Step 1: Upload the video to blob storage.\nStep 2: Index the video by using the Video Indexer API.\nStep 3: Extract the transcript from the Video Indexer API.\nStep 4: Translate the transcript by using the Translator API.',
  118: 'Box 1: "fr", "de", "es"\nBox 2: TranslationRecognizer',
  142: 'Box 1: api-nam.cognitive.microsofttranslator.com\nBox 2: /translate?to=en',
  124: 'Box 1: No\nBox 2: No\nBox 3: Yes',
  151: 'Yes\nNo\nYes',
  161: 'No\nYes\nNo',
  179: 'No\nYes\nNo',
  180: 'Yes\nNo\nNo',
  195: 'Box 1: Yes\nBox 2: No\nBox 3: No',
  200: 'Box 1: Yes\nBox 2: Yes\nBox 3: No',
  211: 'No\nYes\nYes',
  229: 'Box 1: No\nBox 2: Yes\nBox 3: Yes',
  235: 'Box 1: Yes\nBox 2: No\nBox 3: No',
  236: 'Box 1: No\nBox 2: Yes\nBox 3: Yes',
  237: 'Box 1: Yes\nBox 2: Yes\nBox 3: No',
  276: 'No\nNo\nYes',
  279: 'Yes\nYes\nNo',
  289: 'No\nNo\nNo',
  303: 'No\nYes\nYes',
  77: 'Yes\nYes\nYes',
  100: 'Yes\nYes\nNo',
  207: 'There will be two projection groups. Normalized images will be projected to Azure Blob storage.',
  286: 'ChatRole.User; Temperature',
  288: 'user; Temperature',
  304: 'Box 1: Cognitive Service User\nBox 2: Cognitive Services QnA Maker Editor\nBox 3: Cognitive Services QnA Maker Read',
  324: 'Box 1: "categories": ["Locations", "Persons", "Organizations"]\nBox 2: "name": "entities"',
  327: 'Box 1: name[language]\nBox 2: $when:$ stockLevel != \'OK\'\nBox 3: image.altText[language]',
  329: 'Box 1: name[language]\nBox 2: $when:$ stockLevel != \'OK\'\nBox 3: image.altText[language]',
};

function firstAnswerClause(value) {
  const normalized = value
    .replace(/\s+/g, ' ')
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s+\.\s+.*$/, '')
    .replace(/\s+(?:Example|Incorrect Answers|The correct value|The correct function|The correct answer|This is|Because|Reference:|https?:\/\/|A common task|The following|The definition|Scenario:).*$/i, '')
    .replace(/[.;:,]+$/, '')
    .trim();
  const sentenceEnd = normalized.search(/\.\s+(?=[A-Z])/);
  return (sentenceEnd >= 0 ? normalized.slice(0, sentenceEnd) : normalized).trim();
}

function summarizeAnswerAreaExplanation(explanation) {
  const text = explanation.replace(/\s+/g, ' ').split(/\s+Reference:/i)[0].trim();
  const boxMatches = [...text.matchAll(/Box\s*(\d+)\s*:\s*/gi)];
  if (boxMatches.length) {
    return boxMatches.map((match, index) => {
      const start = match.index + match[0].length;
      const end = boxMatches[index + 1]?.index ?? text.length;
      return `Box ${match[1]}: ${firstAnswerClause(text.slice(start, end))}`;
    }).join('\n');
  }

  const stepMatches = [...text.matchAll(/Step\s*(\d+)\s*:\s*/gi)];
  if (stepMatches.length) {
    return stepMatches.map((match, index) => {
      const start = match.index + match[0].length;
      const end = stepMatches[index + 1]?.index ?? text.length;
      return `Step ${match[1]}: ${firstAnswerClause(text.slice(start, end))}`;
    }).join('\n');
  }

  const numberedMatches = [...text.matchAll(/(?:^|\s)(\d+)\s*[.)]\s*/g)];
  if (numberedMatches.length > 1) {
    return numberedMatches.map((match, index) => {
      const start = match.index + match[0].length;
      const end = numberedMatches[index + 1]?.index ?? text.length;
      return `${match[1]}. ${firstAnswerClause(text.slice(start, end))}`;
    }).join('\n');
  }

  return firstAnswerClause(text);
}

function getSelectedOptionText(question, answer) {
  const selectedLetters = getAnswerLetters(answer);
  if (!selectedLetters.length) return '';

  const lines = String(question?.prompt || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const optionStart = lines.findIndex((line) => /^[A-Z]\.\s*\S/.test(line));
  if (optionStart === -1) return '';

  const options = lines.slice(optionStart).reduce((items, line) => {
    const match = line.match(/^([A-Z])\.\s*(.+)$/);
    if (match) items.push({ letter: match[1], text: match[2] });
    else if (items.length) items[items.length - 1].text += ` ${line}`;
    return items;
  }, []);

  return selectedLetters
    .map((letter) => options.find((option) => option.letter === letter))
    .filter(Boolean)
    .map((option) => `${option.letter}. ${option.text}`)
    .join('\n');
}

export function getAnswerText(question) {
  const answer = String(question?.answer || '').trim();
  if (answer) return getSelectedOptionText(question, answer) || answer;

  if ((question?.type === 'HOTSPOT' || question?.type === 'DRAG DROP') && answerAreaAnswers[question?.number]) {
    return answerAreaAnswers[question.number];
  }

  const explanation = String(question?.explanation || '').trim();
  if (explanation && (question?.type === 'HOTSPOT' || question?.type === 'DRAG DROP')) {
    return summarizeAnswerAreaExplanation(explanation);
  }
  if (explanation) return explanation;

  return answerAreaAnswers[question?.number] || 'No answer was extracted for this question.';
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
