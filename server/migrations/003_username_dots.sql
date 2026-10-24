ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_check;
ALTER TABLE users
  ADD CONSTRAINT users_username_format CHECK (username ~ '^[A-Za-z0-9._]{3,24}$');
