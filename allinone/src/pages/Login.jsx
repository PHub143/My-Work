import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { API_URL } from '../config';
import { isAdmin, isStudent } from '../utils/roles';
import {
  ADMIN_FALLBACK_ROUTE,
  LEARNING_FALLBACK_ROUTE,
  canRoleAccessPath,
  getLoginModeForPath
} from '../utils/routeAccess';
import './Login.css';

const Login = () => {
  const [authMode, setAuthMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from || ADMIN_FALLBACK_ROUTE;
  const loginMode = getLoginModeForPath(from);
  const isStudentMode = loginMode === 'student';
  const isRegisterMode = isStudentMode && authMode === 'register';
  const loginContent = isStudentMode
    ? {
        title: isRegisterMode ? 'Student Register' : 'Student Login',
        subtitle: isRegisterMode ? 'Create your learning account' : 'Sign in to continue learning',
        placeholder: 'student@example.com',
        button: isRegisterMode ? 'Create Student Account' : 'Sign in as Student',
        fallback: LEARNING_FALLBACK_ROUTE
      }
    : {
        title: 'Admin Login',
        subtitle: 'Sign in to manage the workspace',
        placeholder: 'admin@example.com',
        button: 'Sign in as Admin',
        fallback: ADMIN_FALLBACK_ROUTE
      };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegisterMode && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = isRegisterMode ? 'register' : 'login';
      const payload = isRegisterMode
        ? { email, password, name }
        : { email, password };

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
        const requestedPath = isRegisterMode ? LEARNING_FALLBACK_ROUTE : from || loginContent.fallback;
        navigate(requestedPath, {
          replace: true,
          state: canRoleAccessPath(data.user, requestedPath, { isAdmin, isStudent })
            ? undefined
            : { locked: true }
        });
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
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <h2>{loginContent.title}</h2>
        <p className="login-subtitle">{loginContent.subtitle}</p>
        
        {error && <div className="login-error-message">{error}</div>}

        {isStudentMode && (
          <div className="login-mode-toggle" aria-label="Student account mode">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => switchAuthMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => switchAuthMode('register')}
            >
              Register
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Student name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder={loginContent.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
            />
          </div>

          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-submit-btn primary-btn" 
            disabled={isLoading}
          >
            {isLoading ? (isRegisterMode ? 'Creating account...' : 'Signing in...') : loginContent.button}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
