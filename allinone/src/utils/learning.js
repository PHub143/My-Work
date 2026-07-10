export function getLearningStats(pages) {
  return pages.reduce(
    (stats, page) => {
      const text = page.text || '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;

      return {
        pageCount: stats.pageCount + 1,
        wordCount: stats.wordCount + words,
        blankPageCount: stats.blankPageCount + (text.trim() ? 0 : 1),
      };
    },
    { pageCount: 0, wordCount: 0, blankPageCount: 0 },
  );
}

export function filterLearningPages(pages, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return pages;
  }

  const pageNumberMatch = normalizedQuery.match(/^(?:page|question)\s+(\d+)$/);
  if (pageNumberMatch) {
    const pageNumber = Number(pageNumberMatch[1]);
    return pages.filter((page) => page.page === pageNumber);
  }

  return pages.filter((page) => {
    const text = page.text || '';
    return text.toLowerCase().includes(normalizedQuery);
  });
}

export function filterLearningQuestions(questions, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return questions;
  }

  const questionNumberMatch = normalizedQuery.match(/^(?:page|question)\s+(\d+)$/);
  if (questionNumberMatch) {
    const questionNumber = Number(questionNumberMatch[1]);
    return questions.filter((question) => question.number === questionNumber);
  }

  return questions.filter((question) => {
    const searchableText = [
      question.text,
      question.prompt,
      question.answer,
      question.explanation,
    ]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

export function getQuestionPagination(questions, selectedNumber) {
  const total = questions.length;
  const selectedIndex = questions.findIndex((question) => question.number === selectedNumber);
  const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const currentQuestion = questions[currentIndex] || null;

  return {
    currentQuestion,
    currentIndex,
    total,
    previousNumber: currentIndex > 0 ? questions[currentIndex - 1].number : null,
    nextNumber: currentIndex < total - 1 ? questions[currentIndex + 1].number : null,
  };
}

const QUESTION_ONE_SECTION_TITLES = new Set([
  'Overview',
  'Company Information',
  'Existing Environment',
  'Identity Environment',
  'Generative Environment',
  'Project1',
  'Project2',
  'Data Environment',
  'Problem Statements',
  'Requirements',
  'Planned Changes',
  'Technical Requirements',
  'Security and Compliance Requirements',
  'Business Requirements',
]);

function cleanQuestionHeading(line) {
  return line.trim().replace(/\s+-$/, '');
}

function isQuestionOneSectionHeading(line) {
  return QUESTION_ONE_SECTION_TITLES.has(cleanQuestionHeading(line));
}

function isQuestionTwoSectionHeading(line) {
  return QUESTION_ONE_SECTION_TITLES.has(cleanQuestionHeading(line));
}

function isSentenceEnd(line) {
  return /[.!?:)”]$/.test(line.trim()) || /\s-$/.test(line.trim());
}

function linesToParagraphs(lines) {
  const paragraphs = [];
  let currentParagraph = [];

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    currentParagraph.push(trimmedLine);

    if (isSentenceEnd(trimmedLine)) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [];
    }
  });

  if (currentParagraph.length) {
    paragraphs.push(currentParagraph.join(' '));
  }

  return paragraphs;
}

function splitNonEmptyLines(text) {
  return (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitExplanationParagraphs(text) {
  return splitNonEmptyLines(text);
}

const OPTION_LINE_PATTERN = /^[A-Z]\.\s+/;

function parseOptionLines(optionLines) {
  return optionLines.map((line) => {
    const [, key, text] = line.match(/^([A-Z])\.\s+(.+)$/) || [];
    return { key, text };
  });
}

function parseAnswerSelection(question, options) {
  const answerSelection = (question?.answer || '').trim();
  const answerSelections = Array.from(answerSelection.matchAll(/[A-Z]/g), (match) => match[0]);
  const selectedKeys = answerSelections.length > 0 ? answerSelections : answerSelection ? [answerSelection] : [];
  const answerOptions = options.filter((option) => selectedKeys.includes(option.key));
  const answerOption = answerOptions[0] || null;

  return {
    answerSelection,
    answerSelections: selectedKeys,
    answerOptions,
    answerOption,
  };
}

function hashSeed(seed) {
  const value = String(seed || '');
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashSeed(seed) || 1;

  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function shuffleQuestions(questions, random) {
  const shuffled = [...questions];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function normalizeSelection(selection) {
  const values = Array.isArray(selection) ? selection : [selection];
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .flatMap((value) => String(value).match(/[A-Z]/g) || [])
    )
  ).sort();
}

function arraysEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

const PRACTICE_CONTROL_CONFIGS = {
  1: {
    type: 'dropdowns',
    controls: [
      {
        id: 'deploymentType',
        label: 'Deployment type',
        options: [
          'Standard',
          'Global Standard',
          'Global Provisioned',
        ],
      },
      {
        id: 'versionUpdatePolicy',
        label: 'Version update policy',
        options: [
          'Once the current version expires',
          'Opt out of automatic model version upgrades',
          'Upgrade once a new default version becomes available',
        ],
      },
    ],
    correct: {
      deploymentType: 'Standard',
      versionUpdatePolicy: 'Opt out of automatic model version upgrades',
    },
  },
  4: {
    type: 'radioRows',
    controls: [
      {
        id: 'langchainAppearsWithoutTracer',
        label: 'The LangChain service will appear in Traces without configuring a tracer.',
        options: ['Yes', 'No'],
      },
      {
        id: 'serviceNamesSeparateTelemetry',
        label: 'Setting different OTEL_SERVICE_NAME values separates the services in Application Insights.',
        options: ['Yes', 'No'],
      },
      {
        id: 'contentRecordingCapturesPrompts',
        label: 'When using enable_content_recording=False, prompts and tool data will be captured in the telemetry.',
        options: ['Yes', 'No'],
      },
    ],
    correct: {
      langchainAppearsWithoutTracer: 'No',
      serviceNamesSeparateTelemetry: 'Yes',
      contentRecordingCapturesPrompts: 'No',
    },
  },
  5: {
    type: 'dropdowns',
    controls: [
      {
        id: 'pipeline1',
        label: 'Pipeline1',
        options: [
          'Multi-file task in pro mode',
          'Multi-file task in standard mode',
          'Single-file task in pro mode',
          'Single-file task in standard mode',
        ],
      },
      {
        id: 'pipeline2',
        label: 'Pipeline2',
        options: [
          'Multi-file task in pro mode',
          'Multi-file task in standard mode',
          'Single-file task in pro mode',
          'Single-file task in standard mode',
        ],
      },
    ],
    correct: {
      pipeline1: 'Multi-file task in pro mode',
      pipeline2: 'Single-file task in standard mode',
    },
  },
  6: {
    type: 'dropdowns',
    controls: [
      {
        id: 'credential',
        label: 'credential',
        options: [
          'AzureKeyCredential',
          'ClientSecretCredential',
          'DefaultAzureCredential',
        ],
      },
      {
        id: 'responsesMethod',
        label: 'openai_client.responses method',
        options: [
          'compact',
          'create',
          'retrieve',
        ],
      },
    ],
    correct: {
      credential: 'DefaultAzureCredential',
      responsesMethod: 'create',
    },
  },
  7: {
    type: 'dropdowns',
    controls: [
      {
        id: 'conditionExpression',
        label: 'If/else condition expression',
        options: [
          'IsBlank(Local.Var01)',
          'IsEmpty(Local.Var01)',
          'Not(IsBlank(Local.Var01))',
        ],
      },
      {
        id: 'sendMessageExpression',
        label: 'Send message expression',
        options: [
          '{Local.Var01}',
          '{Upper(Local.Var01)}',
          '{Upper(Var01)}',
        ],
      },
    ],
    correct: {
      conditionExpression: 'Not(IsBlank(Local.Var01))',
      sendMessageExpression: '{Upper(Local.Var01)}',
    },
  },
  8: {
    type: 'dropdowns',
    controls: [
      {
        id: 'guardrails',
        label: 'Guardrails',
        options: [
          'Select Tool call and set Action to Block.',
          'Select User input and Output and set Action to Annotate.',
          'Select User input and Tool response and set Action to Annotate.',
          'Select User input, Output, Tool response, and Tool call and set Action to Block.',
        ],
      },
      {
        id: 'storageAccess',
        label: 'Storage access',
        options: [
          'Storage account access keys',
          'A user-assigned identity that is assigned the Storage Queue Data Contributor role',
          'A system-assigned managed identity that is assigned the Storage Blob Data Reader role',
          'A system-assigned managed identity that is assigned the Storage Blob Data Contributor role',
        ],
      },
    ],
    correct: {
      guardrails: 'Select User input, Output, Tool response, and Tool call and set Action to Block.',
      storageAccess: 'A system-assigned managed identity that is assigned the Storage Blob Data Reader role',
    },
  },
  11: {
    type: 'dropdowns',
    controls: [
      {
        id: 'approvalType',
        label: 'approval type',
        options: [
          'ask_question',
          'basic_chat',
          'data_transformation',
        ],
      },
      {
        id: 'refundCondition',
        label: 'execute_refund condition',
        options: [
          'approval == "approved"',
          'propose_refund.output != null',
          'true',
        ],
      },
    ],
    correct: {
      approvalType: 'ask_question',
      refundCondition: 'approval == "approved"',
    },
  },
  15: {
    type: 'dropdowns',
    controls: [
      {
        id: 'unsupportedResponses',
        label: 'Unsupported responses',
        options: [
          'Groundedness evaluation metrics',
          'Latency breakdown traces',
          'Risk and safety metrics',
          'Token usage analytics',
        ],
      },
      {
        id: 'policyViolations',
        label: 'Policy violations',
        options: [
          'Groundedness evaluation metrics',
          'Latency breakdown traces',
          'Risk and safety metrics',
          'Token usage analytics',
        ],
      },
    ],
    correct: {
      unsupportedResponses: 'Groundedness evaluation metrics',
      policyViolations: 'Risk and safety metrics',
    },
  },
  18: {
    type: 'dropdowns',
    controls: [
      {
        id: 'metricsToEnable',
        label: 'Metrics to enable',
        options: [
          'Model Availability Rate and Provisioned Utilization',
          'Only Tokens Cache Match Rate',
          'Only Total Requests filtered to status code 200',
          'Time To Response and Total Tokens',
        ],
      },
      {
        id: 'diagnosticLog',
        label: 'Diagnostic log to collect',
        options: [
          'AllMetrics',
          'audit',
          'RequestResponse',
          'trace',
        ],
      },
    ],
    correct: {
      metricsToEnable: 'Time To Response and Total Tokens',
      diagnosticLog: 'RequestResponse',
    },
  },
  20: {
    type: 'dropdowns',
    controls: [
      {
        id: 'toolChoice',
        label: 'Set tool_choice to',
        options: [
          'auto',
          'none',
          'required',
        ],
      },
      {
        id: 'toolAuthentication',
        label: 'Configure the tool to authenticate by',
        options: [
          'Storing API keys in prompts',
          'Using the shared project agent identity',
          'Using a distinct agent identity bound to the client application',
        ],
      },
    ],
    correct: {
      toolChoice: 'required',
      toolAuthentication: 'Using a distinct agent identity bound to the client application',
    },
  },
  30: {
    type: 'dropdowns',
    controls: [
      {
        id: 'runPayloadKey',
        label: 'run_payload key',
        options: [
          '"auto"',
          '"required"',
          '"response_format"',
          '"tool_choice"',
          '"tools"',
          '"type"',
        ],
      },
      {
        id: 'runPayloadValue',
        label: 'run_payload value',
        options: [
          '"auto"',
          '"required"',
          '"response_format"',
          '"tool_choice"',
          '"tools"',
          '"type"',
        ],
      },
    ],
    correct: {
      runPayloadKey: '"tool_choice"',
      runPayloadValue: '"required"',
    },
  },
  32: {
    type: 'dropdowns',
    controls: [
      {
        id: 'publicWebsites',
        label: 'Access up-to-date information from public websites',
        options: [
          'Code interpreter',
          'Computer use',
          'File search',
          'Grounding with Bing Search',
          'Microsoft Fabric',
        ],
      },
      {
        id: 'calculations',
        label: 'Perform calculations during conversations',
        options: [
          'Code interpreter',
          'Computer use',
          'File search',
          'Grounding with Bing Search',
          'Microsoft Fabric',
        ],
      },
      {
        id: 'uploadedDocuments',
        label: 'Retrieve information from documents uploaded directly to the agent',
        options: [
          'Code interpreter',
          'Computer use',
          'File search',
          'Grounding with Bing Search',
          'Microsoft Fabric',
        ],
      },
    ],
    correct: {
      publicWebsites: 'Grounding with Bing Search',
      calculations: 'Code interpreter',
      uploadedDocuments: 'File search',
    },
  },
  35: {
    type: 'dropdowns',
    controls: [
      {
        id: 'temperature',
        label: 'temperature',
        options: [
          '0',
          '1',
          '2',
        ],
      },
      {
        id: 'effort',
        label: 'output_config effort',
        options: [
          '"high"',
          '"low"',
          '"medium"',
        ],
      },
    ],
    correct: {
      temperature: '0',
      effort: '"low"',
    },
  },
  37: {
    type: 'dropdowns',
    controls: [
      {
        id: 'retainPreferences',
        label: 'To retain user preferences across conversations, use',
        options: [
          'Agent memory that uses persistent storage',
          'Conversation history',
          'Orchestration-managed session context',
        ],
      },
      {
        id: 'contextualGrounding',
        label: 'To enable users to provide contextual grounding during chats, use the',
        options: [
          'Azure AI Search tool',
          'Code interpreter tool',
          'File search tool',
        ],
      },
    ],
    correct: {
      retainPreferences: 'Agent memory that uses persistent storage',
      contextualGrounding: 'File search tool',
    },
  },
  40: {
    type: 'dropdowns',
    controls: [
      {
        id: 'authenticationMethod',
        label: 'Authentication method',
        options: [
          'A personal access token (PAT)',
          'A user-assigned managed identity',
          'An Azure Login action that uses OpenID Connect (OIDC)',
        ],
      },
      {
        id: 'thresholdAction',
        label: 'If the evaluation results are NOT met, configure the workflow to',
        options: [
          'Lock the target branch',
          'Send an alert',
          'Fail',
        ],
      },
    ],
    correct: {
      authenticationMethod: 'An Azure Login action that uses OpenID Connect (OIDC)',
      thresholdAction: 'Fail',
    },
  },
  49: {
    type: 'dropdowns',
    controls: [
      {
        id: 'promptShieldsAction',
        label: 'Prompt shields action',
        options: [
          'Disable the shield.',
          'Set action to block.',
          'Set action to annotate.',
        ],
      },
      {
        id: 'additionalMitigation',
        label: 'Additional mitigation',
        options: [
          'Enable Spotlighting.',
          'Create a custom blocklist.',
          'Use optical character recognition (OCR) to extract the text from the images first.',
        ],
      },
    ],
    correct: {
      promptShieldsAction: 'Set action to block.',
      additionalMitigation: 'Use optical character recognition (OCR) to extract the text from the images first.',
    },
  },
};

function normalizeStructuredSelection(questionNumber, selection) {
  const config = PRACTICE_CONTROL_CONFIGS[questionNumber];
  if (!config) return null;

  return config.controls.map((control) => selection?.[control.id] || '');
}

function structuredCorrectSelection(questionNumber) {
  const config = PRACTICE_CONTROL_CONFIGS[questionNumber];
  if (!config) return null;

  return config.controls.map((control) => config.correct[control.id]);
}

function extractLeadingQuestionType(lines) {
  const firstLine = lines[0] || '';
  const inlineTypeMatch = firstLine.match(/^([A-Z][A-Z ]+)\s*-\s*(.*)$/);

  if (inlineTypeMatch) {
    const [, type, remainder] = inlineTypeMatch;
    const nextLines = remainder ? [remainder, ...lines.slice(1)] : lines.slice(1);
    return {
      type: cleanQuestionHeading(type),
      lines: nextLines,
    };
  }

  if (/^[A-Z ]+\s*-$/.test(firstLine)) {
    return {
      type: cleanQuestionHeading(firstLine),
      lines: lines.slice(1),
    };
  }

  return {
    type: '',
    lines,
  };
}

export function getQuestionOneDisplayParts(question) {
  const lines = splitNonEmptyLines(question?.prompt || '');
  const explanation = question?.explanation || '';
  const sections = [];
  const finalPromptLines = [];
  const caseStudyLines = [];
  let currentSection = null;
  let isFinalPrompt = false;
  let lineIndex = 0;

  const type = cleanQuestionHeading(lines[lineIndex] || '');
  if (type === 'HOTSPOT') {
    lineIndex += 1;
  }

  const caseStudyTitle = cleanQuestionHeading(lines[lineIndex] || '');
  if (caseStudyTitle === 'Case Study') {
    lineIndex += 1;
  }

  const flushSection = () => {
    if (!currentSection) return;

    sections.push({
      title: currentSection.title,
      paragraphs: linesToParagraphs(currentSection.lines),
    });
    currentSection = null;
  };

  for (; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];

    if (line.startsWith('You need to configure')) {
      flushSection();
      isFinalPrompt = true;
    }

    if (isFinalPrompt) {
      finalPromptLines.push(line);
      continue;
    }

    if (isQuestionOneSectionHeading(line)) {
      flushSection();
      currentSection = {
        title: cleanQuestionHeading(line),
        lines: [],
      };
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      caseStudyLines.push(line);
    }
  }

  flushSection();

  return {
    type,
    caseStudyTitle,
    caseStudyParagraphs: linesToParagraphs(caseStudyLines),
    sections,
    finalPrompt: linesToParagraphs(finalPromptLines),
    answerSelections: [
      'Standard',
      'Opt out of automatic model version upgrades',
    ].filter((selection) => explanation.includes(selection)),
  };
}

export function getQuestionTwoDisplayParts(question) {
  const lines = splitNonEmptyLines(question?.prompt || '');
  const explanationParagraphs = splitExplanationParagraphs(question?.explanation || '');
  const sections = [];
  const finalPromptLines = [];
  const optionLines = [];
  const caseStudyLines = [];
  let currentSection = null;
  let isFinalPrompt = false;
  let lineIndex = 0;

  const caseStudyTitle = cleanQuestionHeading(lines[lineIndex] || '');
  if (caseStudyTitle === 'Case Study') {
    lineIndex += 1;
  }

  const flushSection = () => {
    if (!currentSection) return;

    sections.push({
      title: currentSection.title,
      paragraphs: linesToParagraphs(currentSection.lines),
    });
    currentSection = null;
  };

  for (; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];

    if (/^[A-D]\.\s+/.test(line)) {
      isFinalPrompt = true;
      optionLines.push(line);
      continue;
    }

    if (line.startsWith('You need to configure') || line.startsWith('What should you use?')) {
      flushSection();
      isFinalPrompt = true;
    }

    if (isFinalPrompt) {
      finalPromptLines.push(line);
      continue;
    }

    if (isQuestionTwoSectionHeading(line)) {
      flushSection();
      currentSection = {
        title: cleanQuestionHeading(line),
        lines: [],
      };
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      caseStudyLines.push(line);
    }
  }

  flushSection();

  const options = parseOptionLines(optionLines);
  const { answerSelection, answerSelections, answerOptions, answerOption } = parseAnswerSelection(question, options);

  return {
    caseStudyTitle,
    caseStudyParagraphs: linesToParagraphs(caseStudyLines),
    sections,
    finalPrompt: finalPromptLines.filter((line) => !/^[A-D]\.\s+/.test(line)),
    options,
    answerSelection,
    answerSelections,
    answerOptions,
    answerOption,
    explanationParagraphs,
  };
}

export function getCaseStudyChoiceQuestionDisplayParts(question) {
  const lines = splitNonEmptyLines(question?.prompt || '');
  const explanationParagraphs = splitExplanationParagraphs(question?.explanation || '');
  const sections = [];
  const finalPromptLines = [];
  const optionLines = [];
  const caseStudyLines = [];
  let currentSection = null;
  let isFinalPrompt = false;
  let lineIndex = 0;

  const caseStudyTitle = cleanQuestionHeading(lines[lineIndex] || '');
  if (caseStudyTitle === 'Case Study') {
    lineIndex += 1;
  }

  const flushSection = () => {
    if (!currentSection) return;

    sections.push({
      title: currentSection.title,
      paragraphs: linesToParagraphs(currentSection.lines),
    });
    currentSection = null;
  };

  for (; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];

    if (OPTION_LINE_PATTERN.test(line)) {
      flushSection();
      isFinalPrompt = true;
      optionLines.push(line);
      continue;
    }

    if (line.startsWith('You need to') || line.startsWith('What should') || line.startsWith('Which ')) {
      flushSection();
      isFinalPrompt = true;
    }

    if (isFinalPrompt) {
      finalPromptLines.push(line);
      continue;
    }

    if (isQuestionTwoSectionHeading(line)) {
      flushSection();
      currentSection = {
        title: cleanQuestionHeading(line),
        lines: [],
      };
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      caseStudyLines.push(line);
    }
  }

  flushSection();

  const options = parseOptionLines(optionLines);
  const { answerSelection, answerSelections, answerOptions, answerOption } = parseAnswerSelection(question, options);

  return {
    caseStudyTitle,
    caseStudyParagraphs: linesToParagraphs(caseStudyLines),
    sections,
    finalPrompt: finalPromptLines.filter((line) => !OPTION_LINE_PATTERN.test(line)),
    options,
    answerSelection,
    answerSelections,
    answerOptions,
    answerOption,
    explanationParagraphs,
  };
}

export function getChoiceQuestionDisplayParts(question) {
  const extracted = extractLeadingQuestionType(splitNonEmptyLines(question?.prompt || ''));
  const lines = extracted.lines;
  const promptLines = [];
  const optionLines = [];
  let lineIndex = 0;

  for (; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (OPTION_LINE_PATTERN.test(line)) {
      optionLines.push(line);
      continue;
    }
    if (optionLines.length === 0) {
      promptLines.push(line);
    }
  }

  const options = parseOptionLines(optionLines);
  const { answerSelection, answerSelections, answerOptions, answerOption } = parseAnswerSelection(question, options);

  return {
    type: extracted.type,
    promptParagraphs: linesToParagraphs(promptLines),
    options,
    answerSelection,
    answerSelections,
    answerOptions,
    answerOption,
    explanationParagraphs: splitExplanationParagraphs(question?.explanation || ''),
  };
}

export function getQuestionTwentyOneDisplayParts(question) {
  const extracted = extractLeadingQuestionType(splitNonEmptyLines(question?.prompt || ''));
  const lines = extracted.lines;
  const introLines = [];
  const projectItems = [];
  const scenarioLines = [];
  const finalPromptLines = [];
  const optionLines = [];
  let section = 'intro';

  lines.forEach((line) => {
    if (OPTION_LINE_PATTERN.test(line)) {
      optionLines.push(line);
      section = 'options';
      return;
    }

    if (line.startsWith('When an agent calls')) {
      section = 'scenario';
    } else if (line.startsWith('You need to ensure')) {
      section = 'prompt';
    } else if (line.startsWith('An OpenAPI tool') || line.startsWith('A project connection')) {
      section = 'items';
    }

    if (section === 'intro') {
      introLines.push(line);
      return;
    }

    if (section === 'items') {
      projectItems.push(line);
      return;
    }

    if (section === 'scenario') {
      scenarioLines.push(line);
      return;
    }

    if (section === 'prompt') {
      finalPromptLines.push(line);
    }
  });

  const options = parseOptionLines(optionLines);
  const { answerSelection, answerSelections, answerOptions, answerOption } = parseAnswerSelection(question, options);

  return {
    type: extracted.type,
    introParagraphs: linesToParagraphs(introLines),
    projectItems,
    scenarioParagraphs: linesToParagraphs(scenarioLines),
    finalPrompt: linesToParagraphs(finalPromptLines),
    options,
    answerSelection,
    answerSelections,
    answerOptions,
    answerOption,
    explanationParagraphs: splitExplanationParagraphs(question?.explanation || ''),
  };
}

export function getVisualQuestionDisplayParts(question) {
  const extracted = extractLeadingQuestionType(splitNonEmptyLines(question?.prompt || ''));
  const explanationParagraphs = splitExplanationParagraphs(question?.explanation || '');
  const answerRows = [];
  let pendingKey = null;

  explanationParagraphs.forEach((line) => {
    const keyMatch = line.match(/^Left Box \(Key\):\s*"([^"]+)"$/);
    if (keyMatch) {
      pendingKey = keyMatch[1];
      return;
    }

    const valueMatch = line.match(/^Right Box \(Value\):\s*"([^"]+)"$/);
    if (valueMatch && pendingKey) {
      answerRows.push({
        key: pendingKey,
        value: valueMatch[1],
      });
      pendingKey = null;
    }
  });

  return {
    type: extracted.type,
    promptParagraphs: linesToParagraphs(extracted.lines),
    explanationParagraphs,
    answerRows,
  };
}

export function getPracticeQuestionDisplayParts(question) {
  const extracted = extractLeadingQuestionType(splitNonEmptyLines(question?.prompt || ''));
  const promptLines = [];
  const optionLines = [];

  extracted.lines.forEach((line) => {
    if (OPTION_LINE_PATTERN.test(line)) {
      optionLines.push(line);
      return;
    }

    promptLines.push(line);
  });

  const options = parseOptionLines(optionLines);
  const answerSelections = normalizeSelection(question?.answer || '');

  return {
    type: extracted.type,
    promptParagraphs: linesToParagraphs(promptLines),
    options,
    answerSelection: (question?.answer || '').trim(),
    answerSelections,
    answerOptions: options.filter((option) => answerSelections.includes(option.key)),
    allowsMultipleSelections: answerSelections.length > 1,
    explanationParagraphs: splitExplanationParagraphs(question?.explanation || ''),
  };
}

export function getPracticeControlConfig(questionNumber) {
  return PRACTICE_CONTROL_CONFIGS[questionNumber] || null;
}

export function parsePracticeQuestionNumbers(search) {
  const params = new URLSearchParams(search || '');
  const seen = new Set();

  return (params.get('questions') || '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((number) => Number.isInteger(number) && number >= 1 && number <= 65)
    .filter((number) => {
      if (seen.has(number)) return false;
      seen.add(number);
      return true;
    });
}

export function createPracticeSession(questions, options = {}) {
  const difficulty = options.difficulty || 'easy';
  const fullQuestionMode = ['normal', 'hard', 'extra-hard'].includes(difficulty);
  const timeLimitMinutesByDifficulty = {
    normal: 60,
    hard: 30,
    'extra-hard': 20,
  };
  const defaultQuestionCount = fullQuestionMode ? 65 : 20;
  const questionCount = options.questionCount || defaultQuestionCount;
  const timeLimitMinutes = options.timeLimitMinutes !== undefined
    ? options.timeLimitMinutes
    : timeLimitMinutesByDifficulty[difficulty] || null;
  const random = typeof options.random === 'function'
    ? options.random
    : options.seed
      ? seededRandom(options.seed)
      : Math.random;
  const pinnedQuestionNumbers = Array.isArray(options.questionNumbers) ? options.questionNumbers : [];
  const pinnedQuestions = pinnedQuestionNumbers
    .map((number) => (questions || []).find((question) => question.number === number))
    .filter(Boolean);
  const pinnedSet = new Set(pinnedQuestions.map((question) => question.number));
  const remainingQuestions = (questions || []).filter((question) => !pinnedSet.has(question.number));
  const shuffledQuestions = [
    ...pinnedQuestions,
    ...shuffleQuestions(remainingQuestions, random),
  ];
  const selectedQuestions = shuffledQuestions.slice(0, questionCount).map((question) => ({
    ...question,
    sourceIndex: questions.findIndex((sourceQuestion) => sourceQuestion.number === question.number),
  }));

  return {
    difficulty,
    timeLimitMinutes,
    answerAreaHintsEnabled: difficulty !== 'extra-hard',
    questions: selectedQuestions,
  };
}

export function getPracticeSessionResults(questions, selectionsByQuestionNumber, options = {}) {
  const useStructuredControls = options.structuredControls !== false;
  const items = (questions || []).map((question) => {
    const parts = getPracticeQuestionDisplayParts(question);
    const structuredSelected = useStructuredControls
      ? normalizeStructuredSelection(question.number, selectionsByQuestionNumber?.[question.number])
      : null;
    const structuredCorrect = useStructuredControls ? structuredCorrectSelection(question.number) : null;
    const selected = structuredSelected || normalizeSelection(selectionsByQuestionNumber?.[question.number] || []);
    const correct = structuredCorrect || normalizeSelection(parts.answerSelections);
    const isCorrect = correct.length > 0 && arraysEqual(selected, correct);

    return {
      questionNumber: question.number,
      selected,
      correct,
      isCorrect,
      answerOptions: parts.answerOptions,
    };
  });
  const correctCount = items.filter((item) => item.isCorrect).length;
  const totalQuestions = items.length;

  return {
    correctCount,
    totalQuestions,
    scorePercent: totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0,
    items,
  };
}

export function getPracticeResultSummary(results) {
  const items = results?.items || [];
  const autoScoredTotal = items.filter((item) => item.correct.length > 0).length;
  const manualReviewTotal = Math.max(0, (results?.totalQuestions || 0) - autoScoredTotal);
  const visualQuestionLabel = manualReviewTotal === 1 ? 'visual question needs' : 'visual questions need';

  return {
    scorePercent: results?.scorePercent || 0,
    correctCount: results?.correctCount || 0,
    totalQuestions: results?.totalQuestions || 0,
    autoScoredTotal,
    manualReviewTotal,
    title: `Score: ${results?.scorePercent || 0}%`,
    detail: `${results?.correctCount || 0} of ${autoScoredTotal} auto-scored answers correct. ${manualReviewTotal} ${visualQuestionLabel} manual review.`,
  };
}

// --- TOEIC Reading (Parts 5-7) — English learning section ---

const READING_PART_QUOTAS = { part5: 30, part6Sets: 4, part7: 54 };
const READING_TEST_TIME_LIMIT_MINUTES = 75;
const READING_FIRST_QUESTION_NUMBER = 101;

// Approximate raw-to-scaled conversion anchors (real conversions vary by form).
const SCALED_READING_SCORE_ANCHORS = [
  [0, 5],
  [10, 30],
  [20, 70],
  [30, 115],
  [40, 160],
  [50, 210],
  [60, 260],
  [70, 310],
  [80, 365],
  [90, 425],
  [96, 465],
  [100, 495],
];

function normalizeReadingOptions(options) {
  return Object.entries(options || {}).map(([key, text]) => ({ key, text }));
}

function normalizeReadingQuestion(question, { part, set = null } = {}) {
  const passages = set?.passages
    || (set?.passage ? [{ type: set.passageType, text: set.passage }] : null);

  return {
    id: question.id,
    part,
    setId: set?.id || null,
    passages,
    blank: question.blank || null,
    prompt: question.prompt,
    options: normalizeReadingOptions(question.options),
    answer: question.answer,
    explanation: question.explanation || '',
    tags: question.tags || [],
  };
}

function getReadingBanks(content) {
  const part5 = (content?.parts?.part5?.questions || [])
    .map((question) => normalizeReadingQuestion(question, { part: 5 }));
  const part6Sets = (content?.parts?.part6?.sets || []).map((set) => ({
    id: set.id,
    questions: (set.questions || []).map((question) => normalizeReadingQuestion(question, { part: 6, set })),
  }));
  const normalizePart7Set = (set, passageKind) => ({
    id: set.id,
    passageKind,
    questions: (set.questions || []).map((question) => normalizeReadingQuestion(question, { part: 7, set })),
  });
  const part7SingleSets = (content?.parts?.part7?.singleSets || [])
    .map((set) => normalizePart7Set(set, 'single'));
  const part7MultiSets = (content?.parts?.part7?.multiSets || [])
    .map((set) => normalizePart7Set(set, 'multi'));
  const part7Sets = [...part7SingleSets, ...part7MultiSets];

  return { part5, part6Sets, part7Sets, part7SingleSets, part7MultiSets };
}

export function flattenReadingBank(content) {
  const banks = getReadingBanks(content);
  const ordered = [
    ...banks.part5,
    ...banks.part6Sets.flatMap((set) => set.questions),
    ...banks.part7Sets.flatMap((set) => set.questions),
  ];

  return ordered.map((question, index) => ({
    ...question,
    number: index + 1,
    text: [
      ...(question.passages || []).map((passage) => passage.text),
      ...question.options.map((option) => option.text),
    ].join('\n'),
  }));
}

export function getReadingBankSummary(content) {
  const banks = getReadingBanks(content);
  const part6 = banks.part6Sets.reduce((count, set) => count + set.questions.length, 0);
  const part7 = banks.part7Sets.reduce((count, set) => count + set.questions.length, 0);

  return {
    part5: banks.part5.length,
    part6,
    part6Sets: banks.part6Sets.length,
    part7,
    total: banks.part5.length + part6 + part7,
    quotas: {
      part5: READING_PART_QUOTAS.part5,
      part6: READING_PART_QUOTAS.part6Sets * 4,
      part7: READING_PART_QUOTAS.part7,
      total: 100,
    },
  };
}

export function getMaxReadingFormScale(content) {
  const banks = getReadingBanks(content);
  const part7 = banks.part7Sets.reduce((count, set) => count + set.questions.length, 0);

  return Math.min(
    1,
    banks.part5.length / READING_PART_QUOTAS.part5,
    banks.part6Sets.length / READING_PART_QUOTAS.part6Sets,
    part7 / READING_PART_QUOTAS.part7,
  );
}

export function assembleReadingTest(content, options = {}) {
  const banks = getReadingBanks(content);
  const random = typeof options.random === 'function'
    ? options.random
    : options.seed
      ? seededRandom(options.seed)
      : Math.random;
  let selected;
  let timeLimitMinutes;

  if (options.formNumber) {
    const formIndex = Math.max(0, options.formNumber - 1);
    const slice = (entries, count) => entries.slice(formIndex * count, (formIndex + 1) * count);
    const singleSets = formIndex === 0
      ? banks.part7SingleSets.slice(0, 11)
      : banks.part7SingleSets.slice(11);
    selected = [
      ...slice(banks.part5, 30),
      ...slice(banks.part6Sets, 4).flatMap((set) => set.questions),
      ...singleSets.flatMap((set) => set.questions),
      ...slice(banks.part7MultiSets, 5).flatMap((set) => set.questions),
    ];
    timeLimitMinutes = 75;
  } else if (options.part) {
    if (options.part === 5) {
      selected = shuffleQuestions(banks.part5, random);
    } else if (options.part === 6) {
      selected = shuffleQuestions(banks.part6Sets, random).flatMap((set) => set.questions);
    } else {
      selected = shuffleQuestions(banks.part7Sets, random).flatMap((set) => set.questions);
    }
    timeLimitMinutes = null;
  } else {
    const scale = Math.min(options.scale || 1, getMaxReadingFormScale(content));
    const part5Count = Math.min(banks.part5.length, Math.round(READING_PART_QUOTAS.part5 * scale));
    const part6SetCount = Math.min(banks.part6Sets.length, Math.round(READING_PART_QUOTAS.part6Sets * scale));
    const part7Target = Math.round(READING_PART_QUOTAS.part7 * scale);

    const part5Questions = shuffleQuestions(banks.part5, random).slice(0, part5Count);
    const part6Questions = shuffleQuestions(banks.part6Sets, random)
      .slice(0, part6SetCount)
      .flatMap((set) => set.questions);
    const part7Questions = [];
    shuffleQuestions(banks.part7Sets, random).forEach((set) => {
      if (part7Questions.length >= part7Target) return;
      part7Questions.push(...set.questions);
    });

    selected = [...part5Questions, ...part6Questions, ...part7Questions];
    timeLimitMinutes = Math.max(
      5,
      Math.round((READING_TEST_TIME_LIMIT_MINUTES * selected.length) / 100),
    );
  }

  const questions = selected.map((question, index) => ({
    ...question,
    number: READING_FIRST_QUESTION_NUMBER + index,
  }));

  return {
    questions,
    totalQuestions: questions.length,
    timeLimitMinutes,
    isFullForm: questions.length === 100,
    formNumber: options.formNumber || null,
    counts: {
      5: questions.filter((question) => question.part === 5).length,
      6: questions.filter((question) => question.part === 6).length,
      7: questions.filter((question) => question.part === 7).length,
    },
  };
}

export function getScaledReadingScore(correctCount, totalQuestions = 100) {
  if (!totalQuestions) return 5;

  const rawEquivalent = Math.max(0, Math.min(100, (correctCount / totalQuestions) * 100));
  let scaled = SCALED_READING_SCORE_ANCHORS[SCALED_READING_SCORE_ANCHORS.length - 1][1];

  for (let index = 1; index < SCALED_READING_SCORE_ANCHORS.length; index += 1) {
    const [x0, y0] = SCALED_READING_SCORE_ANCHORS[index - 1];
    const [x1, y1] = SCALED_READING_SCORE_ANCHORS[index];

    if (rawEquivalent <= x1) {
      scaled = y0 + ((rawEquivalent - x0) / (x1 - x0)) * (y1 - y0);
      break;
    }
  }

  return Math.max(5, Math.min(495, Math.round(scaled / 5) * 5));
}

export function getReadingTestResults(questions, selectionsByNumber) {
  const items = (questions || []).map((question) => {
    const selected = selectionsByNumber?.[question.number] || null;
    const isCorrect = Boolean(selected) && selected === question.answer;

    return {
      number: question.number,
      part: question.part,
      selected,
      correct: question.answer,
      isCorrect,
      tags: question.tags || [],
    };
  });
  const perPart = {};
  const perTag = {};

  items.forEach((item) => {
    perPart[item.part] = perPart[item.part] || { correct: 0, total: 0 };
    perPart[item.part].total += 1;
    if (item.isCorrect) perPart[item.part].correct += 1;

    item.tags.forEach((tag) => {
      perTag[tag] = perTag[tag] || { correct: 0, total: 0 };
      perTag[tag].total += 1;
      if (item.isCorrect) perTag[tag].correct += 1;
    });
  });

  const correctCount = items.filter((item) => item.isCorrect).length;
  const totalQuestions = items.length;

  return {
    correctCount,
    totalQuestions,
    scorePercent: totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0,
    scaledScore: getScaledReadingScore(correctCount, totalQuestions),
    perPart,
    perTag,
    items,
  };
}

export function getWeakestReadingTags(results, { minTotal = 2, limit = 5 } = {}) {
  return Object.entries(results?.perTag || {})
    .filter(([, stats]) => stats.total >= minTotal)
    .map(([tag, stats]) => ({
      tag,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total ? stats.correct / stats.total : 0,
    }))
    .sort((left, right) => left.accuracy - right.accuracy || right.total - left.total)
    .slice(0, limit);
}

// --- Grammar drills — untimed Part 5 practice by topic (tag) ---

export function getDrillTopics(content) {
  const banks = getReadingBanks(content);
  const counts = {};

  banks.part5.forEach((question) => {
    (question.tags || []).forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
}

export function assembleDrill(content, options = {}) {
  const banks = getReadingBanks(content);
  const random = typeof options.random === 'function'
    ? options.random
    : options.seed
      ? seededRandom(options.seed)
      : Math.random;
  const tags = (options.tags || []).filter(Boolean);
  const pool = tags.length
    ? banks.part5.filter((question) => question.tags.some((tag) => tags.includes(tag)))
    : banks.part5;
  const questionCount = options.questionCount || 10;
  const questions = shuffleQuestions(pool, random)
    .slice(0, questionCount)
    .map((question, index) => ({ ...question, number: index + 1 }));

  return {
    questions,
    totalQuestions: questions.length,
    poolSize: pool.length,
    tags,
  };
}

// --- TOEIC Listening (Parts 1-4) — English learning section ---

const LISTENING_QUESTION_QUOTAS = { 1: 6, 2: 25, 3: 39, 4: 30 };
// Approximate response window per question, mirroring the real exam's pauses.
const LISTENING_RESPONSE_SECONDS = { 1: 5, 2: 5, 3: 8, 4: 8 };

function listeningLetterOptions(count) {
  return ['A', 'B', 'C', 'D'].slice(0, count).map((key) => ({ key, text: '' }));
}

function normalizeListeningGroup(entry, part) {
  const questions = part === 1 || part === 2
    ? [{
      id: entry.id,
      part,
      groupId: entry.id,
      prompt: part === 1
        ? 'Select the statement that best describes the picture.'
        : 'Listen and select the best response.',
      options: listeningLetterOptions(part === 1 ? 4 : 3),
      answer: entry.answer,
      explanation: entry.explanation || '',
      tags: entry.tags || [],
    }]
    : (entry.questions || []).map((question) => ({
      id: question.id,
      part,
      groupId: entry.id,
      prompt: question.prompt,
      options: normalizeReadingOptions(question.options),
      answer: question.answer,
      explanation: question.explanation || '',
      tags: question.tags || [],
    }));

  return {
    id: entry.id,
    part,
    image: entry.image || null,
    segments: entry.segments || [],
    responseSeconds: LISTENING_RESPONSE_SECONDS[part] * questions.length,
    questions,
  };
}

function getListeningBanks(content) {
  return {
    1: (content?.parts?.part1?.items || []).map((entry) => normalizeListeningGroup(entry, 1)),
    2: (content?.parts?.part2?.items || []).map((entry) => normalizeListeningGroup(entry, 2)),
    3: (content?.parts?.part3?.sets || []).map((entry) => normalizeListeningGroup(entry, 3)),
    4: (content?.parts?.part4?.sets || []).map((entry) => normalizeListeningGroup(entry, 4)),
  };
}

function countGroupQuestions(groups) {
  return groups.reduce((count, group) => count + group.questions.length, 0);
}

export function getListeningBankSummary(content) {
  const banks = getListeningBanks(content);
  const counts = {
    part1: countGroupQuestions(banks[1]),
    part2: countGroupQuestions(banks[2]),
    part3: countGroupQuestions(banks[3]),
    part4: countGroupQuestions(banks[4]),
  };

  return {
    ...counts,
    total: counts.part1 + counts.part2 + counts.part3 + counts.part4,
    quotas: {
      part1: LISTENING_QUESTION_QUOTAS[1],
      part2: LISTENING_QUESTION_QUOTAS[2],
      part3: LISTENING_QUESTION_QUOTAS[3],
      part4: LISTENING_QUESTION_QUOTAS[4],
      total: 100,
    },
  };
}

export function getMaxListeningFormScale(content) {
  const banks = getListeningBanks(content);

  return Math.min(
    1,
    countGroupQuestions(banks[1]) / LISTENING_QUESTION_QUOTAS[1],
    countGroupQuestions(banks[2]) / LISTENING_QUESTION_QUOTAS[2],
    countGroupQuestions(banks[3]) / LISTENING_QUESTION_QUOTAS[3],
    countGroupQuestions(banks[4]) / LISTENING_QUESTION_QUOTAS[4],
  );
}

export function assembleListeningTest(content, options = {}) {
  const banks = getListeningBanks(content);
  const random = typeof options.random === 'function'
    ? options.random
    : options.seed
      ? seededRandom(options.seed)
      : Math.random;
  let selectedGroups;

  if (options.formNumber) {
    const formIndex = Math.max(0, options.formNumber - 1);
    const groupQuotas = { 1: 6, 2: 25, 3: 13, 4: 10 };
    selectedGroups = [1, 2, 3, 4].flatMap((part) => {
      const start = formIndex * groupQuotas[part];
      return banks[part].slice(start, start + groupQuotas[part]);
    });
  } else if (options.part) {
    selectedGroups = shuffleQuestions(banks[options.part] || [], random);
  } else {
    const scale = Math.min(options.scale || 1, getMaxListeningFormScale(content));
    const pickGroups = (part) => {
      if (!banks[part].length) return [];
      // Every part with content appears at least once, as on the real exam.
      const target = Math.max(1, Math.round(LISTENING_QUESTION_QUOTAS[part] * scale));
      const picked = [];
      let total = 0;

      shuffleQuestions(banks[part], random).forEach((group) => {
        if (total >= target) return;
        picked.push(group);
        total += group.questions.length;
      });

      return picked;
    };

    selectedGroups = [...pickGroups(1), ...pickGroups(2), ...pickGroups(3), ...pickGroups(4)];
  }

  let nextNumber = 1; // real listening answer sheet numbering starts at 1
  const groups = selectedGroups.map((group) => {
    const questions = group.questions.map((question) => ({
      ...question,
      number: nextNumber++,
    }));

    return { ...group, questions, questionNumbers: questions.map((question) => question.number) };
  });
  const questions = groups.flatMap((group) => group.questions);

  return {
    groups,
    questions,
    totalQuestions: questions.length,
    isFullForm: questions.length === 100,
    formNumber: options.formNumber || null,
    counts: {
      1: questions.filter((question) => question.part === 1).length,
      2: questions.filter((question) => question.part === 2).length,
      3: questions.filter((question) => question.part === 3).length,
      4: questions.filter((question) => question.part === 4).length,
    },
  };
}

export function getScaledListeningScore(correctCount, totalQuestions = 100) {
  // Uses the same approximate anchor table as reading; tune separately later.
  return getScaledReadingScore(correctCount, totalQuestions);
}

export function getListeningTestResults(questions, selectionsByNumber) {
  const results = getReadingTestResults(questions, selectionsByNumber);

  return {
    ...results,
    scaledScore: getScaledListeningScore(results.correctCount, results.totalQuestions),
  };
}

export function getFullTestScore(listeningResults, readingResults) {
  const listening = listeningResults?.scaledScore ?? null;
  const reading = readingResults?.scaledScore ?? null;

  return {
    listening,
    reading,
    total: (listening || 0) + (reading || 0),
  };
}

export function getStudyMaterialPages(pages) {
  return pages.filter((page) => {
    const text = (page.text || '').trim();
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');

    if (!text) return false;
    if (normalizedText.includes('get certification quickly')) return false;
    if (normalizedText.includes('about certyiq')) return false;
    if (normalizedText.startsWith('thank you')) return false;

    const isTitleOnlyPage =
      normalizedText.includes('(ai-103)') &&
      normalizedText.includes('65') &&
      normalizedText.includes('questions') &&
      !normalizedText.includes('answer');

    return !isTitleOnlyPage;
  });
}
