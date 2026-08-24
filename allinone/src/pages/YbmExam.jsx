import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './YbmExam.css';
import { useAuth } from '../AuthContext';
import { PARTS, getTest } from '../data/ybm/manifest.js';
import {
  clearAttempt,
  getAnswerKey,
  getAudioUrl,
  getOptionKeys,
  getPageUrl,
  getQuestionAudioUrl,
  getTestReadiness,
  loadAttempt,
  saveAttempt,
  scoreAttempt,
} from '../utils/ybm.js';

function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (v) => String(v).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Matches the `max-width: 900px` breakpoint in YbmExam.css, where the exam body
// collapses to a single column and the side answer sheet has no room left.
const COMPACT_QUERY = '(max-width: 900px)';

function subscribeToCompact(onChange) {
  const query = window.matchMedia(COMPACT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useCompactLayout() {
  return useSyncExternalStore(
    subscribeToCompact,
    () => window.matchMedia(COMPACT_QUERY).matches
  );
}

function sectionParts(section) {
  return PARTS.filter((part) => part.section === section);
}

function sectionRange(section) {
  const parts = sectionParts(section);
  if (!parts.length) return [1, 1];
  return [parts[0].from, parts[parts.length - 1].to];
}

function AnswerSheet({ section, selections, onSelect, disabled, focus, onFocusChange, correctAnswers }) {
  const parts = sectionParts(section);

  return (
    <div className="ybm-sheet">
      {parts.map((part) => {
        const numbers = [];
        for (let n = part.from; n <= part.to; n += 1) numbers.push(n);

        return (
          <section className="ybm-sheet-part" key={part.part}>
            <h3>
              Part {part.part}
              <span>{part.label}</span>
            </h3>
            <ul>
              {numbers.map((number) => (
                <li key={number}>
                  <button
                    type="button"
                    className="ybm-sheet-number"
                    aria-label={`Play audio for question ${number}`}
                    aria-current={number === focus}
                    onClick={() => onFocusChange(number)}
                  >
                    {number}
                  </button>
                  <span className="ybm-sheet-bubbles">
                    {getOptionKeys(number).map((option) => {
                      const picked = selections[number] === option;
                      const isCorrect = disabled && correctAnswers[number] === option;
                      const isWrongPick = disabled && picked && !isCorrect;
                      const className = isCorrect ? 'is-correct' : isWrongPick ? 'is-incorrect' : picked ? 'is-picked' : '';

                      return (
                        <button
                          type="button"
                          key={option}
                          disabled={disabled}
                          aria-label={`Question ${number} answer ${option}`}
                          aria-pressed={picked}
                          className={className}
                          onClick={() => onSelect(number, option)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// Compact-layout answer entry: one question at a time in a docked pad, with the
// whole section behind a review grid. Replaces AnswerSheet below 900px, where a
// 200-row bubble list leaves no room for the booklet and gives 26px targets.
function FocusPad({
  section,
  selections,
  onSelect,
  disabled,
  focus,
  onFocusChange,
  answered,
  onSubmit,
  correctAnswers,
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [first, last] = sectionRange(section);
  const part = PARTS.find((entry) => focus >= entry.from && focus <= entry.to);

  const pick = (option) => {
    onSelect(focus, option);
    // Advance so filling a run of questions is one tap each, not two.
    if (focus < last) onFocusChange(focus + 1);
  };

  return (
    <aside className="ybm-focus" aria-label="Answer pad">
      {reviewOpen && (
        <div className="ybm-review">
          <div className="ybm-review-head">
            <strong>{answered} of {last - first + 1} answered</strong>
            <button type="button" onClick={() => setReviewOpen(false)}>Close</button>
          </div>
          <div className="ybm-review-scroll">
            {sectionParts(section).map((entry) => {
              const numbers = [];
              for (let n = entry.from; n <= entry.to; n += 1) numbers.push(n);

              return (
                <section key={entry.part}>
                  <h3>Part {entry.part} <span>{entry.label}</span></h3>
                  <div className="ybm-review-grid">
                    {numbers.map((number) => (
                      <button
                        type="button"
                        key={number}
                        aria-label={`Go to question ${number}`}
                        aria-current={number === focus}
                        className={selections[number] ? 'is-done' : ''}
                        onClick={() => { onFocusChange(number); setReviewOpen(false); }}
                      >
                        <span>{number}</span>
                        <em>{selections[number] || '·'}</em>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <div className="ybm-focus-head">
        <strong>Question {focus}</strong>
        {part && <span>Part {part.part} · {part.label}</span>}
      </div>

      <div className="ybm-focus-options">
        {getOptionKeys(focus).map((option) => {
          const picked = selections[focus] === option;
          const isCorrect = disabled && correctAnswers[focus] === option;
          const isWrongPick = disabled && picked && !isCorrect;
          const className = isCorrect ? 'is-correct' : isWrongPick ? 'is-incorrect' : picked ? 'is-picked' : '';

          return (
            <button
              type="button"
              key={option}
              disabled={disabled}
              aria-label={`Question ${focus} answer ${option}`}
              aria-pressed={picked}
              className={className}
              onClick={() => pick(option)}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="ybm-focus-nav">
        <button
          type="button"
          disabled={focus <= first}
          onClick={() => onFocusChange(focus - 1)}
        >
          ← Prev
        </button>
        <button type="button" onClick={() => setReviewOpen((open) => !open)}>
          Review · {answered}
        </button>
        <button
          type="button"
          disabled={focus >= last}
          onClick={() => onFocusChange(focus + 1)}
        >
          Next →
        </button>
      </div>

      {!disabled && (
        <button type="button" className="ybm-submit" onClick={onSubmit}>
          Submit test
        </button>
      )}
    </aside>
  );
}

const ExamRunner = ({ test, volumeId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const readiness = useMemo(() => getTestReadiness(test), [test]);
  const correctAnswers = useMemo(() => getAnswerKey(test.id).answers, [test.id]);

  const sections = useMemo(() => {
    const available = [];
    if (readiness.hasListeningBooklet && readiness.hasListening) available.push('listening');
    if (readiness.hasReadingBooklet && readiness.hasReading) available.push('reading');
    return available;
  }, [readiness]);

  // The component is keyed on the test id, so a saved attempt can be restored
  // once during initial state setup rather than in an effect.
  const saved = useMemo(() => loadAttempt(user?.id, test.id), [test.id, user?.id]);

  const [section, setSection] = useState(() => saved?.section || sections[0] || null);
  const [page, setPage] = useState(() => saved?.page || 1);
  const [focus, setFocus] = useState(
    () => saved?.focus || sectionRange(saved?.section || sections[0] || null)[0]
  );
  const [selections, setSelections] = useState(() => saved?.selections || {});
  const [deadline, setDeadline] = useState(() => (saved?.submittedAt ? null : saved?.deadline || null));
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState(() => (saved?.submittedAt ? saved.score || null : null));
  const [zoom, setZoom] = useState(1);
  const audioRef = useRef(null);
  const compact = useCompactLayout();

  const pageCount = section === 'listening' ? test?.listeningPages : test?.readingPages;
  const questionAudioUrl = section === 'listening' ? getQuestionAudioUrl(test.id, focus) : null;
  const pageUrl = section ? getPageUrl(test.id, section, page) : null;
  const audioUrl = section === 'listening' ? (questionAudioUrl || getAudioUrl(test.id)) : null;

  // Booklet pages and audio stream from Drive through the API (see ybm.js),
  // which is noticeably slower than a static file — show a spinner rather
  // than a blank/broken-looking gap while each new URL is in flight. Tracking
  // the *loaded* url (rather than a plain boolean reset in an effect) means a
  // url change is "not loaded" for free on the very next render, with no
  // extra effect/render cycle.
  const [loadedPageUrl, setLoadedPageUrl] = useState(null);
  const [loadedAudioUrl, setLoadedAudioUrl] = useState(null);
  const pageLoaded = loadedPageUrl === pageUrl;
  const audioLoaded = loadedAudioUrl === audioUrl;

  // Warm the browser's cache for the neighboring pages while the current one
  // is being read, so Prev/Next feels instant instead of starting a fresh
  // fetch on click. Fire-and-forget: no need to track or cancel these.
  useEffect(() => {
    if (!section || !pageCount) return;
    [page - 1, page + 1].forEach((neighbor) => {
      if (neighbor < 1 || neighbor > pageCount) return;
      new Image().src = getPageUrl(test.id, section, neighbor);
    });
  }, [page, section, pageCount, test.id]);

  const persist = useCallback((patch) => {
    if (!test) return;
    saveAttempt(user?.id, test.id, {
      selections,
      section,
      page,
      focus,
      deadline,
      ...patch,
    });
  }, [deadline, focus, page, section, selections, test, user?.id]);

  const handleSelect = useCallback((number, option) => {
    setSelections((current) => {
      const next = { ...current, [number]: option };
      if (test) {
        saveAttempt(user?.id, test.id, { selections: next, section, page, focus, deadline });
      }
      return next;
    });
  }, [deadline, focus, page, section, test, user?.id]);

  const handleFocusChange = useCallback((number) => {
    setFocus(number);
    persist({ focus: number });
  }, [persist]);

  const handleSubmit = useCallback(() => {
    if (!test) return;
    const score = scoreAttempt(test.id, selections);
    setResult(score);
    setDeadline(null);
    audioRef.current?.pause();
    saveAttempt(user?.id, test.id, {
      selections,
      section,
      page,
      focus,
      deadline: null,
      submittedAt: new Date().toISOString(),
      score,
    });
  }, [focus, page, section, selections, test, user?.id]);

  const startTimer = useCallback(() => {
    const minutes = section === 'listening' ? test.listeningMinutes : test.readingMinutes;
    const next = Date.now() + minutes * 60 * 1000;
    setDeadline(next);
    setNow(Date.now());
    persist({ deadline: next });
  }, [persist, section, test]);

  // Tick the countdown once a second, and submit when the clock runs out.
  useEffect(() => {
    if (!deadline || result) return undefined;

    const id = window.setInterval(() => {
      const current = Date.now();
      if (current >= deadline) {
        window.clearInterval(id);
        handleSubmit();
      } else {
        setNow(current);
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [deadline, handleSubmit, result]);

  if (!sections.length) {
    return (
      <div className="ybm-exam ybm-exam--empty">
        <h1>{test.label} is not ready yet</h1>
        <p>
          This test is missing source material:
          {!readiness.hasListeningBooklet && ' listening booklet;'}
          {!readiness.hasListening && ' listening answer key;'}
          {!readiness.hasReadingBooklet && ' reading booklet;'}
          {!readiness.hasReading && ' reading answer key;'}
        </p>
        <button
          type="button"
          onClick={() => navigate(`/learning/english/toeic/ybm/${volumeId}`)}
        >
          Back to {volumeId}
        </button>
      </div>
    );
  }

  const remaining = deadline ? (deadline - now) / 1000 : null;
  const answeredInSection = PARTS
    .filter((part) => part.section === section)
    .reduce((count, part) => {
      let found = 0;
      for (let n = part.from; n <= part.to; n += 1) if (selections[n]) found += 1;
      return count + found;
    }, 0);

  return (
    <div className="ybm-exam">
      <header className="ybm-exam-bar">
        <div className="ybm-exam-id">
          <button
            type="button"
            className="ybm-exit"
            onClick={() => navigate(`/learning/english/toeic/ybm/${volumeId}`)}
          >
            ← Exit
          </button>
          <strong>{volumeId.replace('vol-', 'Vol ')} · {test.label}</strong>
        </div>

        <div className="ybm-exam-sections" role="tablist" aria-label="Test sections">
          {sections.map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={entry === section}
              className={entry === section ? 'is-active' : ''}
              onClick={() => { setSection(entry); setPage(1); setFocus(sectionRange(entry)[0]); }}
            >
              {entry === 'listening' ? 'Listening' : 'Reading'}
            </button>
          ))}
        </div>

        <div className="ybm-exam-clock">
          {result ? (
            <span className="ybm-clock-done">Submitted</span>
          ) : remaining !== null ? (
            <span className={remaining < 300 ? 'ybm-clock is-low' : 'ybm-clock'}>
              {formatClock(remaining)}
            </span>
          ) : (
            <button type="button" className="ybm-start" onClick={startTimer}>
              Start {section === 'listening' ? `${test.listeningMinutes}` : `${test.readingMinutes}`} min
            </button>
          )}
        </div>
      </header>

      {result && (
        <section className="ybm-result" aria-label="Result">
          <div>
            <span>Listening</span>
            <strong>{result.listeningScaled ?? '—'}</strong>
            <em>{result.listeningCorrect} correct</em>
          </div>
          <div>
            <span>Reading</span>
            <strong>{result.readingScaled ?? '—'}</strong>
            <em>{result.readingCorrect} correct</em>
          </div>
          <div className="ybm-result-total">
            <span>Total</span>
            <strong>{result.totalScaled ?? '—'}</strong>
            <em>{result.correctCount} / {result.answered} answered</em>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAttempt(user?.id, test.id);
              setResult(null);
              setSelections({});
              setDeadline(null);
              setPage(1);
              setSection(sections[0]);
              setFocus(sectionRange(sections[0])[0]);
            }}
          >
            Retake
          </button>
        </section>
      )}

      <div className="ybm-exam-body">
        <section className="ybm-booklet" aria-label="Test booklet">
          <div className="ybm-booklet-controls">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <span>Page {page} / {pageCount}</span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
            <span className="ybm-zoom">
              <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>+</button>
            </span>
          </div>

          <div className="ybm-booklet-viewport">
            {!pageLoaded && (
              <div className="ybm-loading" role="status">
                <span className="ybm-spinner" aria-hidden="true" />
                <span>Loading page…</span>
              </div>
            )}
            <img
              src={pageUrl}
              alt={`${test.label} ${section} booklet page ${page}`}
              style={{ width: `${zoom * 100}%`, display: pageLoaded ? 'inline-block' : 'none' }}
              onLoad={() => setLoadedPageUrl(pageUrl)}
              onError={() => setLoadedPageUrl(pageUrl)}
            />
          </div>

          {section === 'listening' && (
            <div className="ybm-audio">
              {questionAudioUrl && (
                <span className="ybm-audio-label">Question {focus}</span>
              )}
              <div className="ybm-audio-row">
                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  preload="auto"
                  onCanPlay={() => setLoadedAudioUrl(audioUrl)}
                  onError={() => setLoadedAudioUrl(audioUrl)}
                >
                  Your browser does not support audio playback.
                </audio>
                {!audioLoaded && (
                  <span className="ybm-loading ybm-loading--inline" role="status">
                    <span className="ybm-spinner ybm-spinner--sm" aria-hidden="true" />
                    <span>Loading audio…</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {compact ? (
          <FocusPad
            section={section}
            selections={selections}
            onSelect={handleSelect}
            disabled={Boolean(result)}
            focus={focus}
            onFocusChange={handleFocusChange}
            answered={answeredInSection}
            onSubmit={handleSubmit}
            correctAnswers={correctAnswers}
          />
        ) : (
          <aside className="ybm-answers" aria-label="Answer sheet">
            <div className="ybm-answers-head">
              <strong>Answer sheet</strong>
              <span>{answeredInSection} answered</span>
            </div>
            <AnswerSheet
              section={section}
              selections={selections}
              onSelect={handleSelect}
              disabled={Boolean(result)}
              focus={focus}
              onFocusChange={handleFocusChange}
              correctAnswers={correctAnswers}
            />
            {!result && (
              <button type="button" className="ybm-submit" onClick={handleSubmit}>
                Submit test
              </button>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

// Keyed on the test id so switching tests remounts the runner and its saved
// attempt is picked up by the state initialisers above.
const YbmExam = () => {
  const navigate = useNavigate();
  const { volumeId, testNumber } = useParams();
  const test = getTest(volumeId, testNumber);

  if (!test) {
    return (
      <div className="ybm-exam ybm-exam--empty">
        <p>That test does not exist.</p>
        <button type="button" onClick={() => navigate('/learning/english')}>
          Back to YBM
        </button>
      </div>
    );
  }

  return <ExamRunner key={test.id} test={test} volumeId={volumeId} />;
};

export default YbmExam;
