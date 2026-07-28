import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { isStudent } from '../utils/roles';
import { STUDENT_LOGIN_ROUTE } from '../utils/routeAccess';
import Spinner from './Spinner';

const LearningRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh'
      }}>
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={STUDENT_LOGIN_ROUTE} state={{ from: location.pathname }} replace />;
  }

  if (!isStudent(user)) {
    return <Navigate to={STUDENT_LOGIN_ROUTE} replace />;
  }

  return <Outlet />;
};

export default LearningRoute;
