import { HashRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import React, { Suspense, lazy, useEffect } from 'react';
import './App.css';
import AppRail from './components/AppRail';
import Spinner from './components/Spinner';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LearningRoute from './components/LearningRoute';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { DriveProvider } from './DriveContext';

const Documents = lazy(() => import('./pages/Documents'));
const Gallery = lazy(() => import('./pages/Gallery'));
const LearningHome = lazy(() => import('./pages/LearningHome'));
const AI103 = lazy(() => import('./pages/AI103'));
const AI103Practice = lazy(() => import('./pages/AI103Practice'));
const AI102 = lazy(() => import('./pages/AI102'));
const AI102Practice = lazy(() => import('./pages/AI102Practice'));
const English = lazy(() => import('./pages/English'));
const YbmExam = lazy(() => import('./pages/YbmExam'));
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
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);

      let callbackUrl = `/oauth/callback?code=${code}`;
      if (state) callbackUrl += `&state=${encodeURIComponent(state)}`;
      navigate(callbackUrl, { replace: true });
    }
  }, [navigate]);

  return null;
};

/* Routes that own the full viewport: no navbar, no content padding. */
const CHROMELESS = ['/login', '/bossin', '/oauth/callback'];

const AppShell = () => {
  const { pathname } = useLocation();
  const chromeless = CHROMELESS.some((p) => pathname.startsWith(p));

  return (
    <div className={chromeless ? 'app-shell is-chromeless' : 'app-shell'}>
      <OAuthDetector />
      {!chromeless && <AppRail />}
      <main className={chromeless ? 'content-container is-chromeless' : 'content-container'}>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path='/' element={<Documents />} />
              <Route path='/gallery' element={<Gallery />} />
              <Route path='/upload' element={<Upload />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path='/users' element={<Users />} />
              <Route path='/settings' element={<Settings />} />
            </Route>
            <Route element={<LearningRoute />}>
              <Route path='/learning/home' element={<LearningHome />} />
              <Route path='/learning/ai-103' element={<AI103 />} />
              <Route path='/learning/ai-103/practice' element={<AI103Practice />} />
              <Route path='/learning/ai-102' element={<AI102 />} />
              <Route path='/learning/ai-102/practice' element={<AI102Practice />} />
              <Route path='/learning/english' element={<English />} />
              <Route path='/learning/english/toeic/ybm/:volumeId' element={<English />} />
              <Route
                path='/learning/english/toeic/ybm/:volumeId/test/:testNumber'
                element={<YbmExam />}
              />
            </Route>
            <Route path='/login' element={<Login />} />
            <Route path='/bossin' element={<Login />} />
            <Route path='/oauth/callback' element={<OAuthCallback />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DriveProvider>
          <Router>
            <AppShell />
          </Router>
        </DriveProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
