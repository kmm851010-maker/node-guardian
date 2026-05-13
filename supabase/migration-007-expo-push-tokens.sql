-- Expo 푸시 알림 토큰 테이블
CREATE TABLE IF NOT EXISTS expo_push_tokens (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pi_uid     TEXT NOT NULL,
  token      TEXT NOT NULL,
  prefs      JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS expo_push_tokens_pi_uid_token_key
  ON expo_push_tokens(pi_uid, token);
