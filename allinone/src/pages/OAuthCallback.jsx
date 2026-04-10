import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config';
import Spinner from '../components/Spinner';
import './OAuthCallback.css';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  const hasExchanged = useRef(false);
  const [status, setStatus] = useState('Authenticating with Google...');
  const [error, setError] = useState(code ? '' : 'No authorization code found in the URL. If you just redirected, please try again from Settings.');

  useEffect(() => {
    if (!code || hasExchanged.current) {
      return;
    }

    const exchangeCode = async () => {
      hasExchanged.current = true;
      try {
        const response = await fetch(`${API_URL}/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (response.ok) {
          setStatus('Authentication successful! Redirecting...');
          // Clean the URL hash params
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
  }, [code, navigate]);

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-card">
        {error ? (
          <>
            <div className="error-icon">⚠️</div>
            <h2>Authentication Error</h2>
            <p className="error-message">{error}</p>
            <button className="primary-button" onClick={() => navigate('/settings')}>
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
