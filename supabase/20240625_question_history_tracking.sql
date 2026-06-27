-- ============================================================
-- Question History Tracking — Prevent repeated questions in mock tests
-- ============================================================

-- 1. user_question_history: tracks which questions each user has seen in tests
create table if not exists public.user_question_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  seen_at     timestamptz not null default now(),
  unique (user_id, question_id)
);

create index idx_user_question_history_user_id on public.user_question_history(user_id);
create index idx_user_question_history_question_id on public.user_question_history(question_id);

-- 2. Enable RLS
alter table public.user_question_history enable row level security;

-- 3. RLS policies: own data only
create policy "Users can insert their own question history"
  on public.user_question_history for insert
  to authenticated
  with check (user_id = (auth.jwt()->>'sub')::uuid);

create policy "Users can read their own question history"
  on public.user_question_history for select
  to authenticated
  using (user_id = (auth.jwt()->>'sub')::uuid);

-- 4. Backfill existing test history (one-time migration)
-- This records all questions users have already seen from completed/in_progress tests
insert into public.user_question_history (user_id, question_id, seen_at)
select distinct ts.user_id, ta.question_id, ts.started_at
from public.test_sessions ts
join public.test_answers ta on ta.session_id = ts.id
on conflict (user_id, question_id) do nothing;
