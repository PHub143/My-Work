import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AI103.css';
import './English.css';
import PassagePanel from '../components/PassagePanel';
import { useAuth } from '../AuthContext';
import {
  assembleListeningTest,
  assembleReadingTest,
  filterLearningQuestions,
  flattenReadingBank,
  getDrillTopics,
  getListeningBankSummary,
  getMaxReadingFormScale,
  getQuestionPagination,
  getReadingBankSummary,
} from '../utils/learning';
import { getWeakestTopics, loadProgressState } from '../utils/progress';
import {
  getLearningResults,
  migrateLocalLearningProgress,
} from '../utils/learningResults';
import {
  getVocabSummary,
  loadVocabState,
} from '../utils/vocab';
import { useEnglishContent } from '../utils/englishContent';

const SCORE_KINDS = new Set(['full', 'reading', 'listening', 'mini']);
const DEFAULT_TARGET_SCORE = 750;

function getTargetStorageKey(userId) {
  return `english.targetScore.${userId || 'anonymous'}`;
}

function loadTargetScore(userId) {
  if (typeof window === 'undefined') return DEFAULT_TARGET_SCORE;

  const value = Number(window.localStorage.getItem(getTargetStorageKey(userId)));
  return Number.isInteger(value) && value >= 10 && value <= 990 ? value : DEFAULT_TARGET_SCORE;
}

function saveTargetScore(userId, score) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getTargetStorageKey(userId), String(score));
}

function formatResultKind(kind) {
  if (kind === 'full') return 'Full test';
  if (kind === 'mini') return 'Mini reading';
  return kind ? `${kind.charAt(0).toUpperCase()}${kind.slice(1)} test` : 'Practice';
}

function getRecentScoredResults(results) {
  return (results || [])
    .filter((result) => SCORE_KINDS.has(result.kind) && Number.isInteger(result.scaled))
    .slice(0, 5);
}

function getWeakestPartsFromResults(results, limit = 3) {
  const parts = {};

  (results || []).forEach((result) => {
    Object.entries(result.perPart || {}).forEach(([part, stats]) => {
      if (!stats?.total) return;
      parts[part] = parts[part] || { correct: 0, total: 0 };
      parts[part].correct += stats.correct || 0;
      parts[part].total += stats.total || 0;
    });
  });

  return Object.entries(parts)
    .map(([part, stats]) => ({
      part,
      ...stats,
      accuracy: stats.total ? stats.correct / stats.total : 0,
    }))
    .filter((entry) => entry.total > 0 && entry.accuracy < 1)
    .sort((left, right) => left.accuracy - right.accuracy || right.total - left.total)
    .slice(0, limit);
}

function flattenVocabCards(decks, customCards = []) {
  const deckCards = (decks?.decks || []).flatMap((deck) => deck.cards || []);
  return [...deckCards, ...(customCards || [])];
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

const English = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { readingContent, listeningContent, vocabDecks } = useEnglishContent();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPracticeChooserOpen, setIsPracticeChooserOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState('full');
  const [learningResultsState, setLearningResultsState] = useState({ userId: null, results: [] });
  const [targetScoreState, setTargetScoreState] = useState(() => ({
    userId: user?.id || null,
    score: loadTargetScore(user?.id),
  }));
  const [dashboardNow] = useState(() => Date.now());
  const questions = useMemo(() => flattenReadingBank(readingContent), [readingContent]);
  const bankSummary = useMemo(() => getReadingBankSummary(readingContent), [readingContent]);
  const formPreview = useMemo(() => {
    const maxScale = getMaxReadingFormScale(readingContent);
    const full = assembleReadingTest(readingContent, { formNumber: 1 });
    const mini = assembleReadingTest(readingContent, { scale: maxScale / 2, seed: 'preview-mini' });
    const listening = assembleListeningTest(listeningContent, { formNumber: 1 });
    const full2 = assembleReadingTest(readingContent, { formNumber: 2 });
    const listening2 = assembleListeningTest(listeningContent, { formNumber: 2 });
    return { full, mini, listening, full2, listening2 };
  }, [listeningContent, readingContent]);
  const listeningSummary = useMemo(() => getListeningBankSummary(listeningContent), [listeningContent]);
  const localProgress = useMemo(() => loadProgressState(user?.id), [user?.id]);
  const vocabState = useMemo(() => loadVocabState(user?.id), [user?.id]);
  const vocabCards = useMemo(
    () => flattenVocabCards(vocabDecks, vocabState.custom),
    [vocabDecks, vocabState.custom],
  );
  const vocabSummary = useMemo(
    () => getVocabSummary(vocabCards, vocabState, dashboardNow),
    [dashboardNow, vocabCards, vocabState],
  );
  const learningResults = useMemo(
    () => (learningResultsState.userId === user?.id ? learningResultsState.results : []),
    [learningResultsState, user?.id],
  );
  const targetScore = targetScoreState.userId === (user?.id || null)
    ? targetScoreState.score
    : loadTargetScore(user?.id);
  const weakestTopics = useMemo(() => {
    const drillableTags = getDrillTopics(readingContent).map((topic) => topic.tag);
    return getWeakestTopics(localProgress, { tags: drillableTags, minTotal: 3, limit: 4 });
  }, [localProgress, readingContent]);
  const recentScoredResults = useMemo(() => getRecentScoredResults(learningResults), [learningResults]);
  const latestResult = recentScoredResults[0] || null;
  const targetProgress = latestResult?.scaled
    ? Math.min(100, Math.round((latestResult.scaled / targetScore) * 100))
    : 0;
  const scoreTrend = useMemo(() => [...recentScoredResults].reverse(), [recentScoredResults]);
  const weakestParts = useMemo(() => getWeakestPartsFromResults(learningResults), [learningResults]);
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState(questions[0]?.number || 1);
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

  const visibleQuestion = pagination.currentQuestion;
  const paginationLabel = visibleQuestion
    ? pagination.total === questions.length
      ? `Question ${visibleQuestion.number} / ${questions.length}`
      : `Question ${visibleQuestion.number} (${pagination.currentIndex + 1} / ${pagination.total})`
    : 'No question';
  const testModes = [
    {
      id: 'fulltest',
      label: 'Test 1 · Full Test',
      detail: `${formPreview.listening.totalQuestions} listening + ${formPreview.full.totalQuestions} reading questions, both sections scored`,
    },
    {
      id: 'fulltest2',
      label: 'Test 2 · Full Test',
      detail: `${formPreview.listening2.totalQuestions} new listening + ${formPreview.full2.totalQuestions} new reading questions, both sections scored`,
    },
    {
      id: 'full',
      label: 'Test 1 · Reading',
      detail: `${formPreview.full.totalQuestions} questions, ${formPreview.full.timeLimitMinutes} minute limit${formPreview.full.isFullForm ? '' : ' (partial form — bank still growing)'}`,
    },
    {
      id: 'full2',
      label: 'Test 2 · Reading',
      detail: `${formPreview.full2.totalQuestions} new questions, ${formPreview.full2.timeLimitMinutes} minute limit`,
    },
    {
      id: 'listening',
      label: 'Test 1 · Listening',
      detail: `${formPreview.listening.totalQuestions} questions, paced by the recording`,
    },
    {
      id: 'listening2',
      label: 'Test 2 · Listening',
      detail: `${formPreview.listening2.totalQuestions} new questions, paced by the recording`,
    },
    {
      id: 'mini',
      label: 'Mini Reading Test',
      detail: `${formPreview.mini.totalQuestions} questions, ${formPreview.mini.timeLimitMinutes} minute limit`,
    },
  ];
  const partModes = [
    { id: 'lpart1', label: 'Part 1 · Photographs', detail: `${listeningSummary.part1} questions, replayable audio` },
    { id: 'lpart2', label: 'Part 2 · Question–Response', detail: `${listeningSummary.part2} questions, replayable audio` },
    { id: 'lpart3', label: 'Part 3 · Conversations', detail: `${listeningSummary.part3} questions, replayable audio` },
    { id: 'lpart4', label: 'Part 4 · Talks', detail: `${listeningSummary.part4} questions, replayable audio` },
    { id: 'part5', label: 'Part 5 · Incomplete Sentences', detail: `${bankSummary.part5} questions, untimed` },
    { id: 'part6', label: 'Part 6 · Text Completion', detail: `${bankSummary.part6} questions, untimed` },
    { id: 'part7', label: 'Part 7 · Reading Comprehension', detail: `${bankSummary.part7} questions, untimed` },
  ];
  const modes = [...testModes, ...partModes];

  useEffect(() => {
    if (!user?.id || !token) {
      return undefined;
    }

    let isCancelled = false;

    migrateLocalLearningProgress(user.id, { token })
      .catch(() => null)
      .then(() => getLearningResults({ limit: 30, token }))
      .then((results) => {
        if (!isCancelled) {
          setLearningResultsState({ userId: user.id, results });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [token, user?.id]);

  useEffect(() => {
    saveTargetScore(user?.id, targetScore);
  }, [targetScore, user?.id]);

  const startPractice = () => {
    if (selectedMode === 'fulltest' || selectedMode === 'fulltest2') {
      const formNumber = selectedMode === 'fulltest2' ? 2 : 1;
      navigate('/learning/english/listening', { state: { mode: 'listening', chain: 'full', formNumber } });
    } else if (selectedMode === 'listening' || selectedMode === 'listening2') {
      navigate('/learning/english/listening', {
        state: { mode: 'listening', formNumber: selectedMode === 'listening2' ? 2 : 1 },
      });
    } else if (selectedMode.startsWith('lpart')) {
      navigate('/learning/english/listening', { state: { mode: selectedMode.replace('lpart', 'part') } });
    } else {
      navigate('/learning/english/practice', {
        state: { mode: selectedMode === 'full2' ? 'full' : selectedMode, formNumber: selectedMode === 'full2' ? 2 : 1 },
      });
    }
  };

  return (
    <div
      className="ai103-container"
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
      <div className="ai103-content">
        <header className="ai103-header">
          <div className="ai103-title-block">
            <div className="ai103-title-row">
              <span className="ai103-bubble" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </span>
              <h1>
                {readingContent.title}
                <span className="ai103-title-suffix">{readingContent.subtitle}</span>
              </h1>
            </div>
            <div className="ai103-kicker">
              <span className="ai103-badge">Learning / English</span>
              <span className="ai103-meta">{readingContent.format}</span>
            </div>
            <div className="ai103-actions">
              <button
                type="button"
                className="ai103-practice-button"
                onClick={() => setIsPracticeChooserOpen(true)}
              >
                Practice
              </button>
              <button
                type="button"
                className="english-secondary-button"
                onClick={() => navigate('/learning/english/vocabulary')}
              >
                Vocabulary
              </button>
              <button
                type="button"
                className="english-secondary-button"
                onClick={() => navigate('/learning/english/drills')}
              >
                Drills
              </button>
            </div>
          </div>

          <div className="ai103-stat-grid" aria-label="English question bank stats">
            <div className="ai103-stat">
              <strong>{bankSummary.total + listeningSummary.total}</strong>
              <span>Questions</span>
            </div>
            <div className="ai103-stat">
              <strong>{listeningSummary.total}/{listeningSummary.quotas.total}</strong>
              <span>Listening</span>
            </div>
            <div className="ai103-stat">
              <strong>{bankSummary.total}/{bankSummary.quotas.total}</strong>
              <span>Reading</span>
            </div>
            <div className="ai103-stat">
              <strong>{bankSummary.part5}/{bankSummary.quotas.part5}</strong>
              <span>Part 5</span>
            </div>
            <div className="ai103-stat">
              <strong>{bankSummary.part6}/{bankSummary.quotas.part6}</strong>
              <span>Part 6</span>
            </div>
            <div className="ai103-stat">
              <strong>{bankSummary.part7}/{bankSummary.quotas.part7}</strong>
              <span>Part 7</span>
            </div>
          </div>
        </header>

        <section className="english-dashboard" aria-label="English progress dashboard">
          <div className="english-dashboard-header">
            <div>
              <h2>Progress dashboard</h2>
              <p>
                {learningResults.length
                  ? 'Synced from your saved practice results.'
                  : 'Finish a test or drill to start building cross-device history.'}
              </p>
            </div>
            <button
              type="button"
              className="english-secondary-button"
              onClick={() => navigate('/learning/english/practice', { state: { mode: 'mini' } })}
            >
              Take mini test
            </button>
          </div>

          <div className="english-dashboard-grid">
            <article>
              <span>Latest score</span>
              <strong>{latestResult ? `${latestResult.scaled} / ${latestResult.kind === 'full' ? 990 : 495}` : '—'}</strong>
              <p>{latestResult ? formatResultKind(latestResult.kind) : 'No saved score yet'}</p>
            </article>
            <article>
              <span>Target progress</span>
              <strong>{latestResult ? `${targetProgress}%` : '—'}</strong>
              <label className="english-target-input">
                Target
                <input
                  type="number"
                  min="10"
                  max="990"
                  step="5"
                  value={targetScore}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isInteger(value)) {
                      setTargetScoreState({
                        userId: user?.id || null,
                        score: Math.max(10, Math.min(990, value)),
                      });
                    }
                  }}
                />
              </label>
            </article>
            <article>
              <span>Saved sessions</span>
              <strong>{learningResults.length}</strong>
              <p>{learningResults.length ? 'Results in your account' : 'Local practice still works'}</p>
            </article>
            <article>
              <span>Vocab streak</span>
              <strong>{vocabSummary.streak}</strong>
              <p>{vocabSummary.due} due today · {vocabSummary.learned}/{vocabSummary.total} learned</p>
            </article>
            <article>
              <span>Score trend</span>
              <div className="english-score-trend" aria-label="Last saved scores">
                {scoreTrend.length ? scoreTrend.map((result) => (
                  <i
                    key={result.id}
                    title={`${formatResultKind(result.kind)}: ${result.scaled}`}
                    style={{ height: `${Math.max(10, Math.min(100, (result.scaled / (result.kind === 'full' ? 990 : 495)) * 100))}%` }}
                  />
                )) : <em>No trend yet</em>}
              </div>
            </article>
          </div>

          <div className="english-dashboard-grid english-dashboard-grid--compact">
            <article>
              <span>Weakest parts</span>
              {weakestParts.length ? (
                <div className="english-tag-list">
                  {weakestParts.map((entry) => (
                    <span key={entry.part}>
                      Part {entry.part} · {entry.correct}/{entry.total}
                    </span>
                  ))}
                </div>
              ) : (
                <p>Saved test results will surface part-level gaps here.</p>
              )}
            </article>
            <article>
              <span>Weakest topics</span>
              {weakestTopics.length ? (
                <div className="english-tag-list">
                  {weakestTopics.map((entry) => (
                    <span key={entry.tag}>
                      {entry.tag.replace(/-/g, ' ')} · {entry.correct}/{entry.total}
                    </span>
                  ))}
                </div>
              ) : (
                <p>Local drill and test history will surface grammar gaps here.</p>
              )}
            </article>
          </div>
        </section>

        <section className="english-weakness-panel" aria-label="Weakest topics report">
          <h2>Weakest topics</h2>
          {weakestTopics.length > 0 ? (
            <>
              <p>Based on your tests and drills, these grammar topics need the most work:</p>
              <div className="english-weakness-row">
                <div className="english-tag-list">
                  {weakestTopics.map((entry) => (
                    <span key={entry.tag}>
                      {entry.tag.replace(/-/g, ' ')} · {entry.correct}/{entry.total}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="english-secondary-button"
                  onClick={() => navigate('/learning/english/drills', {
                    state: { tags: weakestTopics.map((entry) => entry.tag) },
                  })}
                >
                  Drill weakest topics
                </button>
              </div>
            </>
          ) : (
            <p>
              Finish a test or a grammar drill to build your report — your per-topic
              accuracy accumulates here and powers one-click targeted drills.
            </p>
          )}
        </section>

        <section className="ai103-toolbar" aria-label="English controls">
          <label className="ai103-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search words, phrases, or 'question 12'"
              aria-label="Search English questions"
            />
          </label>
          <div className="ai103-search-meta">
            <div className="ai103-pagination-controls" aria-label="Question pagination">
              <button
                type="button"
                onClick={() => setSelectedQuestionNumber(pagination.previousNumber)}
                disabled={!pagination.previousNumber}
              >
                ← Previous
              </button>
              <span>{paginationLabel}</span>
              <button
                type="button"
                onClick={() => setSelectedQuestionNumber(pagination.nextNumber)}
                disabled={!pagination.nextNumber}
              >
                Next →
              </button>
            </div>
          </div>
        </section>

        <div className="ai103-layout">
          <aside className="ai103-page-index" aria-label="English question index">
            {filteredQuestions.map((question) => (
              <button
                key={question.number}
                type="button"
                className={question.number === visibleQuestion?.number ? 'active' : ''}
                onClick={() => setSelectedQuestionNumber(question.number)}
                aria-current={question.number === visibleQuestion?.number ? 'page' : undefined}
                aria-label={`Go to question ${question.number}`}
              >
                {question.number}
              </button>
            ))}
          </aside>

          <section className="ai103-page-list" aria-label="English question content">
            {visibleQuestion ? (
              <article className="ai103-page-card" id={`english-question-${visibleQuestion.number}`} key={visibleQuestion.number}>
                <div className="ai103-page-card-header">
                  <h2>Question {visibleQuestion.number}</h2>
                  <div className="ai103-page-card-tags">
                    <span className="ai103-pill ai103-pill--neutral">Part {visibleQuestion.part}</span>
                    {visibleQuestion.tags.map((tag) => (
                      <span className="ai103-pill" key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>

                <PassagePanel
                  passages={visibleQuestion.passages}
                  currentBlank={visibleQuestion.blank}
                  idPrefix={`study-${visibleQuestion.number}`}
                />

                <section className="ai103-section-block">
                  <h3 id="english-question-heading">Question</h3>
                  <p className="ai103-question-prompt">{visibleQuestion.prompt}</p>
                  <OptionsGrid
                    options={visibleQuestion.options}
                    selectedKeys={[visibleQuestion.answer]}
                    ariaLabel={`Question ${visibleQuestion.number} answer options`}
                  />
                </section>

                <section className="ai103-answer-block" aria-labelledby="english-answer-heading">
                  <h3 id="english-answer-heading">Answer</h3>
                  <div className="ai103-answer-chips">
                    <span className="ai103-answer-chip">{visibleQuestion.answer}</span>
                  </div>
                </section>

                {visibleQuestion.explanation && (
                  <section className="ai103-explanation" aria-labelledby="english-explanation-heading">
                    <h3 id="english-explanation-heading">Explanation</h3>
                    <p>{visibleQuestion.explanation}</p>
                  </section>
                )}

                <div className="ai103-footer-stats">
                  <div className="ai103-footer-stat">
                    <span className="ai103-footer-stat-label">Part</span>
                    <span className="ai103-footer-stat-value">Part {visibleQuestion.part}</span>
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
          <span>© 2026 · English study material</span>
          <div className="ai103-page-footer-links">
            <a href="#top">Back to top</a>
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
            aria-labelledby="english-practice-title"
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
            <h2 id="english-practice-title">Choose Test Mode</h2>
            <h3 className="english-mode-heading">Tests</h3>
            <div className="ai103-difficulty-grid" role="radiogroup" aria-label="Test modes">
              {testModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={[
                    'ai103-difficulty-option',
                    selectedMode === mode.id ? 'active' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedMode(mode.id)}
                  role="radio"
                  aria-checked={selectedMode === mode.id}
                >
                  <strong>{mode.label}</strong>
                  <span>{mode.detail}</span>
                </button>
              ))}
            </div>
            <h3 className="english-mode-heading">Part practice</h3>
            <div className="ai103-difficulty-grid" role="radiogroup" aria-label="Part practice modes">
              {partModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={[
                    'ai103-difficulty-option',
                    selectedMode === mode.id ? 'active' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedMode(mode.id)}
                  role="radio"
                  aria-checked={selectedMode === mode.id}
                >
                  <strong>{mode.label}</strong>
                  <span>{mode.detail}</span>
                </button>
              ))}
            </div>
            <div className="ai103-practice-modal-actions">
              <button type="button" onClick={() => setIsPracticeChooserOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={startPractice}>
                Start {modes.find((mode) => mode.id === selectedMode)?.label || 'Test'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default English;
