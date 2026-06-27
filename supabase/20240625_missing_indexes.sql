-- ============================================================
-- Missing Indexes — Performance optimization
-- ============================================================

-- 1. daily_questions: queried by assigned_date daily
CREATE INDEX IF NOT EXISTS idx_daily_questions_assigned_date
  ON public.daily_questions(assigned_date);

-- 2. spaced_repetition: queried by user_id + next_review_date for SRS due questions
CREATE INDEX IF NOT EXISTS idx_spaced_repetition_user_next
  ON public.spaced_repetition(user_id, next_review_date);

-- 3. test_sessions: queried by user_id + status repeatedly across dashboard, recent-tests
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_status
  ON public.test_sessions(user_id, status);

-- 4. daily_question_answers: queried by user_id for daily history
CREATE INDEX IF NOT EXISTS idx_daily_question_answers_user
  ON public.daily_question_answers(user_id);

-- 5. test_answers: queried by session_id + is_correct for scoring
CREATE INDEX IF NOT EXISTS idx_test_answers_session_correct
  ON public.test_answers(session_id, is_correct);
