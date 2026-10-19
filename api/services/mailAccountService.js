const prisma = require('./prismaService');
const { encrypt, decrypt } = require('../utils/encryption');
const providers = require('./mail/providers');
const { MailError, notFound, conflict } = require('./mail/errors');

/**
 * Mail account persistence. Secrets (clientSecret, refreshToken) are stored
 * AES-256-GCM encrypted and are NEVER part of a returned "safe" account.
 */

/** Capability flags for UI gating, derived from granted scopes; never throws. */
function capabilitiesFor(row) {
  try {
    return providers.getProvider(row.provider).capabilities(row);
  } catch (e) {
    return {};
  }
}

/**
 * Strip secrets and add derived flags.
 * @param {object} row Prisma MailAccount row (encrypted fields allowed).
 */
function toSafeAccount(row) {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    emailAddress: row.emailAddress,
    clientId: row.clientId,
    redirectUri: row.redirectUri,
    hasClientSecret: !!row.clientSecret,
    isConnected: row.status === 'connected' && !!row.refreshToken,
    status: row.status,
    allowPermanentDelete: row.allowPermanentDelete,
    capabilities: capabilitiesFor(row),
    isDefault: row.isDefault,
    connectedAt: row.connectedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const findRow = async (id) => {
  const row = await prisma.mailAccount.findUnique({ where: { id } });
  if (!row) throw notFound('Mail account not found.');
  return row;
};

const mailAccountService = {
  toSafeAccount,

  /** @returns {Promise<object[]>} safe accounts, oldest first */
  listAccounts: async () => {
    const rows = await prisma.mailAccount.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toSafeAccount);
  },

  /** @param {string} id */
  getAccount: async (id) => toSafeAccount(await findRow(id)),

  /**
   * @param {{provider: string, name: string, clientId: string, clientSecret: string, redirectUri: string, allowPermanentDelete?: boolean, isDefault?: boolean}} data
   */
  createAccount: async (data) => {
    const count = await prisma.mailAccount.count();
    const makeDefault = count === 0 || !!data.isDefault;
    const create = prisma.mailAccount.create({
      data: {
        provider: data.provider,
        name: data.name,
        clientId: data.clientId,
        clientSecret: encrypt(data.clientSecret),
        redirectUri: data.redirectUri,
        allowPermanentDelete: !!data.allowPermanentDelete,
        isDefault: makeDefault,
      },
    });
    if (makeDefault && count > 0) {
      const [, row] = await prisma.$transaction([
        prisma.mailAccount.updateMany({ data: { isDefault: false } }),
        create,
      ]);
      return toSafeAccount(row);
    }
    return toSafeAccount(await create);
  },

  /**
   * Partial update. A blank / '********' clientSecret keeps the stored
   * ciphertext untouched. Changing clientId invalidates the stored token
   * (it is bound to the OAuth client), so the account is disconnected.
   */
  updateAccount: async (id, data) => {
    const existing = await findRow(id);
    const update = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.redirectUri !== undefined) update.redirectUri = data.redirectUri;
    if (data.allowPermanentDelete !== undefined) update.allowPermanentDelete = data.allowPermanentDelete;
    if (data.clientSecret) update.clientSecret = encrypt(data.clientSecret);
    if (data.clientId !== undefined) {
      update.clientId = data.clientId;
      if (existing.clientId && existing.clientId !== data.clientId) {
        Object.assign(update, {
          refreshToken: null,
          grantedScopes: null,
          emailAddress: null,
          connectedAt: null,
          status: 'disconnected',
        });
      }
    }
    if (Object.keys(update).length === 0) return toSafeAccount(existing);
    return toSafeAccount(await prisma.mailAccount.update({ where: { id }, data: update }));
  },

  /** Deletes the row (no provider-side revoke; user revokes in Google account). */
  deleteAccount: async (id) => {
    const deleted = await findRow(id);
    await prisma.mailAccount.delete({ where: { id } });
    if (deleted.isDefault) {
      const next = await prisma.mailAccount.findFirst({ orderBy: { createdAt: 'asc' } });
      if (next) await prisma.mailAccount.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  },

  setDefault: async (id) => {
    await findRow(id);
    const [, row] = await prisma.$transaction([
      prisma.mailAccount.updateMany({ where: { id: { not: id } }, data: { isDefault: false } }),
      prisma.mailAccount.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return toSafeAccount(row);
  },

  /** Forget the stored authorization locally. */
  disconnect: async (id) => {
    await findRow(id);
    const row = await prisma.mailAccount.update({
      where: { id },
      data: {
        refreshToken: null,
        grantedScopes: null,
        emailAddress: null,
        connectedAt: null,
        status: 'disconnected',
      },
    });
    return toSafeAccount(row);
  },

  /**
   * Account with decrypted secrets for building a provider client.
   * Internal use only; never return this object from an endpoint.
   */
  getAccountWithSecrets: async (id) => {
    const row = await findRow(id);
    return {
      ...row,
      clientSecret: row.clientSecret ? decrypt(row.clientSecret) : null,
      refreshToken: row.refreshToken ? decrypt(row.refreshToken) : null,
    };
  },

  /**
   * Decrypted account that is ready for provider calls.
   * @throws {MailError} 404 / 412 MAIL_NOT_CONNECTED / 412 MAIL_REAUTH_REQUIRED
   */
  getConnectedAccount: async (id) => {
    const account = await mailAccountService.getAccountWithSecrets(id);
    if (account.status === 'reauth_required') {
      throw new MailError('MAIL_REAUTH_REQUIRED', 'Mailbox authorization expired. Reconnect the mailbox in Settings.');
    }
    if (account.status !== 'connected' || !account.refreshToken || !account.clientId || !account.clientSecret) {
      throw new MailError('MAIL_NOT_CONNECTED', 'Mailbox is not connected. Connect it in Settings.');
    }
    return account;
  },

  /**
   * Persist a successful OAuth exchange.
   * @throws {MailError} 409 when the mailbox is linked to another account row
   */
  completeConnection: async (id, { refreshToken, grantedScopes, emailAddress }) => {
    const account = await findRow(id);
    const duplicate = await prisma.mailAccount.findFirst({
      where: { provider: account.provider, emailAddress, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) throw conflict('This mailbox is already connected to another account.');
    try {
      const row = await prisma.mailAccount.update({
        where: { id },
        data: {
          emailAddress,
          refreshToken: encrypt(refreshToken),
          grantedScopes,
          status: 'connected',
          connectedAt: new Date(),
        },
      });
      return toSafeAccount(row);
    } catch (err) {
      if (err && err.code === 'P2002') throw conflict('This mailbox is already connected to another account.');
      throw err;
    }
  },

  /** Flag an account whose stored token Google rejected (invalid_grant). */
  markReauthRequired: async (id) => {
    await prisma.mailAccount.updateMany({
      where: { id, status: 'connected' },
      data: { status: 'reauth_required' },
    });
  },
};

module.exports = mailAccountService;
