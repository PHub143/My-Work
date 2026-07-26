-- The email local part is the login user ID, so it must identify exactly one account.
CREATE UNIQUE INDEX "User_email_local_part_key"
  ON "User" (LOWER(SPLIT_PART("email", '@', 1)));
