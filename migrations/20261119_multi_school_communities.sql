ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'school_admin';
CREATE TYPE community_scope AS ENUM ('school', 'platform');
CREATE TYPE message_channel AS ENUM ('school', 'social');
CREATE TYPE school_invite_role AS ENUM ('student', 'teacher', 'school_admin');

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(100) NOT NULL UNIQUE,
  name_ar varchar(180) NOT NULL,
  name_en varchar(180) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schools (slug, name_ar, name_en)
VALUES ('first-school', 'مدرستي الأولى', 'My First School')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE school_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role school_invite_role NOT NULL,
  code_hash varchar(64) NOT NULL UNIQUE,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses integer NOT NULL DEFAULT 0 CHECK (uses >= 0 AND uses <= max_uses),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX school_invites_school_idx ON school_invites (school_id, role, expires_at);

ALTER TABLE classes ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE SET NULL;
ALTER TABLE subjects ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE teaching_assignments ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE assessments ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE grades ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE announcements ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE assignments ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE files ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE assignment_submissions ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE calendar_events ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE message_requests ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE message_requests ADD COLUMN channel message_channel NOT NULL DEFAULT 'school';
ALTER TABLE community_posts ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE community_posts ADD COLUMN scope community_scope NOT NULL DEFAULT 'school';
ALTER TABLE rules ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE school_locations ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE attendance_records ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE registration_requests ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE registration_requests ADD COLUMN invite_id uuid REFERENCES school_invites(id) ON DELETE SET NULL;

DO $$
DECLARE first_school uuid;
BEGIN
  SELECT id INTO first_school FROM schools WHERE slug = 'first-school';

  UPDATE classes SET school_id = first_school WHERE school_id IS NULL;
  UPDATE users SET school_id = first_school WHERE school_id IS NULL AND role <> 'admin';
  UPDATE subjects SET school_id = first_school WHERE school_id IS NULL;
  UPDATE teaching_assignments SET school_id = first_school WHERE school_id IS NULL;
  UPDATE assessments SET school_id = first_school WHERE school_id IS NULL;
  UPDATE grades SET school_id = first_school WHERE school_id IS NULL;
  UPDATE announcements SET school_id = first_school WHERE school_id IS NULL;
  UPDATE assignments SET school_id = first_school WHERE school_id IS NULL;
  UPDATE files SET school_id = first_school WHERE school_id IS NULL;
  UPDATE assignment_submissions SET school_id = first_school WHERE school_id IS NULL;
  UPDATE calendar_events SET school_id = first_school WHERE school_id IS NULL;
  UPDATE message_requests SET school_id = first_school WHERE school_id IS NULL;
  UPDATE community_posts SET school_id = first_school WHERE school_id IS NULL;
  UPDATE rules SET school_id = first_school WHERE school_id IS NULL;
  UPDATE notifications SET school_id = first_school WHERE school_id IS NULL;
  UPDATE school_locations SET school_id = first_school WHERE school_id IS NULL;
  UPDATE attendance_records SET school_id = first_school WHERE school_id IS NULL;
  UPDATE registration_requests SET school_id = first_school WHERE school_id IS NULL AND status <> 'draft';
END $$;

-- The former single-school schema may have enforced global subject-code uniqueness.
-- Replace only unique indexes/constraints whose sole key is code.
DO $$
DECLARE
  legacy_constraint record;
  legacy_index record;
BEGIN
  FOR legacy_constraint IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'subjects'::regclass
      AND con.contype = 'u'
      AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'subjects'::regclass AND attname = 'code')]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE subjects DROP CONSTRAINT %I', legacy_constraint.conname);
  END LOOP;

  FOR legacy_index IN
    SELECT idx.relname
    FROM pg_index ix
    JOIN pg_class idx ON idx.oid = ix.indexrelid
    WHERE ix.indrelid = 'subjects'::regclass
      AND ix.indisunique
      AND NOT ix.indisprimary
      AND ix.indpred IS NULL
      AND ix.indnkeyatts = 1
      AND pg_get_indexdef(ix.indexrelid, 1, true) = 'code'
      AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = ix.indexrelid)
  LOOP
    EXECUTE format('DROP INDEX %I', legacy_index.relname);
  END LOOP;
END $$;

ALTER TABLE registration_requests ADD CONSTRAINT registration_requests_school_status_check
  CHECK ((status = 'draft' AND school_id IS NULL) OR (status <> 'draft' AND school_id IS NOT NULL));

ALTER TABLE classes ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE subjects ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE teaching_assignments ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE assessments ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE grades ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE announcements ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE assignments ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE files ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE assignment_submissions ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE calendar_events ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE rules ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE school_locations ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE attendance_records ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE community_posts ADD CONSTRAINT community_posts_scope_school_check
  CHECK ((scope = 'school' AND school_id IS NOT NULL) OR (scope = 'platform' AND school_id IS NULL));
ALTER TABLE message_requests ADD CONSTRAINT message_requests_channel_school_check
  CHECK ((channel = 'school' AND school_id IS NOT NULL) OR channel = 'social');

CREATE INDEX classes_school_idx ON classes (school_id, grade_level, section);
CREATE INDEX users_school_role_idx ON users (school_id, role, is_active);
CREATE INDEX subjects_school_idx ON subjects (school_id, name_ar);
CREATE UNIQUE INDEX subjects_school_code_idx ON subjects (school_id, code);
CREATE INDEX assessments_school_idx ON assessments (school_id, class_id, created_at DESC);
CREATE INDEX grades_school_student_idx ON grades (school_id, student_id, graded_at DESC);
CREATE INDEX announcements_school_idx ON announcements (school_id, published, published_at DESC);
CREATE INDEX assignments_school_idx ON assignments (school_id, class_id, due_at);
CREATE INDEX files_school_idx ON files (school_id, visibility, created_at DESC);
CREATE INDEX calendar_events_school_idx ON calendar_events (school_id, starts_at);
CREATE INDEX messages_school_channel_idx ON message_requests (school_id, channel, created_at DESC);
CREATE INDEX community_posts_feed_idx ON community_posts (scope, school_id, published, pinned DESC, created_at DESC);
CREATE INDEX community_posts_author_idx ON community_posts (author_id, created_at DESC);
CREATE INDEX attendance_school_student_idx ON attendance_records (school_id, student_id, date DESC);
CREATE INDEX registrations_school_status_idx ON registration_requests (school_id, status, created_at DESC);
