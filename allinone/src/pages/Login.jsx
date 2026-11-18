import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { API_URL } from '../config';
import { isAdmin, isStudent } from '../utils/roles';
import {
  ADMIN_FALLBACK_ROUTE,
  ADMIN_LOGIN_ROUTE,
  LEARNING_FALLBACK_ROUTE,
  canRoleAccessPath
} from '../utils/routeAccess';
import LoginBrandPanel from '../components/LoginBrandPanel';
import './Login.css';

const Login = () => {
  const [authMode, setAuthMode] = useState('login');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || null;
  // The route itself is the door: /login is the student portal,
  // ADMIN_LOGIN_ROUTE is the admin portal. Mode no longer depends on referrer.
  const isStudentMode = location.pathname !== ADMIN_LOGIN_ROUTE;
  const isRegisterMode = isStudentMode && authMode === 'register';
  const loginContent = isStudentMode
    ? {
        eyebrow: 'Student portal',
        title: isRegisterMode ? 'Create your account' : 'Sign in',
        subtitle: isRegisterMode
          ? 'Your practice history starts saving right away.'
          : 'Continue your AI-103 and TOEIC practice.',
        placeholder: 'student@example.com',
        button: isRegisterMode ? 'Create account' : 'Sign in',
        fallback: LEARNING_FALLBACK_ROUTE
      }
    : {
        eyebrow: 'Admin portal',
        title: 'Admin sign in',
        subtitle: 'Manage banks, files and student accounts.',
        placeholder: 'admin@example.com',
        button: 'Sign in as admin',
        fallback: ADMIN_FALLBACK_ROUTE
      };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegisterMode && password !== confirmPassword) {
      setError('Passwords do not match. Type the same password in both fields.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = isRegisterMode ? 'register' : 'login';
      const payload = isRegisterMode
        ? { userId, email: email || undefined, password }
        : { userId, password, portal: isStudentMode ? 'student' : 'admin' };

      const response = await fetch(`${API_URL}/users/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token);
        const preferredPath = isRegisterMode ? LEARNING_FALLBACK_ROUTE : from || loginContent.fallback;
        const requestedPath = canRoleAccessPath(data.user, preferredPath, { isAdmin, isStudent })
          ? preferredPath
          : loginContent.fallback;
        navigate(requestedPath, { replace: true });
      } else {
        setError(data.message || `${isRegisterMode ? 'Registration' : 'Login'} failed. Please try again.`);
      }
    } catch (err) {
      console.error(`${isRegisterMode ? 'Registration' : 'Login'} error:`, err);
      setError(`An error occurred during ${isRegisterMode ? 'registration' : 'login'}. Please try again later.`);
    } finally {
      setIsLoading(false);
    }
  };

  const switchAuthMode = (nextMode) => {
    setAuthMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setEmail('');
  };

  return (
    <div className="login-page">
      <LoginBrandPanel mode={isStudentMode ? 'student' : 'admin'} />

      <main className="login-form-col">
        <div className="login-card">
          <div className="login-head">
            <span className="as-label login-eyebrow">{loginContent.eyebrow}</span>
            <h1>{loginContent.title}</h1>
            <p className="login-subtitle">{loginContent.subtitle}</p>
          </div>

          {error && (
            <div className="as-alert as-alert--error" role="alert">
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
              <span>
                <span className="as-visually-hidden">Error: </span>
                {error}
              </span>
            </div>
          )}

          {isStudentMode && (
            <div className="as-tabs" role="group" aria-label="Student account mode">
              <button
                type="button"
                className="as-tab"
                aria-pressed={authMode === 'login'}
                onClick={() => switchAuthMode('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                className="as-tab"
                aria-pressed={authMode === 'register'}
                onClick={() => switchAuthMode('register')}
              >
                Register
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="as-field">
              <label className="as-field__label" htmlFor="userId">
                {isRegisterMode ? 'User ID' : 'User ID or email'}
              </label>
              <input
                id="userId"
                className="as-field__input"
                type="text"
                placeholder={isRegisterMode ? 'Choose a user ID' : 'User ID or email address'}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            {isRegisterMode && (
              <div className="as-field">
                <label className="as-field__label" htmlFor="email">Email address (optional)</label>
                <input
                  id="email"
                  className="as-field__input"
                  type="email"
                  placeholder={loginContent.placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            )}

            <div className="as-field">
              <label className="as-field__label" htmlFor="password">Password</label>
              <input
                id="password"
                className="as-field__input"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              />
            </div>

            {isRegisterMode && (
              <div className="as-field">
                <label className="as-field__label" htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  className="as-field__input"
                  type="password"
                  placeholder="Type it again"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            <button
              type="submit"
              className="as-btn as-btn--primary as-btn--block login-submit"
              disabled={isLoading}
            >
              {isLoading ? (isRegisterMode ? 'Creating account…' : 'Signing in…') : loginContent.button}
            </button>
          </form>

          {isStudentMode && (
            <p className="as-small login-legal">
              Trouble signing in? Ask your teacher to reset your account.
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Login;
