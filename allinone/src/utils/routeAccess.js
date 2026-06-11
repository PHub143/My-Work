export const LEARNING_FALLBACK_ROUTE = '/learning/ai-103';
export const ADMIN_FALLBACK_ROUTE = '/';

export const isLearningPath = (path = '') => path.startsWith('/learning');

export const getLoginModeForPath = (path = '') => (
  isLearningPath(path) ? 'student' : 'admin'
);

export const canRoleAccessPath = (user, path, { isAdmin, isStudent }) => {
  if (isAdmin(user)) return true;
  if (isLearningPath(path)) return isStudent(user);
  return false;
};
