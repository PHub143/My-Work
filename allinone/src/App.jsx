import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Spinner from './components/Spinner';

const Documents = lazy(() => import('./pages/Documents'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Services = lazy(() => import('./pages/Services'));
const Upload = lazy(() => import('./pages/Upload'));
const Settings = lazy(() => import('./pages/Settings'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));

function App() {
  return (
    <Router>
      <Navbar />
      <main className="content-container">
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path='/' element={<Documents />} />
            <Route path='/gallery' element={<Gallery />} />
            <Route path='/services' element={<Services />} />
            <Route path='/upload' element={<Upload />} />
            <Route path='/settings' element={<Settings />} />
            <Route path='/oauth/callback' element={<OAuthCallback />} />
          </Routes>
        </Suspense>
      </main>
    </Router>
  );
}

export default App;
