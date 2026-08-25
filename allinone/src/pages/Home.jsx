import React from 'react';
import { Navigate } from 'react-router-dom';
import AdminHome from './AdminHome';
import { useAuth } from '../AuthContext';
import { isAdmin } from '../utils/roles';
import { LEARNING_FALLBACK_ROUTE } from '../utils/routeAccess';

// Root route ("/"). Routed inside the LearningRoute guard, which lets any
// authenticated user through (isStudent() is true for admins too) rather
// than ProtectedRoute's admin-only gate — "/" is the app's default landing
// path for every signed-in user, so it must never show the "Admin login
// required" screen a student would get from ProtectedRoute.
const Home = () => {
  const { user } = useAuth();

  if (isAdmin(user)) {
    return <AdminHome />;
  }

  return <Navigate to={LEARNING_FALLBACK_ROUTE} replace />;
};

export default Home;
