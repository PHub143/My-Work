-- Registration now collects a UserID directly instead of deriving a login
-- handle from the email local part, and email becomes optional. Backfill
-- userId from the existing email local part so current accounts keep
-- logging in with the same identifier they already use.
ALTER TABLE "User" ADD COLUMN "userId" TEXT;

UPDATE "User" SET "userId" = LOWER(SPLIT_PART("email", '@', 1)) WHERE "userId" IS NULL;

-- A handful of existing accounts can share an email local part (e.g.
-- abc@example.com and abc@gmail.com); the old ambiguous-local-part login
-- already refused to log either of them in with the bare local part, so
-- disambiguating all but the earliest-created with a numeric suffix here
-- doesn't change any login that currently works.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt") AS rn
  FROM "User"
)
UPDATE "User" u
SET "userId" = u."userId" || '-' || ranked.rn
FROM ranked
WHERE u.id = ranked.id AND ranked.rn > 1;

ALTER TABLE "User" ALTER COLUMN "userId" SET NOT NULL;

DROP INDEX IF EXISTS "User_email_local_part_key";

CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
