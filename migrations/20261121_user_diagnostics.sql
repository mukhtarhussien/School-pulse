ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_method varchar(20),
  ADD COLUMN IF NOT EXISTS last_login_ip_hash varchar(64),
  ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failed_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
