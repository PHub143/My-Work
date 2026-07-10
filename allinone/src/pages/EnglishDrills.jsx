import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AI103.css';
import './English.css';
import { useAuth } from '../AuthContext';
import { assembleDrill, getDrillTopics } from '../utils/learning';
import {
  loadProgressState,
  recordTagResults,
  saveProgressState,
} from '../utils/progress';
import {
  buildDrillResultPayload,
  saveLearningResult,
} from '../utils/learningResults';
import { useEnglishContent } from '../utils/englishContent';

const DRILL_QUESTION_COUNT = 10;

const formatTopic = (tag) => tag.replace(/-/g, ' ');

function buildDrill(readingContent, tags) {
  return assembleDrill(readingContent, { tags, questionCount: DRILL_QUESTION_COUNT });
}

// Per-topic accuracy over the answered drill questions (a question can carry
// several tags, so every tag it has accumulates).
function getDrillTopicStats(questions, selections) {
  const perTopic = {};
  let correctCount = 0;

  questions.forEach((question) => {
    const isCorrect = selections[question.number] === question.answer;
    if (isCorrect) correctCount += 1;

    question.tags.forEach((tag) => {
      perTopic[tag] = perTopic[tag] || { correct: 0, total: 0 };
      perTopic[tag].total += 1;
      if (isCorrect) perTopic[tag].correct += 1;
    });
  });

  return { perTopic, correctCount };
}

const EnglishDrills = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const { readingContent } = useEnglishContent();
  const drillTopics = useMemo(() => getDrillTopics(readingContent), [readingContent]);
  const drillTopicTags = useMemo(() => drillTopics.map((topic) => topic.tag), [drillTopics]);
  const requestedTags = useMemo(
    () => (location.state?.tags || []).filter((tag) => drillTopicTags.includes(tag)),
    [drillTopicTags, location.state],
  );
  const [selectedTags, setSelectedTags] = useState(requestedTags);
  const [session, setSession] = useState(() => (requestedTags.length ? buildDrill(readingContent, requestedTags) : null));
  const [phase, setPhase] = useState(requestedTags.length ? 'running' : 'setup');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState({});
  const [historyState, setHistoryState] = useState(() => loadProgressState(user?.id));

  const toggleTag = (tag) => {
    setSelectedTags((currentTags) => (
      currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag]
    ));
  };

  const startDrill = (tags) => {
    setSession(buildDrill(readingContent, tags));
    setSelections({});
    setCurrentIndex(0);
    setPhase('running');
  };

  const currentQuestion = phase === 'setup' ? null : session?.questions[currentIndex];
  const currentSelection = currentQuestion ? selections[currentQuestion.number] : null;
  const isAnswered = Boolean(currentSelection);
  const isLastQuestion = session ? currentIndex === session.questions.length - 1 : false;
  const { perTopic, correctCount } = useMemo(
    () => (session ? getDrillTopicStats(session.questions, selections) : { perTopic: {}, correctCount: 0 }),
    [session, selections],
  );

  const answerQuestion = (optionKey) => {
    if (isAnswered) return;

    setSelections((currentSelections) => ({
      ...currentSelections,
      [currentQuestion.number]: optionKey,
    }));
  };

  const finishDrill = () => {
    const nextHistory = recordTagResults(historyState, perTopic);
    saveProgressState(user?.id, nextHistory);
    setHistoryState(nextHistory);
    void saveLearningResult(buildDrillResultPayload({
      correctCount,
      totalQuestions: session.questions.length,
      perTopic,
      tags: session.tags,
    }), { token });
    setPhase('summary');
  };

  const advance = () => {
    if (isLastQuestion) {
      finishDrill();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

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
        <header className="ai103-practice-header">
          <div>
            <div className="ai103-kicker">
              <span className="ai103-badge">English Drills</span>
              <span className="ai103-meta ai103-mode-meta">Grammar by topic</span>
            </div>
            <h1>
              Grammar Drills
              <span>
                Untimed practice with instant feedback after every answer.
                Results feed your weakest-topics report on the English study page.
              </span>
            </h1>
          </div>
          {phase !== 'setup' && session ? (
            <div className="ai103-practice-summary">
              <strong>
                {phase === 'summary' ? session.questions.length : Math.min(currentIndex + 1, session.questions.length)}
                /{session.questions.length}
              </strong>
              <span>{phase === 'summary' ? 'Questions' : 'Question'}</span>
              <strong>{correctCount}</strong>
              <span>Correct</span>
            </div>
          ) : null}
        </header>

        {phase === 'setup' ? (
          <section className="ai103-practice-shell english-intro-shell">
            <article className="ai103-practice-card">
              <div className="english-directions">
                <strong>Pick your topics</strong>
                Choose one or more grammar topics to drill. Each drill has up to{' '}
                {DRILL_QUESTION_COUNT} questions, is untimed, and shows the answer and
                explanation as soon as you respond — the opposite of test mode, on purpose.
              </div>
              <div className="ai103-difficulty-grid" role="group" aria-label="Drill topics">
                {drillTopics.map((topic) => {
                  const history = historyState.tags[topic.tag];
                  const isSelected = selectedTags.includes(topic.tag);

                  return (
                    <button
                      key={topic.tag}
                      type="button"
                      className={['ai103-difficulty-option', isSelected ? 'active' : ''].filter(Boolean).join(' ')}
                      onClick={() => toggleTag(topic.tag)}
                      aria-pressed={isSelected}
                    >
                      <strong>{formatTopic(topic.tag)}</strong>
                      <span>
                        {topic.count} questions
                        {history?.total
                          ? ` · your accuracy ${Math.round((history.correct / history.total) * 100)}% (${history.correct}/${history.total})`
                          : ' · not practiced yet'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="ai103-practice-actions">
                <button type="button" onClick={() => navigate('/learning/english')}>
                  Back to Learning
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => startDrill(selectedTags)}
                  disabled={!selectedTags.length}
                >
                  {selectedTags.length
                    ? `Start Drill (${selectedTags.length} topic${selectedTags.length === 1 ? '' : 's'})`
                    : 'Select a topic to start'}
                </button>
              </div>
            </article>
          </section>
        ) : null}

        {phase === 'running' && currentQuestion ? (
          <section className="ai103-practice-shell english-intro-shell">
            <article className="ai103-practice-card" key={currentQuestion.number}>
              <div className="ai103-page-card-header">
                <span>Question {currentIndex + 1} of {session.questions.length}</span>
                <div className="ai103-page-card-tags">
                  {currentQuestion.tags.map((tag) => (
                    <span className="ai103-pill" key={tag}>{formatTopic(tag)}</span>
                  ))}
                </div>
              </div>

              <section className="ai103-final-prompt">
                <p>{currentQuestion.prompt}</p>
              </section>

              <div className="ai103-practice-options" role="group" aria-label={`Drill question ${currentIndex + 1} options`}>
                {currentQuestion.options.map((option) => {
                  const selected = currentSelection === option.key;
                  const correct = option.key === currentQuestion.answer;
                  const optionClass = [
                    'ai103-practice-option',
                    selected ? 'selected' : '',
                    isAnswered && correct ? 'correct' : '',
                    isAnswered && selected && !correct ? 'incorrect' : '',
                  ].filter(Boolean).join(' ');

                  return (
                    <label className={optionClass} key={option.key}>
                      <input
                        type="radio"
                        name={`drill-question-${currentQuestion.number}`}
                        value={option.key}
                        checked={selected}
                        disabled={isAnswered}
                        onChange={() => answerQuestion(option.key)}
                      />
                      <span className="ai103-option-key">{option.key}</span>
                      <span>{option.text}</span>
                    </label>
                  );
                })}
              </div>

              {isAnswered ? (
                <section className="ai103-practice-review">
                  <h2>{currentSelection === currentQuestion.answer ? 'Correct!' : `Not quite — the answer is ${currentQuestion.answer}`}</h2>
                  {currentQuestion.explanation ? <p>{currentQuestion.explanation}</p> : null}
                </section>
              ) : null}

              <div className="ai103-practice-actions">
                <button type="button" onClick={() => navigate('/learning/english')}>
                  Back to Learning
                </button>
                <button type="button" onClick={() => setPhase('setup')}>
                  Change Topics
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={advance}
                  disabled={!isAnswered}
                >
                  {isLastQuestion ? 'Finish Drill' : 'Next Question'}
                </button>
              </div>
            </article>
          </section>
        ) : null}

        {phase === 'running' && !currentQuestion ? (
          <section className="ai103-practice-shell english-intro-shell">
            <article className="ai103-practice-card">
              <div className="ai103-empty-state">
                <strong>No drill questions found for the selected topics</strong>
              </div>
              <div className="ai103-practice-actions">
                <button type="button" onClick={() => setPhase('setup')}>
                  Change Topics
                </button>
              </div>
            </article>
          </section>
        ) : null}

        {phase === 'summary' && session ? (
          <section className="ai103-practice-shell english-intro-shell">
            <article className="ai103-practice-card">
              <h2 className="english-drill-summary-title">
                Drill complete: {correctCount} / {session.questions.length} correct
              </h2>
              <div className="ai103-practice-score-grid" aria-label="Drill score summary">
                <div>
                  <strong>{correctCount}</strong>
                  <span>Correct</span>
                </div>
                <div>
                  <strong>{session.questions.length}</strong>
                  <span>Questions</span>
                </div>
                <div>
                  <strong>{Math.round((correctCount / session.questions.length) * 100)}%</strong>
                  <span>Accuracy</span>
                </div>
              </div>
              <div className="english-result-parts" aria-label="Per-topic results">
                {Object.entries(perTopic).map(([tag, stats]) => (
                  <div key={tag}>
                    <span>{formatTopic(tag)}</span>
                    <span>{stats.correct} / {stats.total}</span>
                  </div>
                ))}
              </div>
              <p className="ai103-practice-result-detail">
                These results were added to your practice history and refine the
                weakest-topics report on the English study page.
              </p>
              <div className="ai103-practice-actions">
                <button type="button" onClick={() => navigate('/learning/english')}>
                  Back to Learning
                </button>
                <button type="button" onClick={() => setPhase('setup')}>
                  Change Topics
                </button>
                <button type="button" className="primary" onClick={() => startDrill(session.tags)}>
                  Drill Again
                </button>
              </div>
            </article>
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default EnglishDrills;
