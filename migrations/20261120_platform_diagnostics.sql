CREATE TABLE IF NOT EXISTS public.platform_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type varchar(48) NOT NULL,
  severity varchar(12) NOT NULL DEFAULT 'info' CONSTRAINT platform_diagnostics_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role varchar(24),
  subject_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  route varchar(255),
  method varchar(10),
  status_code integer CONSTRAINT platform_diagnostics_status_check CHECK (status_code IS NULL OR status_code BETWEEN 100 AND 599),
  duration_ms integer CONSTRAINT platform_diagnostics_duration_check CHECK (duration_ms IS NULL OR duration_ms >= 0),
  error_code varchar(64),
  error_digest varchar(128),
  message varchar(500),
  request_id varchar(128),
  ip_hash varchar(64),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS platform_diagnostics_event_time_idx ON public.platform_diagnostics(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS platform_diagnostics_actor_time_idx ON public.platform_diagnostics(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS platform_diagnostics_subject_time_idx ON public.platform_diagnostics(subject_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS platform_diagnostics_error_time_idx ON public.platform_diagnostics(error_code, occurred_at DESC);
CREATE INDEX IF NOT EXISTS platform_diagnostics_route_time_idx ON public.platform_diagnostics(route, occurred_at DESC);
