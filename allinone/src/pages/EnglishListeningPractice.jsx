import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AI103.css';
import './English.css';
import ListeningPlayer from '../components/ListeningPlayer';
import { useAuth } from '../AuthContext';
import {
  assembleListeningTest,
  getListeningTestResults,
  getWeakestReadingTags,
} from '../utils/learning';
import {
  loadProgressState,
  recordTagResults,
  saveProgressState,
} from '../utils/progress';
import {
  buildListeningResultPayload,
  saveLearningResult,
} from '../utils/learningResults';
import { useEnglishContent } from '../utils/englishContent';

const audioModules = import.meta.glob('../assets/english/audio/*.m4a', {
  eager: true,
  query: '?url',
  import: 'default',
});
const imageModules = import.meta.glob('../assets/english/*.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const audioUrl = (segmentId) => audioModules[`../assets/english/audio/${segmentId}.m4a`];
const imageUrl = (name) => imageModules[`../assets/english/${name}`];

const PART_DIRECTIONS = {
  1: 'For each question, you will hear four statements about a picture. Select the statement that best describes what you see. The statements are not printed and will be spoken only once.',
  2: 'You will hear a question or statement followed by three responses. Select the best response. The question and responses are not printed and will be spoken only once.',
  3: 'You will hear a conversation between two people. Answer three questions about what the speakers say. The conversation will be spoken only once.',
  4: 'You will hear a talk given by a single speaker. Answer three questions about what the speaker says. The talk will be spoken only once.',
};

const MODE_LABELS = {
  listening: 'Listening Test',
  part1: 'Part 1 Practice — Photographs',
  part2: 'Part 2 Practice — Question–Response',
  part3: 'Part 3 Practice — Conversations',
  part4: 'Part 4 Practice — Talks',
};

const SPEAKER_LABELS = {
  narrator: 'Narrator',
  'man-us': 'Man',
  'man-uk': 'Man',
  'woman-us': 'Woman',
  'woman-au': 'Woman',
};

function buildSession(listeningContent, mode, formNumber = 1) {
  if (mode === 'listening') return assembleListeningTest(listeningContent, { formNumber });
  const part = Number(mode.replace('part', ''));
  return assembleListeningTest(listeningContent, { part });
}

const EnglishListeningPractice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const { listeningContent } = useEnglishContent();
  const savedResultKeyRef = useRef(null);
  const mode = location.state?.mode || 'listening';
  const chain = location.state?.chain || null;
  const formNumber = location.state?.formNumber || 1;
  const isTestMode = mode === 'listening';
  const baseModeLabel = MODE_LABELS[mode] || MODE_LABELS.listening;
  const modeLabel = isTestMode ? `Test ${formNumber} · ${baseModeLabel}` : baseModeLabel;
  const [session, setSession] = useState(() => buildSession(listeningContent, mode, formNumber));
  const [phase, setPhase] = useState(isTestMode ? 'intro' : 'running');
  const [groupIndex, setGroupIndex] = useState(0);
  const [groupPhase, setGroupPhase] = useState('audio');
  const [responseRemaining, setResponseRemaining] = useState(null);
  const [selections, setSelections] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const currentGroup = session.groups[groupIndex];
  const previousGroup = groupIndex > 0 ? session.groups[groupIndex - 1] : null;
  const showDirections = !previousGroup || previousGroup.part !== currentGroup?.part;
  const answeredCount = session.questions.filter((question) => selections[question.number]).length;
  const results = useMemo(
    () => (isSubmitted ? getListeningTestResults(session.questions, selections) : null),
    [isSubmitted, session.questions, selections],
  );
  const weakestTags = useMemo(
    () => (results ? getWeakestReadingTags(results, { minTotal: 2, limit: 4 }) : []),
    [results],
  );

  // Accumulate per-tag history for the weakest-topics report. Selections are
  // frozen once submitted, so this runs exactly once per finished section.
  useEffect(() => {
    if (!results) return;
    saveProgressState(user?.id, recordTagResults(loadProgressState(user?.id), results.perTag));
  }, [results, user?.id]);

  useEffect(() => {
    if (!results) return;

    const payload = buildListeningResultPayload(results, { mode, formNumber, chain });
    const saveKey = JSON.stringify({
      kind: payload?.kind,
      raw: payload?.raw,
      scaled: payload?.scaled,
      total: payload?.total,
      mode,
      chain,
    });

    if (!payload || savedResultKeyRef.current === saveKey) return;
    savedResultKeyRef.current = saveKey;

    void saveLearningResult(payload, { token });
  }, [chain, formNumber, mode, results, token]);

  const submitTest = () => {
    setIsSubmitted(true);
    setShowResultsModal(true);
    setPhase('done');
    setResponseRemaining(null);
  };

  const advanceGroup = () => {
    if (groupIndex + 1 < session.groups.length) {
      setGroupIndex(groupIndex + 1);
      setGroupPhase('audio');
      setResponseRemaining(null);
    } else {
      submitTest();
    }
  };

  // Response-window countdown drives the exam pacing in test mode.
  useEffect(() => {
    if (!isTestMode || phase !== 'running' || groupPhase !== 'response') return undefined;
    if (responseRemaining === null) return undefined;

    if (responseRemaining <= 0) {
      advanceGroup();
      return undefined;
    }

    const timerId = window.setTimeout(
      () => setResponseRemaining(responseRemaining - 1),
      1000,
    );

    return () => window.clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTestMode, phase, groupPhase, responseRemaining]);

  const handleAudioFinished = () => {
    if (!isTestMode || isSubmitted) return;
    setGroupPhase('response');
    setResponseRemaining(currentGroup?.responseSeconds || 5);
  };

  const updateSelection = (questionNumber, optionKey) => {
    if (isSubmitted) return;

    setSelections((currentSelections) => ({
      ...currentSelections,
      [questionNumber]: optionKey,
    }));
  };

  const goToGroup = (nextIndex) => {
    setGroupIndex(Math.max(0, Math.min(session.groups.length - 1, nextIndex)));
  };

  const retryTest = () => {
    setSession(buildSession(listeningContent, mode, formNumber));
    setPhase(isTestMode ? 'intro' : 'running');
    setGroupIndex(0);
    setGroupPhase('audio');
    setResponseRemaining(null);
    setSelections({});
    setIsSubmitted(false);
    setShowResultsModal(false);
    savedResultKeyRef.current = null;
  };

  const continueToReading = () => {
    navigate('/learning/english/practice', {
      state: {
        mode: 'full',
        formNumber,
        listening: {
          correctCount: results.correctCount,
          totalQuestions: results.totalQuestions,
          scaledScore: results.scaledScore,
        },
      },
    });
  };

  if (!currentGroup) {
    return (
      <main className="ai103-container cosmic-page">
        <div className="ai103-content cosmic-content">
          <div className="ai103-empty-state">
            <strong>No listening questions found</strong>
          </div>
        </div>
      </main>
    );
  }

  const groupNavigationLocked = isTestMode && !isSubmitted;
  const playerLocked = isTestMode && !isSubmitted;

  return (
    <main
      className="ai103-container ai103-practice-page cosmic-page"
      style={{
        '--page-accent': 'var(--cosmic-blue)',
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
              aria-labelledby="english-listening-result-title"
            >
              <div className="ai103-practice-modal-header">
                <span>Listening Result</span>
                <button type="button" onClick={() => setShowResultsModal(false)} aria-label="Close result popup">
                  X
                </button>
              </div>
              <h2 id="english-listening-result-title">
                {isTestMode ? `Estimated score: ${results.scaledScore} / 495` : `Score: ${results.scorePercent}%`}
              </h2>
              <div className="ai103-practice-score-grid" aria-label="Listening score summary">
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
                <div className="english-tag-list">
                  {weakestTags.map((entry) => (
                    <span key={entry.tag}>
                      {entry.tag} · {entry.correct}/{entry.total}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="ai103-practice-modal-actions">
                <button type="button" onClick={() => setShowResultsModal(false)}>
                  Review Answers
                </button>
                {chain === 'full' ? (
                  <button type="button" className="primary" onClick={continueToReading}>
                    Continue to Reading Section
                  </button>
                ) : (
                  <button type="button" className="primary" onClick={retryTest}>
                    Retry Test
                  </button>
                )}
              </div>
            </section>
          </div>
        ) : null}

        <header className="ai103-practice-header">
          <div>
            <div className="ai103-kicker">
              <span className="ai103-badge">English Listening</span>
              <span className="ai103-meta ai103-mode-meta">{modeLabel}</span>
            </div>
            <h1>
              {modeLabel}
              <span>
                {session.totalQuestions} questions
                {session.isFullForm ? '' : isTestMode ? ' (partial form — bank still growing)' : ''}.{' '}
                {isTestMode
                  ? 'The recording controls the pace: audio plays once, then a short answer window follows.'
                  : 'Practice mode: replay the audio as often as you like.'}
              </span>
            </h1>
          </div>
          <div className="ai103-practice-summary">
            <strong>{answeredCount}/{session.totalQuestions}</strong>
            <span>Answered</span>
            {isTestMode && phase === 'running' && groupPhase === 'response' && responseRemaining !== null ? (
              <>
                <strong>{responseRemaining}s</strong>
                <span>Answer window</span>
              </>
            ) : null}
            {results ? (
              <>
                <strong>{isTestMode ? results.scaledScore : `${results.scorePercent}%`}</strong>
                <span>{isTestMode ? 'Est. score' : 'Score'}</span>
              </>
            ) : null}
          </div>
        </header>

        {phase === 'intro' ? (
          <section className="ai103-practice-shell english-intro-shell">
            <article className="ai103-practice-card">
              <div className="english-directions">
                <strong>Listening section</strong>
                In this section you will demonstrate how well you understand spoken English.
                Each recording plays only once and cannot be paused. After each recording,
                you will have a short window to mark your answers before the next one begins.
              </div>
              <div className="ai103-practice-actions">
                <button type="button" onClick={() => navigate('/learning/english')}>
                  Back to Learning
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => setPhase('running')}
                >
                  Start Listening Section
                </button>
              </div>
            </article>
          </section>
        ) : (
          <section className="ai103-practice-shell">
            <aside className="ai103-practice-rail" aria-label="Listening question navigation">
              {session.questions.map((question) => {
                const resultItem = results?.items.find((item) => item.number === question.number);
                const inCurrentGroup = currentGroup.questionNumbers.includes(question.number);
                const buttonClass = [
                  inCurrentGroup ? 'active' : '',
                  selections[question.number] ? 'answered' : '',
                  isSubmitted && resultItem?.isCorrect ? 'correct' : '',
                  isSubmitted && resultItem && !resultItem.isCorrect ? 'incorrect' : '',
                ].filter(Boolean).join(' ');
                const groupForQuestion = session.groups.findIndex(
                  (group) => group.questionNumbers.includes(question.number),
                );

                return (
                  <button
                    key={question.number}
                    type="button"
                    className={buttonClass}
                    disabled={groupNavigationLocked}
                    onClick={() => goToGroup(groupForQuestion)}
                    aria-current={inCurrentGroup ? 'page' : undefined}
                  >
                    {question.number}
                  </button>
                );
              })}
            </aside>

            <article className="ai103-practice-card" key={currentGroup.id}>
              <div className="ai103-page-card-header">
                <span>
                  Part {currentGroup.part} · Question{currentGroup.questionNumbers.length > 1 ? 's' : ''}{' '}
                  {currentGroup.questionNumbers[0]}
                  {currentGroup.questionNumbers.length > 1
                    ? `–${currentGroup.questionNumbers[currentGroup.questionNumbers.length - 1]}`
                    : ''}
                </span>
                <small>Recording {groupIndex + 1} of {session.groups.length}</small>
              </div>

              {showDirections || !isTestMode ? (
                <div className="english-directions">
                  <strong>Part {currentGroup.part}</strong>
                  {PART_DIRECTIONS[currentGroup.part]}
                </div>
              ) : null}

              <ListeningPlayer
                key={`${currentGroup.id}-${isSubmitted ? 'review' : 'test'}`}
                sources={currentGroup.segments.map((segment) => audioUrl(segment.id)).filter(Boolean)}
                locked={playerLocked}
                autoPlay={isTestMode && !isSubmitted}
                onFinished={handleAudioFinished}
              />

              {currentGroup.image ? (
                <figure className="english-photo">
                  <img src={imageUrl(currentGroup.image)} alt={`Part 1 photograph for question ${currentGroup.questionNumbers[0]}`} />
                </figure>
              ) : null}

              {currentGroup.questions.map((question) => {
                const resultItem = results?.items.find((item) => item.number === question.number);
                const letterOnly = currentGroup.part === 1 || currentGroup.part === 2;

                return (
                  <div className="english-group-question" key={question.number}>
                    <section className="ai103-final-prompt">
                      <h2>Question {question.number}</h2>
                      <p>{question.prompt}</p>
                    </section>
                    <div
                      className={`ai103-practice-options${letterOnly ? ' english-letter-options' : ''}`}
                      role="group"
                      aria-label={`Question ${question.number} options`}
                    >
                      {question.options.map((option) => {
                        const selected = selections[question.number] === option.key;
                        const correct = option.key === question.answer;
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
                              name={`listening-question-${question.number}`}
                              value={option.key}
                              checked={selected}
                              disabled={isSubmitted}
                              onChange={() => updateSelection(question.number, option.key)}
                            />
                            <span className="ai103-option-key">{option.key}</span>
                            {option.text ? <span>{option.text}</span> : null}
                          </label>
                        );
                      })}
                    </div>
                    {isSubmitted ? (
                      <section className="ai103-practice-review">
                        <p>
                          Correct answer: <strong>{question.answer}</strong>
                          {resultItem && !resultItem.isCorrect && resultItem.selected
                            ? ` — you chose ${resultItem.selected}`
                            : ''}
                          {resultItem && !resultItem.selected ? ' — not answered' : ''}
                        </p>
                        {question.explanation ? <p>{question.explanation}</p> : null}
                      </section>
                    ) : null}
                  </div>
                );
              })}

              {isSubmitted ? (
                <section className="english-transcript" aria-label="Recording transcript">
                  <h2>Transcript</h2>
                  {currentGroup.segments.map((segment) => (
                    <p key={segment.id}>
                      <strong>{SPEAKER_LABELS[segment.voice] || 'Speaker'}:</strong> {segment.text}
                    </p>
                  ))}
                </section>
              ) : null}

              <div className="ai103-practice-actions">
                <button type="button" onClick={() => navigate('/learning/english')}>
                  Back to Learning
                </button>
                {!groupNavigationLocked ? (
                  <>
                    <button type="button" onClick={() => goToGroup(groupIndex - 1)} disabled={groupIndex === 0}>
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => goToGroup(groupIndex + 1)}
                      disabled={groupIndex === session.groups.length - 1}
                    >
                      Next
                    </button>
                  </>
                ) : null}
                {!isTestMode && !isSubmitted ? (
                  <button type="button" className="primary" onClick={submitTest}>
                    Submit
                  </button>
                ) : null}
                {isTestMode && !isSubmitted && groupPhase === 'response' ? (
                  <button type="button" className="primary" onClick={advanceGroup}>
                    {groupIndex + 1 < session.groups.length ? 'Next Recording' : 'Finish Section'}
                  </button>
                ) : null}
              </div>
            </article>
          </section>
        )}
      </div>
    </main>
  );
};

export default EnglishListeningPractice;
