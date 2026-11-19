ALTER TABLE sessions ADD COLUMN IF NOT EXISTS auth_method varchar(20) NOT NULL DEFAULT 'password';
