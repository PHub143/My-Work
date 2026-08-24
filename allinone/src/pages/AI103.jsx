import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AI103.css';
import LearningTabs from '../components/LearningTabs';
import q1AnswerArea from '../assets/ai103/q1-answer-area.png';
import q1AnswerAreaBlank from '../assets/ai103/q1-answer-area-blank.png';
import q4AnswerArea from '../assets/ai103/q4-answer-area.png';
import q4AnswerAreaBlank from '../assets/ai103/q4-answer-area-blank.png';
import q5AnswerArea from '../assets/ai103/q5-answer-area.png';
import q5AnswerAreaBlank from '../assets/ai103/q5-answer-area-blank.png';
import q6AnswerArea from '../assets/ai103/q6-answer-area.png';
import q6AnswerAreaBlank from '../assets/ai103/q6-answer-area-blank.png';
import q7AnswerArea from '../assets/ai103/q7-answer-area.png';
import q7AnswerAreaBlank from '../assets/ai103/q7-answer-area-blank.png';
import q8AnswerArea from '../assets/ai103/q8-answer-area.png';
import q8AnswerAreaBlank from '../assets/ai103/q8-answer-area-blank.png';
import q11AnswerArea from '../assets/ai103/q11-answer-area.png';
import q11AnswerAreaBlank from '../assets/ai103/q11-answer-area-blank.png';
import q15AnswerArea from '../assets/ai103/q15-answer-area.png';
import q15AnswerAreaBlank from '../assets/ai103/q15-answer-area-blank.png';
import q18AnswerArea from '../assets/ai103/q18-answer-area.png';
import q18AnswerAreaBlank from '../assets/ai103/q18-answer-area-blank.png';
import q20AnswerArea from '../assets/ai103/q20-answer-area.png';
import q20AnswerAreaBlank from '../assets/ai103/q20-answer-area-blank.png';
import q30AnswerArea from '../assets/ai103/q30-answer-area.png';
import q30AnswerAreaBlank from '../assets/ai103/q30-answer-area-blank.png';
import q32AnswerArea from '../assets/ai103/q32-answer-area.png';
import q32AnswerAreaBlank from '../assets/ai103/q32-answer-area-blank.png';
import q37AnswerArea from '../assets/ai103/q37-answer-area.png';
import q37AnswerAreaBlank from '../assets/ai103/q37-answer-area-blank.png';
import q49AnswerAreaBlank from '../assets/ai103/q49-answer-area-blank.png';
import q66AnswerArea from '../assets/ai103/q66-answer-area.png';
import q66AnswerAreaBlank from '../assets/ai103/q66-answer-area-blank.png';
import q68AnswerArea from '../assets/ai103/q68-answer-area.png';
import q68AnswerAreaBlank from '../assets/ai103/q68-answer-area-blank.png';
import q71AnswerArea from '../assets/ai103/q71-answer-area.png';
import q71AnswerAreaBlank from '../assets/ai103/q71-answer-area-blank.png';
import q79AnswerArea from '../assets/ai103/q79-answer-area.png';
import q79AnswerAreaBlank from '../assets/ai103/q79-answer-area-blank.png';
import q86AnswerArea from '../assets/ai103/q86-answer-area.png';
import q86AnswerAreaBlank from '../assets/ai103/q86-answer-area-blank.png';
import q92AnswerArea from '../assets/ai103/q92-answer-area.png';
import q92AnswerAreaBlank from '../assets/ai103/q92-answer-area-blank.png';
import q93AnswerArea from '../assets/ai103/q93-answer-area.png';
import q93AnswerAreaBlank from '../assets/ai103/q93-answer-area-blank.png';
import q94AnswerArea from '../assets/ai103/q94-answer-area.png';
import q94AnswerAreaBlank from '../assets/ai103/q94-answer-area-blank.png';
import q95AnswerArea from '../assets/ai103/q95-answer-area.png';
import q95AnswerAreaBlank from '../assets/ai103/q95-answer-area-blank.png';
import q98AnswerArea from '../assets/ai103/q98-answer-area.png';
import q98AnswerAreaBlank from '../assets/ai103/q98-answer-area-blank.png';
import q99AnswerArea from '../assets/ai103/q99-answer-area.png';
import q99AnswerAreaBlank from '../assets/ai103/q99-answer-area-blank.png';
import q101Exhibit from '../assets/ai103/q101-exhibit.png';
import q101AnswerArea from '../assets/ai103/q101-answer-area.png';
import q101AnswerAreaBlank from '../assets/ai103/q101-answer-area-blank.png';
import q103AnswerArea from '../assets/ai103/q103-answer-area.png';
import q103AnswerAreaBlank from '../assets/ai103/q103-answer-area-blank.png';
import q104AnswerArea from '../assets/ai103/q104-answer-area.png';
import q104AnswerAreaBlank from '../assets/ai103/q104-answer-area-blank.png';
import q107Exhibit from '../assets/ai103/q107-exhibit.png';
import q107AnswerArea from '../assets/ai103/q107-answer-area.png';
import q107AnswerAreaBlank from '../assets/ai103/q107-answer-area-blank.png';
import q108AnswerArea from '../assets/ai103/q108-answer-area.png';
import q108AnswerAreaBlank from '../assets/ai103/q108-answer-area-blank.png';
import q112AnswerArea from '../assets/ai103/q112-answer-area.png';
import q112AnswerAreaBlank from '../assets/ai103/q112-answer-area-blank.png';
import q113AnswerArea from '../assets/ai103/q113-answer-area.png';
import q113AnswerAreaBlank from '../assets/ai103/q113-answer-area-blank.png';
import q114Exhibit from '../assets/ai103/q114-exhibit.png';
import q114AnswerArea from '../assets/ai103/q114-answer-area.png';
import q114AnswerAreaBlank from '../assets/ai103/q114-answer-area-blank.png';
import q117AnswerArea from '../assets/ai103/q117-answer-area.png';
import q117AnswerAreaBlank from '../assets/ai103/q117-answer-area-blank.png';
import ai103Content from '../data/ai103Content.json';
import { multipleChoiceExhibitConfigs, visualCodeHotspotConfigs } from '../data/ai103ExhibitConfigs';
import { ExhibitTable, ExhibitCode, CodeWithBlanks, HotspotFields, ReferenceLinks } from './ai103Exhibits';
import {
  getCaseStudyChoiceQuestionDisplayParts,
  getChoiceQuestionDisplayParts,
  filterLearningQuestions,
  getLearningStats,
  getQuestionOneDisplayParts,
  getQuestionTwentyOneDisplayParts,
  getQuestionTwoDisplayParts,
  getQuestionPagination,
  getVisualQuestionDisplayParts,
} from '../utils/learning';

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function splitPageText(text) {
  if (!text || !text.trim()) {
    return [];
  }

  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

const visualQuestionConfigs = {
  11: {
    blankImage: q11AnswerAreaBlank,
    solvedImage: q11AnswerArea,
    imagePageLabel: 'PDF page 18',
    blankAlt:
      'Question 11 workflow answer area showing the type dropdown for the approval step and the condition dropdown for the execute_refund step before the correct selections are highlighted.',
    solvedAlt:
      'Question 11 answer area showing type set to ask_question and condition set to approval equals approved.',
    answerRows: [
      { label: 'Approval step type', value: 'ask_question' },
      { label: 'Execute refund condition', value: 'approval == "approved"' },
    ],
  },
  4: {
    blankImage: q4AnswerAreaBlank,
    solvedImage: q4AnswerArea,
    imagePageLabel: 'PDF page 11',
    blankAlt:
      'Question 4 answer area listing three statements with Yes and No columns before any hotspot selections are highlighted.',
    solvedAlt:
      'Question 4 answer area showing the selected answers No, Yes, and No highlighted for the three statements.',
    answerRows: [
      {
        label: 'The LangChain service will appear in Traces without configuring a tracer',
        value: 'No',
      },
      {
        label: 'Setting different OTEL_SERVICE_NAME values separates the services in Application Insights',
        value: 'Yes',
      },
      {
        label: 'When using enable_content_recording=False, prompts and tool data will be captured in the telemetry',
        value: 'No',
      },
    ],
  },
  5: {
    blankImage: q5AnswerAreaBlank,
    solvedImage: q5AnswerArea,
    imagePageLabel: 'PDF page 12',
    blankAlt:
      'Question 5 drag-and-drop answer area showing the four configuration choices and empty Pipeline1 and Pipeline2 targets.',
    solvedAlt:
      'Question 5 answer area showing the corrected pipeline configuration in the answer summary below.',
    answerRows: [
      { label: 'Pipeline1', value: 'Single-file task in standard mode' },
      { label: 'Pipeline2', value: 'Multi-file task in pro mode' },
    ],
  },
  6: {
    blankImage: q6AnswerAreaBlank,
    solvedImage: q6AnswerArea,
    imagePageLabel: 'PDF page 13',
    blankAlt:
      'Question 6 Python code answer area showing dropdown choices for the credential type and the OpenAI Responses API method before the correct answers are highlighted.',
    solvedAlt:
      'Question 6 answer area showing DefaultAzureCredential and create highlighted in the Python code sample.',
    answerRows: [
      { label: 'Credential', value: 'DefaultAzureCredential' },
      { label: 'Responses method', value: 'create' },
    ],
  },
  7: {
    blankImage: q7AnswerAreaBlank,
    solvedImage: q7AnswerArea,
    imagePageLabel: 'PDF page 14',
    blankAlt:
      'Question 7 answer area showing Power Fx dropdown options for the if/else condition expression and the send message expression.',
    solvedAlt:
      'Question 7 answer area showing Not(IsBlank(Local.Var01)) and {Upper(Local.Var01)} highlighted.',
    answerRows: [
      { label: 'If/else condition expression', value: 'Not(IsBlank(Local.Var01))' },
      { label: 'Send message expression', value: '{Upper(Local.Var01)}' },
    ],
  },
  8: {
    blankImage: q8AnswerAreaBlank,
    solvedImage: q8AnswerArea,
    imagePageLabel: 'PDF page 15',
    blankAlt:
      'Question 8 answer area showing dropdown options for the Content Safety guardrails and the storage access configuration.',
    solvedAlt:
      'Question 8 answer area showing all guardrails set to Block and storage access set to a system-assigned managed identity with the Storage Blob Data Reader role.',
    answerRows: [
      {
        label: 'Guardrails',
        value: 'Select User input, Output, Tool response, and Tool call and set Action to Block',
      },
      {
        label: 'Storage access',
        value: 'A system-assigned managed identity that is assigned the Storage Blob Data Reader role',
      },
    ],
  },
  15: {
    blankImage: q15AnswerAreaBlank,
    solvedImage: q15AnswerArea,
    imagePageLabel: 'PDF pages 21, 22',
    blankAlt:
      'Question 15 drag-and-drop answer area showing the observability signals and empty targets for unsupported responses and policy violations.',
    solvedAlt:
      'Question 15 answer area showing unsupported responses mapped to Groundedness evaluation metrics and policy violations mapped to Risk and safety metrics.',
    answerRows: [
      { label: 'Unsupported responses', value: 'Groundedness evaluation metrics' },
      { label: 'Policy violations', value: 'Risk and safety metrics' },
    ],
  },
  18: {
    blankImage: q18AnswerAreaBlank,
    solvedImage: q18AnswerArea,
    imagePageLabel: 'PDF page 24',
    blankAlt:
      'Question 18 answer area showing dropdown choices for the metrics to enable and the diagnostic log to collect.',
    solvedAlt:
      'Question 18 answer area showing Model Availability Rate and Provisioned Utilization plus RequestResponse highlighted.',
    answerRows: [
      { label: 'Metrics to enable', value: 'Model Availability Rate and Provisioned Utilization' },
      { label: 'Diagnostic log to collect', value: 'RequestResponse' },
    ],
  },
  20: {
    blankImage: q20AnswerAreaBlank,
    solvedImage: q20AnswerArea,
    imagePageLabel: 'PDF pages 25, 26',
    blankAlt:
      'Question 20 answer area showing dropdown choices for tool_choice and the tool authentication configuration before the correct selections are highlighted.',
    solvedAlt:
      'Question 20 answer area showing tool_choice set to required and the tool configured to use a distinct agent identity bound to the client application.',
    answerRows: [
      { label: 'Set tool_choice to', value: 'required' },
      { label: 'Configure the tool to authenticate by', value: 'Using a distinct agent identity bound to the client application' },
    ],
  },
  30: {
    blankImage: q30AnswerAreaBlank,
    solvedImage: q30AnswerArea,
    imagePageLabel: 'PDF page 35',
    blankAlt:
      'Question 30 answer area showing the available drag-and-drop values and the blank Python run_payload slots before the correct selections are highlighted.',
    solvedAlt:
      'Question 30 answer area showing the Python run_payload configured with tool_choice as the key and required as the selected value.',
  },
  32: {
    blankImage: q32AnswerAreaBlank,
    solvedImage: q32AnswerArea,
    imagePageLabel: 'PDF page 37',
    blankAlt:
      'Question 32 drag-and-drop answer area showing the available tools and the empty targets for public websites, calculations, and uploaded documents.',
    solvedAlt:
      'Question 32 answer area showing Grounding with Bing Search, Code interpreter, and File search matched to the three requirements.',
    answerRows: [
      { label: 'Access up-to-date information from public websites', value: 'Grounding with Bing Search' },
      { label: 'Perform calculations during conversations', value: 'Code interpreter' },
      { label: 'Retrieve information from documents uploaded directly to the agent', value: 'File search' },
    ],
  },
  35: {
    imagePageLabel: 'PDF page 40',
    ...visualCodeHotspotConfigs[35],
    answerRows: [
      { label: 'temperature', value: '1' },
      { label: 'output_config.effort', value: '"low"' },
    ],
  },
  37: {
    blankImage: q37AnswerAreaBlank,
    solvedImage: q37AnswerArea,
    imagePageLabel: 'PDF page 42',
    blankAlt:
      'Question 37 answer area showing dropdown choices for long-term preference retention and contextual grounding during chat uploads before the correct answers are highlighted.',
    solvedAlt:
      'Question 37 answer area showing agent memory that uses persistent storage and File search tool highlighted.',
    answerRows: [
      { label: 'Retain user preferences across conversations', value: 'Agent memory that uses persistent storage' },
      { label: 'Provide contextual grounding during chats', value: 'File search tool' },
    ],
  },
  40: {
    imagePageLabel: 'PDF pages 44, 45',
    ...visualCodeHotspotConfigs[40],
    answerRows: [
      { label: 'Authentication method', value: 'An Azure Login action that uses OpenID Connect (OIDC)' },
      { label: 'If the evaluation results are NOT met, configure the workflow to', value: 'Fail' },
    ],
  },
  77: {
    imagePageLabel: 'CertyIQ source (page missing from local PDF)',
    ...visualCodeHotspotConfigs[77],
    answerRows: [
      { label: 'memory_tool scope', value: '"{{$userId}}"' },
      { label: 'agent_def tools', value: '[memory_tool]' },
    ],
  },
  118: {
    imagePageLabel: 'PDF page 158',
    ...visualCodeHotspotConfigs[118],
    answerRows: [
      { label: 'Project Types', value: 'Classification' },
      { label: 'Classification Types', value: 'Multiclass (Single tag per image)' },
      { label: 'Domains', value: 'General (compact)' },
    ],
  },
  121: {
    imagePageLabel: 'PDF page 159',
    ...visualCodeHotspotConfigs[121],
    answerRows: [
      { label: 'The code will detect the language of documents', value: 'Yes' },
      { label: 'The url attribute returned for each linked entity will be a Bing search link', value: 'Yes' },
      {
        label: 'The matches attribute returned for each linked entity will provide the location in a document where the entity is referenced',
        value: 'No',
      },
    ],
  },
  122: {
    imagePageLabel: 'PDF page 160',
    ...visualCodeHotspotConfigs[122],
    answerRows: [
      { label: 'Model evaluation', value: 'Use model catalog leaderboards and model cards.' },
      { label: 'Deployment option', value: 'Use a serverless deployment.' },
    ],
  },
  124: {
    imagePageLabel: 'PDF page 162',
    ...visualCodeHotspotConfigs[124],
    answerRows: [
      {
        label: 'The response will contain an explanation of large language models (LLMs) that has a high degree of certainty',
        value: 'Yes',
      },
      {
        label: 'Changing "What is an LLM?" to "What is an LLM in the context of AI models?" will produce the intended response',
        value: 'Yes',
      },
      {
        label: 'Changing "You are a helpful assistant." to "You must answer only within the context of AI language models." will give a higher likelihood of producing the intended response',
        value: 'No',
      },
    ],
  },
  128: {
    imagePageLabel: 'PDF page 165',
    ...visualCodeHotspotConfigs[128],
    answerRows: [
      { label: 'Extract text', value: 'Azure Document Intelligence in Foundry Tools' },
      { label: 'Perform sentiment analysis', value: 'Azure Language in Foundry Tools' },
    ],
  },
  130: {
    imagePageLabel: 'PDF page 167',
    ...visualCodeHotspotConfigs[130],
    answerRows: [
      {
        label: 'Going to http://localhost:5000/status will query the Azure endpoint to verify whether the API key used to start the container is valid',
        value: 'Yes',
      },
      { label: 'The container logging provider will write log data', value: 'No' },
      {
        label: 'Going to http://localhost:5000/swagger will provide the details to access the documentation for the available endpoints',
        value: 'Yes',
      },
    ],
  },
  134: {
    imagePageLabel: 'PDF page 170',
    ...visualCodeHotspotConfigs[134],
    answerRows: [
      { label: 'HTTP method', value: 'GET' },
      { label: 'visualFeatures value', value: 'imageType' },
    ],
  },
  49: {
    blankImage: q49AnswerAreaBlank,
    imagePageLabel: 'PDF page 50',
    blankAlt:
      'Question 49 answer area showing dropdown choices for the prompt shields action and the added mitigation for malicious text embedded in screenshots.',
    answerRows: [
      { label: 'Prompt shields action', value: 'Set action to block' },
      { label: 'Additional mitigation', value: 'Enable Spotlighting.' },
    ],
  },
  66: {
    blankImage: q66AnswerAreaBlank,
    solvedImage: q66AnswerArea,
    imagePageLabel: 'PDF page 92',
    blankAlt:
      'Question 66 Python code answer area showing dropdown choices for the two client.videos method calls before the correct answers are highlighted.',
    solvedAlt: 'Question 66 answer area showing create and retrieve highlighted for the two client.videos method calls.',
    answerRows: [
      { label: 'Initial video generation call', value: 'create' },
      { label: 'Polling call using video.id', value: 'retrieve' },
    ],
  },
  68: {
    blankImage: q68AnswerAreaBlank,
    solvedImage: q68AnswerArea,
    imagePageLabel: 'PDF pages 98, 99',
    blankAlt:
      'Question 68 Python code answer area showing dropdown choices for the credential and the agent retrieval method before the correct answers are highlighted.',
    solvedAlt: 'Question 68 answer area showing DefaultAzureCredential() and get highlighted.',
    answerRows: [
      { label: 'credential', value: 'DefaultAzureCredential()' },
      { label: 'project_client.agents method', value: 'get' },
    ],
  },
  71: {
    blankImage: q71AnswerAreaBlank,
    solvedImage: q71AnswerArea,
    imagePageLabel: 'PDF pages 102, 103',
    blankAlt:
      'Question 71 answer area showing dropdown choices for the groundedness metric and the sensitive-information metric before the correct answers are highlighted.',
    solvedAlt: 'Question 71 answer area showing Groundedness and Relevance plus Protected material highlighted.',
    answerRows: [
      {
        label: 'To measure whether the responses are supported by the provided context and address the user query',
        value: 'Groundedness and Relevance',
      },
      { label: 'To measure whether responses contain sensitive or proprietary information', value: 'Protected material' },
    ],
  },
  79: {
    blankImage: q79AnswerAreaBlank,
    solvedImage: q79AnswerArea,
    imagePageLabel: 'PDF pages 108, 109',
    blankAlt:
      'Question 79 answer area showing dropdown choices for the orchestration pattern and the approval checkpoint node before the correct answers are highlighted.',
    solvedAlt:
      'Question 79 answer area showing the sequential template that passes outputs node-by-node and Add an Ask a question node highlighted.',
    answerRows: [
      { label: 'Orchestration pattern', value: 'The sequential template that passes outputs node by-node' },
      { label: 'Approval checkpoint', value: 'Add an Ask a question node.' },
    ],
  },
  86: {
    blankImage: q86AnswerAreaBlank,
    solvedImage: q86AnswerArea,
    imagePageLabel: 'PDF pages 116, 117',
    blankAlt:
      'Question 86 drag-and-drop answer area showing the available values and empty targets for field value type and field method.',
    solvedAlt: 'Question 86 answer area showing field value type set to string and field method set to generate.',
    answerRows: [
      { label: 'Field value type', value: 'string' },
      { label: 'Field method', value: 'generate' },
    ],
  },
  92: {
    blankImage: q92AnswerAreaBlank,
    solvedImage: q92AnswerArea,
    imagePageLabel: 'PDF pages 123, 124',
    blankAlt:
      'Question 92 answer area showing dropdown choices for the managed identity scope and the Key Vault authorization method before the correct answers are highlighted.',
    solvedAlt:
      'Question 92 answer area showing a system-assigned managed identity at the Foundry level and the Key Vault Secrets User role highlighted.',
    answerRows: [
      { label: 'Managed identity scope', value: 'Enable a system-assigned managed identity at the Foundry level.' },
      {
        label: 'Key Vault authorization method',
        value: 'Assign the Key Vault Secrets User role to the managed identity.',
      },
    ],
  },
  93: {
    blankImage: q93AnswerAreaBlank,
    solvedImage: q93AnswerArea,
    imagePageLabel: 'PDF page 125',
    blankAlt:
      'Question 93 answer area showing three statements about content filtering and fine-tuning results with Yes and No columns before any selections are highlighted.',
    solvedAlt: 'Question 93 answer area showing No, Yes, and Yes highlighted for the three statements.',
    answerRows: [
      {
        label: 'Changing the content filtering configuration to low severity will resolve the fine-tuning job issues',
        value: 'No',
      },
      {
        label:
          'The difference between the 12% and 4% content harm defect rate is consistent with the different severity thresholds used in Run1 and Run2',
        value: 'Yes',
      },
      {
        label:
          'The identical 6% protected material evaluation values across Run1 and Run2 indicate that this metric is unaffected by the change in the severity threshold',
        value: 'Yes',
      },
    ],
  },
  94: {
    blankImage: q94AnswerAreaBlank,
    solvedImage: q94AnswerArea,
    imagePageLabel: 'PDF page 126',
    blankAlt:
      'Question 94 drag-and-drop answer area showing the available tracing options and empty targets for the two observability requirements.',
    solvedAlt: 'Question 94 answer area showing Hierarchical spans and Tool call attributes matched to the two requirements.',
    answerRows: [
      { label: 'Capture all the nested operations across the entire agent run', value: 'Hierarchical spans' },
      { label: 'Record tool invocation arguments and results', value: 'Tool call attributes' },
    ],
  },
  95: {
    blankImage: q95AnswerAreaBlank,
    solvedImage: q95AnswerArea,
    imagePageLabel: 'PDF pages 127, 128',
    blankAlt:
      'Question 95 drag-and-drop answer area showing the available actions and empty targets for the HTTP 429 and HTTP 400 errors.',
    solvedAlt:
      'Question 95 answer area showing exponential backoff and jitter matched to HTTP 429, and moving large content to files matched to HTTP 400.',
    answerRows: [
      { label: 'HTTP 429', value: 'Implement exponential backoff and jitter in the retry logic.' },
      { label: 'HTTP 400', value: 'Move large content to files and use file search.' },
    ],
  },
  98: {
    blankImage: q98AnswerAreaBlank,
    solvedImage: q98AnswerArea,
    imagePageLabel: 'PDF pages 131, 132',
    blankAlt:
      'Question 98 Bicep code answer area showing dropdown choices for the connection category and authentication type before the correct answers are highlighted.',
    solvedAlt: "Question 98 answer area showing 'AzureKeyVault' and 'AccountManagedIdentity' highlighted.",
    answerRows: [
      { label: 'category', value: "'AzureKeyVault'" },
      { label: 'authType', value: "'AccountManagedIdentity'" },
    ],
  },
  99: {
    blankImage: q99AnswerAreaBlank,
    solvedImage: q99AnswerArea,
    imagePageLabel: 'PDF page 133',
    blankAlt:
      'Question 99 answer area showing dropdown choices for knowledge grounding and memory configuration before the correct answers are highlighted.',
    solvedAlt:
      'Question 99 answer area showing Configure revival from approved data sources and Enable agent memory that uses persistent storage highlighted.',
    answerRows: [
      { label: 'Knowledge grounding', value: 'Configure revival from approved data sources.' },
      { label: 'Memory', value: 'Enable agent memory that uses persistent storage.' },
    ],
  },
  101: {
    exhibitImage: q101Exhibit,
    exhibitAlt:
      'Code segment that iterates over image_analysis.brands and prints the name and rectangle coordinates for brands with confidence of 0.75 or higher.',
    exhibitPageLabel: 'PDF page 135',
    blankImage: q101AnswerAreaBlank,
    solvedImage: q101AnswerArea,
    imagePageLabel: 'PDF pages 135, 136',
    blankAlt:
      'Question 101 answer area showing three statements about the code segment output with Yes and No columns before any selections are highlighted.',
    solvedAlt: 'Question 101 answer area showing Yes, Yes, and No highlighted for the three statements.',
    answerRows: [
      {
        label: 'The code will display the name of each detected brand with a confidence equal to or higher than 75 percent',
        value: 'Yes',
      },
      {
        label:
          'The code will display coordinates for the top-left corner of the rectangle that contains the brand logo of the displayed brands',
        value: 'Yes',
      },
      {
        label:
          'The code will display coordinates for the bottom-right corner of the rectangle that contains the brand logo of the displayed brands',
        value: 'No',
      },
    ],
  },
  103: {
    blankImage: q103AnswerAreaBlank,
    solvedImage: q103AnswerArea,
    imagePageLabel: 'PDF page 138',
    blankAlt:
      'Question 103 CLI command answer area showing dropdown choices for the resource kind and a flag before the correct answers are highlighted.',
    solvedAlt: 'Question 103 answer area showing OpenAI and --encryption highlighted.',
    answerRows: [
      { label: '--kind', value: 'OpenAI' },
      { label: 'Flag before the JSON payload', value: '--encryption' },
    ],
  },
  104: {
    blankImage: q104AnswerAreaBlank,
    solvedImage: q104AnswerArea,
    imagePageLabel: 'PDF pages 139, 140',
    blankAlt:
      'Question 104 Python code answer area showing dropdown choices for the request and response calls before the correct answers are highlighted.',
    solvedAlt: 'Question 104 answer area showing AnalyzeTextOptions(text=comment) and client.analyze_text(request) highlighted.',
    answerRows: [
      { label: 'request =', value: 'AnalyzeTextOptions(text=comment)' },
      { label: 'response =', value: 'client.analyze_text(request)' },
    ],
  },
  107: {
    exhibitImage: q107Exhibit,
    exhibitAlt:
      'Python code that redacts PII from sample_text and returns text_for_model and an audit list of redacted entities.',
    exhibitPageLabel: 'PDF page 143',
    blankImage: q107AnswerAreaBlank,
    solvedImage: q107AnswerArea,
    imagePageLabel: 'PDF page 144',
    blankAlt:
      'Question 107 answer area showing three statements about the redaction code output with Yes and No columns before any selections are highlighted.',
    solvedAlt: 'Question 107 answer area showing No, No, and Yes highlighted for the three statements.',
    answerRows: [
      { label: 'For sample_text, audit will include entity records for Contact and SSN', value: 'No' },
      {
        label: 'For sample_text, text_for_model will include john.doe@contoso.com and 859-98-0987',
        value: 'No',
      },
      {
        label: 'For sample_text, text_for_model will contain entity type masks for John Doe and 312-555-1234',
        value: 'Yes',
      },
    ],
  },
  108: {
    blankImage: q108AnswerAreaBlank,
    solvedImage: q108AnswerArea,
    imagePageLabel: 'PDF page 145',
    blankAlt:
      'Question 108 answer area showing the available actions and three empty ordered targets before the correct sequence is highlighted.',
    solvedAlt: 'Question 108 answer area showing Create a project, Upload and tag images, and Train the classifier model in order.',
    answerRows: [
      { label: '1', value: 'Create a project.' },
      { label: '2', value: 'Upload and tag images.' },
      { label: '3', value: 'Train the classifier model.' },
    ],
  },
  112: {
    blankImage: q112AnswerAreaBlank,
    solvedImage: q112AnswerArea,
    imagePageLabel: 'PDF pages 149, 150',
    blankAlt:
      'Question 112 answer area showing the available actions and three empty ordered targets before the correct sequence is highlighted.',
    solvedAlt:
      'Question 112 answer area showing the app switched to the secondary admin key, the primary key regenerated, then the app switched to the new key.',
    answerRows: [
      { label: '1', value: 'Change the app to use the secondary admin key.' },
      { label: '2', value: 'Regenerate the primary admin key.' },
      { label: '3', value: 'Change the app to use the new key.' },
    ],
  },
  113: {
    blankImage: q113AnswerAreaBlank,
    solvedImage: q113AnswerArea,
    imagePageLabel: 'PDF pages 151, 152',
    blankAlt:
      'Question 113 REST request answer area showing dropdown choices for the HTTP method and the resource kind before the correct answers are highlighted.',
    solvedAlt: 'Question 113 answer area showing PUT and CognitiveServices highlighted.',
    answerRows: [
      { label: 'HTTP method', value: 'PUT' },
      { label: 'kind', value: 'CognitiveServices' },
    ],
  },
  114: {
    exhibitImage: q114Exhibit,
    exhibitAlt: 'Custom Vision performance dashboard for Iteration 1 showing Precision 100.0%, Recall 25.0%, and mAP 77.2%.',
    exhibitPageLabel: 'PDF page 153',
    blankImage: q114AnswerAreaBlank,
    solvedImage: q114AnswerArea,
    imagePageLabel: 'PDF pages 153, 154',
    blankAlt:
      'Question 114 answer area showing dropdown choices for the false positive percentage and the true positive ratio before the correct answers are highlighted.',
    solvedAlt: 'Question 114 answer area showing 0 and 100 highlighted.',
    answerRows: [
      { label: 'The percentage of false positives is', value: '0' },
      {
        label: 'The value for the number of true positives divided by the total number of true positives and false negatives is',
        value: '100',
      },
    ],
  },
  117: {
    blankImage: q117AnswerAreaBlank,
    solvedImage: q117AnswerArea,
    imagePageLabel: 'PDF page 157',
    blankAlt:
      'Question 117 answer area showing dropdown choices for the JSON data projection and the extracted text data projection before the correct answers are highlighted.',
    solvedAlt: 'Question 117 answer area showing Object projection and Table projection highlighted.',
    answerRows: [
      { label: 'JSON data', value: 'Object projection' },
      { label: 'Extracted text data', value: 'Table projection' },
    ],
  },
};

const multipleChoiceQuestionConfigs = multipleChoiceExhibitConfigs;

function AnswerSummaryRows({ rows }) {
  if (!rows?.length) {
    return null;
  }

  return (
    <div className="ai103-answer-chips" role="list" aria-label="Answer summary">
      {rows.map((row, index) => {
        const heading = row.label || row.key;
        const rowKey = `${heading}-${row.value}-${index}`;

        return (
          <span className="ai103-answer-chip" key={rowKey} role="listitem">
            {heading}: {row.value}
          </span>
        );
      })}
    </div>
  );
}

function AnswerSelectionChips({ selections }) {
  if (!selections?.length) {
    return null;
  }

  return (
    <div className="ai103-answer-chips">
      {selections.map((selection) => (
        <span className="ai103-answer-chip" key={selection}>
          {selection}
        </span>
      ))}
    </div>
  );
}

function PromptBlock({ paragraphs, fallback }) {
  if (!paragraphs.length) {
    return fallback ? (
      <p className="ai103-question-prompt empty">{fallback}</p>
    ) : null;
  }

  return paragraphs.map((paragraph, index) => (
    <p className="ai103-question-prompt" key={`prompt-${index}`}>
      {paragraph}
    </p>
  ));
}

function OptionsGrid({ options, selectedKeys = [], ariaLabel }) {
  if (!options?.length) {
    return null;
  }

  return (
    <div className="ai103-option-grid" role="list" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = selectedKeys.includes(option.key);
        return (
          <div
            className={`ai103-option-card${isSelected ? ' selected' : ''}`}
            key={option.key}
            role="listitem"
          >
            <span className="ai103-option-key">{option.key}</span>
            <p>{option.text}</p>
          </div>
        );
      })}
    </div>
  );
}

function AnswerBlock({ selections, summaryRows, paragraphText, illustration }) {
  return (
    <section className="ai103-answer-block" aria-labelledby="ai103-answer-heading">
      <h3 id="ai103-answer-heading">Answer</h3>
      {selections ? <AnswerSelectionChips selections={selections} /> : null}
      {summaryRows ? <AnswerSummaryRows rows={summaryRows} /> : null}
      {paragraphText ? <p className="ai103-answer-text">{paragraphText}</p> : null}
      {illustration ? (
        <figure className="ai103-illustration">
          <figcaption>Reference Illustration</figcaption>
          <img src={illustration} alt="Reference illustration for the question" />
        </figure>
      ) : null}
    </section>
  );
}

function ExplanationBlock({ paragraphs }) {
  if (!paragraphs.length) {
    return null;
  }

  return (
    <section className="ai103-explanation" aria-labelledby="ai103-explanation-heading">
      <h3 id="ai103-explanation-heading">Explanation</h3>
      {paragraphs.map((paragraph, index) => (
        <p key={`explanation-${index}`}>{paragraph}</p>
      ))}
    </section>
  );
}

function SectionBlock({ title, children, ariaLabelledBy, className = '' }) {
  const classes = ['ai103-section-block'];
  if (className) classes.push(className);
  const sectionProps = title && ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {};
  return (
    <section className={classes.join(' ')} {...sectionProps}>
      {title ? <h3 id={ariaLabelledBy}>{title}</h3> : null}
      {children}
    </section>
  );
}

function QuestionOneContent({ question, explanationParagraphs }) {
  const questionParts = getQuestionOneDisplayParts(question);

  return (
    <>
      <SectionBlock title={questionParts.caseStudyTitle} ariaLabelledBy="ai103-q1-case-study" className="ai103-section-block--lead">
        {questionParts.caseStudyParagraphs.map((paragraph, index) => (
          <p key={`q1-case-study-${index}`}>{paragraph}</p>
        ))}
      </SectionBlock>

      <div className="ai103-q1-section-stack" aria-label="Question 1 case study details">
        {questionParts.sections.map((section, index) => (
          <SectionBlock title={section.title} ariaLabelledBy={`ai103-q1-section-${index}`} key={section.title}>
            {section.paragraphs.map((paragraph, pIndex) => (
              <p key={`${section.title}-${pIndex}`}>{paragraph}</p>
            ))}
          </SectionBlock>
        ))}
      </div>

      <SectionBlock title="Question" ariaLabelledBy="ai103-q1-question">
        <PromptBlock paragraphs={questionParts.finalPrompt} />
      </SectionBlock>

      <SectionBlock title="Answer Area (Blank) · PDF page 6" ariaLabelledBy="ai103-q1-answer-area">
        <img
          src={q1AnswerAreaBlank}
          alt="Question 1 answer area showing the Deployment type and Version update policy dropdown options before the correct answers are highlighted."
          className="ai103-answer-image"
          style={{ maxWidth: 480 }}
        />
      </SectionBlock>

      <SectionBlock title="Correct Answer Area · PDF page 6" ariaLabelledBy="ai103-q1-solved-answer-area">
        <img
          src={q1AnswerArea}
          alt="Question 1 answer area showing Deployment type set to Standard and Version update policy set to Once the current version expires."
          className="ai103-answer-image"
          style={{ maxWidth: 480 }}
        />
      </SectionBlock>

      <AnswerBlock selections={questionParts.answerSelections} />
      <ExplanationBlock paragraphs={explanationParagraphs} />
      <ReferenceLinks references={question.references} headingId="ai103-q1-references" />
    </>
  );
}

function QuestionTwoContent({ question }) {
  const questionParts = getQuestionTwoDisplayParts(question);

  return (
    <>
      <SectionBlock title={questionParts.caseStudyTitle} ariaLabelledBy="ai103-q2-case-study" className="ai103-section-block--lead">
        {questionParts.caseStudyParagraphs.map((paragraph, index) => (
          <p key={`q2-case-study-${index}`}>{paragraph}</p>
        ))}
      </SectionBlock>

      {questionParts.sections.map((section, index) => (
        <SectionBlock title={section.title} ariaLabelledBy={`ai103-q2-section-${index}`} key={section.title}>
          {section.paragraphs.map((paragraph, pIndex) => (
            <p key={`${section.title}-${pIndex}`}>{paragraph}</p>
          ))}
        </SectionBlock>
      ))}

      <SectionBlock title="Question" ariaLabelledBy="ai103-q2-question">
        <PromptBlock paragraphs={questionParts.finalPrompt} />
        <OptionsGrid
          options={questionParts.options}
          selectedKeys={questionParts.answerSelections}
          ariaLabel="Question 2 answer options"
        />
      </SectionBlock>

      <AnswerBlock selections={questionParts.answerSelections} />
      <ExplanationBlock paragraphs={questionParts.explanationParagraphs} />
      <ReferenceLinks references={question.references} headingId="ai103-q2-references" />
    </>
  );
}

function MultipleChoiceQuestionContent({ question }) {
  const questionParts = getChoiceQuestionDisplayParts(question);
  const questionConfig = multipleChoiceQuestionConfigs[question.number];
  const hasInlineExhibit = Boolean(questionConfig?.exhibitTable || questionConfig?.exhibitCode);
  const exhibitSplitIndex = hasInlineExhibit
    ? Math.min(questionConfig.exhibitInsertAfterParagraph ?? 0, questionParts.promptParagraphs.length)
    : questionParts.promptParagraphs.length;
  const promptBeforeExhibit = questionParts.promptParagraphs.slice(0, exhibitSplitIndex);
  const promptAfterExhibit = questionParts.promptParagraphs.slice(exhibitSplitIndex);
  const exhibitCaption = questionConfig ? `${questionConfig.exhibitTitle} · ${questionConfig.exhibitPageLabel}` : '';

  return (
    <>
      <SectionBlock title="Question" ariaLabelledBy={`ai103-q${question.number}-question`}>
        <PromptBlock paragraphs={promptBeforeExhibit} />
        {questionConfig?.exhibitTable ? (
          <ExhibitTable
            headers={questionConfig.exhibitTable.headers}
            rows={questionConfig.exhibitTable.rows}
            caption={exhibitCaption}
          />
        ) : null}
        {questionConfig?.exhibitCode ? (
          <ExhibitCode code={questionConfig.exhibitCode} caption={exhibitCaption} />
        ) : null}
        <PromptBlock paragraphs={promptAfterExhibit} />
      </SectionBlock>

      {questionConfig?.exhibitImage ? (
        <SectionBlock
          title={`${questionConfig.exhibitTitle} · ${questionConfig.exhibitPageLabel}`}
          ariaLabelledBy={`ai103-q${question.number}-exhibit`}
        >
          <img
            src={questionConfig.exhibitImage}
            alt={questionConfig.exhibitAlt}
            className="ai103-answer-image"
            style={{ maxWidth: 640 }}
          />
        </SectionBlock>
      ) : null}

      <SectionBlock title="Options" ariaLabelledBy={`ai103-q${question.number}-options`}>
        <OptionsGrid
          options={questionParts.options}
          selectedKeys={questionParts.answerSelections}
          ariaLabel={`Question ${question.number} answer options`}
        />
      </SectionBlock>

      <AnswerBlock selections={questionParts.answerSelections} summaryRows={questionConfig?.answerRows} />
      <ExplanationBlock paragraphs={questionParts.explanationParagraphs} />
      <ReferenceLinks references={question.references} headingId={`ai103-q${question.number}-references`} />
    </>
  );
}

function QuestionTwentyOneContent({ question }) {
  const questionParts = getQuestionTwentyOneDisplayParts(question);

  return (
    <>
      <SectionBlock title="Question" ariaLabelledBy="ai103-q21-question">
        <PromptBlock paragraphs={questionParts.introParagraphs} />
      </SectionBlock>

      <SectionBlock title="Project1 Contains" ariaLabelledBy="ai103-q21-project-items">
        <ul className="ai103-detail-list">
          {questionParts.projectItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock title="Scenario" ariaLabelledBy="ai103-q21-scenario">
        <PromptBlock paragraphs={questionParts.scenarioParagraphs} />
      </SectionBlock>

      <SectionBlock title="What Should You Do?" ariaLabelledBy="ai103-q21-final-prompt">
        <PromptBlock paragraphs={questionParts.finalPrompt} />
      </SectionBlock>

      <SectionBlock title="Options" ariaLabelledBy="ai103-q21-options">
        <OptionsGrid
          options={questionParts.options}
          selectedKeys={questionParts.answerSelections}
          ariaLabel="Question 21 answer options"
        />
      </SectionBlock>

      <AnswerBlock selections={questionParts.answerSelections} />
      <ExplanationBlock paragraphs={questionParts.explanationParagraphs} />
      <ReferenceLinks references={question.references} headingId="ai103-q21-references" />
    </>
  );
}

function CaseStudyChoiceQuestionContent({ question }) {
  const questionParts = getCaseStudyChoiceQuestionDisplayParts(question);

  return (
    <>
      <SectionBlock title={questionParts.caseStudyTitle} ariaLabelledBy={`ai103-q${question.number}-case-study`} className="ai103-section-block--lead">
        {questionParts.caseStudyParagraphs.map((paragraph, index) => (
          <p key={`q${question.number}-case-study-${index}`}>{paragraph}</p>
        ))}
      </SectionBlock>

      {questionParts.sections.map((section, index) => (
        <SectionBlock title={section.title} ariaLabelledBy={`ai103-q${question.number}-section-${index}`} key={section.title}>
          {section.paragraphs.map((paragraph, pIndex) => (
            <p key={`${section.title}-${pIndex}`}>{paragraph}</p>
          ))}
        </SectionBlock>
      ))}

      <SectionBlock title="Question" ariaLabelledBy={`ai103-q${question.number}-question`}>
        <PromptBlock paragraphs={questionParts.finalPrompt} />
        <OptionsGrid
          options={questionParts.options}
          selectedKeys={questionParts.answerSelections}
          ariaLabel={`Question ${question.number} answer options`}
        />
      </SectionBlock>

      <AnswerBlock selections={questionParts.answerSelections} />
      <ExplanationBlock paragraphs={questionParts.explanationParagraphs} />
      <ReferenceLinks references={question.references} headingId={`ai103-q${question.number}-references`} />
    </>
  );
}

function AnswerAreaContent({ questionConfig, revealAnswer }) {
  if (questionConfig.codeTemplate) {
    return (
      <CodeWithBlanks template={questionConfig.codeTemplate} blanks={questionConfig.codeBlanks} revealAnswer={revealAnswer} />
    );
  }
  if (questionConfig.hotspotFields) {
    return <HotspotFields fields={questionConfig.hotspotFields} revealAnswer={revealAnswer} />;
  }
  return (
    <img
      src={revealAnswer ? questionConfig.solvedImage : questionConfig.blankImage}
      alt={revealAnswer ? questionConfig.solvedAlt : questionConfig.blankAlt}
      className="ai103-answer-image"
      style={{ maxWidth: 640 }}
    />
  );
}

function VisualQuestionContent({ question }) {
  const questionParts = getVisualQuestionDisplayParts(question);
  const questionConfig = visualQuestionConfigs[question.number];
  const answerRows = questionParts.answerRows.length > 0 ? questionParts.answerRows : questionConfig.answerRows;
  const hasInteractiveAnswerArea = Boolean(questionConfig.codeTemplate || questionConfig.hotspotFields);

  return (
    <>
      <SectionBlock title="Question" ariaLabelledBy={`ai103-q${question.number}-question`}>
        <PromptBlock paragraphs={questionParts.promptParagraphs} />
      </SectionBlock>

      {questionConfig.exhibitImage ? (
        <SectionBlock
          title={`Exhibit · ${questionConfig.exhibitPageLabel}`}
          ariaLabelledBy={`ai103-q${question.number}-exhibit`}
        >
          <img
            src={questionConfig.exhibitImage}
            alt={questionConfig.exhibitAlt}
            className="ai103-answer-image"
            style={{ maxWidth: 640 }}
          />
        </SectionBlock>
      ) : null}

      {questionConfig.exhibitCode ? (
        <ExhibitCode code={questionConfig.exhibitCode} caption={`Code · ${questionConfig.imagePageLabel}`} />
      ) : null}

      <SectionBlock title={`Answer Area · ${questionConfig.imagePageLabel}`} ariaLabelledBy={`ai103-q${question.number}-answer-area`}>
        <AnswerAreaContent questionConfig={questionConfig} revealAnswer={false} />
      </SectionBlock>

      {hasInteractiveAnswerArea || questionConfig.solvedImage ? (
        <SectionBlock
          title={`Correct Answer Area · ${questionConfig.imagePageLabel}`}
          ariaLabelledBy={`ai103-q${question.number}-solved-answer-area`}
          className="ai103-section-block--success"
        >
          <AnswerAreaContent questionConfig={questionConfig} revealAnswer />
        </SectionBlock>
      ) : null}

      <AnswerBlock summaryRows={answerRows} />
      <ExplanationBlock paragraphs={questionParts.explanationParagraphs} />
      <ReferenceLinks references={question.references} headingId={`ai103-q${question.number}-references`} />
    </>
  );
}

function QuestionTypeTag({ question }) {
  const label =
    question.type === 'HOTSPOT' || question.type === 'DRAG DROP'
      ? question.type
      : question.type === 'CASE STUDY'
        ? 'Case Study'
        : 'Multiple Choice';
  return <span className="ai103-pill ai103-pill--neutral">{label}</span>;
}

function questionType(question) {
  if (!question) return 'Question';
  if (question.type === 'HOTSPOT') return 'Hotspot';
  if (question.type === 'DRAG DROP') return 'Drag and Drop';
  if (question.type === 'CASE STUDY') return 'Case Study';
  return 'Multiple Choice';
}

const AI103 = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPracticeChooserOpen, setIsPracticeChooserOpen] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [selectedScope, setSelectedScope] = useState('all');
  const questions = useMemo(() => ai103Content.questions || [], []);
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState(questions[0]?.number || 1);
  const stats = useMemo(() => getLearningStats(questions), [questions]);
  const filteredQuestions = useMemo(
    () => filterLearningQuestions(questions, searchQuery),
    [searchQuery, questions],
  );
  const effectiveSelectedQuestionNumber = filteredQuestions.some(
    (question) => question.number === selectedQuestionNumber,
  )
    ? selectedQuestionNumber
    : filteredQuestions[0]?.number;
  const pagination = useMemo(
    () => getQuestionPagination(filteredQuestions, effectiveSelectedQuestionNumber),
    [filteredQuestions, effectiveSelectedQuestionNumber],
  );
  const questionCount = ai103Content.questionCount || questions.length;

  const visibleQuestion = pagination.currentQuestion;
  const indexGroups = useMemo(() => {
    const groups = new Map();
    questions.forEach((question) => {
      const start = Math.floor((question.number - 1) / 10) * 10 + 1;
      if (!groups.has(start)) groups.set(start, []);
      groups.get(start).push(question);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([start, groupQuestions]) => ({ start, end: start + 9, questions: groupQuestions }));
  }, [questions]);
  const goToQuestion = (number) => {
    if (!number) return;
    setSelectedQuestionNumber(number);
  };
  const promptParagraphs = visibleQuestion ? splitPageText(visibleQuestion.prompt) : [];
  const answerParagraphs = visibleQuestion ? splitPageText(visibleQuestion.answer) : [];
  const explanationParagraphs = visibleQuestion ? splitPageText(visibleQuestion.explanation) : [];
  const practiceQuestions = useMemo(
    () => questions.filter((question) => !question.tags?.includes('fundamentals')),
    [questions],
  );
  const originalQuestionCount = practiceQuestions.filter((question) => question.number <= 65).length;
  const scopes = [
    { id: 'all', label: `All ${practiceQuestions.length}`, detail: `Full bank, including ${practiceQuestions.length - originalQuestionCount} newer Skills Measured questions` },
    { id: 'original', label: `Original ${originalQuestionCount}`, detail: 'Only the original 65 exam-guide questions' },
  ];
  const questionPool = selectedScope === 'original'
    ? practiceQuestions.filter((question) => question.number <= 65)
    : practiceQuestions;
  const difficulties = [
    { id: 'easy', label: 'Easy', detail: `${Math.min(20, questionPool.length)} random questions, no time limit`, enabled: true },
    { id: 'normal', label: 'Normal', detail: `${questionPool.length} random questions, 60 minute limit`, enabled: true },
    { id: 'hard', label: 'Hard', detail: `${questionPool.length} random questions, 30 minute limit`, enabled: true },
    { id: 'extra-hard', label: 'Extra Hard', detail: `${questionPool.length} random questions, 20 minute limit, no answer-area hints`, enabled: true },
  ];

  const startPractice = () => {
    const selectedMode = difficulties.find((difficulty) => difficulty.id === selectedDifficulty);
    if (!selectedMode?.enabled) return;
    navigate('/learning/ai-103/practice', { state: { difficulty: selectedDifficulty, scope: selectedScope } });
  };

  return (
    <div className="ai103-container">
      <LearningTabs />
      <div className="ai103-content">
        <header className="ai103-header">
          <div className="ai103-title-block">
            <div className="ai103-title-row">
              <span className="ai103-bubble" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <h1>
                {ai103Content.title}
                <span className="ai103-title-suffix">{ai103Content.subtitle}</span>
              </h1>
            </div>
            <div className="ai103-kicker">
              <span className="ai103-badge">Learning / AI</span>
              <span className="ai103-meta">{ai103Content.sourceFile}</span>
            </div>
            <p className="ai103-source">
              Source:{' '}
              <a href={ai103Content.sourceUrl} target="_blank" rel="noreferrer">
                {ai103Content.sourceUrl}
              </a>
            </p>
            <div className="ai103-actions">
              <button
                type="button"
                className="ai103-practice-button"
                onClick={() => setIsPracticeChooserOpen(true)}
              >
                Practice
              </button>
            </div>
          </div>

          <div className="ai103-stat-grid" aria-label="AI-103 document stats">
            <div className="ai103-stat">
              <strong>{questionCount}</strong>
              <span>Questions</span>
            </div>
            <div className="ai103-stat">
              <strong>{formatNumber(stats.wordCount)}</strong>
              <span>Words</span>
            </div>
          </div>
        </header>

        <section className="ai103-toolbar" aria-label="AI-103 controls">
          <label className="ai103-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search concepts, keywords, or 'question 12'"
              aria-label="Search AI-103 questions"
            />
          </label>
          <div className="ai103-search-meta">
            <div className="ai103-pagination-controls" aria-label="Question pagination">
              <button
                type="button"
                onClick={() => goToQuestion(pagination.previousNumber)}
                disabled={!pagination.previousNumber}
              >
                ← Previous
              </button>
              <select
                className="ai103-question-select"
                value={visibleQuestion?.number || ''}
                onChange={(event) => goToQuestion(Number(event.target.value))}
                aria-label="Jump to question"
              >
                {indexGroups.map((group) => (
                  <optgroup label={`${group.start}–${group.end}`} key={group.start}>
                    {group.questions.map((question) => (
                      <option key={question.number} value={question.number}>
                        Question {question.number}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="ai103-pagination-count">{pagination.currentIndex + 1} / {pagination.total}</span>
              <button
                type="button"
                onClick={() => goToQuestion(pagination.nextNumber)}
                disabled={!pagination.nextNumber}
              >
                Next →
              </button>
            </div>
          </div>
        </section>

        <div className="ai103-layout">
          <section className="ai103-page-list" aria-label="AI-103 question content">
            {visibleQuestion ? (
              <article className="ai103-page-card" id={`ai103-question-${visibleQuestion.number}`} key={visibleQuestion.number}>
                <div className="ai103-page-card-header">
                  <h2>Question {visibleQuestion.number}</h2>
                  <div className="ai103-page-card-tags">
                    <QuestionTypeTag question={visibleQuestion} />
                    <span className="ai103-pill">
                      {visibleQuestion.sourcePages.length > 0
                        ? `PDF pages ${visibleQuestion.sourcePages.join(', ')}`
                        : 'Custom question'}
                    </span>
                  </div>
                </div>

                {visibleQuestion.number === 1 ? (
                  <QuestionOneContent question={visibleQuestion} explanationParagraphs={explanationParagraphs} />
                ) : visibleQuestion.number === 2 ? (
                  <QuestionTwoContent question={visibleQuestion} />
                ) : [27, 28, 56, 61, 62].includes(visibleQuestion.number) ? (
                  <CaseStudyChoiceQuestionContent question={visibleQuestion} />
                ) : visibleQuestion.number === 21 ? (
                  <QuestionTwentyOneContent question={visibleQuestion} />
                ) : [4, 5, 6, 7, 8, 11, 15, 18, 20, 30, 32, 35, 37, 40, 49, 66, 68, 71, 77, 79, 86, 92, 93, 94, 95, 98, 99, 101, 103, 104, 107, 108, 112, 113, 114, 117, 118, 121, 122, 124, 128, 130, 134].includes(visibleQuestion.number) ? (
                  <VisualQuestionContent question={visibleQuestion} />
                ) : [3, 9, 10, 12, 13, 14, 16, 17, 19, 22, 23, 24, 25, 26, 29, 31, 33, 34, 36, 38, 39, 41, 42, 43, 44, 45, 46, 47, 48, 50, 51, 52, 53, 54, 55, 57, 58, 59, 60, 63, 64, 65].includes(visibleQuestion.number) || visibleQuestion.number >= 66 ? (
                  <MultipleChoiceQuestionContent question={visibleQuestion} />
                ) : (
                  <>
                    <SectionBlock title="Question" ariaLabelledBy="ai103-fallback-question">
                      <PromptBlock paragraphs={promptParagraphs} fallback="No question text extracted." />
                    </SectionBlock>
                    {answerParagraphs.length > 0 && (
                      <AnswerBlock paragraphText={answerParagraphs.join('\n\n')} />
                    )}
                    <ExplanationBlock paragraphs={explanationParagraphs} />
                    <ReferenceLinks references={visibleQuestion.references} headingId="ai103-fallback-references" />
                  </>
                )}

                <div className="ai103-footer-stats">
                  <div className="ai103-footer-stat">
                    <span className="ai103-footer-stat-label">Type</span>
                    <span className="ai103-footer-stat-value">{questionType(visibleQuestion)}</span>
                  </div>
                  <div className="ai103-footer-stat">
                    <span className="ai103-footer-stat-label">Source Pages</span>
                    <span className="ai103-footer-stat-value">
                      {visibleQuestion.sourcePages.length > 0 ? visibleQuestion.sourcePages.join(', ') : 'Custom'}
                    </span>
                  </div>
                  <div className="ai103-footer-stat">
                    <span className="ai103-footer-stat-label">Progress</span>
                    <span className="ai103-footer-stat-value">
                      {pagination.currentIndex + 1} / {pagination.total}
                    </span>
                  </div>
                </div>
              </article>
            ) : (
              <div className="ai103-empty-state">
                <strong>No questions found</strong>
                <span>{searchQuery ? `No matches for "${searchQuery}"` : 'Try a different search.'}</span>
              </div>
            )}
          </section>
        </div>

        <footer className="ai103-page-footer" aria-label="Page footer">
          <span>© 2026 · AI-103 study material</span>
          <div className="ai103-page-footer-links">
            <a href={ai103Content.sourceUrl} target="_blank" rel="noreferrer">Source</a>
            <button type="button" className="ai103-link-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Back to top
            </button>
          </div>
        </footer>
      </div>

      {isPracticeChooserOpen && (
        <div
          className="ai103-practice-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsPracticeChooserOpen(false);
            }
          }}
        >
          <section
            className="ai103-practice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai103-practice-title"
          >
            <div className="ai103-practice-modal-header">
              <span>Practice Test</span>
              <button
                type="button"
                aria-label="Close practice chooser"
                onClick={() => setIsPracticeChooserOpen(false)}
              >
                ×
              </button>
            </div>
            <h2 id="ai103-practice-title">Choose Question Set</h2>
            <div className="ai103-difficulty-grid" role="radiogroup" aria-label="Practice question set">
              {scopes.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  className={[
                    'ai103-difficulty-option',
                    `scope-${scope.id}`,
                    selectedScope === scope.id ? 'active' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedScope(scope.id)}
                  role="radio"
                  aria-checked={selectedScope === scope.id}
                >
                  <strong>{scope.label}</strong>
                  <span>{scope.detail}</span>
                </button>
              ))}
            </div>
            <h2 id="ai103-practice-difficulty-title">Choose Difficulty</h2>
            <div className="ai103-difficulty-grid" role="radiogroup" aria-label="Practice difficulty">
              {difficulties.map((difficulty) => (
                <button
                  key={difficulty.id}
                  type="button"
                  className={[
                    'ai103-difficulty-option',
                    `mode-${difficulty.id}`,
                    selectedDifficulty === difficulty.id ? 'active' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedDifficulty(difficulty.id)}
                  role="radio"
                  aria-checked={selectedDifficulty === difficulty.id}
                  disabled={!difficulty.enabled}
                >
                  <strong>{difficulty.label}</strong>
                  <span>{difficulty.detail}</span>
                </button>
              ))}
            </div>
            <div className="ai103-practice-modal-actions">
              <button type="button" onClick={() => setIsPracticeChooserOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={startPractice}
                disabled={!difficulties.find((difficulty) => difficulty.id === selectedDifficulty)?.enabled}
              >
                Confirm {difficulties.find((difficulty) => difficulty.id === selectedDifficulty)?.label || 'Mode'} Mode
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AI103;
