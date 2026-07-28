export const LEARNING_FALLBACK_ROUTE = '/learning/ai-103';
export const ADMIN_FALLBACK_ROUTE = '/';

export const STUDENT_LOGIN_ROUTE = '/login';
export const ADMIN_LOGIN_ROUTE = '/bossin';

export const isLearningPath = (path = '') => path.startsWith('/learning');

export const canRoleAccessPath = (user, path, { isAdmin, isStudent }) => {
  if (isAdmin(user)) return true;
  if (isLearningPath(path)) return isStudent(user);
  return false;
};
