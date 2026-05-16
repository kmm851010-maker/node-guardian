-- weekly_rankings에 점수 세부 항목 컬럼 추가
ALTER TABLE public.weekly_rankings
  ADD COLUMN IF NOT EXISTS best_answer_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count     INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_score        INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_score       INT DEFAULT 0;

GRANT ALL ON public.weekly_rankings TO service_role;
