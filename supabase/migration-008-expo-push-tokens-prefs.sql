-- migration-007을 이미 실행했다면 이 파일만 실행 (prefs 컬럼 추가)
-- migration-007을 아직 안 했다면 migration-007.sql을 먼저 실행하세요
ALTER TABLE expo_push_tokens
  ADD COLUMN IF NOT EXISTS prefs JSONB NOT NULL DEFAULT '{}';
