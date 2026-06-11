export const ROLES = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT'
};

const LEGACY_ROLE_MAP = {
  USER: ROLES.STUDENT
};

const ROLE_ORDER = [ROLES.STUDENT, ROLES.ADMIN];
const VALID_ROLES = new Set(ROLE_ORDER);

const normalizeRole = (role) => {
  if (typeof role !== 'string') return null;
  const normalizedInput = role.trim().toUpperCase();
  const normalizedRole = LEGACY_ROLE_MAP[normalizedInput] || normalizedInput;
  return VALID_ROLES.has(normalizedRole) ? normalizedRole : null;
};

export const normalizeRoles = (input, fallback = [ROLES.STUDENT]) => {
  const rawRoles = Array.isArray(input) ? input : [input];
  const roles = new Set();

  rawRoles.forEach((role) => {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole) {
      roles.add(normalizedRole);
    }
  });

  const fallbackRoles = Array.isArray(fallback) ? fallback : [fallback];
  if (roles.size === 0 && fallbackRoles.length > 0) {
    return normalizeRoles(fallbackRoles, []);
  }

  return ROLE_ORDER.filter((role) => roles.has(role));
};

export const getUserRoles = (user) => {
  if (!user) return [];

  const roles = [
    ...(Array.isArray(user.roles) ? user.roles : [user.roles]),
    user.role
  ];

  return normalizeRoles(roles, []);
};

export const hasRole = (user, role) => {
  const [normalizedRole] = normalizeRoles(role, []);
  return normalizedRole ? getUserRoles(user).includes(normalizedRole) : false;
};

export const isAdmin = (user) => hasRole(user, ROLES.ADMIN);

export const isStudent = (user) => isAdmin(user) || hasRole(user, ROLES.STUDENT);

export const primaryRole = (roles) => {
  const normalizedRoles = normalizeRoles(roles);
  return normalizedRoles.includes(ROLES.ADMIN) ? ROLES.ADMIN : ROLES.STUDENT;
};
