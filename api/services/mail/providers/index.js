/**
 * Mail provider registry. To add a provider, drop `<id>Provider.js` in this
 * folder implementing the same method set as gmailProvider.js and register it
 * below. Callers (services/mailService.js) only use getProvider()/listProviders().
 *
 * Required provider interface (all async methods take the decrypted account
 * first and return provider-neutral shapes):
 *   id, name, supportsPermanentDelete (boolean), capabilities(account) [sync]
 *   getAuthUrl(account, state) [sync], exchangeCode(account, code)
 *   getProfile, listFolders, listThreads, getThread, getMessage, getAttachment,
 *   applyAction, listDrafts, getDraft, createDraft, updateDraft, deleteDraft,
 *   sendDraft, send
 */
const { validation } = require('../errors');

const registry = {
  gmail: () => require('./gmailProvider'),
};

/** @param {string} id @returns {object} provider implementation */
function getProvider(id) {
  const factory = Object.prototype.hasOwnProperty.call(registry, id) ? registry[id] : null;
  if (!factory) throw validation(`Unsupported mail provider: ${String(id).slice(0, 40)}`);
  return factory();
}

/** @param {string} id @returns {boolean} */
function hasProvider(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(registry, id);
}

/** @returns {Array<{id: string, name: string, supportsPermanentDelete: boolean}>} */
function listProviders() {
  return Object.keys(registry).map((id) => {
    const p = registry[id]();
    return { id: p.id, name: p.name, supportsPermanentDelete: p.supportsPermanentDelete === true };
  });
}

module.exports = { getProvider, hasProvider, listProviders };
