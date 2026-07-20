import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AI103.css';
import './English.css';
import PassagePanel from '../components/PassagePanel';
import { useAuth } from '../AuthContext';
import {
  assembleReadingTest,
  getFullTestScore,
  getMaxReadingFormScale,
  getReadingTestResults,
  getWeakestReadingTags,
} from '../utils/learning';
import {
  addCustomCards,
  getMissedVocabCards,
  loadVocabState,
  saveVocabState,
} from '../utils/vocab';
import {
  loadProgressState,
  recordTagResults,
  saveProgressState,
} from '../utils/progress';
import {
  buildReadingResultPayload,
  saveLearningResult,
} from '../utils/learningResults';
import { useEnglishContent } from '../utils/englishContent';

const PART_DIRECTIONS = {
  5: 'A word or phrase is missing in each of the sentences below. Four answer choices are given below each sentence. Select the best answer to complete the sentence.',
  6: 'Read the texts that follow. A word, phrase, or sentence is missing in parts of each text. Four answer choices are given below each of the texts. Select the best answer to complete the text.',
  7: 'In this part you will read a selection of texts. Each text or set of texts is followed by several questions. Select the best answer for each question.',
};

const MODE_LABELS = {
  full: 'Full Reading Test',
  mini: 'Mini Test',
  part5: 'Part 5 Practice',
  part6: 'Part 6 Practice',
  part7: 'Part 7 Practice',
};

function buildSession(readingContent, mode, formNumber = 1) {
  if (mode === 'part5') return assembleReadingTest(readingContent, { part: 5 });
  if (mode === 'part6') return assembleReadingTest(readingContent, { part: 6 });
  if (mode === 'part7') return assembleReadingTest(readingContent, { part: 7 });
  if (mode === 'mini') {
    return assembleReadingTest(readingContent, { scale: getMaxReadingFormScale(readingContent) / 2 });
  }
  return assembleReadingTest(readingContent, { formNumber });
}

function formatRemainingTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

const EnglishPractice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.state?.mode || 'full';
  const formNumber = location.state?.formNumber || 1;
  const listeningSummary = location.state?.listening || null;
  const { readingContent } = useEnglishContent();
  const modeLabel = listeningSummary
    ? `Test ${formNumber} · Full Test — Reading Section`
    : mode === 'full' ? `Test ${formNumber} · Full Reading Test` : MODE_LABELS[mode] || MODE_LABELS.full;
  const [session, setSession] = useState(() => buildSession(readingContent, mode, formNumber));
  const [remainingSeconds, setRemainingSeconds] = useState(() => (
    session.timeLimitMinutes ? session.timeLimitMinutes * 60 : null
  ));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState({});
  const [flaggedNumbers, setFlaggedNumbers] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const { user, token } = useAuth();
  const savedResultKeyRef = useRef(null);
  const currentQuestion = session.questions[currentIndex];
  const previousQuestion = currentIndex > 0 ? session.questions[currentIndex - 1] : null;
  const showDirections = !previousQuestion || previousQuestion.part !== currentQuestion?.part;
  const answeredCount = session.questions.filter((question) => selections[question.number]).length;
  const unansweredCount = session.questions.length - answeredCount;
  const results = useMemo(
    () => (isSubmitted ? getReadingTestResults(session.questions, selections) : null),
    [isSubmitted, session.questions, selections],
  );
  const weakestTags = useMemo(
    () => (results ? getWeakestReadingTags(results, { minTotal: 2, limit: 4 }) : []),
    [results],
  );
  const missedVocabCards = useMemo(
    () => (results ? getMissedVocabCards(session.questions, results) : []),
    [results, session.questions],
  );
  const isScoredForm = mode === 'full' || mode === 'mini';

  // Accumulate per-tag history for the weakest-topics report. Selections are
  // frozen once submitted, so this runs exactly once per finished test.
  useEffect(() => {
    if (!results) return;
    saveProgressState(user?.id, recordTagResults(loadProgressState(user?.id), results.perTag));
  }, [results, user?.id]);

  useEffect(() => {
    if (!results) return;

    const duration = session.timeLimitMinutes && remainingSeconds !== null
      ? (session.timeLimitMinutes * 60) - remainingSeconds
      : null;
    const payload = buildReadingResultPayload(results, { mode, formNumber, duration, listeningSummary });
    const saveKey = JSON.stringify({
      kind: payload?.kind,
      raw: payload?.raw,
      scaled: payload?.scaled,
      total: payload?.total,
      mode,
    });

    if (!payload || savedResultKeyRef.current === saveKey) return;
    savedResultKeyRef.current = saveKey;

    void saveLearningResult(payload, { token });
  }, [formNumber, listeningSummary, mode, remainingSeconds, results, session.timeLimitMinutes, token]);

  // Auto-mine missed Part 5 words into the custom vocab deck the moment
  // results become available. The dedup-key makes the effect idempotent
  // across React 19 strict-mode re-runs and across rapid modal toggles, and
  // it scopes re-mining to a new session on Retry. This is a localStorage
  // side effect (external system), so doing it inside the effect body is
  // correct — no React state needs to change.
  const missedAddedKeyRef = useRef(null);

  useEffect(() => {
    if (!missedVocabCards.length) return;
    const addKey = JSON.stringify({
      mode,
      formNumber,
      missedIds: missedVocabCards.map((card) => card.id).sort(),
    });
    if (missedAddedKeyRef.current === addKey) return;
    missedAddedKeyRef.current = addKey;
    saveVocabState(user?.id, addCustomCards(loadVocabState(user?.id), missedVocabCards));
  }, [missedVocabCards, mode, formNumber, user?.id]);

  useEffect(() => {
    if (!session.timeLimitMinutes || isSubmitted) return undefined;
    if (remainingSeconds <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        const nextSeconds = Math.max(0, currentSeconds - 1);

        if (nextSeconds === 0) {
          window.clearInterval(timerId);
          setIsSubmitted(true);
          setShowResultsModal(true);
        }

        return nextSeconds;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isSubmitted, remainingSeconds, session.timeLimitMinutes]);

  const updateSelection = (questionNumber, optionKey) => {
    if (isSubmitted) return;

    setSelections((currentSelections) => ({
      ...currentSelections,
      [questionNumber]: optionKey,
    }));
  };

  const toggleFlag = (questionNumber) => {
    if (isSubmitted) return;

    setFlaggedNumbers((currentFlags) => (
      currentFlags.includes(questionNumber)
        ? currentFlags.filter((number) => number !== questionNumber)
        : [...currentFlags, questionNumber]
    ));
  };

  const goToQuestion = (nextIndex) => {
    setCurrentIndex(Math.max(0, Math.min(session.questions.length - 1, nextIndex)));
  };

  const submitTest = () => {
    setIsSubmitted(true);
    setShowResultsModal(true);
  };

  const retryTest = () => {
    const nextSession = buildSession(readingContent, mode, formNumber);
    setSession(nextSession);
    setRemainingSeconds(nextSession.timeLimitMinutes ? nextSession.timeLimitMinutes * 60 : null);
    setSelections({});
    setFlaggedNumbers([]);
    setCurrentIndex(0);
    setIsSubmitted(false);
    setShowResultsModal(false);
    savedResultKeyRef.current = null;
    missedAddedKeyRef.current = null;
  };

  if (!currentQuestion) {
    return (
      <main className="ai103-container cosmic-page">
        <div className="ai103-content cosmic-content">
          <div className="ai103-empty-state">
            <strong>No practice questions found</strong>
          </div>
        </div>
      </main>
    );
  }

  const isFlagged = flaggedNumbers.includes(currentQuestion.number);
  const currentResultItem = results?.items.find((item) => item.number === currentQuestion.number);

  return (
    <main
      className="ai103-container ai103-practice-page cosmic-page"
      style={{
        '--page-accent': 'var(--cosmic-purple)',
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
      <div className="ai103-content cosmic-content">
        {results && showResultsModal ? (
          <div className="ai103-practice-modal-backdrop" role="presentation">
            <section
              className="ai103-practice-modal ai103-practice-result-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="english-practice-result-title"
              aria-describedby="english-practice-result-detail"
            >
              <div className="ai103-practice-modal-header">
                <span>Test Result</span>
                <button type="button" onClick={() => setShowResultsModal(false)} aria-label="Close result popup">
                  X
                </button>
              </div>
              <h2 id="english-practice-result-title">
                {listeningSummary
                  ? `Estimated total: ${getFullTestScore(listeningSummary, results).total} / 990`
                  : isScoredForm
                    ? `Estimated score: ${results.scaledScore} / 495`
                    : `Score: ${results.scorePercent}%`}
              </h2>
              {listeningSummary ? (
                <div className="english-result-parts" aria-label="Section scores">
                  <div>
                    <span>Listening</span>
                    <span>{listeningSummary.scaledScore} / 495</span>
                  </div>
                  <div>
                    <span>Reading</span>
                    <span>{results.scaledScore} / 495</span>
                  </div>
                </div>
              ) : null}
              <div className="ai103-practice-score-grid" aria-label="Practice score summary">
                <div>
                  <strong>{results.correctCount}</strong>
                  <span>Correct</span>
                </div>
                <div>
                  <strong>{results.totalQuestions}</strong>
                  <span>Questions</span>
                </div>
                <div>
                  <strong>{results.scorePercent}%</strong>
                  <span>Accuracy</span>
                </div>
              </div>
              <div className="english-result-parts" aria-label="Per-part results">
                {Object.entries(results.perPart).map(([part, stats]) => (
                  <div key={part}>
                    <span>Part {part}</span>
                    <span>{stats.correct} / {stats.total}</span>
                  </div>
                ))}
              </div>
              {weakestTags.length > 0 ? (
                <>
                  <p id="english-practice-result-detail" className="ai103-practice-result-detail">
                    {isScoredForm
                      ? 'Scaled score is an estimate based on a typical conversion table. Weakest areas:'
                      : 'Weakest areas:'}
                  </p>
                  <div className="english-tag-list">
                    {weakestTags.map((entry) => (
                      <span key={entry.tag}>
                        {entry.tag} · {entry.correct}/{entry.total}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p id="english-practice-result-detail" className="ai103-practice-result-detail">
                  You answered {results.correctCount} of {results.totalQuestions} questions correctly.
                </p>
              )}
              {missedVocabCards.length > 0 ? (
                <div className="english-missed-words">
                  <button type="button" disabled aria-live="polite">
                    ✓ {missedVocabCards.length} missed Part 5 word{missedVocabCards.length === 1 ? '' : 's'} added to Vocabulary
                  </button>
                </div>
              ) : null}
              <div className="ai103-practice-modal-actions">
                <button type="button" onClick={() => setShowResultsModal(false)}>
                  Review Answers
                </button>
                <button type="button" className="primary" onClick={retryTest}>
                  Retry Test
                </button>
              </div>
            </section>
          </div>
        ) : null}

        <header className="ai103-practice-header">
          <div>
            <div className="ai103-kicker">
              <span className="ai103-badge">English Practice</span>
              <span className="ai103-meta ai103-mode-meta">{modeLabel}</span>
            </div>
            <h1>
              {modeLabel}
              <span>
                {session.totalQuestions} questions
                {session.isFullForm ? '' : mode === 'full' ? ' (partial form — bank still growing)' : ''}.{' '}
                {session.timeLimitMinutes ? `${session.timeLimitMinutes}-minute limit.` : 'Untimed.'}
                {' '}Questions are numbered from 101, as on the real answer sheet.
              </span>
            </h1>
          </div>
          <div className="ai103-practice-summary">
            <strong>{answeredCount}/{session.questions.length}</strong>
            <span>Answered</span>
            {remainingSeconds !== null ? (
              <>
                <strong>{formatRemainingTime(remainingSeconds)}</strong>
                <span>Time left</span>
              </>
            ) : null}
            {results ? (
              <>
                <strong>{isScoredForm ? results.scaledScore : `${results.scorePercent}%`}</strong>
                <span>{isScoredForm ? 'Est. score' : 'Score'}</span>
              </>
            ) : null}
          </div>
        </header>

        <section className="ai103-practice-shell">
          <aside className="ai103-practice-rail" aria-label="Practice question navigation">
            {session.questions.map((question, index) => {
              const resultItem = results?.items.find((item) => item.number === question.number);
              const buttonClass = [
                index === currentIndex ? 'active' : '',
                selections[question.number] ? 'answered' : '',
                flaggedNumbers.includes(question.number) ? 'english-flagged' : '',
                isSubmitted && resultItem?.isCorrect ? 'correct' : '',
                isSubmitted && resultItem && !resultItem.isCorrect ? 'incorrect' : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={question.number}
                  type="button"
                  className={buttonClass}
                  onClick={() => goToQuestion(index)}
                  aria-current={index === currentIndex ? 'page' : undefined}
                  aria-label={`Go to question ${question.number}${flaggedNumbers.includes(question.number) ? ' (flagged)' : ''}`}
                >
                  {question.number}
                </button>
              );
            })}
          </aside>

          <article className="ai103-practice-card">
            <div className="ai103-page-card-header">
              <span>Question {currentQuestion.number} · {currentIndex + 1} of {session.questions.length}</span>
              <button
                type="button"
                className={`english-flag-toggle${isFlagged ? ' active' : ''}`}
                onClick={() => toggleFlag(currentQuestion.number)}
                aria-pressed={isFlagged}
                disabled={isSubmitted}
              >
                {isFlagged ? '⚑ Flagged' : '⚐ Flag for review'}
              </button>
            </div>

            {showDirections ? (
              <div className="english-directions">
                <strong>Part {currentQuestion.part}</strong>
                {PART_DIRECTIONS[currentQuestion.part]}
              </div>
            ) : null}

            <PassagePanel
              passages={currentQuestion.passages}
              currentBlank={currentQuestion.blank}
              idPrefix={`practice-${currentQuestion.number}`}
            />

            <section className="ai103-final-prompt">
              <h2>Question {currentQuestion.number}</h2>
              <p>{currentQuestion.prompt}</p>
            </section>

            <div className="ai103-practice-options" role="group" aria-label={`Question ${currentQuestion.number} options`}>
              {currentQuestion.options.map((option) => {
                const selected = selections[currentQuestion.number] === option.key;
                const correct = option.key === currentQuestion.answer;
                const optionClass = [
                  'ai103-practice-option',
                  selected ? 'selected' : '',
                  isSubmitted && correct ? 'correct' : '',
                  isSubmitted && selected && !correct ? 'incorrect' : '',
                ].filter(Boolean).join(' ');

                return (
                  <label className={optionClass} key={option.key}>
                    <input
                      type="radio"
                      name={`practice-question-${currentQuestion.number}`}
                      value={option.key}
                      checked={selected}
                      disabled={isSubmitted}
                      onChange={() => updateSelection(currentQuestion.number, option.key)}
                    />
                    <span className="ai103-option-key">{option.key}</span>
                    <span>{option.text}</span>
                  </label>
                );
              })}
            </div>

            {isSubmitted ? (
              <section className="ai103-practice-review">
                <h2>Answer Review</h2>
                <p>
                  Correct answer: <strong>{currentQuestion.answer}</strong>
                  {currentResultItem && !currentResultItem.isCorrect && currentResultItem.selected
                    ? ` — you chose ${currentResultItem.selected}`
                    : ''}
                  {currentResultItem && !currentResultItem.selected ? ' — not answered' : ''}
                </p>
                {currentQuestion.explanation ? <p>{currentQuestion.explanation}</p> : null}
              </section>
            ) : null}

            <div className="ai103-practice-actions">
              <button type="button" onClick={() => navigate('/learning/english')}>
                Back to Learning
              </button>
              <button type="button" onClick={() => goToQuestion(currentIndex - 1)} disabled={currentIndex === 0}>
                Previous
              </button>
              <button type="button" onClick={() => goToQuestion(currentIndex + 1)} disabled={currentIndex === session.questions.length - 1}>
                Next
              </button>
              <button
                type="button"
                className="primary"
                onClick={submitTest}
                disabled={isSubmitted}
              >
                Submit{!isSubmitted && unansweredCount > 0 ? ` (${unansweredCount} unanswered)` : ''}
              </button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
};

export default EnglishPractice;
