import { HashRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import React, { Suspense, lazy, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Spinner from './components/Spinner';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';

const Documents = lazy(() => import('./pages/Documents'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Services = lazy(() => import('./pages/Services'));
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
    if (code) {
      // Clean the search params from the URL immediately
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      
      // Navigate to the React Router hash route
      navigate(`/oauth/callback?code=${code}`, { replace: true });
    }
  }, [navigate]);

  return null;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <OAuthDetector />
          <Navbar />
          <main className="content-container">
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route element={<ProtectedRoute />}>
                  <Route path='/' element={<Documents />} />
                  <Route path='/gallery' element={<Gallery />} />
                  <Route path='/upload' element={<Upload />} />
                </Route>
                <Route path='/services' element={<Services />} />
                <Route element={<AdminRoute />}>
                  <Route path='/settings' element={<Settings />} />
                </Route>
                <Route path='/login' element={<Login />} />
                <Route path='/oauth/callback' element={<OAuthCallback />} />
              </Routes>
            </Suspense>
          </main>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
