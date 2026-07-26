function getUserIdFromEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }

  return email.trim().split('@', 1)[0].toLowerCase();
}

module.exports = { getUserIdFromEmail };
