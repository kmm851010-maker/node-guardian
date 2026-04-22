-- PiLink Migration 001: 프리미엄 및 노드 점수

-- 프리미엄 사용자
CREATE TABLE IF NOT EXISTS premium_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid        TEXT UNIQUE NOT NULL,
  nickname      TEXT NOT NULL,
  payment_id    TEXT NOT NULL,
  amount_pi     NUMERIC NOT NULL DEFAULT 1,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE premium_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read premium_users" ON premium_users FOR SELECT USING (true);

-- node_status에 점수 컬럼 추가
ALTER TABLE node_status ADD COLUMN IF NOT EXISTS node_score INT DEFAULT 0;
ALTER TABLE node_status ADD COLUMN IF NOT EXISTS node_score_updated_at TIMESTAMPTZ;

