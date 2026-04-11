/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

/**
 * Decodes a JWT token and returns its payload.
 */
const decodeToken = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const decoded = JSON.parse(jsonPayload);
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return decoded;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token');
    const decoded = decodeToken(storedToken);
    if (storedToken && !decoded) {
      localStorage.removeItem('token');
      return null;
    }
    return storedToken;
  });
  
  // Deriving user from token using useMemo to avoid useEffect setState
  const user = useMemo(() => {
    const decoded = decodeToken(token);
    if (!decoded) return null;
    
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    };
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
  }, []);

  const login = useCallback((newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  }, []);

  // Cleanup effect if token is found to be invalid by useMemo later (e.g., expiration)
  useEffect(() => {
    if (token && !user) {
      setTimeout(() => setToken(null), 0);
    }
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading: false, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
