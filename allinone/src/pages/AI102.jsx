import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AI103.css';
import LearningTabs from '../components/LearningTabs';
import ai102Content from '../data/ai102Content.json';
import {
  formatQuestionType,
  getQuestionParts,
  getPdfPageUrl,
  getAnswerText,
  matchesQuestion,
} from '../utils/ai102';

const PAGE_SIZE = 10;
const questions = ai102Content.questions || [];

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function QuestionTypeTag({ type }) {
  return <span className="ai103-pill ai103-pill--neutral">{formatQuestionType(type)}</span>;
}

function DeprecatedTag({ services }) {
  if (!services?.length) return null;
  return (
    <span className="ai103-pill ai103-pill--warning" title={`References retired Azure service(s): ${services.join(', ')}`}>
      Deprecated · {services.join(', ')}
    </span>
  );
}

function PromptSection({ question, parts }) {
  return (
    <section className="ai103-final-prompt">
      <h3>Question</h3>
      {parts.promptParagraphs.map((paragraph, index) => (
        <p key={`${question.number}-prompt-${index}`} style={{ whiteSpace: 'pre-wrap' }}>
          {paragraph}
        </p>
      ))}
      {!parts.promptParagraphs.length ? <p>No question text extracted.</p> : null}
      {parts.options.length ? (
        <div className="ai102-options" aria-label={`Question ${question.number} options`}>
          {parts.options.map((option) => (
            <div className="ai102-option" key={option.letter}>
              <strong>{option.letter}.</strong>
              <span>{option.text}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function QuestionCard({ question, index, total }) {
  const parts = getQuestionParts(question);
  const imagePage = question.questionPage || question.sourcePages[0];
  const additionalPages = question.sourcePages.filter((page) => page !== imagePage);
  const answerText = getAnswerText(question);

  return (
    <article className="ai103-page-card" id={`ai102-question-${question.number}`}>
      <div className="ai103-page-card-header">
        <h2>Question {question.number}</h2>
        <div className="ai103-page-card-tags">
          <QuestionTypeTag type={question.type} />
          <span className="ai103-pill">PDF pages {question.sourcePages.join(', ')}</span>
          <DeprecatedTag services={question.deprecatedServices} />
        </div>
      </div>

      <PromptSection question={question} parts={parts} />

      <section className="ai102-source-preview" aria-label={`PDF content for question ${question.number}`}>
        <h3>PDF question page · page {imagePage}</h3>
        <img
          src={getPdfPageUrl(imagePage)}
          alt={`PDF page ${imagePage} containing AI-102 question ${question.number}`}
          loading="lazy"
        />
        {additionalPages.length ? (
          <details className="ai102-additional-pages" open>
            <summary>Show {additionalPages.length} additional PDF page{additionalPages.length === 1 ? '' : 's'}</summary>
            {additionalPages.map((page) => (
              <figure key={page}>
                <figcaption>PDF page {page}</figcaption>
                <img src={getPdfPageUrl(page)} alt={`PDF page ${page} for AI-102 question ${question.number}`} loading="lazy" />
              </figure>
            ))}
          </details>
        ) : null}
      </section>

      <section className="ai103-answer-block">
        <h3>Answer</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{answerText}</p>
      </section>

      <section className="ai103-explanation-block">
        <h3>Explanation</h3>
        {parts.explanationParagraphs.map((paragraph, explanationIndex) => (
          <p key={`${question.number}-explanation-${explanationIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
            {paragraph}
          </p>
        ))}
      </section>

      <div className="ai103-footer-stats">
        <div className="ai103-footer-stat">
          <span className="ai103-footer-stat-label">Type</span>
          <span className="ai103-footer-stat-value">{formatQuestionType(question.type)}</span>
        </div>
        <div className="ai103-footer-stat">
          <span className="ai103-footer-stat-label">Source Pages</span>
          <span className="ai103-footer-stat-value">{question.sourcePages.join(', ')}</span>
        </div>
        <div className="ai103-footer-stat">
          <span className="ai103-footer-stat-label">Progress</span>
          <span className="ai103-footer-stat-value">{index + 1} / {total}</span>
        </div>
      </div>
    </article>
  );
}

const AI102 = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selectedNumber, setSelectedNumber] = useState(questions[0]?.number || 1);

  const filteredQuestions = useMemo(
    () => questions.filter((question) => matchesQuestion(question, searchQuery)),
    [searchQuery],
  );
  const selectedIndex = Math.max(
    filteredQuestions.findIndex((question) => question.number === selectedNumber),
    0,
  );
  const currentPage = Math.floor(selectedIndex / PAGE_SIZE);
  const activePage = Number.isFinite(page) && page === currentPage ? page : currentPage;
  const visibleQuestions = filteredQuestions.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE);
  const visibleQuestion = filteredQuestions[selectedIndex];
  const pageCount = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const wordCount = questions.reduce((total, question) => total + (question.text || '').split(/\s+/).filter(Boolean).length, 0);
  const typeCount = new Set(questions.map((question) => question.type)).size;
  const activeCount = questions.filter((question) => !question.deprecated).length;
  const deprecatedCount = questions.length - activeCount;

  const selectQuestion = (number) => {
    setSelectedNumber(number);
    const nextIndex = filteredQuestions.findIndex((question) => question.number === number);
    if (nextIndex >= 0) setPage(Math.floor(nextIndex / PAGE_SIZE));
  };

  const goToPage = (nextPage) => {
    const boundedPage = Math.min(Math.max(nextPage, 0), pageCount - 1);
    setPage(boundedPage);
    const firstQuestion = filteredQuestions[boundedPage * PAGE_SIZE];
    if (firstQuestion) setSelectedNumber(firstQuestion.number);
  };

  return (
    <div className="ai103-container">
      <LearningTabs />
      <div className="ai103-content">
        <header className="ai103-header">
          <div className="ai103-title-block">
            <div className="ai103-title-row">
              <span className="ai103-bubble" aria-hidden="true">✦</span>
              <h1>
                {ai102Content.title}
                <span className="ai103-title-suffix">{ai102Content.subtitle}</span>
              </h1>
            </div>
            <div className="ai103-kicker">
              <span className="ai103-badge">Learning / AI</span>
              <span className="ai103-meta">{ai102Content.sourceFile}</span>
            </div>
            <p className="ai103-source">
              Source:{' '}
              <a href={ai102Content.sourceUrl} target="_blank" rel="noreferrer">{ai102Content.sourceUrl}</a>
            </p>
            <div className="ai103-actions">
              <button type="button" className="ai103-practice-button" onClick={() => navigate('/learning/ai-102/practice')}>
                Practice 65 random
              </button>
              <button type="button" className="ai103-practice-button" onClick={() => navigate(`/learning/ai-102/practice?questions=${activeCount}`)}>
                Practice all {activeCount}
              </button>
            </div>
          </div>
          <div className="ai103-stat-grid" aria-label="AI-102 document stats">
            <div className="ai103-stat"><strong>{ai102Content.questionCount}</strong><span>Questions</span></div>
            <div className="ai103-stat"><strong>{deprecatedCount}</strong><span>Deprecated</span></div>
            <div className="ai103-stat"><strong>{typeCount}</strong><span>Question Types</span></div>
            <div className="ai103-stat"><strong>{formatNumber(wordCount)}</strong><span>Words</span></div>
          </div>
        </header>

        <section className="ai103-toolbar" aria-label="AI-102 controls">
          <label className="ai103-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Search concepts, keywords, or question number"
              aria-label="Search AI-102 questions"
            />
          </label>
          <div className="ai103-search-meta">
            <div className="ai103-pagination-controls" aria-label="Question pagination">
              <button type="button" onClick={() => selectQuestion(filteredQuestions[Math.max(selectedIndex - 1, 0)]?.number)} disabled={!selectedIndex}>← Previous</button>
              <span>{visibleQuestion ? `Question ${visibleQuestion.number} · ${filteredQuestions.length} matches` : 'No questions'}</span>
              <button type="button" onClick={() => selectQuestion(filteredQuestions[Math.min(selectedIndex + 1, filteredQuestions.length - 1)]?.number)} disabled={selectedIndex >= filteredQuestions.length - 1}>Next →</button>
            </div>
          </div>
        </section>

        <div className="ai103-layout">
          <aside className="ai103-page-index" aria-label="AI-102 question index">
            {visibleQuestions.map((question) => (
              <button
                key={question.number}
                type="button"
                title={question.deprecated ? `Deprecated: references ${question.deprecatedServices.join(', ')}` : undefined}
                className={[question.number === visibleQuestion?.number ? 'active' : '', question.deprecated ? 'deprecated' : ''].filter(Boolean).join(' ')}
                onClick={() => selectQuestion(question.number)}
              >
                {question.number}
              </button>
            ))}
          </aside>
          <section className="ai103-page-list" aria-label="AI-102 question content">
            {visibleQuestion ? (
              <QuestionCard question={visibleQuestion} index={selectedIndex} total={filteredQuestions.length} />
            ) : (
              <div className="ai103-empty-state"><strong>No questions found</strong><span>Try a different search.</span></div>
            )}
            <div className="ai102-page-buttons" aria-label="Question pages">
              <button type="button" onClick={() => goToPage(activePage - 1)} disabled={activePage === 0}>Previous page</button>
              <span>Page {activePage + 1} of {pageCount}</span>
              <button type="button" onClick={() => goToPage(activePage + 1)} disabled={activePage === pageCount - 1}>Next page</button>
            </div>
          </section>
        </div>

        <footer className="ai103-page-footer">
          <span>© 2026 · AI-102 study material</span>
          <button type="button" className="ai103-link-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AI102;
