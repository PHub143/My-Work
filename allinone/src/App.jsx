import { HashRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import React, { Suspense, lazy, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Spinner from './components/Spinner';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { DriveProvider } from './DriveContext';

const Documents = lazy(() => import('./pages/Documents'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Users = lazy(() => import('./pages/Users'));
const Upload = lazy(() => import('./pages/Upload'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));

/**
 * Helper component to detect OAuth code in the search string (non-hash part)
 * and redirect to the hash-based callback route.
 */
const OAuthDetector = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    if (code) {
      // Clean the search params from the URL immediately
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      
      // Navigate to the React Router hash route, preserving state for drive-specific auth
      let callbackUrl = `/oauth/callback?code=${code}`;
      if (state) callbackUrl += `&state=${encodeURIComponent(state)}`;
      navigate(callbackUrl, { replace: true });
    }
  }, [navigate]);

  return null;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DriveProvider>
        <Router>
          <OAuthDetector />
          <Navbar />
          <main className="content-container">
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route element={<ProtectedRoute />}>
                  <Route path='/' element={<Documents />} />
                  <Route path='/gallery' element={<Gallery />} />
                  <Route element={<AuthenticatedRoute />}>
                    <Route path='/upload' element={<Upload />} />
                  </Route>
                </Route>
                <Route element={<AdminRoute />}>
                  <Route path='/users' element={<Users />} />
                  <Route path='/settings' element={<Settings />} />
                </Route>
                <Route path='/login' element={<Login />} />
                <Route path='/oauth/callback' element={<OAuthCallback />} />
              </Routes>
            </Suspense>
          </main>
        </Router>
        </DriveProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
