import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AI103.css';
import ai102Content from '../data/ai102Content.json';
import { answerKey, formatQuestionType, getAnswerText, getPdfPageUrl, getQuestionParts } from '../utils/ai102';

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getQuestionCount(location) {
  const requested = Number(new URLSearchParams(location.search).get('questions'));
  return Number.isFinite(requested) && requested > 0 ? requested : 65;
}

const activeQuestions = ai102Content.questions.filter((question) => !question.deprecated);

function hasSelection(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim?.() || value);
}

function PracticeOptions({ question, parts, value, disabled, onChange }) {
  if (!parts.options.length) {
    return (
      <label className="ai103-practice-written">
        <span>Your answer</span>
        <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} rows={4} placeholder="Enter your answer or describe the answer-area selections" />
      </label>
    );
  }

  const multi = parts.answerLetters.length > 1;
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <div className="ai103-practice-options" role="group" aria-label={`Question ${question.number} options`}>
      {parts.options.map((option) => {
        const checked = selected.includes(option.letter);
        return (
          <label className={`ai103-practice-option${checked ? ' selected' : ''}`} key={option.letter}>
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={`ai102-question-${question.number}`}
              checked={checked}
              disabled={disabled}
              onChange={() => {
                if (multi) onChange(checked ? selected.filter((letter) => letter !== option.letter) : [...selected, option.letter]);
                else onChange(option.letter);
              }}
            />
            <strong>{option.letter}.</strong><span>{option.text}</span>
          </label>
        );
      })}
    </div>
  );
}

const AI102Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedCount = getQuestionCount(location);
  const [session, setSession] = useState(() => shuffle(activeQuestions).slice(0, Math.min(requestedCount, activeQuestions.length)));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = session[currentIndex];
  const currentParts = useMemo(() => getQuestionParts(currentQuestion), [currentQuestion]);
  const autoScored = session.filter((question) => answerKey(question)).length;
  const answeredCount = session.filter((question) => hasSelection(selections[question.number])).length;
  const results = useMemo(() => {
    if (!submitted) return null;
    const items = session.map((question) => {
      const expected = answerKey(question);
      const actual = Array.isArray(selections[question.number])
        ? [...selections[question.number]].sort().join('')
        : selections[question.number] || '';
      return { question, expected, actual, isCorrect: Boolean(expected) && expected === actual.split('').sort().join('') };
    });
    const scored = items.filter((item) => item.expected);
    const correct = scored.filter((item) => item.isCorrect).length;
    return { items, correct, scored: scored.length, percent: scored.length ? Math.round((correct / scored.length) * 100) : 0 };
  }, [session, selections, submitted]);

  const startNewSession = (count = requestedCount) => {
    setSession(shuffle(activeQuestions).slice(0, Math.min(count, activeQuestions.length)));
    setCurrentIndex(0);
    setSelections({});
    setSubmitted(false);
  };

  if (!currentQuestion) return null;

  return (
    <div className="ai103-container ai103-practice-page">
      <div className="ai103-content">
        <header className="ai103-practice-header">
          <div>
            <span className="ai103-badge">AI-102 Practice</span>
            <h1>Designing and Implementing an Azure AI Solution</h1>
            <p>{session.length} random questions from the {activeQuestions.length}-question AI-102 learning set (deprecated-service questions excluded).</p>
          </div>
          <div className="ai103-practice-summary"><strong>{answeredCount}/{session.length}</strong><span>Answered</span><strong>{autoScored}</strong><span>Auto-scored</span></div>
        </header>

        <section className="ai103-practice-shell">
          <aside className="ai103-practice-rail" aria-label="AI-102 practice question navigation">
            {session.map((question, index) => {
              const result = results?.items.find((item) => item.question.number === question.number);
              return <button key={`${question.number}-${index}`} type="button" className={[index === currentIndex ? 'active' : '', hasSelection(selections[question.number]) ? 'answered' : '', result?.isCorrect ? 'correct' : '', results && result && !result.isCorrect ? 'incorrect' : ''].filter(Boolean).join(' ')} onClick={() => setCurrentIndex(index)}>{index + 1}</button>;
            })}
          </aside>
          <article className="ai103-practice-card">
            <div className="ai103-page-card-header"><span>Question {currentIndex + 1} of {session.length}</span><small>Source question {currentQuestion.number}</small></div>
            <div className="ai103-question-type-row"><span>{formatQuestionType(currentQuestion.type)}</span><span>{currentParts.options.length ? 'Choose answer' : 'Written response'}</span></div>
            <section className="ai103-final-prompt">
              <h2>Question</h2>
              {currentParts.promptParagraphs.map((paragraph, index) => <p key={index} style={{ whiteSpace: 'pre-wrap' }}>{paragraph}</p>)}
              {currentParts.options.length ? <p className="ai102-practice-note">Select {currentParts.answerLetters.length > 1 ? 'all answers that apply' : 'one answer'}.</p> : null}
            </section>
            <section className="ai102-source-preview" aria-label={`PDF content for practice question ${currentQuestion.number}`}>
              <h3>PDF question page · page {currentQuestion.questionPage || currentQuestion.sourcePages[0]}</h3>
              <img src={getPdfPageUrl(currentQuestion.questionPage || currentQuestion.sourcePages[0])} alt={`PDF page for question ${currentQuestion.number}`} loading="lazy" />
              {currentQuestion.sourcePages.length > 1 ? (
                <details className="ai102-additional-pages" open>
                  <summary>Show additional PDF pages</summary>
                  {currentQuestion.sourcePages.filter((page) => page !== (currentQuestion.questionPage || currentQuestion.sourcePages[0])).map((page) => (
                    <figure key={page}><figcaption>PDF page {page}</figcaption><img src={getPdfPageUrl(page)} alt={`PDF page ${page} for question ${currentQuestion.number}`} loading="lazy" /></figure>
                  ))}
                </details>
              ) : null}
            </section>
            <PracticeOptions question={currentQuestion} parts={currentParts} value={selections[currentQuestion.number]} disabled={submitted} onChange={(value) => setSelections((previous) => ({ ...previous, [currentQuestion.number]: value }))} />

            {submitted ? (
              <section className="ai103-practice-review">
                <h2>Answer Review</h2>
                <p>Correct answer: <strong style={{ whiteSpace: 'pre-wrap' }}>{getAnswerText(currentQuestion)}</strong></p>
                {currentParts.explanationParagraphs.map((paragraph, index) => <p key={index} style={{ whiteSpace: 'pre-wrap' }}>{paragraph}</p>)}
              </section>
            ) : null}
            {results ? <section className="ai103-practice-results"><strong>{results.correct} of {results.scored} auto-scored correct ({results.percent}%)</strong><span>{session.length - results.scored} questions need manual review.</span></section> : null}
            <div className="ai103-practice-actions">
              <button type="button" onClick={() => navigate('/learning/ai-102')}>Back to Learning</button>
              <button type="button" onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))} disabled={currentIndex === 0}>Previous</button>
              <button type="button" onClick={() => setCurrentIndex((index) => Math.min(index + 1, session.length - 1))} disabled={currentIndex === session.length - 1}>Next</button>
              <button type="button" className="primary" onClick={() => setSubmitted(true)} disabled={submitted}>Submit Test</button>
              {submitted ? <button type="button" onClick={() => startNewSession()}>New Session</button> : null}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
};

export default AI102Practice;
