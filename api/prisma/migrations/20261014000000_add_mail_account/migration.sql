-- Admin Inbox: connected mailbox accounts (additive only). clientSecret and
-- refreshToken hold AES-256-GCM ciphertext produced by utils/encryption.js.
CREATE TABLE "MailAccount" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gmail',
    "name" TEXT NOT NULL DEFAULT 'Gmail',
    "emailAddress" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "redirectUri" TEXT,
    "refreshToken" TEXT,
    "grantedScopes" TEXT,
    "allowPermanentDelete" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "providerConfig" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MailAccount_provider_emailAddress_key" ON "MailAccount"("provider", "emailAddress");
