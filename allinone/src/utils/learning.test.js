import assert from 'node:assert/strict';
import test from 'node:test';
import readingContent from '../data/englishContent.json' with { type: 'json' };
import listeningContent from '../data/englishListeningContent.json' with { type: 'json' };
import { test2ListeningContent, test2ReadingSingleSets } from '../data/englishTest2Content.js';
import {
  filterLearningPages,
  filterLearningQuestions,
  getCaseStudyChoiceQuestionDisplayParts,
  getChoiceQuestionDisplayParts,
  getQuestionTwoDisplayParts,
  getQuestionOneDisplayParts,
  getQuestionTwentyOneDisplayParts,
  getQuestionPagination,
  getLearningStats,
  createPracticeSession,
  getPracticeControlConfig,
  getPracticeQuestionDisplayParts,
  getPracticeResultSummary,
  getPracticeSessionResults,
  parsePracticeQuestionNumbers,
  getStudyMaterialPages,
  getVisualQuestionDisplayParts,
  flattenReadingBank,
  getReadingBankSummary,
  getMaxReadingFormScale,
  assembleReadingTest,
  getScaledReadingScore,
  getReadingTestResults,
  getWeakestReadingTags,
  getDrillTopics,
  assembleDrill,
  getListeningBankSummary,
  getMaxListeningFormScale,
  assembleListeningTest,
  getListeningTestResults,
  getFullTestScore,
} from './learning.js';

const pages = [
  { page: 1, text: 'Azure AI Document Intelligence reads forms and receipts.' },
  { page: 2, text: 'Language services extract key phrases and sentiment.' },
  { page: 3, text: '' },
];

test('getLearningStats counts pages, words, and blank pages', () => {
  assert.deepEqual(getLearningStats(pages), {
    pageCount: 3,
    wordCount: 15,
    blankPageCount: 1,
  });
});

test('filterLearningPages matches by page number and body text', () => {
  assert.deepEqual(filterLearningPages(pages, 'language').map((page) => page.page), [2]);
  assert.deepEqual(filterLearningPages(pages, 'page 1').map((page) => page.page), [1]);
  assert.deepEqual(filterLearningPages(pages, 'question 2').map((page) => page.page), [2]);
  assert.deepEqual(filterLearningPages(pages, '').map((page) => page.page), [1, 2, 3]);
});

test('getStudyMaterialPages removes cover, title, blank, and closing pages', () => {
  const sourcePages = [
    { page: 1, text: 'Get certification quickly with the CertyIQ Premium exam material.' },
    { page: 2, text: 'About CertyIQ Doubt Support Mail us on - certyiqofficial@gmail.com' },
    { page: 3, text: 'Microsoft\n(AI-103)\nTotal:\n65 Questions\nLink:\nhttps://certyiq.com/papers/microsoft/ai-103' },
    { page: 4, text: 'HOTSPOT -\nCase Study -\nWhat should you use?\nAnswer:\nB' },
    { page: 5, text: 'Answer:\nExplanation:\nStandard deployment is correct.' },
    { page: 65, text: '' },
    { page: 66, text: 'Thank you\nTotal:\n65 Questions\nMore Papers' },
  ];

  assert.deepEqual(getStudyMaterialPages(sourcePages).map((page) => page.page), [4, 5]);
});

test('filterLearningQuestions matches exact question numbers and body text', () => {
  const questions = [
    { number: 1, text: 'Configure the model deployment.', prompt: 'Configure deployment', answer: 'A', explanation: 'Standard model.' },
    { number: 12, text: 'Use Azure AI Search for grounding.', prompt: 'Grounding', answer: 'B', explanation: 'Search index.' },
  ];

  assert.deepEqual(filterLearningQuestions(questions, 'question 12').map((question) => question.number), [12]);
  assert.deepEqual(filterLearningQuestions(questions, 'grounding').map((question) => question.number), [12]);
  assert.deepEqual(filterLearningQuestions(questions, '').map((question) => question.number), [1, 12]);
});

test('getQuestionPagination returns one current question and adjacent targets', () => {
  const questions = [
    { number: 1, text: 'First question' },
    { number: 2, text: 'Second question' },
    { number: 3, text: 'Third question' },
  ];

  assert.deepEqual(getQuestionPagination(questions, 2), {
    currentQuestion: questions[1],
    currentIndex: 1,
    total: 3,
    previousNumber: 1,
    nextNumber: 3,
  });

  assert.deepEqual(getQuestionPagination(questions, 99), {
    currentQuestion: questions[0],
    currentIndex: 0,
    total: 3,
    previousNumber: null,
    nextNumber: 2,
  });
});

test('createPracticeSession returns a deterministic 20 question easy session from the question bank', () => {
  const questions = Array.from({ length: 65 }, (_, index) => ({
    number: index + 1,
    prompt: `Question ${index + 1}`,
    answer: 'A',
  }));

  const session = createPracticeSession(questions, {
    difficulty: 'easy',
    questionCount: 20,
    seed: 'ai-103-easy',
  });
  const repeated = createPracticeSession(questions, {
    difficulty: 'easy',
    questionCount: 20,
    seed: 'ai-103-easy',
  });

  assert.equal(session.difficulty, 'easy');
  assert.equal(session.timeLimitMinutes, null);
  assert.equal(session.questions.length, 20);
  assert.equal(new Set(session.questions.map((question) => question.number)).size, 20);
  assert.deepEqual(
    session.questions.map((question) => question.number),
    repeated.questions.map((question) => question.number),
  );
  assert.ok(session.questions.every((question) => question.sourceIndex >= 0));
});

test('createPracticeSession can pin source question numbers for exact practice review', () => {
  const questions = Array.from({ length: 65 }, (_, index) => ({
    number: index + 1,
    prompt: `Question ${index + 1}`,
    answer: 'A',
  }));

  const session = createPracticeSession(questions, {
    difficulty: 'easy',
    questionCount: 20,
    questionNumbers: [1, 4],
    seed: 'fill-remaining',
  });

  assert.deepEqual(session.questions.slice(0, 2).map((question) => question.number), [1, 4]);
  assert.equal(session.questions.length, 20);
  assert.equal(new Set(session.questions.map((question) => question.number)).size, 20);
});

test('createPracticeSession returns all questions with a 60 minute limit for normal mode', () => {
  const questions = Array.from({ length: 65 }, (_, index) => ({
    number: index + 1,
    prompt: `Question ${index + 1}`,
    answer: 'A',
  }));

  const session = createPracticeSession(questions, {
    difficulty: 'normal',
    seed: 'normal-full-test',
  });

  assert.equal(session.difficulty, 'normal');
  assert.equal(session.timeLimitMinutes, 60);
  assert.equal(session.questions.length, 65);
  assert.equal(new Set(session.questions.map((question) => question.number)).size, 65);
  assert.notDeepEqual(
    session.questions.map((question) => question.number),
    questions.map((question) => question.number),
  );
});

test('createPracticeSession returns all questions with a 30 minute limit for hard mode', () => {
  const questions = Array.from({ length: 65 }, (_, index) => ({
    number: index + 1,
    prompt: `Question ${index + 1}`,
    answer: 'A',
  }));

  const session = createPracticeSession(questions, {
    difficulty: 'hard',
    seed: 'hard-full-test',
  });

  assert.equal(session.difficulty, 'hard');
  assert.equal(session.timeLimitMinutes, 30);
  assert.equal(session.questions.length, 65);
  assert.equal(new Set(session.questions.map((question) => question.number)).size, 65);
  assert.notDeepEqual(
    session.questions.map((question) => question.number),
    questions.map((question) => question.number),
  );
});

test('createPracticeSession returns all questions with a 20 minute limit and no hints for extra hard mode', () => {
  const questions = Array.from({ length: 65 }, (_, index) => ({
    number: index + 1,
    prompt: `Question ${index + 1}`,
    answer: 'A',
  }));

  const session = createPracticeSession(questions, {
    difficulty: 'extra-hard',
    seed: 'extra-hard-full-test',
  });

  assert.equal(session.difficulty, 'extra-hard');
  assert.equal(session.timeLimitMinutes, 20);
  assert.equal(session.answerAreaHintsEnabled, false);
  assert.equal(session.questions.length, 65);
  assert.equal(new Set(session.questions.map((question) => question.number)).size, 65);
  assert.notDeepEqual(
    session.questions.map((question) => question.number),
    questions.map((question) => question.number),
  );
});

test('createPracticeSession can use a provided random source for regenerating practice tests', () => {
  const questions = Array.from({ length: 8 }, (_, index) => ({
    number: index + 1,
    prompt: `Question ${index + 1}`,
    answer: 'A',
  }));

  const frontLoaded = createPracticeSession(questions, {
    questionCount: 4,
    random: () => 0,
  });
  const originalOrder = createPracticeSession(questions, {
    questionCount: 4,
    random: () => 0.999,
  });

  assert.deepEqual(frontLoaded.questions.map((question) => question.number), [2, 3, 4, 5]);
  assert.deepEqual(originalOrder.questions.map((question) => question.number), [1, 2, 3, 4]);
});

test('parsePracticeQuestionNumbers reads unique valid source question numbers from a query string', () => {
  assert.deepEqual(parsePracticeQuestionNumbers('?questions=1,4,4,abc,66,0,12'), [1, 4, 12]);
  assert.deepEqual(parsePracticeQuestionNumbers('?difficulty=easy'), []);
});

test('getPracticeQuestionDisplayParts parses prompt, options, and correct selections for test taking', () => {
  const question = {
    number: 12,
    prompt: [
      'DRAG DROP -',
      'You need to configure the project.',
      'What should you use?',
      'A. Azure AI Search',
      'B. Azure Translator',
      'C. Azure OpenAI Embedding',
      'D. Text Split',
    ].join('\n'),
    answer: 'CD',
    explanation: 'Use embeddings and split text.',
  };

  const parts = getPracticeQuestionDisplayParts(question);

  assert.equal(parts.type, 'DRAG DROP');
  assert.deepEqual(parts.promptParagraphs, [
    'You need to configure the project.',
    'What should you use?',
  ]);
  assert.deepEqual(parts.options, [
    { key: 'A', text: 'Azure AI Search' },
    { key: 'B', text: 'Azure Translator' },
    { key: 'C', text: 'Azure OpenAI Embedding' },
    { key: 'D', text: 'Text Split' },
  ]);
  assert.deepEqual(parts.answerSelections, ['C', 'D']);
  assert.equal(parts.allowsMultipleSelections, true);
});

test('getPracticeControlConfig exposes question 1 dropdown controls and correct selections', () => {
  const config = getPracticeControlConfig(1);

  assert.equal(config.type, 'dropdowns');
  assert.deepEqual(config.correct, {
    deploymentType: 'Standard',
    versionUpdatePolicy: 'Opt out of automatic model version upgrades',
  });
  assert.deepEqual(config.controls.map((control) => control.id), [
    'deploymentType',
    'versionUpdatePolicy',
  ]);
  assert.deepEqual(config.controls[0].options, [
    'Standard',
    'Global Standard',
    'Global Provisioned',
  ]);
  assert.deepEqual(config.controls[1].options, [
    'Once the current version expires',
    'Opt out of automatic model version upgrades',
    'Upgrade once a new default version becomes available',
  ]);
});

test('getPracticeControlConfig exposes question 4 yes-no radio controls and correct selections', () => {
  const config = getPracticeControlConfig(4);

  assert.equal(config.type, 'radioRows');
  assert.deepEqual(config.correct, {
    langchainAppearsWithoutTracer: 'No',
    serviceNamesSeparateTelemetry: 'Yes',
    contentRecordingCapturesPrompts: 'No',
  });
  assert.deepEqual(config.controls.map((control) => control.label), [
    'The LangChain service will appear in Traces without configuring a tracer.',
    'Setting different OTEL_SERVICE_NAME values separates the services in Application Insights.',
    'When using enable_content_recording=False, prompts and tool data will be captured in the telemetry.',
  ]);
  assert.equal(config.controls.length, 3);
  assert.ok(config.controls.every((control) => control.options.join('|') === 'Yes|No'));
});

test('getPracticeControlConfig covers every visual answer-area question with structured controls', () => {
  const expectedCorrectAnswers = {
    1: ['Standard', 'Opt out of automatic model version upgrades'],
    4: ['No', 'Yes', 'No'],
    5: ['Multi-file task in pro mode', 'Single-file task in standard mode'],
    6: ['DefaultAzureCredential', 'create'],
    7: ['Not(IsBlank(Local.Var01))', '{Upper(Local.Var01)}'],
    8: [
      'Select User input, Output, Tool response, and Tool call and set Action to Block.',
      'A system-assigned managed identity that is assigned the Storage Blob Data Reader role',
    ],
    11: ['ask_question', 'approval == "approved"'],
    15: ['Groundedness evaluation metrics', 'Risk and safety metrics'],
    18: ['Time To Response and Total Tokens', 'RequestResponse'],
    20: ['required', 'Using a distinct agent identity bound to the client application'],
    30: ['"tool_choice"', '"required"'],
    32: ['Grounding with Bing Search', 'Code interpreter', 'File search'],
    35: ['0', '"low"'],
    37: ['Agent memory that uses persistent storage', 'File search tool'],
    40: ['An Azure Login action that uses OpenID Connect (OIDC)', 'Fail'],
    49: [
      'Set action to block.',
      'Use optical character recognition (OCR) to extract the text from the images first.',
    ],
  };

  Object.entries(expectedCorrectAnswers).forEach(([questionNumber, expectedAnswers]) => {
    const config = getPracticeControlConfig(Number(questionNumber));

    assert.ok(config, `Expected question ${questionNumber} to have structured controls`);
    assert.equal(config.controls.length, expectedAnswers.length);
    assert.deepEqual(
      config.controls.map((control) => config.correct[control.id]),
      expectedAnswers,
      `Question ${questionNumber} correct answers should match the answer-area image`,
    );
    assert.ok(
      config.controls.every((control) => control.options.includes(config.correct[control.id])),
      `Question ${questionNumber} options should include every correct answer`,
    );
  });
});

test('getPracticeSessionResults scores selected answers without caring about order', () => {
  const questions = [
    { number: 12, prompt: 'Question 12\nA. One\nB. Two', answer: 'A' },
    { number: 13, prompt: 'Question 13\nA. One\nB. Two\nC. Three', answer: 'AC' },
  ];

  const results = getPracticeSessionResults(questions, {
    12: ['A'],
    13: ['C', 'A'],
  });

  assert.equal(results.correctCount, 2);
  assert.equal(results.totalQuestions, 2);
  assert.equal(results.scorePercent, 100);
  assert.deepEqual(results.items.map((item) => item.isCorrect), [true, true]);
});

test('getPracticeSessionResults scores structured visual controls for questions 1 and 4', () => {
  const questions = [
    { number: 1, prompt: 'HOTSPOT -\nQuestion 1', answer: '' },
    { number: 4, prompt: 'HOTSPOT -\nQuestion 4', answer: '' },
    { number: 49, prompt: 'HOTSPOT -\nQuestion 49', answer: '' },
  ];

  const results = getPracticeSessionResults(questions, {
    1: {
      deploymentType: 'Standard',
      versionUpdatePolicy: 'Opt out of automatic model version upgrades',
    },
    4: {
      langchainAppearsWithoutTracer: 'No',
      serviceNamesSeparateTelemetry: 'Yes',
      contentRecordingCapturesPrompts: 'No',
    },
    49: {
      promptShieldsAction: 'Set action to block.',
      additionalMitigation: 'Use optical character recognition (OCR) to extract the text from the images first.',
    },
  });

  assert.equal(results.correctCount, 3);
  assert.equal(results.totalQuestions, 3);
  assert.equal(results.scorePercent, 100);
  assert.deepEqual(results.items.map((item) => item.correct), [
    ['Standard', 'Opt out of automatic model version upgrades'],
    ['No', 'Yes', 'No'],
    [
      'Set action to block.',
      'Use optical character recognition (OCR) to extract the text from the images first.',
    ],
  ]);
});

test('getPracticeSessionResults does not mark manual visual questions correct when unanswered', () => {
  const questions = [
    { number: 5, prompt: 'HOTSPOT -\nQuestion 5', answer: '' },
    { number: 12, prompt: 'Question 12\nA. One\nB. Two', answer: 'A' },
  ];

  const results = getPracticeSessionResults(questions, {
    12: ['A'],
  });

  assert.equal(results.correctCount, 1);
  assert.deepEqual(results.items.map((item) => item.isCorrect), [false, true]);
});

test('getPracticeResultSummary formats score details for the submit popup', () => {
  const questions = [
    { number: 12, prompt: 'Question 12\nA. One\nB. Two', answer: 'A' },
    { number: 13, prompt: 'Question 13\nA. One\nB. Two', answer: 'B' },
    { number: 14, prompt: 'HOTSPOT -\nQuestion 14', answer: '' },
  ];
  const results = getPracticeSessionResults(questions, {
    12: ['A'],
    13: ['A'],
  });

  assert.deepEqual(getPracticeResultSummary(results), {
    scorePercent: 33,
    correctCount: 1,
    totalQuestions: 3,
    autoScoredTotal: 2,
    manualReviewTotal: 1,
    title: 'Score: 33%',
    detail: '1 of 2 auto-scored answers correct. 1 visual question needs manual review.',
  });
});

test('getQuestionOneDisplayParts preserves the case study structure and answer selections', () => {
  const question = {
    prompt: [
      'HOTSPOT -',
      'Case Study -',
      'This is a case study. Case studies are not timed separately from other exam sections.',
      'A Review Screen will appear at the end of this case study.',
      'Overview -',
      'Company Information -',
      'Contoso, Ltd builds AI solutions by using Microsoft Foundry.',
      'Technical Requirements -',
      'The model deployment used by Agent1 must support scalable workloads and',
      'dynamically scale without reserved throughput capacity.',
      'Business Requirements -',
      'Agent1 must answer questions only about the products sold by Contoso.',
      'You need to configure the model deployment for Agent1 to meet the technical requirements.',
      'What should you configure? To answer, select the appropriate options in the answer area.',
      'NOTE: Each correct selection is worth one point.',
    ].join('\n'),
    explanation: [
      'Standard .',
      'A Standard deployment uses a pay-as-you-go model.',
      'Opt out of automatic model version upgrades .',
      'This keeps the deployment on the selected model version until administrators manually upgrade it.',
    ].join('\n'),
  };

  const parts = getQuestionOneDisplayParts(question);

  assert.equal(parts.type, 'HOTSPOT');
  assert.equal(parts.caseStudyTitle, 'Case Study');
  assert.ok(parts.caseStudyParagraphs.some((paragraph) => paragraph.includes('Review Screen')));
  assert.deepEqual(parts.sections.map((section) => section.title), [
    'Overview',
    'Company Information',
    'Technical Requirements',
    'Business Requirements',
  ]);
  assert.deepEqual(parts.sections[2].paragraphs, [
    'The model deployment used by Agent1 must support scalable workloads and dynamically scale without reserved throughput capacity.',
  ]);
  assert.deepEqual(parts.finalPrompt, [
    'You need to configure the model deployment for Agent1 to meet the technical requirements.',
    'What should you configure? To answer, select the appropriate options in the answer area.',
    'NOTE: Each correct selection is worth one point.',
  ]);
  assert.deepEqual(parts.answerSelections, [
    'Standard',
    'Opt out of automatic model version upgrades',
  ]);
});

test('getQuestionTwoDisplayParts preserves the case study sections, options, and selected answer', () => {
  const question = {
    prompt: [
      'Case Study -',
      'This is a case study.',
      'Overview -',
      'Company Information -',
      'Contoso, Ltd builds AI solutions by using Microsoft Foundry.',
      'Existing Environment -',
      'Identity Environment -',
      'Contoso uses Microsoft Entra ID for identity management.',
      'Requirements -',
      'Technical Requirements -',
      'The data processed by the model must remain within the EU.',
      'Security and Compliance Requirements',
      'API keys must NOT be used to access Foundry-deployed models.',
      'The product sheets might contain images that include embedded text.',
      'Business Requirements -',
      'Agent1 must answer questions only about the products sold by Contoso.',
      'You need to configure Agent1 to meet the security and compliance requirements.',
      'What should you use?',
      'A. self-harm content filtering',
      'B. prompt shields',
      'C. Personally identifiable information (PII) Detection',
      'D. violence content filtering',
    ].join('\n'),
    answer: 'B',
    explanation: [
      'Prompt Shields.',
      'Prompt Shields in Azure AI Foundry / Azure OpenAI are specifically designed to detect and mitigate:',
      'Direct prompt injection attacks',
      'Indirect prompt injection attacks',
      'Malicious instructions hidden in retrieved content',
      'Hidden instructions in documents and multimodal inputs (including images)',
    ].join('\n'),
  };

  const parts = getQuestionTwoDisplayParts(question);

  assert.equal(parts.caseStudyTitle, 'Case Study');
  assert.ok(parts.caseStudyParagraphs.includes('This is a case study.'));
  assert.deepEqual(parts.sections.map((section) => section.title), [
    'Overview',
    'Company Information',
    'Existing Environment',
    'Identity Environment',
    'Requirements',
    'Technical Requirements',
    'Security and Compliance Requirements',
    'Business Requirements',
  ]);
  assert.deepEqual(parts.sections[6].paragraphs, [
    'API keys must NOT be used to access Foundry-deployed models.',
    'The product sheets might contain images that include embedded text.',
  ]);
  assert.deepEqual(parts.finalPrompt, [
    'You need to configure Agent1 to meet the security and compliance requirements.',
    'What should you use?',
  ]);
  assert.deepEqual(parts.options, [
    { key: 'A', text: 'self-harm content filtering' },
    { key: 'B', text: 'prompt shields' },
    { key: 'C', text: 'Personally identifiable information (PII) Detection' },
    { key: 'D', text: 'violence content filtering' },
  ]);
  assert.equal(parts.answerSelection, 'B');
  assert.equal(parts.answerOption?.text, 'prompt shields');
  assert.deepEqual(parts.explanationParagraphs, [
    'Prompt Shields.',
    'Prompt Shields in Azure AI Foundry / Azure OpenAI are specifically designed to detect and mitigate:',
    'Direct prompt injection attacks',
    'Indirect prompt injection attacks',
    'Malicious instructions hidden in retrieved content',
    'Hidden instructions in documents and multimodal inputs (including images)',
  ]);
});

test('getCaseStudyChoiceQuestionDisplayParts supports A-F options and multiple selections', () => {
  const question = {
    prompt: [
      'Case Study -',
      'This is a case study.',
      'Overview -',
      'Company Information -',
      'Contoso, Ltd builds AI solutions by using Microsoft Foundry.',
      'Requirements -',
      'Technical Requirements -',
      'The product sheets must be processed by using an indexing pipeline that enables semantic and vector search.',
      'Business Requirements -',
      'Agent1 must answer questions only about the products sold by Contoso.',
      'You need to configure an indexing pipeline for Agent1 to retrieve the relevant product information in storage1.',
      'Which two built-in skills should you use? Each correct answer presents part of the solution.',
      'NOTE: Each correct selection is worth one point.',
      'A. Azure OpenAI Embedding',
      'B. Entity Recognition',
      'C. Text Split',
      'D. Merge',
      'E. Language Detection',
      'F. key phrase extraction',
    ].join('\n'),
    answer: 'AC',
    explanation: [
      'A. Azure OpenAI Embedding',
      'C. Text Split',
    ].join('\n'),
  };

  const parts = getCaseStudyChoiceQuestionDisplayParts(question);

  assert.deepEqual(parts.sections.map((section) => section.title), [
    'Overview',
    'Company Information',
    'Requirements',
    'Technical Requirements',
    'Business Requirements',
  ]);
  assert.deepEqual(parts.finalPrompt, [
    'You need to configure an indexing pipeline for Agent1 to retrieve the relevant product information in storage1.',
    'Which two built-in skills should you use? Each correct answer presents part of the solution.',
    'NOTE: Each correct selection is worth one point.',
  ]);
  assert.deepEqual(parts.options, [
    { key: 'A', text: 'Azure OpenAI Embedding' },
    { key: 'B', text: 'Entity Recognition' },
    { key: 'C', text: 'Text Split' },
    { key: 'D', text: 'Merge' },
    { key: 'E', text: 'Language Detection' },
    { key: 'F', text: 'key phrase extraction' },
  ]);
  assert.deepEqual(parts.answerSelections, ['A', 'C']);
  assert.deepEqual(parts.answerOptions, [
    { key: 'A', text: 'Azure OpenAI Embedding' },
    { key: 'C', text: 'Text Split' },
  ]);
});

test('getChoiceQuestionDisplayParts preserves prompt paragraphs, options, and selected answer', () => {
  const question = {
    prompt: [
      'You are planning a Microsoft Foundry project named Project1 that will contain multiple agents.',
      'Each agent will access the same Azure AI Search resource.',
      'What should you recommend?',
      'A. Enable role-based access control (RBAC) for the Azure AI Search resource.',
      'B. Disable key-based access control on the Azure AI Search resource.',
      'C. Add a connection to the Azure AI Search resource.',
      'D. Create a managed private endpoint that connects to the Azure AI Search resource.',
    ].join('\n'),
    answer: 'C',
    explanation: [
      'C. Add a connection to the Azure AI Search resource.',
      'Connections centrally store credentials.',
    ].join('\n'),
  };

  const parts = getChoiceQuestionDisplayParts(question);

  assert.equal(parts.type, '');
  assert.deepEqual(parts.promptParagraphs, [
    'You are planning a Microsoft Foundry project named Project1 that will contain multiple agents.',
    'Each agent will access the same Azure AI Search resource.',
    'What should you recommend?',
  ]);
  assert.deepEqual(parts.options, [
    { key: 'A', text: 'Enable role-based access control (RBAC) for the Azure AI Search resource.' },
    { key: 'B', text: 'Disable key-based access control on the Azure AI Search resource.' },
    { key: 'C', text: 'Add a connection to the Azure AI Search resource.' },
    { key: 'D', text: 'Create a managed private endpoint that connects to the Azure AI Search resource.' },
  ]);
  assert.equal(parts.answerSelection, 'C');
  assert.equal(parts.answerOption?.text, 'Add a connection to the Azure AI Search resource.');
  assert.deepEqual(parts.explanationParagraphs, [
    'C. Add a connection to the Azure AI Search resource.',
    'Connections centrally store credentials.',
  ]);
});

test('getChoiceQuestionDisplayParts supports multiple selected answers', () => {
  const question = {
    prompt: [
      'You need to implement tracing for an agent invoked outside Foundry.',
      'Which two components can you use?',
      'A. a Log Analytics workspace',
      'B. Application Insights',
      'C. OpenTelemetry',
      'D. Microsoft Sentinel',
    ].join('\n'),
    answer: 'BC',
    explanation: 'B. Application Insights\nC. OpenTelemetry',
  };

  const parts = getChoiceQuestionDisplayParts(question);

  assert.deepEqual(parts.answerSelections, ['B', 'C']);
  assert.deepEqual(parts.answerOptions, [
    { key: 'B', text: 'Application Insights' },
    { key: 'C', text: 'OpenTelemetry' },
  ]);
});

test('getVisualQuestionDisplayParts preserves question type and prompt text for visual questions', () => {
  const question = {
    prompt: [
      'HOTSPOT - You have a Python application named App1 that integrates with a Microsoft Foundry project named Project1.',
      'You need to ensure that App1 meets the following requirements:',
      'Authenticates by using a Microsoft Entra managed identity',
      'Sends prompts to a deployed model by using the Azure OpenAI Responses API',
      'How should you complete the Python code? To answer, select the appropriate options in the answer area.',
      'NOTE: Each correct selection is worth one point.',
    ].join('\n'),
    explanation: [
      'DefaultAzureCredential',
      'create',
    ].join('\n'),
  };

  const parts = getVisualQuestionDisplayParts(question);

  assert.equal(parts.type, 'HOTSPOT');
  assert.deepEqual(parts.promptParagraphs, [
    'You have a Python application named App1 that integrates with a Microsoft Foundry project named Project1.',
    'You need to ensure that App1 meets the following requirements:',
    'Authenticates by using a Microsoft Entra managed identity Sends prompts to a deployed model by using the Azure OpenAI Responses API How should you complete the Python code? To answer, select the appropriate options in the answer area.',
    'NOTE: Each correct selection is worth one point.',
  ]);
  assert.deepEqual(parts.explanationParagraphs, [
    'DefaultAzureCredential',
    'create',
  ]);
});

test('getQuestionTwentyOneDisplayParts preserves the project items, scenario, and selected answer', () => {
  const question = {
    prompt: [
      'You have a Microsoft Foundry project named Project1 that contains the following:',
      'An OpenAPI tool that calls an external API',
      'A project connection named Connection1 that stores the API key of the external API',
      'When an agent calls the OpenAPI tool, the API returns a 401 unauthorized error, and traces show that the API key',
      'header is NOT being sent.',
      'You need to ensure that the OpenAPI tool automatically includes the API key from Connection1 on all requests.',
      'What should you do?',
      'A. Enable identity passthrough so that the tool uses the Microsoft Entra token of the caller.',
      'B. Add the API key header manually to the OpenAPI specification.',
      'C. Configure the tool to use the default connection of Project1.',
      'D. Connect the tool to Connection1.',
    ].join('\n'),
    answer: 'D',
    explanation: [
      'D. Connect the tool to Connection1.',
      'The scenario states:',
      'The OpenAPI tool calls an external API.',
      'The API key is already stored in Connection1.',
      'The API returns 401 Unauthorized.',
      'Traces show the API key header is not being sent.',
      'The goal is to have the OpenAPI tool automatically include the API key from Connection1.',
      'In Microsoft Foundry, an OpenAPI tool only injects credentials automatically when the tool is associated with',
      'the appropriate project connection.',
    ].join('\n'),
  };

  const parts = getQuestionTwentyOneDisplayParts(question);

  assert.deepEqual(parts.introParagraphs, [
    'You have a Microsoft Foundry project named Project1 that contains the following:',
  ]);
  assert.deepEqual(parts.projectItems, [
    'An OpenAPI tool that calls an external API',
    'A project connection named Connection1 that stores the API key of the external API',
  ]);
  assert.deepEqual(parts.scenarioParagraphs, [
    'When an agent calls the OpenAPI tool, the API returns a 401 unauthorized error, and traces show that the API key header is NOT being sent.',
  ]);
  assert.deepEqual(parts.finalPrompt, [
    'You need to ensure that the OpenAPI tool automatically includes the API key from Connection1 on all requests.',
    'What should you do?',
  ]);
  assert.deepEqual(parts.options, [
    { key: 'A', text: 'Enable identity passthrough so that the tool uses the Microsoft Entra token of the caller.' },
    { key: 'B', text: 'Add the API key header manually to the OpenAPI specification.' },
    { key: 'C', text: 'Configure the tool to use the default connection of Project1.' },
    { key: 'D', text: 'Connect the tool to Connection1.' },
  ]);
  assert.equal(parts.answerSelection, 'D');
  assert.equal(parts.answerOption?.text, 'Connect the tool to Connection1.');
  assert.deepEqual(parts.explanationParagraphs, [
    'D. Connect the tool to Connection1.',
    'The scenario states:',
    'The OpenAPI tool calls an external API.',
    'The API key is already stored in Connection1.',
    'The API returns 401 Unauthorized.',
    'Traces show the API key header is not being sent.',
    'The goal is to have the OpenAPI tool automatically include the API key from Connection1.',
    'In Microsoft Foundry, an OpenAPI tool only injects credentials automatically when the tool is associated with',
    'the appropriate project connection.',
  ]);
});

test('getCaseStudyChoiceQuestionDisplayParts preserves case-study sections, final prompt, options, and selected answer', () => {
  const question = {
    prompt: [
      'Case Study -',
      'This is a case study.',
      'A Review Screen will appear at the end of this case study.',
      'Overview -',
      'Company Information -',
      'Contoso, Ltd builds and manages generative AI solutions.',
      'Technical Requirements -',
      'Responses generated by using the product sheet information must be relevant, complete, and accurate.',
      'Business Requirements -',
      'Agent1 must answer questions only about the products sold by Contoso.',
      'You need to recommend a solution to assess the responses generated by Agent1 when the agent uses the product information stored in storage1.',
      'The solution must meet the technical requirements.',
      'What should you include in the recommendation?',
      'A. a Retrieval Augmented Generation (RAG) evaluator',
      'B. a custom guardrail',
      'C. model fine-tuning',
      'D. a groundedness evaluator',
    ].join('\n'),
    answer: 'D',
    explanation: [
      'D. a groundedness evaluator.',
      'Groundedness verifies the response is supported by the retrieved context.',
    ].join('\n'),
  };

  const parts = getCaseStudyChoiceQuestionDisplayParts(question);

  assert.equal(parts.caseStudyTitle, 'Case Study');
  assert.deepEqual(parts.caseStudyParagraphs, [
    'This is a case study.',
    'A Review Screen will appear at the end of this case study.',
  ]);
  assert.deepEqual(parts.sections.map((section) => section.title), [
    'Overview',
    'Company Information',
    'Technical Requirements',
    'Business Requirements',
  ]);
  assert.deepEqual(parts.finalPrompt, [
    'You need to recommend a solution to assess the responses generated by Agent1 when the agent uses the product information stored in storage1.',
    'The solution must meet the technical requirements.',
    'What should you include in the recommendation?',
  ]);
  assert.deepEqual(parts.options, [
    { key: 'A', text: 'a Retrieval Augmented Generation (RAG) evaluator' },
    { key: 'B', text: 'a custom guardrail' },
    { key: 'C', text: 'model fine-tuning' },
    { key: 'D', text: 'a groundedness evaluator' },
  ]);
  assert.equal(parts.answerSelection, 'D');
  assert.equal(parts.answerOption?.text, 'a groundedness evaluator');
});

test('getVisualQuestionDisplayParts extracts drag-drop answer rows from explanation text', () => {
  const question = {
    prompt: [
      'DRAG DROP -',
      'You have a Microsoft Foundry project that contains a deployed ticket-triage agent.',
      'You need to ensure that the agent calls a tool during execution.',
      'How should you complete the Python code? To answer, drag the appropriate values to the correct targets.',
    ].join('\n'),
    explanation: [
      'Left Box (Key): "tool_choice"',
      'Right Box (Value): "required"',
      'Configuration Breakdown',
      'Setting the value to "required" explicitly forces the model to execute a tool call loop during processing.',
    ].join('\n'),
  };

  const parts = getVisualQuestionDisplayParts(question);

  assert.equal(parts.type, 'DRAG DROP');
  assert.deepEqual(parts.answerRows, [
    {
      key: 'tool_choice',
      value: 'required',
    },
  ]);
});

test('createPracticeSession honors an explicit time limit override', () => {
  const questions = [
    { number: 1, prompt: 'Pick one.\nA. Yes\nB. No', answer: 'A', explanation: '' },
    { number: 2, prompt: 'Pick one.\nA. Yes\nB. No', answer: 'B', explanation: '' },
    { number: 3, prompt: 'Pick one.\nA. Yes\nB. No', answer: 'A', explanation: '' },
  ];

  const session = createPracticeSession(questions, {
    difficulty: 'normal',
    questionCount: 2,
    timeLimitMinutes: 25,
    seed: 'english-practice',
  });

  assert.equal(session.timeLimitMinutes, 25);
  assert.equal(session.questions.length, 2);

  const untimedSession = createPracticeSession(questions, {
    difficulty: 'normal',
    timeLimitMinutes: null,
    seed: 'english-practice',
  });

  assert.equal(untimedSession.timeLimitMinutes, null);
});

test('getPracticeSessionResults can skip AI-103 structured control configs', () => {
  const questions = [
    { number: 4, prompt: 'Pick one.\nA. Yes\nB. No', answer: 'A', explanation: '' },
  ];
  const selections = { 4: ['A'] };

  const structuredResults = getPracticeSessionResults(questions, selections);
  assert.equal(structuredResults.correctCount, 0);

  const plainResults = getPracticeSessionResults(questions, selections, { structuredControls: false });
  assert.equal(plainResults.correctCount, 1);
  assert.equal(plainResults.scorePercent, 100);
});

// --- TOEIC Reading (Parts 5-7) engine ---

const readingBankFixture = {
  parts: {
    part5: {
      questions: [
        { id: 'p5-1', prompt: 'Blank one.', options: { A: 'a', B: 'b' }, answer: 'A', tags: ['verb-tense'] },
        { id: 'p5-2', prompt: 'Blank two.', options: { A: 'a', B: 'b' }, answer: 'B', tags: ['preposition'] },
        { id: 'p5-3', prompt: 'Blank three.', options: { A: 'a', B: 'b' }, answer: 'A', tags: ['verb-tense'] },
      ],
    },
    part6: {
      sets: [
        {
          id: 'p6-1',
          passageType: 'e-mail',
          passage: 'Dear team, [1] and [2].',
          questions: [
            { id: 'p6-1-q1', blank: 1, prompt: 'Blank [1].', options: { A: 'a', B: 'b' }, answer: 'A', tags: ['verb-form'] },
            { id: 'p6-1-q2', blank: 2, prompt: 'Blank [2].', options: { A: 'a', B: 'b' }, answer: 'B', tags: ['sentence-insertion'] },
          ],
        },
      ],
    },
    part7: {
      singleSets: [
        {
          id: 'p7-s1',
          passages: [{ type: 'notice', text: 'The elevator is closed.' }],
          questions: [
            { id: 'p7-s1-q1', prompt: 'Purpose?', options: { A: 'a', B: 'b' }, answer: 'A', tags: ['purpose'] },
            { id: 'p7-s1-q2', prompt: 'Detail?', options: { A: 'a', B: 'b' }, answer: 'B', tags: ['detail'] },
          ],
        },
      ],
      multiSets: [
        {
          id: 'p7-m1',
          passages: [
            { type: 'e-mail', text: 'See the schedule.' },
            { type: 'schedule', text: 'Salon C at 2:00.' },
          ],
          questions: [
            { id: 'p7-m1-q1', prompt: 'Cross-reference?', options: { A: 'a', B: 'b' }, answer: 'B', tags: ['cross-reference'] },
          ],
        },
      ],
    },
  },
};

test('flattenReadingBank numbers questions sequentially and builds searchable text', () => {
  const items = flattenReadingBank(readingBankFixture);

  assert.equal(items.length, 8);
  assert.deepEqual(items.map((item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(items[0].part, 5);
  assert.equal(items[3].part, 6);
  assert.equal(items[3].passages[0].type, 'e-mail');
  assert.ok(items[5].text.includes('The elevator is closed.'));
  assert.equal(items[7].passages.length, 2);
});

test('getReadingBankSummary and getMaxReadingFormScale report bank coverage', () => {
  const summary = getReadingBankSummary(readingBankFixture);

  assert.equal(summary.part5, 3);
  assert.equal(summary.part6, 2);
  assert.equal(summary.part7, 3);
  assert.equal(summary.total, 8);
  assert.equal(summary.quotas.total, 100);

  // part7 is the binding constraint: 3 of 54 questions
  assert.ok(Math.abs(getMaxReadingFormScale(readingBankFixture) - 3 / 54) < 1e-9);
});

test('assembleReadingTest keeps sets whole, numbers from 101, and scales time to length', () => {
  const form = assembleReadingTest(readingBankFixture, { seed: 'form-a' });

  assert.equal(form.questions[0].number, 101);
  assert.equal(form.totalQuestions, form.questions.length);
  assert.equal(form.isFullForm, false);
  assert.equal(
    form.timeLimitMinutes,
    Math.max(5, Math.round((75 * form.totalQuestions) / 100)),
  );

  // Questions from the same set stay adjacent
  const setPositions = {};
  form.questions.forEach((question, index) => {
    if (!question.setId) return;
    setPositions[question.setId] = setPositions[question.setId] || [];
    setPositions[question.setId].push(index);
  });
  Object.values(setPositions).forEach((positions) => {
    positions.forEach((position, index) => {
      if (index > 0) assert.equal(position, positions[index - 1] + 1);
    });
  });

  // Parts appear in exam order: 5 then 6 then 7
  const partsInOrder = form.questions.map((question) => question.part);
  assert.deepEqual([...partsInOrder].sort((a, b) => a - b), partsInOrder);
});

test('assembleReadingTest part practice returns the whole part bank untimed', () => {
  const part5Form = assembleReadingTest(readingBankFixture, { part: 5, seed: 'p5' });
  assert.equal(part5Form.totalQuestions, 3);
  assert.equal(part5Form.timeLimitMinutes, null);
  assert.ok(part5Form.questions.every((question) => question.part === 5));

  const part7Form = assembleReadingTest(readingBankFixture, { part: 7, seed: 'p7' });
  assert.equal(part7Form.totalQuestions, 3);
  assert.ok(part7Form.questions.every((question) => question.part === 7));
});

test('getScaledReadingScore interpolates the anchor table', () => {
  assert.equal(getScaledReadingScore(0, 100), 5);
  assert.equal(getScaledReadingScore(50, 100), 210);
  assert.equal(getScaledReadingScore(100, 100), 495);
  assert.equal(getScaledReadingScore(25, 50), 210);
  assert.equal(getScaledReadingScore(0, 0), 5);
});

test('getReadingTestResults scores per part and per tag', () => {
  const form = assembleReadingTest(readingBankFixture, { seed: 'score' });
  const selections = {};
  form.questions.forEach((question) => {
    selections[question.number] = question.part === 5 ? question.answer : 'Z';
  });

  const results = getReadingTestResults(form.questions, selections);
  const part5Total = form.counts[5];

  assert.equal(results.correctCount, part5Total);
  assert.equal(results.perPart[5].correct, part5Total);
  assert.equal(results.perPart[7].correct, 0);
  assert.equal(results.totalQuestions, form.totalQuestions);
  assert.ok(results.scaledScore >= 5 && results.scaledScore <= 495);

  const weakest = getWeakestReadingTags(results, { minTotal: 1, limit: 3 });
  assert.ok(weakest.length > 0);
  assert.ok(weakest[0].accuracy <= weakest[weakest.length - 1].accuracy);
});

// --- Grammar drills (Part 5 by topic) ---

test('getDrillTopics counts Part 5 questions per tag, largest first', () => {
  const topics = getDrillTopics(readingBankFixture);

  assert.deepEqual(topics, [
    { tag: 'verb-tense', count: 2 },
    { tag: 'preposition', count: 1 },
  ]);
});

test('assembleDrill filters Part 5 questions by tag and numbers from 1', () => {
  const drill = assembleDrill(readingBankFixture, { tags: ['verb-tense'], seed: 'drill' });

  assert.equal(drill.totalQuestions, 2);
  assert.equal(drill.poolSize, 2);
  assert.deepEqual(drill.questions.map((question) => question.number), [1, 2]);
  assert.ok(drill.questions.every((question) => question.tags.includes('verb-tense')));
  assert.ok(drill.questions.every((question) => question.part === 5));
});

test('assembleDrill uses the whole Part 5 bank when no tags are given and caps the length', () => {
  const drill = assembleDrill(readingBankFixture, { seed: 'drill-all' });
  assert.equal(drill.totalQuestions, 3);
  assert.equal(drill.poolSize, 3);

  const capped = assembleDrill(readingBankFixture, { questionCount: 2, seed: 'drill-cap' });
  assert.equal(capped.totalQuestions, 2);
  assert.equal(capped.poolSize, 3);
});

// --- TOEIC Listening (Parts 1-4) engine ---

const listeningBankFixture = {
  parts: {
    part1: {
      items: [
        {
          id: 'l1-1',
          image: 'l1-1.svg',
          answer: 'A',
          explanation: 'She is typing.',
          tags: ['photograph'],
          segments: [
            { id: 'l1-1-n', voice: 'narrator', text: 'Look at the picture.' },
            { id: 'l1-1-a', voice: 'man-us', text: 'A. She is typing.' },
          ],
        },
      ],
    },
    part2: {
      items: [
        {
          id: 'l2-1',
          answer: 'B',
          explanation: 'Time answer.',
          tags: ['when-question'],
          segments: [{ id: 'l2-1-q', voice: 'man-us', text: 'When does it begin?' }],
        },
        {
          id: 'l2-2',
          answer: 'C',
          explanation: 'Place answer.',
          tags: ['where-question'],
          segments: [{ id: 'l2-2-q', voice: 'woman-us', text: 'Where is it?' }],
        },
      ],
    },
    part3: {
      sets: [
        {
          id: 'l3-1',
          segments: [{ id: 'l3-1-t1', voice: 'woman-us', text: 'Hi.' }],
          questions: [
            { id: 'l3-1-q1', prompt: 'Problem?', options: { A: 'a', B: 'b' }, answer: 'A', tags: ['problem'] },
            { id: 'l3-1-q2', prompt: 'Next?', options: { A: 'a', B: 'b' }, answer: 'B', tags: ['next-action'] },
          ],
        },
      ],
    },
    part4: {
      sets: [
        {
          id: 'l4-1',
          segments: [{ id: 'l4-1-s1', voice: 'man-uk', text: 'Announcement.' }],
          questions: [
            { id: 'l4-1-q1', prompt: 'Topic?', options: { A: 'a', B: 'b' }, answer: 'A', tags: ['purpose'] },
          ],
        },
      ],
    },
  },
};

test('getListeningBankSummary and getMaxListeningFormScale report bank coverage', () => {
  const summary = getListeningBankSummary(listeningBankFixture);

  assert.equal(summary.part1, 1);
  assert.equal(summary.part2, 2);
  assert.equal(summary.part3, 2);
  assert.equal(summary.part4, 1);
  assert.equal(summary.total, 6);
  assert.equal(summary.quotas.total, 100);

  // part4 is the binding constraint: 1 of 30
  assert.ok(Math.abs(getMaxListeningFormScale(listeningBankFixture) - 1 / 30) < 1e-9);
});

test('assembleListeningTest numbers from 1, keeps groups whole, and sets response windows', () => {
  const form = assembleListeningTest(listeningBankFixture, { seed: 'listen' });

  assert.equal(form.questions[0].number, 1);
  assert.equal(form.totalQuestions, form.questions.length);
  assert.equal(form.isFullForm, false);

  // Parts appear in exam order
  const parts = form.questions.map((question) => question.part);
  assert.deepEqual([...parts].sort((a, b) => a - b), parts);

  // Group question numbers are contiguous and match the flat list
  form.groups.forEach((group) => {
    group.questionNumbers.forEach((number, index) => {
      if (index > 0) assert.equal(number, group.questionNumbers[index - 1] + 1);
    });
    assert.equal(group.responseSeconds > 0, true);
  });

  // Part 1 and 2 questions use letter-only options
  const part1Question = form.questions.find((question) => question.part === 1);
  assert.deepEqual(part1Question.options.map((option) => option.key), ['A', 'B', 'C', 'D']);
  const part2Question = form.questions.find((question) => question.part === 2);
  assert.deepEqual(part2Question.options.map((option) => option.key), ['A', 'B', 'C']);
});

test('assembleListeningTest part practice returns every group of that part', () => {
  const part2Form = assembleListeningTest(listeningBankFixture, { part: 2, seed: 'p2' });

  assert.equal(part2Form.totalQuestions, 2);
  assert.ok(part2Form.questions.every((question) => question.part === 2));
});

test('getListeningTestResults scores and getFullTestScore combines sections', () => {
  const form = assembleListeningTest(listeningBankFixture, { seed: 'score' });
  const selections = {};
  form.questions.forEach((question) => {
    selections[question.number] = question.answer;
  });

  const listeningResults = getListeningTestResults(form.questions, selections);
  assert.equal(listeningResults.correctCount, form.totalQuestions);
  assert.equal(listeningResults.scaledScore, 495);

  const combined = getFullTestScore(listeningResults, { scaledScore: 300 });
  assert.equal(combined.listening, 495);
  assert.equal(combined.reading, 300);
  assert.equal(combined.total, 795);
});

test('fixed Test 1 and Test 2 forms contain 200 distinct questions each', () => {
  const combinedReading = {
    ...readingContent,
    parts: {
      ...readingContent.parts,
      part7: {
        ...readingContent.parts.part7,
        singleSets: [...readingContent.parts.part7.singleSets, ...test2ReadingSingleSets],
      },
    },
  };
  const combinedListening = {
    ...listeningContent,
    parts: {
      part1: { items: [...listeningContent.parts.part1.items, ...test2ListeningContent.parts.part1.items] },
      part2: { items: [...listeningContent.parts.part2.items, ...test2ListeningContent.parts.part2.items] },
      part3: { sets: [...listeningContent.parts.part3.sets, ...test2ListeningContent.parts.part3.sets] },
      part4: { sets: [...listeningContent.parts.part4.sets, ...test2ListeningContent.parts.part4.sets] },
    },
  };

  const reading1 = assembleReadingTest(combinedReading, { formNumber: 1 });
  const reading2 = assembleReadingTest(combinedReading, { formNumber: 2 });
  const listening1 = assembleListeningTest(combinedListening, { formNumber: 1 });
  const listening2 = assembleListeningTest(combinedListening, { formNumber: 2 });

  [reading1, reading2, listening1, listening2].forEach((form) => assert.equal(form.totalQuestions, 100));
  assert.deepEqual(reading2.counts, { 5: 30, 6: 16, 7: 54 });
  assert.deepEqual(listening2.counts, { 1: 6, 2: 25, 3: 39, 4: 30 });
  const reading1Ids = new Set(reading1.questions.map(({ id }) => id));
  const listening1Ids = new Set(listening1.questions.map(({ id }) => id));
  assert.equal(reading2.questions.some(({ id }) => reading1Ids.has(id)), false);
  assert.equal(listening2.questions.some(({ id }) => listening1Ids.has(id)), false);
});
