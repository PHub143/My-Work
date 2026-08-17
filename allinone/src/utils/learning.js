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
      versionUpdatePolicy: 'Once the current version expires',
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
      pipeline1: 'Single-file task in standard mode',
      pipeline2: 'Multi-file task in pro mode',
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
      metricsToEnable: 'Model Availability Rate and Provisioned Utilization',
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
      temperature: '1',
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
      additionalMitigation: 'Enable Spotlighting.',
    },
  },
  66: {
    type: 'dropdowns',
    controls: [
      {
        id: 'initialCall',
        label: 'video = client.videos.',
        options: ['create', 'download_content', 'list', 'retrieve'],
      },
      {
        id: 'pollCall',
        label: 'video = client.videos. (video.id)',
        options: ['create', 'download_content', 'list', 'retrieve'],
      },
    ],
    correct: {
      initialCall: 'create',
      pollCall: 'retrieve',
    },
  },
  68: {
    type: 'dropdowns',
    controls: [
      {
        id: 'credential',
        label: 'credential',
        options: ['AzureKeyCredential()', 'DefaultAzureCredential()', 'None'],
      },
      {
        id: 'agentMethod',
        label: 'agent = project_client.agents.',
        options: ['create_version', 'get', 'get_version'],
      },
    ],
    correct: {
      credential: 'DefaultAzureCredential()',
      agentMethod: 'get',
    },
  },
  71: {
    type: 'dropdowns',
    controls: [
      {
        id: 'groundednessMetric',
        label: 'To measure whether the responses are supported by the provided context and address the user query',
        options: [
          'Coherence and Fluency',
          'GPT similarity and F1 score',
          'Groundedness and Relevance',
          'Groundedness and ROUGE score',
        ],
      },
      {
        id: 'sensitiveInfoMetric',
        label: 'To measure whether responses contain sensitive or proprietary information',
        options: [
          'Hateful and unfair content',
          'Indirect attack',
          'Protected material',
          'Violent content',
        ],
      },
    ],
    correct: {
      groundednessMetric: 'Groundedness and Relevance',
      sensitiveInfoMetric: 'Protected material',
    },
  },
  79: {
    type: 'dropdowns',
    controls: [
      {
        id: 'orchestrationPattern',
        label: 'Orchestration pattern',
        options: [
          'The sequential template that passes outputs node by-node',
          'The group chat template to dynamically route control between the agents',
          'The human-in-the-loop template that pauses execution of the workflow for input',
        ],
      },
      {
        id: 'approvalCheckpoint',
        label: 'Approval checkpoints',
        options: [
          'Add a Basic chat node.',
          'Add a Condition statement.',
          'Add an Ask a question node.',
        ],
      },
    ],
    correct: {
      orchestrationPattern: 'The sequential template that passes outputs node by-node',
      approvalCheckpoint: 'Add an Ask a question node.',
    },
  },
  86: {
    type: 'dropdowns',
    controls: [
      {
        id: 'fieldValueType',
        label: 'Field value type',
        options: ['classify', 'generate', 'group', 'string', 'table'],
      },
      {
        id: 'fieldMethod',
        label: 'Field method',
        options: ['classify', 'generate', 'group', 'string', 'table'],
      },
    ],
    correct: {
      fieldValueType: 'string',
      fieldMethod: 'generate',
    },
  },
  92: {
    type: 'dropdowns',
    controls: [
      {
        id: 'managedIdentityScope',
        label: 'Managed identity scope',
        options: [
          'Enable a system-assigned managed identity at the Foundry level.',
          'Enable a system-assigned managed identity at the project level.',
          "Create a service principal and store the principal's client secret.",
        ],
      },
      {
        id: 'keyVaultAuth',
        label: 'Key Vault authorization method',
        options: [
          'Add an API key to application settings.',
          'Add a Key Vault access policy for the secrets.',
          'Assign the Key Vault Secrets User role to the managed identity.',
        ],
      },
    ],
    correct: {
      managedIdentityScope: 'Enable a system-assigned managed identity at the Foundry level.',
      keyVaultAuth: 'Assign the Key Vault Secrets User role to the managed identity.',
    },
  },
  93: {
    type: 'radioRows',
    controls: [
      {
        id: 'lowSeverityResolves',
        label: 'Changing the content filtering configuration to low severity will resolve the fine-tuning job issues.',
        options: ['Yes', 'No'],
      },
      {
        id: 'defectRateConsistent',
        label:
          'The difference between the 12% and 4% content harm defect rate is consistent with the different severity thresholds used in Run1 and Run2.',
        options: ['Yes', 'No'],
      },
      {
        id: 'protectedMaterialUnaffected',
        label:
          'The identical 6% protected material evaluation values across Run1 and Run2 indicate that this metric is unaffected by the change in the severity threshold.',
        options: ['Yes', 'No'],
      },
    ],
    correct: {
      lowSeverityResolves: 'No',
      defectRateConsistent: 'Yes',
      protectedMaterialUnaffected: 'Yes',
    },
  },
  94: {
    type: 'dropdowns',
    controls: [
      {
        id: 'nestedOperations',
        label: 'Capture all the nested operations across the entire agent run',
        options: ['Hierarchical spans', 'A KQL query filter', 'Sampling', 'Tool call attributes', 'Trace sampling policy'],
      },
      {
        id: 'toolInvocationRecord',
        label: 'Record tool invocation arguments and results',
        options: ['Hierarchical spans', 'A KQL query filter', 'Sampling', 'Tool call attributes', 'Trace sampling policy'],
      },
    ],
    correct: {
      nestedOperations: 'Hierarchical spans',
      toolInvocationRecord: 'Tool call attributes',
    },
  },
  95: {
    type: 'dropdowns',
    controls: [
      {
        id: 'http429',
        label: 'HTTP 429',
        options: [
          'Increase tenant-wide quotas.',
          'Move large content to files and use file search.',
          'Use additional agent tools to reduce the message size.',
          'Implement exponential backoff and jitter in the retry logic.',
          'Split content into smaller files before uploading the files.',
        ],
      },
      {
        id: 'http400',
        label: 'HTTP 400',
        options: [
          'Increase tenant-wide quotas.',
          'Move large content to files and use file search.',
          'Use additional agent tools to reduce the message size.',
          'Implement exponential backoff and jitter in the retry logic.',
          'Split content into smaller files before uploading the files.',
        ],
      },
    ],
    correct: {
      http429: 'Implement exponential backoff and jitter in the retry logic.',
      http400: 'Move large content to files and use file search.',
    },
  },
  98: {
    type: 'dropdowns',
    controls: [
      {
        id: 'category',
        label: 'category',
        options: ["'AzureAIService'", "'AzureKeyVault'", "'AzureOpenAI'"],
      },
      {
        id: 'authType',
        label: 'authType',
        options: ["'AccountKey'", "'AccountManagedIdentity'", "'ApiKey'"],
      },
    ],
    correct: {
      category: "'AzureKeyVault'",
      authType: "'AccountManagedIdentity'",
    },
  },
  99: {
    type: 'dropdowns',
    controls: [
      {
        id: 'knowledgeGrounding',
        label: 'Knowledge grounding',
        options: [
          'Configure revival from approved data sources.',
          'Upload the policy documents direct to the agent.',
          'Embed the policy documents directly into the agent instructions.',
        ],
      },
      {
        id: 'memory',
        label: 'Memory',
        options: [
          'Use orchestration-managed session context.',
          'Enable agent memory that uses persistent storage.',
          'Retain user preferences in the state of the client application',
        ],
      },
    ],
    correct: {
      knowledgeGrounding: 'Configure revival from approved data sources.',
      memory: 'Enable agent memory that uses persistent storage.',
    },
  },
  101: {
    type: 'radioRows',
    controls: [
      {
        id: 'nameConfidence',
        label:
          'The code will display the name of each detected brand with a confidence equal to or higher than 75 percent.',
        options: ['Yes', 'No'],
      },
      {
        id: 'topLeftCoords',
        label:
          'The code will display coordinates for the top-left corner of the rectangle that contains the brand logo of the displayed brands.',
        options: ['Yes', 'No'],
      },
      {
        id: 'bottomRightCoords',
        label:
          'The code will display coordinates for the bottom-right corner of the rectangle that contains the brand logo of the displayed brands.',
        options: ['Yes', 'No'],
      },
    ],
    correct: {
      nameConfidence: 'Yes',
      topLeftCoords: 'Yes',
      bottomRightCoords: 'No',
    },
  },
  103: {
    type: 'dropdowns',
    controls: [
      {
        id: 'kind',
        label: '--kind',
        options: ['AIServices', 'LanguageAuthoring', 'OpenAI'],
      },
      {
        id: 'flag',
        label: 'Flag before the JSON payload',
        options: ['--api-properties', '--assign-identity', '--encryption'],
      },
    ],
    correct: {
      kind: 'OpenAI',
      flag: '--encryption',
    },
  },
  104: {
    type: 'dropdowns',
    controls: [
      {
        id: 'request',
        label: 'request =',
        options: [
          'AnalyzeTextOptions(categories=comment)',
          'AnalyzeTextOptions(text=[comment])',
          'AnalyzeTextOptions(text=comment)',
          'TextCategory.SELF_HARM(comment)',
        ],
      },
      {
        id: 'response',
        label: 'response =',
        options: [
          'client.analyze_image(request)',
          'client.analyze_text(request)',
          'client.moderate_text(request)',
          'client.path("/text:analyze").post(request)',
        ],
      },
    ],
    correct: {
      request: 'AnalyzeTextOptions(text=comment)',
      response: 'client.analyze_text(request)',
    },
  },
  107: {
    type: 'radioRows',
    controls: [
      {
        id: 'auditIncludesContactSsn',
        label: 'For sample_text, audit will include entity records for Contact and SSN.',
        options: ['Yes', 'No'],
      },
      {
        id: 'textForModelIncludesRaw',
        label: 'For sample_text, text_for_model will include john.doe@contoso.com and 859-98-0987.',
        options: ['Yes', 'No'],
      },
      {
        id: 'textForModelHasMasks',
        label: 'For sample_text, text_for_model will contain entity type masks for John Doe and 312-555-1234.',
        options: ['Yes', 'No'],
      },
    ],
    correct: {
      auditIncludesContactSsn: 'No',
      textForModelIncludesRaw: 'No',
      textForModelHasMasks: 'Yes',
    },
  },
  108: {
    type: 'dropdowns',
    controls: [
      {
        id: 'step1',
        label: 'Step 1',
        options: [
          'Initialize the training dataset.',
          'Train the classifier model.',
          'Create a project.',
          'Upload and tag images.',
          'Train the object detection model.',
        ],
      },
      {
        id: 'step2',
        label: 'Step 2',
        options: [
          'Initialize the training dataset.',
          'Train the classifier model.',
          'Create a project.',
          'Upload and tag images.',
          'Train the object detection model.',
        ],
      },
      {
        id: 'step3',
        label: 'Step 3',
        options: [
          'Initialize the training dataset.',
          'Train the classifier model.',
          'Create a project.',
          'Upload and tag images.',
          'Train the object detection model.',
        ],
      },
    ],
    correct: {
      step1: 'Create a project.',
      step2: 'Upload and tag images.',
      step3: 'Train the classifier model.',
    },
  },
  112: {
    type: 'dropdowns',
    controls: [
      {
        id: 'step1',
        label: 'Step 1',
        options: [
          'Regenerate the primary admin key',
          'Regenerate the secondary admin key',
          'Change the app to use the secondary admin key',
          'Add a new query key',
          'Change the app to use the new key',
          'Delete the compromised key',
        ],
      },
      {
        id: 'step2',
        label: 'Step 2',
        options: [
          'Regenerate the primary admin key',
          'Regenerate the secondary admin key',
          'Change the app to use the secondary admin key',
          'Add a new query key',
          'Change the app to use the new key',
          'Delete the compromised key',
        ],
      },
      {
        id: 'step3',
        label: 'Step 3',
        options: [
          'Regenerate the primary admin key',
          'Regenerate the secondary admin key',
          'Change the app to use the secondary admin key',
          'Add a new query key',
          'Change the app to use the new key',
          'Delete the compromised key',
        ],
      },
    ],
    correct: {
      step1: 'Change the app to use the secondary admin key',
      step2: 'Regenerate the primary admin key',
      step3: 'Change the app to use the new key',
    },
  },
  113: {
    type: 'dropdowns',
    controls: [
      {
        id: 'httpMethod',
        label: 'HTTP method',
        options: ['PATCH', 'POST', 'PUT'],
      },
      {
        id: 'kind',
        label: 'kind',
        options: ['CognitiveServices', 'ComputerVision', 'TextAnalytics'],
      },
    ],
    correct: {
      httpMethod: 'PUT',
      kind: 'CognitiveServices',
    },
  },
  114: {
    type: 'dropdowns',
    controls: [
      {
        id: 'falsePositivePercent',
        label: 'The percentage of false positives is',
        options: ['0', '25', '30', '50', '100'],
      },
      {
        id: 'truePositiveRatio',
        label:
          'The value for the number of true positives divided by the total number of true positives and false negatives is',
        options: ['0', '25', '30', '50', '100'],
      },
    ],
    correct: {
      falsePositivePercent: '0',
      truePositiveRatio: '100',
    },
  },
  117: {
    type: 'dropdowns',
    controls: [
      {
        id: 'jsonData',
        label: 'JSON data',
        options: ['File projection', 'Object projection', 'Table projection'],
      },
      {
        id: 'extractedTextData',
        label: 'Extracted text data',
        options: ['File projection', 'Object projection', 'Table projection'],
      },
    ],
    correct: {
      jsonData: 'Object projection',
      extractedTextData: 'Table projection',
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
      'Once the current version expires',
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

    if (optionLines.length > 0) {
      optionLines[optionLines.length - 1] += ` ${line}`;
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
    } else {
      optionLines[optionLines.length - 1] += ` ${line}`;
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

    if (section === 'options') {
      optionLines[optionLines.length - 1] += ` ${line}`;
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

    if (optionLines.length > 0) {
      optionLines[optionLines.length - 1] += ` ${line}`;
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

export const CASE_STUDY_QUESTION_NUMBERS = [1, 2, 27, 28, 56, 61, 62, 67];

export function isCaseStudyQuestion(questionNumber) {
  return CASE_STUDY_QUESTION_NUMBERS.includes(questionNumber);
}

export function createPracticeSession(questions, options = {}) {
  const difficulty = options.difficulty || 'easy';
  const fullQuestionMode = ['normal', 'hard', 'extra-hard'].includes(difficulty);
  const timeLimitMinutesByDifficulty = {
    normal: 60,
    hard: 30,
    'extra-hard': 20,
  };
  const defaultQuestionCount = fullQuestionMode ? (questions || []).length : 20;
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
  const caseStudyQuestions = remainingQuestions
    .filter((question) => isCaseStudyQuestion(question.number))
    .sort((a, b) => a.number - b.number);
  const standaloneQuestions = remainingQuestions.filter((question) => !isCaseStudyQuestion(question.number));
  const shuffledQuestions = [
    ...pinnedQuestions,
    ...caseStudyQuestions,
    ...shuffleQuestions(standaloneQuestions, random),
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
