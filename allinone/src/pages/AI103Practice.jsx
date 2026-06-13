import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  createPracticeSession,
  getPracticeControlConfig,
  getPracticeQuestionDisplayParts,
  getPracticeResultSummary,
  getPracticeSessionResults,
  parsePracticeQuestionNumbers,
} from '../utils/learning';

const practiceVisualConfigs = {
  1: { blankImage: q1AnswerAreaBlank, solvedImage: q1AnswerArea, label: 'Answer Area' },
  4: { blankImage: q4AnswerAreaBlank, solvedImage: q4AnswerArea, label: 'Answer Area' },
  5: { blankImage: q5AnswerAreaBlank, solvedImage: q5AnswerArea, label: 'Answer Area' },
  6: { blankImage: q6AnswerAreaBlank, solvedImage: q6AnswerArea, label: 'Answer Area' },
  7: { blankImage: q7AnswerAreaBlank, solvedImage: q7AnswerArea, label: 'Answer Area' },
  8: { blankImage: q8AnswerAreaBlank, solvedImage: q8AnswerArea, label: 'Answer Area' },
  11: { blankImage: q11AnswerAreaBlank, solvedImage: q11AnswerArea, label: 'Answer Area' },
  15: { blankImage: q15AnswerAreaBlank, solvedImage: q15AnswerArea, label: 'Answer Area' },
  18: { blankImage: q18AnswerAreaBlank, solvedImage: q18AnswerArea, label: 'Answer Area' },
  20: { blankImage: q20AnswerAreaBlank, solvedImage: q20AnswerArea, label: 'Answer Area' },
  30: { blankImage: q30AnswerAreaBlank, solvedImage: q30AnswerArea, label: 'Answer Area' },
  32: { blankImage: q32AnswerAreaBlank, solvedImage: q32AnswerArea, label: 'Answer Area' },
  35: { blankImage: q35AnswerAreaBlank, solvedImage: q35AnswerArea, label: 'Answer Area' },
  37: { blankImage: q37AnswerAreaBlank, solvedImage: q37AnswerArea, label: 'Answer Area' },
  40: { blankImage: q40AnswerAreaBlank, solvedImage: q40AnswerArea, label: 'Answer Area' },
  49: { blankImage: q49AnswerAreaBlank, solvedImage: null, label: 'Answer Area' },
};

const practiceExhibitConfigs = {
  9: { image: q9Exhibit, label: 'Exhibit' },
  14: { image: q14Exhibit, label: 'Code Snippet' },
};

function formatDifficulty(difficulty) {
  const labels = {
    easy: 'Easy',
    normal: 'Normal',
    hard: 'Hard',
    'extra-hard': 'Extra Hard',
  };

  return labels[difficulty] || difficulty;
}

function difficultyClassName(difficulty) {
  return `mode-${difficulty || 'easy'}`;
}

function formatPracticeDuration(minutes) {
  return minutes ? `${minutes}-minute limit` : 'No time limit';
}

function formatPracticeHintPolicy(session) {
  return session.answerAreaHintsEnabled === false ? ' Answer-area hints hidden.' : '';
}

function formatRemainingTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function hasSelection(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') {
    return Object.values(value).every(Boolean);
  }
  return Boolean(value?.trim());
}

function PracticeStructuredControls({
  controlConfig,
  questionNumber,
  selectedValue,
  isSubmitted,
  onSelectionChange,
}) {
  if (!controlConfig) return null;

  if (controlConfig.type === 'dropdowns') {
    return (
      <div className="ai103-practice-structured ai103-practice-dropdowns">
        {controlConfig.controls.map((control) => {
          const selected = selectedValue?.[control.id] || '';
          const correct = controlConfig.correct[control.id];
          const isCorrect = isSubmitted && selected === correct;
          const isIncorrect = isSubmitted && selected && selected !== correct;

          return (
            <label
              className={[
                'ai103-practice-control-row',
                isCorrect ? 'correct' : '',
                isIncorrect ? 'incorrect' : '',
              ].filter(Boolean).join(' ')}
              key={control.id}
            >
              <span>{control.label}</span>
              <select
                value={selected}
                disabled={isSubmitted}
                onChange={(event) => onSelectionChange(questionNumber, {
                  controlId: control.id,
                  value: event.target.value,
                })}
              >
                <option value="">Choose an answer</option>
                {control.options.map((option) => (
                  <option value={option} key={option}>{option}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="ai103-practice-structured" role="group" aria-label={`Question ${questionNumber} answer rows`}>
      {controlConfig.controls.map((control) => {
        const selected = selectedValue?.[control.id] || '';
        const correct = controlConfig.correct[control.id];

        return (
          <div className="ai103-practice-radio-row" key={control.id}>
            <p>{control.label}</p>
            <div className="ai103-practice-radio-options">
              {control.options.map((option) => {
                const isSelected = selected === option;
                const isCorrect = isSubmitted && option === correct;
                const isIncorrect = isSubmitted && isSelected && option !== correct;

                return (
                  <label
                    className={[
                      isSelected ? 'selected' : '',
                      isCorrect ? 'correct' : '',
                      isIncorrect ? 'incorrect' : '',
                    ].filter(Boolean).join(' ')}
                    key={option}
                  >
                    <input
                      type="radio"
                      name={`practice-question-${questionNumber}-${control.id}`}
                      value={option}
                      checked={isSelected}
                      disabled={isSubmitted}
                      onChange={() => onSelectionChange(questionNumber, {
                        controlId: control.id,
                        value: option,
                      })}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PracticeOptionList({
  question,
  parts,
  controlConfig,
  selectedValue,
  isSubmitted,
  onSelectionChange,
}) {
  if (controlConfig) {
    return (
      <PracticeStructuredControls
        controlConfig={controlConfig}
        questionNumber={question.number}
        selectedValue={selectedValue}
        isSubmitted={isSubmitted}
        onSelectionChange={onSelectionChange}
      />
    );
  }

  if (!parts.options.length) {
    return (
      <label className="ai103-practice-written">
        <span>Your response</span>
        <textarea
          value={selectedValue || ''}
          onChange={(event) => onSelectionChange(question.number, event.target.value)}
          placeholder="Type your answer for this hotspot or drag-drop item."
          disabled={isSubmitted}
        />
      </label>
    );
  }

  return (
    <div className="ai103-practice-options" role="group" aria-label={`Question ${question.number} options`}>
      {parts.options.map((option) => {
        const selected = (selectedValue || []).includes(option.key);
        const correct = parts.answerSelections.includes(option.key);
        const optionClass = [
          'ai103-practice-option',
          selected ? 'selected' : '',
          isSubmitted && correct ? 'correct' : '',
          isSubmitted && selected && !correct ? 'incorrect' : '',
        ].filter(Boolean).join(' ');

        return (
          <label className={optionClass} key={option.key}>
            <input
              type={parts.allowsMultipleSelections ? 'checkbox' : 'radio'}
              name={`practice-question-${question.number}`}
              value={option.key}
              checked={selected}
              disabled={isSubmitted}
              onChange={() => onSelectionChange(question.number, option.key)}
            />
            <span className="ai103-option-key">{option.key}</span>
            <span>{option.text}</span>
          </label>
        );
      })}
    </div>
  );
}

const AI103Practice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const difficulty = location.state?.difficulty || 'easy';
  const questionNumbers = location.state?.questionNumbers || parsePracticeQuestionNumbers(location.search);
  const questions = useMemo(() => ai103Content.questions || [], []);
  const buildPracticeSession = () => createPracticeSession(questions, {
    difficulty,
    questionNumbers,
  });
  const [session, setSession] = useState(buildPracticeSession);
  const [remainingSeconds, setRemainingSeconds] = useState(() => (
    session.timeLimitMinutes ? session.timeLimitMinutes * 60 : null
  ));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const currentQuestion = session.questions[currentIndex];
  const currentParts = currentQuestion ? getPracticeQuestionDisplayParts(currentQuestion) : null;
  const controlConfig = currentQuestion ? getPracticeControlConfig(currentQuestion.number) : null;
  const visualConfig = currentQuestion ? practiceVisualConfigs[currentQuestion.number] : null;
  const exhibitConfig = currentQuestion ? practiceExhibitConfigs[currentQuestion.number] : null;
  const showAnswerAreaHint = Boolean(visualConfig && session.answerAreaHintsEnabled);
  const answeredCount = session.questions.filter((question) => hasSelection(selections[question.number])).length;
  const results = isSubmitted ? getPracticeSessionResults(session.questions, selections) : null;
  const resultSummary = results ? getPracticeResultSummary(results) : null;
  const autoScoredTotal = resultSummary?.autoScoredTotal || 0;
  const manualReviewTotal = resultSummary?.manualReviewTotal || 0;

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

  const updateSelection = (questionNumber, optionKeyOrText) => {
    if (isSubmitted) return;

    setSelections((currentSelections) => {
      if (!currentParts?.options.length) {
        if (getPracticeControlConfig(questionNumber)) {
          return {
            ...currentSelections,
            [questionNumber]: {
              ...(currentSelections[questionNumber] || {}),
              [optionKeyOrText.controlId]: optionKeyOrText.value,
            },
          };
        }

        return {
          ...currentSelections,
          [questionNumber]: optionKeyOrText,
        };
      }

      const existing = currentSelections[questionNumber] || [];
      if (currentParts.allowsMultipleSelections) {
        return {
          ...currentSelections,
          [questionNumber]: existing.includes(optionKeyOrText)
            ? existing.filter((key) => key !== optionKeyOrText)
            : [...existing, optionKeyOrText],
        };
      }

      return {
        ...currentSelections,
        [questionNumber]: [optionKeyOrText],
      };
    });
  };

  const goToQuestion = (nextIndex) => {
    setCurrentIndex(Math.max(0, Math.min(session.questions.length - 1, nextIndex)));
  };

  const submitPracticeTest = () => {
    setIsSubmitted(true);
    setShowResultsModal(true);
  };

  const retryPracticeTest = () => {
    const nextSession = buildPracticeSession();
    setSession(nextSession);
    setRemainingSeconds(nextSession.timeLimitMinutes ? nextSession.timeLimitMinutes * 60 : null);
    setSelections({});
    setCurrentIndex(0);
    setIsSubmitted(false);
    setShowResultsModal(false);
  };

  if (!currentQuestion || !currentParts) {
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

  return (
    <main
      className="ai103-container ai103-practice-page cosmic-page"
      style={{
        '--page-accent': 'var(--cosmic-pink)',
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
        {resultSummary && showResultsModal ? (
          <div className="ai103-practice-modal-backdrop" role="presentation">
            <section
              className="ai103-practice-modal ai103-practice-result-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai103-practice-result-title"
              aria-describedby="ai103-practice-result-detail"
            >
              <div className="ai103-practice-modal-header">
                <span>Test Result</span>
                <button type="button" onClick={() => setShowResultsModal(false)} aria-label="Close result popup">
                  X
                </button>
              </div>
              <h2 id="ai103-practice-result-title">{resultSummary.title}</h2>
              <div className="ai103-practice-score-grid" aria-label="Practice score summary">
                <div>
                  <strong>{resultSummary.correctCount}</strong>
                  <span>Correct</span>
                </div>
                <div>
                  <strong>{resultSummary.autoScoredTotal}</strong>
                  <span>Auto scored</span>
                </div>
                <div>
                  <strong>{resultSummary.manualReviewTotal}</strong>
                  <span>Manual review</span>
                </div>
              </div>
              <p id="ai103-practice-result-detail" className="ai103-practice-result-detail">
                {resultSummary.detail}
              </p>
              <div className="ai103-practice-modal-actions">
                <button type="button" onClick={() => setShowResultsModal(false)}>
                  Review Answers
                </button>
                <button type="button" className="primary" onClick={retryPracticeTest}>
                  Retry Test
                </button>
              </div>
            </section>
          </div>
        ) : null}

        <header className="ai103-practice-header">
          <div>
            <div className="ai103-kicker">
              <span className="ai103-badge">AI-103 Practice</span>
              <span className={`ai103-meta ai103-mode-meta ${difficultyClassName(session.difficulty)}`}>
                {formatDifficulty(session.difficulty)} mode
              </span>
            </div>
            <h1>
              Practice Test
              <span>
                {session.questions.length} random questions from the 65-question AI-103 learning set.{' '}
                {formatPracticeDuration(session.timeLimitMinutes)}.
                {formatPracticeHintPolicy(session)}
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
                <strong>{results.scorePercent}%</strong>
                <span>Auto score</span>
              </>
            ) : null}
          </div>
        </header>

        <section className="ai103-practice-shell">
          <aside className="ai103-practice-rail" aria-label="Practice question navigation">
            {session.questions.map((question, index) => {
              const resultItem = results?.items.find((item) => item.questionNumber === question.number);
              const buttonClass = [
                index === currentIndex ? 'active' : '',
                hasSelection(selections[question.number]) ? 'answered' : '',
                isSubmitted && resultItem?.isCorrect ? 'correct' : '',
                isSubmitted && resultItem && !resultItem.isCorrect ? 'incorrect' : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={`${question.number}-${index}`}
                  type="button"
                  className={buttonClass}
                  onClick={() => goToQuestion(index)}
                  aria-current={index === currentIndex ? 'page' : undefined}
                >
                  {index + 1}
                </button>
              );
            })}
          </aside>

          <article className="ai103-practice-card">
            <div className="ai103-page-card-header">
              <span>Question {currentIndex + 1} of {session.questions.length}</span>
              <small>Source question {currentQuestion.number}</small>
            </div>

            <div className="ai103-question-type-row">
              {currentParts.type ? <span>{currentParts.type}</span> : null}
              <span>{controlConfig || currentParts.options.length ? 'Choose answer' : 'Written response'}</span>
            </div>

            <section className="ai103-final-prompt">
              <h2>Question</h2>
              {currentParts.promptParagraphs.map((paragraph, index) => (
                <p key={`${currentQuestion.number}-practice-prompt-${index}`}>{paragraph}</p>
              ))}
            </section>

            {exhibitConfig ? (
              <section className="ai103-answer-visual ai103-exhibit-panel">
                <div className="ai103-answer-visual-header">
                  <h2>{exhibitConfig.label}</h2>
                </div>
                <img src={exhibitConfig.image} alt={`Question ${currentQuestion.number} ${exhibitConfig.label}`} />
              </section>
            ) : null}

            {showAnswerAreaHint ? (
              <section className="ai103-answer-visual">
                <div className="ai103-answer-visual-header">
                  <h2>{visualConfig.label}</h2>
                </div>
                <img src={visualConfig.blankImage} alt={`Question ${currentQuestion.number} answer area`} />
              </section>
            ) : null}

            <PracticeOptionList
              question={currentQuestion}
              parts={currentParts}
              controlConfig={controlConfig}
              selectedValue={selections[currentQuestion.number]}
              isSubmitted={isSubmitted}
              onSelectionChange={updateSelection}
            />

            {isSubmitted ? (
              <section className="ai103-practice-review">
                <h2>Answer Review</h2>
                {currentParts.answerSelections.length ? (
                  <p>
                    Correct answer: <strong>{currentParts.answerSelections.join(', ')}</strong>
                  </p>
                ) : controlConfig ? (
                  <p>
                    Correct answer: <strong>{controlConfig.controls.map((control) => controlConfig.correct[control.id]).join(', ')}</strong>
                  </p>
                ) : (
                  <p>This question uses a visual answer area. Compare your written response with the correct answer area and explanation.</p>
                )}
                {visualConfig?.solvedImage ? (
                  <div className="ai103-answer-visual ai103-answer-visual-solved">
                    <div className="ai103-answer-visual-header">
                      <h2>Correct Answer Area</h2>
                    </div>
                    <img src={visualConfig.solvedImage} alt={`Question ${currentQuestion.number} correct answer area`} />
                  </div>
                ) : null}
                {currentParts.explanationParagraphs.map((paragraph, index) => (
                  <p key={`${currentQuestion.number}-practice-explanation-${index}`}>{paragraph}</p>
                ))}
              </section>
            ) : null}

            {results ? (
              <section className="ai103-practice-results">
                <strong>{results.correctCount} of {autoScoredTotal} auto-scored correct</strong>
                <span>{manualReviewTotal} visual questions need manual review.</span>
              </section>
            ) : null}

            <div className="ai103-practice-actions">
              <button type="button" onClick={() => navigate('/learning/ai-103')}>
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
                onClick={submitPracticeTest}
                disabled={isSubmitted}
              >
                Submit Test
              </button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
};

export default AI103Practice;
