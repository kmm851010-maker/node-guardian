-- PiLink 스키마
-- Supabase SQL Editor에서 실행

-- 1. 노드 운영자 프로필
CREATE TABLE IF NOT EXISTS node_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid        TEXT UNIQUE NOT NULL,
  nickname      TEXT UNIQUE NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  os            TEXT DEFAULT 'windows',       -- 운영 환경
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 노드 이벤트 (Node Guardian → PiLink API로 전송)
CREATE TABLE IF NOT EXISTS node_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid        TEXT NOT NULL,                -- 어떤 운영자 노드
  event_type    TEXT NOT NULL,               -- 'startup' | 'reboot' | 'process_critical' | 'process_warning' | 'process_recovery' | 'port_critical' | 'port_partial' | 'port_recovery' | 'shutdown'
  severity      TEXT NOT NULL DEFAULT 'info', -- 'info' | 'warning' | 'critical' | 'recovery'
  message       TEXT NOT NULL,               -- 사람이 읽을 메시지
  detail        JSONB,                       -- 추가 정보 (중단 프로세스명 등)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 노드 현재 상태 (운영자당 1행, upsert로 갱신)
CREATE TABLE IF NOT EXISTS node_status (
  pi_uid           TEXT PRIMARY KEY,
  nickname         TEXT,
  process_status   TEXT DEFAULT 'unknown',   -- 'healthy' | 'warning' | 'critical' | 'unknown'
  port_status      TEXT DEFAULT 'unknown',   -- 'healthy' | 'partial' | 'critical' | 'unknown'
  last_seen        TIMESTAMPTZ DEFAULT NOW(),
  uptime_start     TIMESTAMPTZ,              -- 마지막 정상 시작 시각
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 커뮤니티 게시글 (QnA, 자랑 등)
CREATE TABLE IF NOT EXISTS pilink_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_uid    TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  post_type     TEXT NOT NULL DEFAULT 'general', -- 'qna' | 'brag' | 'general' | 'issue'
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  likes         INT DEFAULT 0,
  views         INT DEFAULT 0,
  is_resolved   BOOLEAN DEFAULT FALSE,       -- QnA 해결 여부
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 댓글
CREATE TABLE IF NOT EXISTS pilink_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES pilink_posts(id) ON DELETE CASCADE,
  author_uid    TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  content       TEXT NOT NULL,
  is_answer     BOOLEAN DEFAULT FALSE,       -- QnA 채택 답변 여부
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 좋아요
CREATE TABLE IF NOT EXISTS pilink_likes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES pilink_posts(id) ON DELETE CASCADE,
  pi_uid        TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, pi_uid)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_node_events_pi_uid     ON node_events(pi_uid);
CREATE INDEX IF NOT EXISTS idx_node_events_created_at ON node_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pilink_posts_type      ON pilink_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_pilink_posts_created   ON pilink_posts(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE node_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_status     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilink_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilink_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilink_likes    ENABLE ROW LEVEL SECURITY;

-- 모든 테이블 public read 허용
CREATE POLICY "public read node_profiles"   ON node_profiles   FOR SELECT USING (true);
CREATE POLICY "public read node_events"     ON node_events     FOR SELECT USING (true);
CREATE POLICY "public read node_status"     ON node_status     FOR SELECT USING (true);
CREATE POLICY "public read pilink_posts"    ON pilink_posts    FOR SELECT USING (true);
CREATE POLICY "public read pilink_comments" ON pilink_comments FOR SELECT USING (true);
CREATE POLICY "public read pilink_likes"    ON pilink_likes    FOR SELECT USING (true);
