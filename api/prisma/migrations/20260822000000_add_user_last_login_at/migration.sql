-- Track when a user last logged in, so the admin Users list can show
-- last-active time instead of only account creation date.
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
