import React, { useEffect, useRef } from 'react';

/* Numbers shown in the "Inside" strip. Keep them here (one place) or replace
   with build-time counts from src/data/*.json — do NOT fetch on this route,
   it is unauthenticated and would block first paint. */
const LOGIN_INVENTORY = [
  { label: 'Practice tests', value: '613' },
  { label: 'Vocabulary', value: '540' },
  { label: 'TOEIC parts', value: '7' },
  { label: 'Library', value: '84' }
];

const CONTINUE_ROWS = [
  { label: 'TOEIC Part 5 drill', meta: '68%', pct: 68, accent: true },
  { label: 'AI-102 study guide.pdf', meta: 'p.31', pct: 34 },
  { label: 'Listening · Part 3 set B', meta: '12%', pct: 12 },
  { label: 'Weak areas · Cognitive Search', meta: '9 q', pct: 52 }
];

const FRAMES = {
  rise: [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
  word: [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
  sweep: [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }]
};
const DURATION = { rise: 600, word: 500, sweep: 900 };

const LoginBrandPanel = ({ mode = 'student' }) => {
  const rootRef = useRef(null);

  // Entrances play from the visible resting state, so a frozen timeline
  // (print, screenshot, reduced motion) still renders finished content.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const players = [];
    root.querySelectorAll('[data-anim]').forEach((el) => {
      const kind = el.dataset.anim;
      if (!FRAMES[kind] || typeof el.animate !== 'function') return;
      players.push(
        el.animate(FRAMES[kind], {
          duration: DURATION[kind],
          delay: Number(el.dataset.animDelay || 0),
          easing: 'cubic-bezier(.2,.8,.2,1)'
        })
      );
    });
    return () => players.forEach((p) => p.cancel());
  }, [mode]);

  const isStudent = mode === 'student';

  return (
    <aside className={`login-brand${isStudent ? '' : ' is-admin'}`} ref={rootRef}>
      <div className="login-brand-grid" aria-hidden="true" />

      <div className="login-brand-head">
        <div className="login-lockup">
          <span className="login-lockup-mark" aria-hidden="true">A</span>
          <span className="login-lockup-text">
            <span className="login-lockup-name">Allinone</span>
            <span className="login-lockup-sub">{isStudent ? 'study desk' : 'workspace'}</span>
          </span>
        </div>
        <span className="login-brand-tag">
          {isStudent ? 'Nothing left in another tab' : 'Admin · content & people'}
        </span>
      </div>

      <div className="login-brand-copy">
        {isStudent ? (
          <>
            <h2>One page for everything you are studying.</h2>
            <p>
              Allinone remembers the question you were on, the words you keep missing and the page
              you closed — then hands them back the moment you sign in.
            </p>
          </>
        ) : (
          <>
            <h2>Every bank, file and student account in one console.</h2>
            <p>
              Publish question sets, manage the library and see where students are losing points,
              without leaving the workspace.
            </p>
          </>
        )}
      </div>

      {isStudent && (
        <div className="login-artifacts">
          <div className="login-artifact-quiz" data-anim="rise" data-anim-delay="0">
            <div className="login-artifact-meta">
              <span>AI-103 · Q14</span>
              <span className="login-artifact-clock">02:41</span>
            </div>
            <p className="login-artifact-stem">
              Which service produces a confidence score for each extracted entity?
            </p>
            <div className="login-options">
              <span className="login-option">Translator</span>
              <span className="login-option is-picked">Language service</span>
              <span className="login-option">Speech service</span>
            </div>
            <div className="login-artifact-foot">
              <span>14 / 40 answered</span>
              <span>flagged 2</span>
            </div>
          </div>

          <div className="login-artifact-vocab" data-anim="rise" data-anim-delay="90">
            <span className="login-artifact-label">Vocabulary · due 24</span>
            <p className="login-vocab-word" data-anim="word" data-anim-delay="420">tenacious</p>
            <p className="login-vocab-gloss">/təˈneɪʃəs/ · adjective</p>
            <div className="login-vocab-actions">
              <span className="login-vocab-again">Again</span>
              <span className="login-vocab-good">Good</span>
            </div>
          </div>

          <div className="login-artifact-continue" data-anim="rise" data-anim-delay="180">
            <span className="login-artifact-label">Library · continue</span>
            <div className="login-continue-list">
              {CONTINUE_ROWS.map((row, i) => (
                <div key={row.label}>
                  <div className="login-continue-row">
                    <span>{row.label}</span>
                    <b>{row.meta}</b>
                  </div>
                  <div className="login-continue-track">
                    <div
                      className={`login-continue-fill${row.accent ? ' is-accent' : ''}`}
                      style={{ width: `${row.pct}%` }}
                      data-anim="sweep"
                      data-anim-delay={520 + i * 100}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isStudent && (
        <div className="login-inside" data-anim="rise" data-anim-delay="270">
          <span className="login-inside-label">Inside</span>
          {LOGIN_INVENTORY.map((item) => (
            <span className="login-chip" key={item.label}>
              {item.label}
              <b>{item.value}</b>
            </span>
          ))}
        </div>
      )}
    </aside>
  );
};

export default LoginBrandPanel;
