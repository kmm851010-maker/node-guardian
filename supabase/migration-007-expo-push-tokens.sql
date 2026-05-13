-- Expo 푸시 알림 토큰 테이블
CREATE TABLE IF NOT EXISTS expo_push_tokens (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pi_uid     TEXT NOT NULL,
  token      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pi_uid, token)
);
