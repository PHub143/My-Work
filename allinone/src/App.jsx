import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense, lazy, useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Spinner from './components/Spinner';
import ProtectedRoute from './components/ProtectedRoute';

const Documents = lazy(() => import('./pages/Documents'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Services = lazy(() => import('./pages/Services'));
const Upload = lazy(() => import('./pages/Upload'));
const Settings = lazy(() => import('./pages/Settings'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));

function App() {
  const [initialCode, setInitialCode] = useState(null);

  useEffect(() => {
    // Detect Google OAuth code in the URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setInitialCode(code);
      // Clean the URL query params IMMEDIATELY to prevent double-detection
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  return (
    <Router>
      {initialCode && <Navigate to={`/oauth/callback?code=${initialCode}`} replace />}
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
            <Route path='/settings' element={<Settings />} />
            <Route path='/oauth/callback' element={<OAuthCallback />} />
          </Routes>
        </Suspense>
      </main>
    </Router>
  );
}

export default App;
