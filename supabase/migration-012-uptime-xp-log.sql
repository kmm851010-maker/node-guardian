-- Uptime XP daily log (prevents double-grant)
CREATE TABLE IF NOT EXISTS public.uptime_xp_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pi_uid text NOT NULL,
  granted_date date NOT NULL,
  xp smallint NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pi_uid, granted_date)
);

ALTER TABLE public.uptime_xp_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.uptime_xp_log TO anon, authenticated;
GRANT ALL ON public.uptime_xp_log TO service_role;
