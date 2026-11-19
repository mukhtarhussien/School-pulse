ALTER TABLE sessions ADD COLUMN IF NOT EXISTS auth_method varchar(20) NOT NULL DEFAULT 'password';

CREATE TABLE IF NOT EXISTS platform_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
  category varchar(40) NOT NULL CONSTRAINT platform_reports_category_check CHECK (category IN ('bug', 'abuse', 'suggestion', 'other')),
  subject varchar(160) NOT NULL,
  message text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'open' CONSTRAINT platform_reports_status_check CHECK (status IN ('open', 'reviewing', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_reports_inbox_idx ON platform_reports(status, created_at);
CREATE INDEX IF NOT EXISTS platform_reports_reporter_idx ON platform_reports(reporter_id, created_at);
