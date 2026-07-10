-- Add persisted English learning results for Phase 5 progress tracking.
CREATE TABLE "PracticeResult" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "raw" INTEGER,
  "scaled" INTEGER,
  "total" INTEGER,
  "duration" INTEGER,
  "perPart" JSONB,
  "perTag" JSONB,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PracticeResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PracticeResult_userId_createdAt_idx" ON "PracticeResult"("userId", "createdAt");
CREATE INDEX "PracticeResult_userId_kind_idx" ON "PracticeResult"("userId", "kind");

ALTER TABLE "PracticeResult"
  ADD CONSTRAINT "PracticeResult_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
