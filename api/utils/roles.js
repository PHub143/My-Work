const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
});

const ALLOWED_ROLES = Object.freeze([ROLES.ADMIN, ROLES.STUDENT]);
const ROLE_ORDER = [ROLES.STUDENT, ROLES.ADMIN];
const LEGACY_ROLE_MAP = Object.freeze({
  USER: ROLES.STUDENT,
});

function normalizeRole(role, strict) {
  if (typeof role !== 'string' || role.trim() === '') {
    return null;
  }

  const normalizedRole = role.trim().toUpperCase();
  const mappedRole = LEGACY_ROLE_MAP[normalizedRole] || normalizedRole;

  if (ALLOWED_ROLES.includes(mappedRole)) {
    return mappedRole;
  }

  if (strict) {
    throw new Error('Role must be ADMIN or STUDENT.');
  }

  return null;
}

function normalizeRoles(input, options = {}) {
  const roles = Array.isArray(input) ? input : [input];
  const normalized = new Set();

  for (const role of roles) {
    const normalizedRole = normalizeRole(role, options.strict === true);
    if (normalizedRole) {
      normalized.add(normalizedRole);
    }
  }

  if (normalized.size === 0) {
    normalized.add(ROLES.STUDENT);
  }

  return ROLE_ORDER.filter((role) => normalized.has(role));
}

function getUserRoles(user, options = {}) {
  if (!user) {
    return [];
  }

  if (Array.isArray(user.roles)) {
    return normalizeRoles(user.roles, options);
  }

  return normalizeRoles(user.role, options);
}

function hasRole(user, role) {
  const normalizedRole = normalizeRole(role, false);

  if (!normalizedRole) {
    return false;
  }

  return getUserRoles(user).includes(normalizedRole);
}

function isAdminUser(user) {
  return hasRole(user, ROLES.ADMIN);
}

function primaryRole(roles) {
  return normalizeRoles(roles).includes(ROLES.ADMIN) ? ROLES.ADMIN : ROLES.STUDENT;
}

function withNormalizedRoles(user, options = {}) {
  if (!user) {
    return user;
  }

  const roles = getUserRoles(user, options);

  return {
    ...user,
    roles,
    role: primaryRole(roles),
  };
}

module.exports = {
  ROLES,
  ALLOWED_ROLES,
  normalizeRoles,
  getUserRoles,
  hasRole,
  isAdminUser,
  primaryRole,
  withNormalizedRoles,
};
