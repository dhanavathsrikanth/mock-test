-- ============================================================
-- Supabase SQL Schema — TGPSC Mock Test App
-- Clerk as third-party auth provider
-- ============================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- 1. exams
create table if not exists public.exams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  full_name   text not null,
  category    text not null default 'Engineering',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2. subjects
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams(id) on delete cascade,
  name       text not null,
  slug       text not null,
  created_at timestamptz not null default now()
);

create index idx_subjects_exam_id on public.subjects(exam_id);

-- 3. questions
create table if not exists public.questions (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references public.exams(id) on delete cascade,
  subject_id     uuid not null references public.subjects(id) on delete cascade,
  year           integer,
  paper          text,
  question_text  text not null,
  option_1       text not null,
  option_2       text not null,
  option_3       text not null,
  option_4       text not null,
  correct_option integer not null check (correct_option between 1 and 4),
  explanation    text,
  difficulty     text check (difficulty in ('easy', 'medium', 'hard')),
  created_at     timestamptz not null default now()
);

create index idx_questions_exam_id    on public.questions(exam_id);
create index idx_questions_subject_id on public.questions(subject_id);
create index idx_questions_year       on public.questions(year);
create index idx_questions_paper      on public.questions(paper);

-- 4. profiles (Clerk user id — text, no FK to auth.users)
create table if not exists public.profiles (
  id             text primary key,
  full_name      text not null,
  email          text not null,
  target_exam_id uuid references public.exams(id) on delete set null,
  avatar_url     text,
  xp             integer not null default 0,
  created_at     timestamptz not null default now()
);

-- 5. test_sessions
create table if not exists public.test_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null references public.profiles(id) on delete cascade,
  exam_id          uuid not null references public.exams(id) on delete cascade,
  subject_id       uuid references public.subjects(id) on delete set null,
  year             integer,
  mode             text not null check (mode in ('full_mock', 'topic_wise', 'custom')),
  total_questions  integer not null,
  duration_minutes integer not null,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  status           text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned'))
);

create index idx_test_sessions_user_id  on public.test_sessions(user_id);
create index idx_test_sessions_exam_id  on public.test_sessions(exam_id);
create index idx_test_sessions_status   on public.test_sessions(status);

-- 6. test_answers
create table if not exists public.test_answers (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.test_sessions(id) on delete cascade,
  question_id       uuid not null references public.questions(id) on delete cascade,
  selected_option   integer check (selected_option between 1 and 4),
  is_correct        boolean,
  is_bookmarked     boolean not null default false,
  time_spent_seconds integer,
  unique (session_id, question_id)
);

create index idx_test_answers_session_id  on public.test_answers(session_id);

-- 7. bookmarks
create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, question_id)
);

create index idx_bookmarks_user_id on public.bookmarks(user_id);

-- 8. streaks
create table if not exists public.streaks (
  user_id           text primary key references public.profiles(id) on delete cascade,
  current_streak    integer not null default 0,
  longest_streak    integer not null default 0,
  freeze_tokens     integer not null default 1,
  last_activity_date date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 9. user_badges
create table if not exists public.user_badges (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references public.profiles(id) on delete cascade,
  badge_type      text not null check (badge_type in ('week_warrior', 'iron_will')),
  unlocked_at     timestamptz not null default now(),
  streak_at_unlock integer not null
);

create index idx_user_badges_user_id on public.user_badges(user_id);

-- ============================================================
-- Row Level Security (Clerk third-party auth)
-- auth.jwt()->>'sub' returns the Clerk user ID (text)
-- ============================================================

alter table public.exams         enable row level security;
alter table public.subjects      enable row level security;
alter table public.questions     enable row level security;
alter table public.profiles      enable row level security;
alter table public.test_sessions enable row level security;
alter table public.test_answers  enable row level security;
alter table public.bookmarks     enable row level security;
alter table public.streaks       enable row level security;
alter table public.user_badges   enable row level security;

-- ── exams: readable by all authenticated users ──────────────
create policy "Exams are readable by all authenticated users"
  on public.exams for select
  to authenticated
  using (true);

-- ── subjects: readable by all authenticated users ───────────
create policy "Subjects are readable by all authenticated users"
  on public.subjects for select
  to authenticated
  using (true);

-- ── questions: readable by all authenticated users ──────────
create policy "Questions are readable by all authenticated users"
  on public.questions for select
  to authenticated
  using (true);

-- ── profiles: own data only ─────────────────────────────────
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (auth.jwt()->>'sub'));

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (auth.jwt()->>'sub'));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (auth.jwt()->>'sub'))
  with check (id = (auth.jwt()->>'sub'));

create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (id = (auth.jwt()->>'sub'));

-- ── test_sessions: own data only ────────────────────────────
create policy "Users can insert their own sessions"
  on public.test_sessions for insert
  to authenticated
  with check (user_id = (auth.jwt()->>'sub'));

create policy "Users can read their own sessions"
  on public.test_sessions for select
  to authenticated
  using (user_id = (auth.jwt()->>'sub'));

create policy "Users can update their own sessions"
  on public.test_sessions for update
  to authenticated
  using (user_id = (auth.jwt()->>'sub'))
  with check (user_id = (auth.jwt()->>'sub'));

create policy "Users can delete their own sessions"
  on public.test_sessions for delete
  to authenticated
  using (user_id = (auth.jwt()->>'sub'));

-- ── test_answers: own data via session ownership ────────────
create policy "Users can insert answers for their sessions"
  on public.test_answers for insert
  to authenticated
  with check (
    exists (
      select 1 from public.test_sessions
      where id = session_id and user_id = (auth.jwt()->>'sub')
    )
  );

create policy "Users can read answers for their sessions"
  on public.test_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.test_sessions
      where id = session_id and user_id = (auth.jwt()->>'sub')
    )
  );

create policy "Users can update answers for their sessions"
  on public.test_answers for update
  to authenticated
  using (
    exists (
      select 1 from public.test_sessions
      where id = session_id and user_id = (auth.jwt()->>'sub')
    )
  )
  with check (
    exists (
      select 1 from public.test_sessions
      where id = session_id and user_id = (auth.jwt()->>'sub')
    )
  );

create policy "Users can delete answers for their sessions"
  on public.test_answers for delete
  to authenticated
  using (
    exists (
      select 1 from public.test_sessions
      where id = session_id and user_id = (auth.jwt()->>'sub')
    )
  );

-- ── bookmarks: own data only ────────────────────────────────
create policy "Users can insert their own bookmarks"
  on public.bookmarks for insert
  to authenticated
  with check (user_id = (auth.jwt()->>'sub'));

create policy "Users can read their own bookmarks"
  on public.bookmarks for select
  to authenticated
  using (user_id = (auth.jwt()->>'sub'));

create policy "Users can delete their own bookmarks"
  on public.bookmarks for delete
  to authenticated
  using (user_id = (auth.jwt()->>'sub'));

-- ── streaks: own data only ──────────────────────────────────
create policy "Users can insert their own streak"
  on public.streaks for insert
  to authenticated
  with check (user_id = (auth.jwt()->>'sub'));

create policy "Users can read their own streak"
  on public.streaks for select
  to authenticated
  using (user_id = (auth.jwt()->>'sub'));

create policy "Users can update their own streak"
  on public.streaks for update
  to authenticated
  using (user_id = (auth.jwt()->>'sub'))
  with check (user_id = (auth.jwt()->>'sub'));

-- ── user_badges: own data only ──────────────────────────────
create policy "Users can read their own badges"
  on public.user_badges for select
  to authenticated
  using (user_id = (auth.jwt()->>'sub'));

-- ============================================================
-- Seed: TSPSC AEE Civil (current active exam)
-- ============================================================

insert into public.exams (name, full_name, category, is_active)
values ('TSPSC AEE', 'Telangana State Public Service Commission Assistant Executive Engineer', 'Engineering', true);

-- Subjects for TSPSC AEE Civil
do $$
declare
  v_exam_id uuid;
begin
  select id into v_exam_id from public.exams where name = 'TSPSC AEE';

  insert into public.subjects (exam_id, name, slug) values
    (v_exam_id, 'Fluid Mechanics',     'fluid-mechanics'),
    (v_exam_id, 'Solid Mechanics',     'solid-mechanics'),
    (v_exam_id, 'Structural Analysis', 'structural-analysis'),
    (v_exam_id, 'RCC Design',          'rcc-design'),
    (v_exam_id, 'Steel Design',        'steel-design'),
    (v_exam_id, 'Geotechnical Engg',   'geotechnical-engg'),
    (v_exam_id, 'Environmental Engg',  'environmental-engg'),
    (v_exam_id, 'Water Resources Engg','water-resources-engg'),
    (v_exam_id, 'Transportation Engg', 'transportation-engg'),
    (v_exam_id, 'Surveying',           'surveying'),
    (v_exam_id, 'Construction Mgmt',   'construction-mgmt'),
    (v_exam_id, 'General Studies',     'general-studies');
end;
$$;
