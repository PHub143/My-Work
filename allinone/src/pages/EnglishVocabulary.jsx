import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AI103.css';
import './English.css';
import './EnglishVocabulary.css';
import { useAuth } from '../AuthContext';
import {
  demoteCard,
  getDueCards,
  getVocabSummary,
  loadVocabState,
  promoteCard,
  saveVocabState,
} from '../utils/vocab';
import { useEnglishContent } from '../utils/englishContent';

const EnglishVocabulary = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vocabDecks } = useEnglishContent();
  const userId = user?.id;
  const [state, setState] = useState(() => loadVocabState(userId));
  const [view, setView] = useState('decks');
  const [session, setSession] = useState(null);
  // Captured once per mount: due-ness only shifts day to day, and a stable
  // timestamp keeps render pure.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    saveVocabState(userId, state);
  }, [userId, state]);

  const decks = useMemo(() => {
    const baseDecks = vocabDecks.decks;
    if (!state.custom.length) return baseDecks;

    return [
      ...baseDecks,
      { id: 'missed', label: 'My Missed Words', cards: state.custom },
    ];
  }, [state.custom, vocabDecks]);
  const allCards = useMemo(() => decks.flatMap((deck) => deck.cards), [decks]);
  const summary = getVocabSummary(allCards, state, now);

  const startSession = (deckId) => {
    const cards = deckId === 'all'
      ? allCards
      : decks.find((deck) => deck.id === deckId)?.cards || [];
    const queue = getDueCards(cards, state, Date.now());
    if (!queue.length) return;

    setSession({
      deckId,
      queue,
      position: 0,
      flipped: false,
      knownCount: 0,
      repeatCount: 0,
      repeatedIds: [],
    });
    setView('session');
  };

  const answerCard = (knewIt) => {
    const card = session.queue[session.position];
    const now = Date.now();

    setState((currentState) => (
      knewIt ? promoteCard(currentState, card.id, now) : demoteCard(currentState, card.id, now)
    ));

    setSession((currentSession) => {
      const nextQueue = [...currentSession.queue];
      const repeatedIds = [...currentSession.repeatedIds];

      // A missed card comes back once at the end of the same session.
      if (!knewIt && !repeatedIds.includes(card.id)) {
        nextQueue.push(card);
        repeatedIds.push(card.id);
      }

      return {
        ...currentSession,
        queue: nextQueue,
        position: currentSession.position + 1,
        flipped: false,
        knownCount: currentSession.knownCount + (knewIt ? 1 : 0),
        repeatCount: currentSession.repeatCount + (knewIt ? 0 : 1),
        repeatedIds,
      };
    });
  };

  const endSession = () => {
    setSession(null);
    setView('decks');
  };

  const currentCard = session && session.position < session.queue.length
    ? session.queue[session.position]
    : null;
  const sessionFinished = session && !currentCard;

  return (
    <div
      className="ai103-container"
      style={{
        '--page-accent': 'var(--cosmic-orange)',
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
                  <rect x="3" y="5" width="14" height="14" rx="2" />
                  <path d="M7 5V3h14v14h-2" />
                </svg>
              </span>
              <h1>
                Vocabulary
                <span className="ai103-title-suffix">Spaced-repetition flashcards</span>
              </h1>
            </div>
            <div className="ai103-kicker">
              <span className="ai103-badge">Learning / English</span>
              <span className="ai103-meta">Leitner boxes · review due cards daily</span>
            </div>
            <div className="ai103-actions">
              <button
                type="button"
                className="ai103-practice-button"
                onClick={() => startSession('all')}
                disabled={summary.due === 0}
              >
                {summary.due > 0 ? `Review ${summary.due} due` : 'All done for today'}
              </button>
              <button
                type="button"
                className="english-secondary-button"
                onClick={() => navigate('/learning/english')}
              >
                Back to English
              </button>
            </div>
          </div>

          <div className="ai103-stat-grid" aria-label="Vocabulary stats">
            <div className="ai103-stat">
              <strong>{summary.total}</strong>
              <span>Cards</span>
            </div>
            <div className="ai103-stat">
              <strong>{summary.due}</strong>
              <span>Due today</span>
            </div>
            <div className="ai103-stat">
              <strong>{summary.learned}</strong>
              <span>Mastered</span>
            </div>
            <div className="ai103-stat">
              <strong>{summary.streak}</strong>
              <span>Day streak</span>
            </div>
          </div>
        </header>

        {view === 'decks' ? (
          <section className="english-deck-grid" aria-label="Vocabulary decks">
            {decks.map((deck) => {
              const deckSummary = getVocabSummary(deck.cards, state, now);

              return (
                <article className="english-deck-card" key={deck.id}>
                  <h2>{deck.label}</h2>
                  <p>
                    {deckSummary.total} cards · {deckSummary.learned} mastered
                  </p>
                  <div className="english-deck-footer">
                    <span className={deckSummary.due > 0 ? 'due' : ''}>
                      {deckSummary.due > 0 ? `${deckSummary.due} due` : 'Up to date'}
                    </span>
                    <button
                      type="button"
                      onClick={() => startSession(deck.id)}
                      disabled={deckSummary.due === 0}
                    >
                      Review
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : sessionFinished ? (
          <section className="english-session-end" aria-label="Session summary">
            <h2>Session complete</h2>
            <div className="ai103-practice-score-grid">
              <div>
                <strong>{session.knownCount}</strong>
                <span>Knew it</span>
              </div>
              <div>
                <strong>{session.repeatCount}</strong>
                <span>To repeat</span>
              </div>
              <div>
                <strong>{summary.streak}</strong>
                <span>Day streak</span>
              </div>
            </div>
            <p>Missed cards moved back to box 1 — they will come up again tomorrow.</p>
            <div className="ai103-practice-actions">
              <button type="button" onClick={endSession}>
                Back to Decks
              </button>
              <button type="button" className="primary" onClick={() => navigate('/learning/english')}>
                Back to English
              </button>
            </div>
          </section>
        ) : (
          <section className="english-session" aria-label="Flashcard review">
            <div className="english-session-meta">
              <span>
                {decks.find((deck) => deck.id === session.deckId)?.label || 'All decks'}
              </span>
              <span>{session.queue.length - session.position} card{session.queue.length - session.position === 1 ? '' : 's'} left</span>
            </div>

            <button
              type="button"
              className={`english-flashcard${session.flipped ? ' flipped' : ''}`}
              onClick={() => setSession((current) => ({ ...current, flipped: !current.flipped }))}
              aria-label={session.flipped ? 'Card back — tap to see the word' : 'Card front — tap to reveal the meaning'}
            >
              {!session.flipped ? (
                <>
                  <strong>{currentCard.word}</strong>
                  {currentCard.partOfSpeech ? <em>{currentCard.partOfSpeech}</em> : null}
                  <small>Tap to reveal meaning</small>
                </>
              ) : (
                <>
                  <p className="english-flashcard-definition">{currentCard.definition}</p>
                  {currentCard.example ? (
                    <p className="english-flashcard-example">“{currentCard.example}”</p>
                  ) : null}
                  {currentCard.vi ? (
                    <p className="english-flashcard-gloss">{currentCard.vi}</p>
                  ) : null}
                </>
              )}
            </button>

            {session.flipped ? (
              <div className="english-flashcard-actions">
                <button type="button" className="unknown" onClick={() => answerCard(false)}>
                  ✗ Didn't know it
                </button>
                <button type="button" className="known" onClick={() => answerCard(true)}>
                  ✓ Knew it
                </button>
              </div>
            ) : (
              <div className="english-flashcard-actions">
                <button type="button" onClick={endSession}>
                  End Session
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default EnglishVocabulary;
