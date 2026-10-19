import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import { useAuth } from '../AuthContext';
import { createMailApi } from '../utils/mailApi';
import { isMailOAuthState } from '../utils/mail';
import './OAuthCallback.css';

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
      <div className="oauth-callback-card">
        {error ? (
          <>
            <div className="error-icon">⚠️</div>
            <h2>Authentication Error</h2>
            <p className="error-message">{error}</p>
            <button className="primary-button" onClick={() => navigate('/settings', isMailOAuthState(stateParam) ? { state: { tab: 'Mail' } } : undefined)}>
              Return to Settings
            </button>
          </>
        ) : (
          <>
            <Spinner />
            <h2>{status}</h2>
            <p>Please wait while we securely connect your account.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
