import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Documents from './pages/Documents';
import About from './pages/About';
import Services from './pages/Services';
import Upload from './pages/Upload';

function App() {
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage or system preference
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Apply the theme to the document element
    document.documentElement.setAttribute('data-theme', theme);
    // Store the theme preference
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <Router basename="/My-Work/allinone">
      <Navbar toggleTheme={toggleTheme} currentTheme={theme} />
      <Routes>
        <Route path='/' element={<Documents />} />
        <Route path='/about' element={<About />} />
        <Route path='/services' element={<Services />} />
        <Route path='/upload' element={<Upload />} />
      </Routes>
    </Router>
  );
}

export default App;
