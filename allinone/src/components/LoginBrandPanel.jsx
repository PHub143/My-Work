import React from 'react';

/* Numbers shown in the counts strip. Keep them here (one place) or replace
   with build-time counts from src/data/*.json — do NOT fetch on this route,
   it is unauthenticated and would block first paint. */
const LOGIN_INVENTORY = [
  { label: 'Practice tests', value: '613' },
  { label: 'Vocabulary', value: '540' },
  { label: 'TOEIC parts', value: '7' },
  { label: 'Library', value: '84' }
];

// Decorative sample question: shows what a practice screen looks like.
const SAMPLE_CHOICES = [
  { letter: 'A', text: 'Translator' },
  { letter: 'B', text: 'Language service', picked: true },
  { letter: 'C', text: 'Speech service' }
];

const Glyph = ({ children }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ADMIN_AREAS = [
  { label: 'Question banks', icon: <path d="M4 5h12M4 10h12M4 15h8" /> },
  {
    label: 'Library files',
    icon: (
      <>
        <path d="M5.5 2.5h6l3 3v12h-9z" />
        <path d="M11.5 2.5v3h3" />
      </>
    )
  },
  {
    label: 'Student accounts',
    icon: (
      <>
        <circle cx="10" cy="7" r="3" />
        <path d="M4 16.5c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5" />
      </>
    )
  }
];

const LoginBrandPanel = ({ mode = 'student' }) => {
  const isStudent = mode === 'student';

  return (
    <aside className={`login-brand${isStudent ? '' : ' is-admin'}`}>
      <div className="login-brand-head">
        <div className="login-wordmark">
          <span className="login-wordmark-name">Allinone</span>
          <span className="login-wordmark-sub">{isStudent ? 'Study desk' : 'Workspace'}</span>
        </div>
        {!isStudent && <span className="login-brand-tag">Admin · content and people</span>}
      </div>

      <div className="login-brand-copy">
        <span className="login-brand-rule" aria-hidden="true" />
        {isStudent ? (
          <>
            <p className="login-brand-title">One page for everything you are studying.</p>
            <p className="login-brand-text">
              Allinone remembers the question you were on, the words you keep missing and the page
              you closed, then hands them back the moment you sign in.
            </p>
          </>
        ) : (
          <>
            <p className="login-brand-title">Every bank, file and student account in one console.</p>
            <p className="login-brand-text">
              Publish question sets, manage the library and see where students are losing points,
              without leaving the workspace.
            </p>
          </>
        )}
      </div>

      {isStudent ? (
        <>
          <div className="login-sample" aria-hidden="true">
            <div className="login-sample-meta">
              <span className="login-sample-kicker">AI-103 · Question 14</span>
              <span className="login-sample-clock">2:41 left</span>
            </div>
            <p className="login-sample-stem">
              Which service produces a confidence score for each extracted entity?
            </p>
            <div className="login-sample-choices">
              {SAMPLE_CHOICES.map((choice) => (
                <div
                  key={choice.letter}
                  className={`login-choice${choice.picked ? ' is-picked' : ''}`}
                >
                  <span className="login-choice-badge">{choice.letter}</span>
                  <span>{choice.text}</span>
                </div>
              ))}
            </div>
          </div>

          <ul className="login-counts">
            {LOGIN_INVENTORY.map((item) => (
              <li key={item.label}>
                <span className="login-count-value">{item.value}</span>
                <span className="login-count-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="login-areas">
          {ADMIN_AREAS.map((area) => (
            <li key={area.label}>
              <Glyph>{area.icon}</Glyph>
              <span>{area.label}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};

export default LoginBrandPanel;
