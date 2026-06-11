import React, { useMemo, useState } from 'react';
import './AI103.css';
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
import q9Exhibit from '../assets/ai103/q9-exhibit.png';
import q11AnswerArea from '../assets/ai103/q11-answer-area.png';
import q11AnswerAreaBlank from '../assets/ai103/q11-answer-area-blank.png';
import q14Exhibit from '../assets/ai103/q14-exhibit.png';
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
import q35AnswerArea from '../assets/ai103/q35-answer-area.png';
import q35AnswerAreaBlank from '../assets/ai103/q35-answer-area-blank.png';
import q37AnswerArea from '../assets/ai103/q37-answer-area.png';
import q37AnswerAreaBlank from '../assets/ai103/q37-answer-area-blank.png';
import q40AnswerArea from '../assets/ai103/q40-answer-area.png';
import q40AnswerAreaBlank from '../assets/ai103/q40-answer-area-blank.png';
import q49AnswerAreaBlank from '../assets/ai103/q49-answer-area-blank.png';
import ai103Content from '../data/ai103Content.json';
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
  if (!text.trim()) {
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
      'Question 5 answer area showing Pipeline1 set to Multi-file task in pro mode and Pipeline2 set to Single-file task in standard mode.',
    answerRows: [
      { label: 'Pipeline1', value: 'Multi-file task in pro mode' },
      { label: 'Pipeline2', value: 'Single-file task in standard mode' },
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
      'Question 18 answer area showing Time To Response and Total Tokens plus RequestResponse highlighted.',
    answerRows: [
      { label: 'Metrics to enable', value: 'Time To Response and Total Tokens' },
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
    blankImage: q35AnswerAreaBlank,
    solvedImage: q35AnswerArea,
    imagePageLabel: 'PDF page 40',
    blankAlt:
      'Question 35 Python code answer area showing dropdown choices for the temperature value and the output_config effort value before the correct answers are highlighted.',
    solvedAlt:
      'Question 35 answer area showing temperature set to 0 and output_config effort set to low.',
    answerRows: [
      { label: 'temperature', value: '0' },
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
    blankImage: q40AnswerAreaBlank,
    solvedImage: q40AnswerArea,
    imagePageLabel: 'PDF pages 44, 45',
    blankAlt:
      'Question 40 answer area showing dropdown choices for the GitHub Actions authentication method and the outcome when evaluation thresholds are not met.',
    solvedAlt:
      'Question 40 answer area showing Azure Login with OpenID Connect and Fail highlighted in the workflow configuration.',
    answerRows: [
      { label: 'Authentication method', value: 'An Azure Login action that uses OpenID Connect (OIDC)' },
      { label: 'If the evaluation results are NOT met, configure the workflow to', value: 'Fail' },
    ],
  },
  49: {
    blankImage: q49AnswerAreaBlank,
    imagePageLabel: 'PDF page 50',
    blankAlt:
      'Question 49 answer area showing dropdown choices for the prompt shields action and the added mitigation for malicious text embedded in screenshots.',
    answerRows: [
      { label: 'Prompt shields action', value: 'Set action to block' },
      { label: 'Additional mitigation', value: 'Use optical character recognition (OCR) to extract the text from the images first' },
    ],
  },
};

const multipleChoiceQuestionConfigs = {
  14: {
    exhibitImage: q14Exhibit,
    exhibitTitle: 'Code Snippet',
    exhibitPageLabel: 'PDF page 21',
    exhibitAlt:
      'Question 14 code snippet showing the create_and_process run call where the tool_choice parameter must be added.',
  },
  9: {
    exhibitImage: q9Exhibit,
    exhibitTitle: 'Exhibit',
    exhibitPageLabel: 'PDF page 16',
    exhibitAlt:
      'Question 9 exhibit showing a table with the TriageAgent, PolicyAgent, and ActionAgent roles and descriptions.',
  },
};

function AnswerSummaryRows({ rows }) {
  if (!rows?.length) {
    return null;
  }

  return (
    <div className="ai103-answer-summary" role="list" aria-label="Answer summary">
      {rows.map((row, index) => {
        const heading = row.label || row.key;
        const rowKey = `${heading}-${row.value}-${index}`;

        return (
          <div className="ai103-answer-summary-row" key={rowKey} role="listitem">
            <span>{heading}</span>
            <strong>{row.value}</strong>
          </div>
        );
      })}
    </div>
  );
}

function AnswerSelectionChips({ selections, options }) {
  if (!selections?.length) {
    return null;
  }

  return (
    <div className="ai103-answer-chip-row">
      {selections.map((selection) => (
        <span className="ai103-answer-chip" key={selection}>
          {selection}
        </span>
      ))}
      {options.map((option) => (
        <span className="ai103-answer-chip ai103-answer-chip-secondary" key={option.key}>
          {option.text}
        </span>
      ))}
    </div>
  );
}

function QuestionOneContent({ question, explanationParagraphs }) {
  const questionParts = getQuestionOneDisplayParts(question);

  return (
    <div className="ai103-q1-content">
      <div className="ai103-question-type-row">
        <span className="ai103-hotspot-badge">{questionParts.type}</span>
        <span>{questionParts.caseStudyTitle}</span>
      </div>

      <section className="ai103-case-study-callout" aria-labelledby="ai103-q1-case-study">
        <h2 id="ai103-q1-case-study">{questionParts.caseStudyTitle}</h2>
        {questionParts.caseStudyParagraphs.map((paragraph, index) => (
          <p key={`q1-case-study-${index}`}>{paragraph}</p>
        ))}
      </section>

      <div className="ai103-q1-section-stack" aria-label="Question 1 case study details">
        {questionParts.sections.map((section) => (
          <section className="ai103-q1-detail-section" key={section.title}>
            <h3>{section.title}</h3>
            {section.paragraphs.map((paragraph, index) => (
              <p key={`${section.title}-${index}`}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>

      <section className="ai103-final-prompt" aria-labelledby="ai103-q1-question">
        <h2 id="ai103-q1-question">Question</h2>
        {questionParts.finalPrompt.map((paragraph, index) => (
          <p key={`q1-final-prompt-${index}`}>{paragraph}</p>
        ))}
      </section>

      <section className="ai103-answer-visual" aria-labelledby="ai103-q1-answer-area">
        <div className="ai103-answer-visual-header">
          <h2 id="ai103-q1-answer-area">Answer Area</h2>
          <span>PDF page 6</span>
        </div>
        <img
          src={q1AnswerAreaBlank}
          alt="Question 1 answer area showing the Deployment type and Version update policy dropdown options before the correct answers are highlighted."
        />
      </section>

      <section className="ai103-answer-visual ai103-answer-visual-solved" aria-labelledby="ai103-q1-solved-answer-area">
        <div className="ai103-answer-visual-header">
          <h2 id="ai103-q1-solved-answer-area">Correct Answer Area</h2>
          <span>PDF page 6</span>
        </div>
        <img
          src={q1AnswerArea}
          alt="Question 1 answer area showing Deployment type set to Standard and Version update policy set to Opt out of automatic model version upgrades."
        />
      </section>

      <section className="ai103-question-section answer ai103-selected-answer">
        <h2>Answer</h2>
        <div className="ai103-answer-chip-row">
          {questionParts.answerSelections.map((selection) => (
            <span className="ai103-answer-chip" key={selection}>
              {selection}
            </span>
          ))}
        </div>
      </section>

      {explanationParagraphs.length > 0 && (
        <section className="ai103-question-section description">
          <h2>Description</h2>
          {explanationParagraphs.map((paragraph, index) => (
            <p key={`q1-explanation-${index}`}>{paragraph}</p>
          ))}
        </section>
      )}
    </div>
  );
}

function QuestionTwoContent({ question }) {
  const questionParts = getQuestionTwoDisplayParts(question);

  return (
    <div className="ai103-q1-content">
      <div className="ai103-question-type-row">
        <span>{questionParts.caseStudyTitle}</span>
        <span>Multiple choice</span>
      </div>

      <section className="ai103-case-study-callout" aria-labelledby="ai103-q2-case-study">
        <h2 id="ai103-q2-case-study">{questionParts.caseStudyTitle}</h2>
        {questionParts.caseStudyParagraphs.map((paragraph, index) => (
          <p key={`q2-case-study-${index}`}>{paragraph}</p>
        ))}
      </section>

      <div className="ai103-q1-section-stack" aria-label="Question 2 case study details">
        {questionParts.sections.map((section) => (
          <section className="ai103-q1-detail-section" key={section.title}>
            <h3>{section.title}</h3>
            {section.paragraphs.map((paragraph, index) => (
              <p key={`${section.title}-${index}`}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>

      <section className="ai103-final-prompt" aria-labelledby="ai103-q2-question">
        <h2 id="ai103-q2-question">Question</h2>
        {questionParts.finalPrompt.map((paragraph, index) => (
          <p key={`q2-final-prompt-${index}`}>{paragraph}</p>
        ))}

        <div className="ai103-option-grid" role="list" aria-label="Question 2 answer options">
          {questionParts.options.map((option) => (
            <div
              className={`ai103-option-card${option.key === questionParts.answerSelection ? ' selected' : ''}`}
              key={option.key}
              role="listitem"
            >
              <span className="ai103-option-key">{option.key}</span>
              <p>{option.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ai103-question-section answer ai103-selected-answer">
        <h2>Answer</h2>
        <AnswerSelectionChips
          selections={questionParts.answerSelections}
          options={questionParts.answerOptions}
        />
      </section>

      {questionParts.explanationParagraphs.length > 0 && (
        <section className="ai103-question-section description">
          <h2>Description</h2>
          {questionParts.explanationParagraphs.map((paragraph, index) => (
            <p key={`q2-explanation-${index}`}>{paragraph}</p>
          ))}
        </section>
      )}
    </div>
  );
}

function MultipleChoiceQuestionContent({ question }) {
  const questionParts = getChoiceQuestionDisplayParts(question);
  const questionConfig = multipleChoiceQuestionConfigs[question.number];

  return (
    <div className="ai103-q1-content">
      <div className="ai103-question-type-row">
        {questionParts.type ? <span>{questionParts.type}</span> : null}
        <span>Multiple choice</span>
      </div>

      <section className="ai103-final-prompt" aria-labelledby={`ai103-q${question.number}-question`}>
        <h2 id={`ai103-q${question.number}-question`}>Question</h2>
        {questionParts.promptParagraphs.map((paragraph, index) => (
          <p key={`q${question.number}-prompt-${index}`}>{paragraph}</p>
        ))}
      </section>

      {questionConfig?.exhibitImage ? (
        <section className="ai103-answer-visual ai103-exhibit-panel" aria-labelledby={`ai103-q${question.number}-exhibit`}>
          <div className="ai103-answer-visual-header">
            <h2 id={`ai103-q${question.number}-exhibit`}>{questionConfig.exhibitTitle}</h2>
            <span>{questionConfig.exhibitPageLabel}</span>
          </div>
          <img src={questionConfig.exhibitImage} alt={questionConfig.exhibitAlt} />
        </section>
      ) : null}

      <section className="ai103-question-section" aria-labelledby={`ai103-q${question.number}-options`}>
        <h2 id={`ai103-q${question.number}-options`}>Options</h2>
        <div className="ai103-option-grid" role="list" aria-label={`Question ${question.number} answer options`}>
          {questionParts.options.map((option) => (
            <div
              className={`ai103-option-card${questionParts.answerSelections.includes(option.key) ? ' selected' : ''}`}
              key={option.key}
              role="listitem"
            >
              <span className="ai103-option-key">{option.key}</span>
              <p>{option.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ai103-question-section answer ai103-selected-answer">
        <h2>Answer</h2>
        <AnswerSelectionChips
          selections={questionParts.answerSelections}
          options={questionParts.answerOptions}
        />
      </section>

      {questionParts.explanationParagraphs.length > 0 && (
        <section className="ai103-question-section description">
          <h2>Description</h2>
          {questionParts.explanationParagraphs.map((paragraph, index) => (
            <p key={`q${question.number}-explanation-${index}`}>{paragraph}</p>
          ))}
        </section>
      )}
    </div>
  );
}

function QuestionTwentyOneContent({ question }) {
  const questionParts = getQuestionTwentyOneDisplayParts(question);

  return (
    <div className="ai103-q1-content">
      <div className="ai103-question-type-row">
        {questionParts.type ? <span>{questionParts.type}</span> : null}
        <span>Multiple choice</span>
      </div>

      <section className="ai103-final-prompt" aria-labelledby="ai103-q21-question">
        <h2 id="ai103-q21-question">Question</h2>
        {questionParts.introParagraphs.map((paragraph, index) => (
          <p key={`q21-intro-${index}`}>{paragraph}</p>
        ))}
      </section>

      <section className="ai103-question-section" aria-labelledby="ai103-q21-project-items">
        <h2 id="ai103-q21-project-items">Project1 Contains</h2>
        <ul className="ai103-detail-list">
          {questionParts.projectItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="ai103-question-section" aria-labelledby="ai103-q21-scenario">
        <h2 id="ai103-q21-scenario">Scenario</h2>
        {questionParts.scenarioParagraphs.map((paragraph, index) => (
          <p key={`q21-scenario-${index}`}>{paragraph}</p>
        ))}
      </section>

      <section className="ai103-question-section" aria-labelledby="ai103-q21-final-prompt">
        <h2 id="ai103-q21-final-prompt">What Should You Do?</h2>
        {questionParts.finalPrompt.map((paragraph, index) => (
          <p key={`q21-final-${index}`}>{paragraph}</p>
        ))}
      </section>

      <section className="ai103-question-section" aria-labelledby="ai103-q21-options">
        <h2 id="ai103-q21-options">Options</h2>
        <div className="ai103-option-grid" role="list" aria-label="Question 21 answer options">
          {questionParts.options.map((option) => (
            <div
              className={`ai103-option-card${questionParts.answerSelections.includes(option.key) ? ' selected' : ''}`}
              key={option.key}
              role="listitem"
            >
              <span className="ai103-option-key">{option.key}</span>
              <p>{option.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ai103-question-section answer ai103-selected-answer">
        <h2>Answer</h2>
        <AnswerSelectionChips
          selections={questionParts.answerSelections}
          options={questionParts.answerOptions}
        />
      </section>

      {questionParts.explanationParagraphs.length > 0 && (
        <section className="ai103-question-section description">
          <h2>Description</h2>
          {questionParts.explanationParagraphs.map((paragraph, index) => (
            <p key={`q21-explanation-${index}`}>{paragraph}</p>
          ))}
        </section>
      )}
    </div>
  );
}

function CaseStudyChoiceQuestionContent({ question }) {
  const questionParts = getCaseStudyChoiceQuestionDisplayParts(question);

  return (
    <div className="ai103-q1-content">
      <div className="ai103-question-type-row">
        <span>{questionParts.caseStudyTitle}</span>
        <span>Multiple choice</span>
      </div>

      <section className="ai103-case-study-callout" aria-labelledby={`ai103-q${question.number}-case-study`}>
        <h2 id={`ai103-q${question.number}-case-study`}>{questionParts.caseStudyTitle}</h2>
        {questionParts.caseStudyParagraphs.map((paragraph, index) => (
          <p key={`q${question.number}-case-study-${index}`}>{paragraph}</p>
        ))}
      </section>

      <div className="ai103-q1-section-stack" aria-label={`Question ${question.number} case study details`}>
        {questionParts.sections.map((section) => (
          <section className="ai103-q1-detail-section" key={section.title}>
            <h3>{section.title}</h3>
            {section.paragraphs.map((paragraph, index) => (
              <p key={`${section.title}-${index}`}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>

      <section className="ai103-final-prompt" aria-labelledby={`ai103-q${question.number}-question`}>
        <h2 id={`ai103-q${question.number}-question`}>Question</h2>
        {questionParts.finalPrompt.map((paragraph, index) => (
          <p key={`q${question.number}-prompt-${index}`}>{paragraph}</p>
        ))}

        <div className="ai103-option-grid" role="list" aria-label={`Question ${question.number} answer options`}>
          {questionParts.options.map((option) => (
            <div
              className={`ai103-option-card${questionParts.answerSelections.includes(option.key) ? ' selected' : ''}`}
              key={option.key}
              role="listitem"
            >
              <span className="ai103-option-key">{option.key}</span>
              <p>{option.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ai103-question-section answer ai103-selected-answer">
        <h2>Answer</h2>
        <AnswerSelectionChips
          selections={questionParts.answerSelections}
          options={questionParts.answerOptions}
        />
      </section>

      {questionParts.explanationParagraphs.length > 0 && (
        <section className="ai103-question-section description">
          <h2>Description</h2>
          {questionParts.explanationParagraphs.map((paragraph, index) => (
            <p key={`q${question.number}-explanation-${index}`}>{paragraph}</p>
          ))}
        </section>
      )}
    </div>
  );
}

function VisualQuestionContent({ question }) {
  const questionParts = getVisualQuestionDisplayParts(question);
  const questionConfig = visualQuestionConfigs[question.number];
  const answerRows = questionParts.answerRows.length > 0 ? questionParts.answerRows : questionConfig.answerRows;

  return (
    <div className="ai103-q1-content">
      <div className="ai103-question-type-row">
        <span className="ai103-hotspot-badge">{questionParts.type}</span>
        <span>PDF answer area</span>
      </div>

      <section className="ai103-final-prompt" aria-labelledby={`ai103-q${question.number}-question`}>
        <h2 id={`ai103-q${question.number}-question`}>Question</h2>
        {questionParts.promptParagraphs.map((paragraph, index) => (
          <p key={`q${question.number}-prompt-${index}`}>{paragraph}</p>
        ))}
      </section>

      <section className="ai103-answer-visual" aria-labelledby={`ai103-q${question.number}-answer-area`}>
        <div className="ai103-answer-visual-header">
          <h2 id={`ai103-q${question.number}-answer-area`}>Answer Area</h2>
          <span>{questionConfig.imagePageLabel}</span>
        </div>
        <img src={questionConfig.blankImage} alt={questionConfig.blankAlt} />
      </section>

      {questionConfig.solvedImage ? (
        <section className="ai103-answer-visual ai103-answer-visual-solved" aria-labelledby={`ai103-q${question.number}-solved-answer-area`}>
          <div className="ai103-answer-visual-header">
            <h2 id={`ai103-q${question.number}-solved-answer-area`}>Correct Answer Area</h2>
            <span>{questionConfig.imagePageLabel}</span>
          </div>
          <img src={questionConfig.solvedImage} alt={questionConfig.solvedAlt} />
        </section>
      ) : null}

      <section className="ai103-question-section answer ai103-selected-answer">
        <h2>Answer</h2>
        <AnswerSummaryRows rows={answerRows} />
      </section>

      {questionParts.explanationParagraphs.length > 0 && (
        <section className="ai103-question-section description">
          <h2>Description</h2>
          {questionParts.explanationParagraphs.map((paragraph, index) => (
            <p key={`q${question.number}-explanation-${index}`}>{paragraph}</p>
          ))}
        </section>
      )}
    </div>
  );
}

const AI103 = () => {
  const [searchQuery, setSearchQuery] = useState('');
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
  const questionCount = ai103Content.questionCount || 65;

  const visibleQuestion = pagination.currentQuestion;
  const promptParagraphs = visibleQuestion ? splitPageText(visibleQuestion.prompt) : [];
  const answerParagraphs = visibleQuestion ? splitPageText(visibleQuestion.answer) : [];
  const explanationParagraphs = visibleQuestion ? splitPageText(visibleQuestion.explanation) : [];
  const paginationLabel = visibleQuestion
    ? pagination.total === questions.length
      ? `Question ${visibleQuestion.number} / ${questions.length}`
      : `Question ${visibleQuestion.number} (${pagination.currentIndex + 1} / ${pagination.total})`
    : 'No question';

  return (
    <div
      className="ai103-container cosmic-page"
      style={{
        '--page-accent': 'var(--cosmic-cyan)',
        '--cosmic-orb-top': '56px',
        '--cosmic-orb-right': '72px',
        '--cosmic-star-top': '168px',
        '--cosmic-star-left': '48%',
        '--cosmic-star-size': '38px',
        '--cosmic-cube-top': '92px',
        '--cosmic-cube-left': '210px',
        '--cosmic-cube-size': '28px',
      }}
    >
      <svg className="cosmic-star" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 0 L24 16 L40 20 L24 24 L20 40 L16 24 L0 20 L16 16 Z" fill="currentColor" />
      </svg>
      <div className="cosmic-cube" />

      <div className="ai103-content cosmic-content">
        <header className="ai103-header">
          <div className="ai103-title-block">
            <div className="ai103-kicker">
              <span className="ai103-badge">Learning / AI</span>
              <span className="ai103-meta">{ai103Content.sourceFile}</span>
            </div>
            <h1>
              {ai103Content.title}
              <span>{ai103Content.subtitle}</span>
            </h1>
            <p className="ai103-source">
              Source:{' '}
              <a href={ai103Content.sourceUrl} target="_blank" rel="noreferrer">
                {ai103Content.sourceUrl}
              </a>
            </p>
          </div>

          <div className="ai103-stat-grid" aria-label="AI-103 document stats">
            <div className="ai103-stat">
              <strong>{questionCount}</strong>
              <span>Questions</span>
            </div>
            <div className="ai103-stat">
              <strong>{questions.length}</strong>
              <span>Question cards</span>
            </div>
            <div className="ai103-stat">
              <strong>{formatNumber(stats.wordCount)}</strong>
              <span>Words</span>
            </div>
          </div>
        </header>

        <section className="ai103-toolbar" aria-label="AI-103 controls">
          <label className="ai103-search">
            <span>Search</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="concept, keyword, or question 12"
            />
          </label>
          <div className="ai103-result-count">
            <strong>{filteredQuestions.length}</strong>
            <span>{filteredQuestions.length === 1 ? 'matching question' : 'matching questions'}</span>
          </div>
          <div className="ai103-pagination-controls" aria-label="Question pagination">
            <button
              type="button"
              onClick={() => setSelectedQuestionNumber(pagination.previousNumber)}
              disabled={!pagination.previousNumber}
            >
              Previous
            </button>
            <span>{paginationLabel}</span>
            <button
              type="button"
              onClick={() => setSelectedQuestionNumber(pagination.nextNumber)}
              disabled={!pagination.nextNumber}
            >
              Next
            </button>
          </div>
        </section>

        <div className="ai103-layout">
          <aside className="ai103-page-index" aria-label="AI-103 question index">
            {filteredQuestions.map((question) => (
              <button
                key={question.number}
                type="button"
                className={question.number === visibleQuestion?.number ? 'active' : ''}
                onClick={() => setSelectedQuestionNumber(question.number)}
                aria-current={question.number === visibleQuestion?.number ? 'page' : undefined}
              >
                {question.number}
              </button>
            ))}
          </aside>

          <section className="ai103-page-list" aria-label="AI-103 question content">
            {visibleQuestion ? (
              <article className="ai103-page-card" id={`ai103-question-${visibleQuestion.number}`} key={visibleQuestion.number}>
                <div className="ai103-page-card-header">
                  <span>Question {visibleQuestion.number}</span>
                  <small>PDF pages {visibleQuestion.sourcePages.join(', ')}</small>
                </div>
                {visibleQuestion.number === 1 ? (
                  <QuestionOneContent question={visibleQuestion} explanationParagraphs={explanationParagraphs} />
                ) : visibleQuestion.number === 2 ? (
                  <QuestionTwoContent question={visibleQuestion} />
                ) : [27, 28, 56, 61, 62].includes(visibleQuestion.number) ? (
                  <CaseStudyChoiceQuestionContent question={visibleQuestion} />
                ) : visibleQuestion.number === 21 ? (
                  <QuestionTwentyOneContent question={visibleQuestion} />
                ) : [4, 5, 6, 7, 8, 11, 15, 18, 20, 30, 32, 35, 37, 40, 49].includes(visibleQuestion.number) ? (
                  <VisualQuestionContent question={visibleQuestion} />
                ) : [3, 9, 10, 12, 13, 14, 16, 17, 19, 22, 23, 24, 25, 26, 29, 31, 33, 34, 36, 38, 39, 41, 42, 43, 44, 45, 46, 47, 48, 50, 51, 52, 53, 54, 55, 57, 58, 59, 60, 63, 64, 65].includes(visibleQuestion.number) ? (
                  <MultipleChoiceQuestionContent question={visibleQuestion} />
                ) : (
                  <>
                    <div className="ai103-question-section">
                      <h2>Question</h2>
                      {promptParagraphs.map((paragraph, index) => (
                        <p key={`${visibleQuestion.number}-prompt-${index}`}>{paragraph}</p>
                      ))}
                    </div>
                    {answerParagraphs.length > 0 && (
                      <div className="ai103-question-section answer">
                        <h2>Answer</h2>
                        {answerParagraphs.map((paragraph, index) => (
                          <p key={`${visibleQuestion.number}-answer-${index}`}>{paragraph}</p>
                        ))}
                      </div>
                    )}
                    {explanationParagraphs.length > 0 && (
                      <div className="ai103-question-section description">
                        <h2>Description</h2>
                        {explanationParagraphs.map((paragraph, index) => (
                          <p key={`${visibleQuestion.number}-explanation-${index}`}>{paragraph}</p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </article>
            ) : (
              <div className="ai103-empty-state">
                <strong>No pages found</strong>
                <span>{searchQuery}</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AI103;
