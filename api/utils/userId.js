function getUserIdFromEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }

  return email.trim().split('@', 1)[0].toLowerCase();
}

/**
 * Normalizes a user-supplied UserID (the login handle) for storage and
 * lookup: trimmed and lowercased, same casing rules the old email-local-part
 * login used.
 */
function normalizeUserId(userId) {
  return typeof userId === 'string' ? userId.trim().toLowerCase() : '';
}

module.exports = { getUserIdFromEmail, normalizeUserId };
