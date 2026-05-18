-- node_status에 first_seen 컬럼 추가 (최초 가입일 추적)
ALTER TABLE public.node_status
  ADD COLUMN IF NOT EXISTS first_seen TIMESTAMPTZ DEFAULT NOW();

-- 기존 유저는 uptime_start로 백필 (없으면 updated_at 사용)
UPDATE public.node_status
SET first_seen = COALESCE(uptime_start, updated_at)
WHERE first_seen IS NULL;
