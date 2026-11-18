import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './OAuthCallback.css';
import { API_URL } from '../config';
import { useAuth } from '../AuthContext';
import { createMailApi } from '../utils/mailApi';
import { isMailOAuthState } from '../utils/mail';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const hasExchanged = useRef(false);
  const [status, setStatus] = useState('Authenticating with Google...');
  const [error, setError] = useState(code ? '' : 'No authorization code found in the URL. If you just redirected, please try again from Settings.');

  useEffect(() => {
    if (!code || hasExchanged.current || !token) {
      return;
    }

    const exchangeCode = async () => {
      hasExchanged.current = true;

      // Gmail (mail) flow: the state carries kind:'mail'. Everything else is
      // the Drive flow below, which stays exactly as it was.
      if (isMailOAuthState(stateParam)) {
        try {
          await createMailApi(token).completeOAuth({ code, state: stateParam });
          setStatus('Gmail connected! Redirecting...');
          navigate('/settings', {
            state: { tab: 'Mail', message: 'Gmail account connected.' },
            replace: true
          });
        } catch (err) {
          console.error('Error during mail code exchange:', err);
          setError(err?.message || 'Gmail authentication failed. The code may have expired or already been used.');
        }
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ code, state: stateParam }),
        });

        if (response.ok) {
          setStatus('Authentication successful! Redirecting...');
          navigate('/settings', {
            state: { message: 'Successfully authenticated with Google Drive!' },
            replace: true
          });
        } else {
          const data = await response.json();
          setError(data.message || data.error || 'Authentication failed. The code may have expired or already been used.');
        }
      } catch (err) {
        console.error('Error during code exchange:', err);
        setError('Connection to server failed during authentication.');
      }
    };

    exchangeCode();
  }, [code, navigate, token, stateParam]);

  return (
    <div className="oauth-callback-container">
      <main className="oauth-callback-main">
        <span className="oauth-callback-wordmark">Allinone</span>

        {error ? (
          <div className="oauth-callback-card">
            <h1 className="as-title oauth-callback-title">
              <svg
                width="24"
                height="24"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 3.5l7.5 13H2.5z" />
                <path d="M10 8.5v3.5M10 14.5v.01" />
              </svg>
              Authentication Error
            </h1>
            <div className="as-alert as-alert--error oauth-callback-alert" role="alert">
              <svg
                className="as-alert__icon"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="7.5" />
                <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" />
              </svg>
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="as-btn as-btn--primary as-btn--block"
              onClick={() => navigate('/settings', isMailOAuthState(stateParam) ? { state: { tab: 'Mail' } } : undefined)}
            >
              Return to Settings
            </button>
          </div>
        ) : (
          <div className="oauth-callback-card" role="status">
            <svg
              className="oauth-callback-spinner"
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="20" cy="20" r="16" stroke="var(--line)" strokeWidth="3" />
              <path d="M20 4a16 16 0 0 1 16 16" stroke="var(--link)" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <h1 className="as-title">{status}</h1>
            <p className="oauth-callback-note">Please wait while we securely connect your account.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default OAuthCallback;
