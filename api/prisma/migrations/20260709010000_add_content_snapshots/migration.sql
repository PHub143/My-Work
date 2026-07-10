-- CreateTable
CREATE TABLE "ContentSnapshot" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'english',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'published',
    "checksum" TEXT NOT NULL,
    "source" JSONB,
    "summary" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentSnapshot_kind_checksum_key" ON "ContentSnapshot"("kind", "checksum");

-- CreateIndex
CREATE INDEX "ContentSnapshot_kind_status_createdAt_idx" ON "ContentSnapshot"("kind", "status", "createdAt");
