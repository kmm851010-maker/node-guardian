-- migration-002: 텔레그램 중앙봇 구독 테이블
CREATE TABLE IF NOT EXISTS telegram_subscriptions (
  pi_uid  TEXT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
