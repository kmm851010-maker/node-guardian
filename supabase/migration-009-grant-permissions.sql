-- Migration 009: 명시적 GRANT 권한 부여 (Supabase 5월 30일 정책 대응)
-- Supabase SQL Editor에서 실행하세요

-- =============================================
-- 공개 읽기 테이블 (anon, authenticated, service_role)
-- =============================================

-- node_profiles
GRANT SELECT ON public.node_profiles TO anon, authenticated;
GRANT ALL ON public.node_profiles TO service_role;

-- node_events
GRANT SELECT ON public.node_events TO anon, authenticated;
GRANT ALL ON public.node_events TO service_role;

-- node_status
GRANT SELECT ON public.node_status TO anon, authenticated;
GRANT ALL ON public.node_status TO service_role;

-- pilink_posts
GRANT SELECT ON public.pilink_posts TO anon, authenticated;
GRANT ALL ON public.pilink_posts TO service_role;

-- pilink_comments
GRANT SELECT ON public.pilink_comments TO anon, authenticated;
GRANT ALL ON public.pilink_comments TO service_role;

-- pilink_likes
GRANT SELECT ON public.pilink_likes TO anon, authenticated;
GRANT ALL ON public.pilink_likes TO service_role;

-- pi_news
GRANT SELECT ON public.pi_news TO anon, authenticated;
GRANT ALL ON public.pi_news TO service_role;

-- premium_users (공개 읽기 - 프리미엄 여부 확인용)
GRANT SELECT ON public.premium_users TO anon, authenticated;
GRANT ALL ON public.premium_users TO service_role;

-- weekly_rankings
GRANT SELECT ON public.weekly_rankings TO anon, authenticated;
GRANT ALL ON public.weekly_rankings TO service_role;

-- =============================================
-- 내부 전용 테이블 (service_role만)
-- =============================================

-- telegram_subscriptions
GRANT ALL ON public.telegram_subscriptions TO service_role;

-- push_subscriptions
GRANT ALL ON public.push_subscriptions TO service_role;

-- expo_push_tokens
GRANT ALL ON public.expo_push_tokens TO service_role;

-- guardian_pair_codes
GRANT ALL ON public.guardian_pair_codes TO service_role;
