/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

// Atelier Study themes: Porcelain (light), Parchment (sepia), Midnight (dark).
// The ids are what <html data-theme> carries; keep them in step with
// styles/tokens.css and the inline script in index.html.
export const THEMES = [
  { id: 'light', label: 'Porcelain' },
  { id: 'sepia', label: 'Parchment' },
  { id: 'dark', label: 'Midnight' }
];

const isTheme = (value) => THEMES.some((entry) => entry.id === value);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage or system preference
    const storedTheme = localStorage.getItem('theme');
    if (isTheme(storedTheme)) {
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

  // Steps through the three themes in order (Porcelain, Parchment, Midnight).
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const index = THEMES.findIndex((entry) => entry.id === prevTheme);
      return THEMES[(index + 1) % THEMES.length].id;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};
