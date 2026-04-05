import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Spinner from './components/Spinner';

const Documents = lazy(() => import('./pages/Documents'));
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const Upload = lazy(() => import('./pages/Upload'));

function App() {
  return (
    <Router>
      <Navbar />
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path='/' element={<Documents />} />
          <Route path='/about' element={<About />} />
          <Route path='/services' element={<Services />} />
          <Route path='/upload' element={<Upload />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
