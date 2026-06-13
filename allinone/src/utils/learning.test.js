import assert from 'node:assert/strict';
import test from 'node:test';
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
  getPracticeQuestionDisplayParts,
  getPracticeSessionResults,
  getStudyMaterialPages,
  getVisualQuestionDisplayParts,
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

test('getPracticeSessionResults scores selected answers without caring about order', () => {
  const questions = [
    { number: 1, prompt: 'Question 1\nA. One\nB. Two', answer: 'A' },
    { number: 2, prompt: 'Question 2\nA. One\nB. Two\nC. Three', answer: 'AC' },
  ];

  const results = getPracticeSessionResults(questions, {
    1: ['A'],
    2: ['C', 'A'],
  });

  assert.equal(results.correctCount, 2);
  assert.equal(results.totalQuestions, 2);
  assert.equal(results.scorePercent, 100);
  assert.deepEqual(results.items.map((item) => item.isCorrect), [true, true]);
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
