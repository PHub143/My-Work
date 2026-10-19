const mailAccountService = require('./mailAccountService');
const providers = require('./mail/providers');
const oauthState = require('./mail/oauthState');
const { MailError, toMailError, validation } = require('./mail/errors');

/**
 * Mail facade: resolves the account, picks the provider and normalises errors.
 * Controllers never touch provider SDKs; providers never touch the database.
 */

/**
 * Run a provider operation for a connected account. Converts every failure to
 * a MailError and flags the account when Google rejects the stored token.
 * @template T
 * @param {string} accountId
 * @param {(provider: object, account: object) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withConnectedAccount(accountId, fn) {
  const account = await mailAccountService.getConnectedAccount(accountId);
  const provider = providers.getProvider(account.provider);
  try {
    return await fn(provider, account);
  } catch (err) {
    const mailErr = toMailError(err);
    if (mailErr.code === 'MAIL_REAUTH_REQUIRED') {
      try {
        await mailAccountService.markReauthRequired(account.id);
      } catch (e) {
        console.error('[mail] failed to flag account for re-authorization:', e && e.name);
      }
    }
    throw mailErr;
  }
}

const mailService = {
  listProviders: () => providers.listProviders(),

  /**
   * Build the consent URL for an account.
   * @param {string} accountId
   * @param {string|number} userId Admin starting the flow (bound into state).
   * @returns {Promise<string>}
   */
  getAuthUrl: async (accountId, userId) => {
    const account = await mailAccountService.getAccountWithSecrets(accountId);
    if (!account.clientId || !account.clientSecret || !account.redirectUri) {
      throw validation('Client ID, Client Secret and Redirect URI must be saved before connecting.');
    }
    const provider = providers.getProvider(account.provider);
    const state = oauthState.createState({ provider: account.provider, accountId: account.id, userId });
    return provider.getAuthUrl(account, state);
  },

  /**
   * Finish the OAuth flow: verify state, exchange code, store token.
   * @returns {Promise<object>} safe account
   */
  completeOAuth: async ({ code, state, userId }) => {
    const { provider: providerId, accountId } = oauthState.verifyState(state, { userId });
    const account = await mailAccountService.getAccountWithSecrets(accountId);
    if (account.provider !== providerId) throw validation('Invalid or expired OAuth state. Start the connection again.');
    const provider = providers.getProvider(account.provider);
    let result;
    try {
      result = await provider.exchangeCode(account, code);
    } catch (err) {
      throw toMailError(err);
    }
    return mailAccountService.completeConnection(account.id, result);
  },

  listFolders: (accountId) => withConnectedAccount(accountId, (p, a) => p.listFolders(a)),
  listThreads: (accountId, opts) => withConnectedAccount(accountId, (p, a) => p.listThreads(a, opts)),
  getThread: (accountId, threadId) => withConnectedAccount(accountId, (p, a) => p.getThread(a, threadId)),
  getMessage: (accountId, messageId) => withConnectedAccount(accountId, (p, a) => p.getMessage(a, messageId)),
  getAttachment: (accountId, messageId, attachmentId, hints) =>
    withConnectedAccount(accountId, (p, a) => p.getAttachment(a, messageId, attachmentId, hints)),

  /**
   * @param {string} accountId
   * @param {{target: 'threads'|'messages', ids: string[], action: string, addLabelIds?: string[], removeLabelIds?: string[]}} req
   */
  applyAction: (accountId, req) =>
    withConnectedAccount(accountId, async (p, a) => {
      if (req.action === 'deleteForever' && !p.capabilities(a).permanentDelete) {
        throw new MailError('SCOPE_REQUIRED', 'Permanent delete is not enabled for this mailbox. Enable it in settings and reconnect.');
      }
      return p.applyAction(a, req);
    }),

  listDrafts: (accountId, opts) => withConnectedAccount(accountId, (p, a) => p.listDrafts(a, opts)),
  getDraft: (accountId, draftId) => withConnectedAccount(accountId, (p, a) => p.getDraft(a, draftId)),
  createDraft: (accountId, compose) => withConnectedAccount(accountId, (p, a) => p.createDraft(a, compose)),
  updateDraft: (accountId, draftId, compose) => withConnectedAccount(accountId, (p, a) => p.updateDraft(a, draftId, compose)),
  deleteDraft: (accountId, draftId) => withConnectedAccount(accountId, (p, a) => p.deleteDraft(a, draftId)),
  sendDraft: (accountId, draftId) => withConnectedAccount(accountId, (p, a) => p.sendDraft(a, draftId)),
  send: (accountId, compose) => withConnectedAccount(accountId, (p, a) => p.send(a, compose)),
};

module.exports = mailService;
