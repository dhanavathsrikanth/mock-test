-- ============================================================
-- Complete Supabase Database Dump — TGPSC Mock Test App
-- Generated from project: ykevvwdieqprmkoevgtw
-- Contains: schema, data, functions, triggers, RLS policies
-- Run this in the new project's SQL Editor
-- ============================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. Custom Enum Types
-- ============================================================
create type report_type as enum (
  'wrong_answer', 'unclear_question', 'typo_error',
  'wrong_options', 'outdated_content', 'other'
);

create type report_status as enum (
  'pending', 'under_review', 'resolved', 'rejected'
);

create type admin_role as enum ('admin', 'moderator');

-- ============================================================
-- 2. Tables
-- ============================================================

-- 2a. exams
create table if not exists public.exams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  full_name   text not null,
  category    text not null default 'Engineering',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2b. subjects
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams(id) on delete cascade,
  name       text not null,
  slug       text not null,
  created_at timestamptz not null default now()
);

-- 2c. topics
create table if not exists public.topics (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  parent_id   uuid references public.topics(id) on delete set null,
  name        text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 2d. questions
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
  created_at     timestamptz not null default now(),
  topic_id       uuid references public.topics(id) on delete set null
);

-- 2e. profiles
create table if not exists public.profiles (
  id             uuid primary key,
  full_name      text not null,
  email          text not null,
  target_exam_id uuid references public.exams(id) on delete set null,
  avatar_url     text,
  xp             integer not null default 0,
  created_at     timestamptz not null default now(),
  role           text not null default 'user' check (role in ('user', 'admin'))
);

-- 2f. test_sessions
create table if not exists public.test_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
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

-- 2g. test_answers
create table if not exists public.test_answers (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.test_sessions(id) on delete cascade,
  question_id        uuid not null references public.questions(id) on delete cascade,
  selected_option    integer check (selected_option between 1 and 4),
  is_correct         boolean,
  is_bookmarked      boolean not null default false,
  time_spent_seconds integer,
  unique (session_id, question_id)
);

-- 2h. bookmarks
create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, question_id)
);

-- 2i. streaks
create table if not exists public.streaks (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  current_streak     integer not null default 0,
  longest_streak     integer not null default 0,
  freeze_tokens      integer not null default 1,
  last_activity_date date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 2j. user_badges
create table if not exists public.user_badges (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  badge_type       text not null check (badge_type in ('week_warrior', 'iron_will')),
  unlocked_at      timestamptz not null default now(),
  streak_at_unlock integer not null
);

-- 2k. push_subscriptions
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null unique,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);

-- 2l. xp_transactions
create table if not exists public.xp_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     integer not null,
  reason     text not null,
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- 2m. user_levels
create table if not exists public.user_levels (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  total_xp      integer not null default 0,
  current_level integer not null default 0,
  level_name    text not null default 'Trainee',
  updated_at    timestamptz not null default now()
);

-- 2n. notification_preferences
create table if not exists public.notification_preferences (
  user_id             text primary key,
  daily_reminder      boolean default true,
  streak_alert        boolean default true,
  daily_question_alert boolean default true,
  exam_date_alert     boolean default true,
  reminder_time       text default '08:00',
  updated_at          timestamptz default now()
);

-- 2o. spaced_repetition
create table if not exists public.spaced_repetition (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  question_id       uuid not null references public.questions(id) on delete cascade,
  interval_days     integer not null default 0,
  ease_factor       real not null default 2.5,
  repetition_count  integer not null default 0,
  next_review_date  date not null,
  last_reviewed_at  timestamptz,
  created_at        timestamptz not null default now()
);

-- 2p. daily_questions
create table if not exists public.daily_questions (
  id             uuid primary key default gen_random_uuid(),
  question_id    uuid not null references public.questions(id) on delete cascade,
  assigned_date  date not null unique,
  created_at     timestamptz not null default now()
);

-- 2q. daily_question_answers
create table if not exists public.daily_question_answers (
  id                uuid primary key default gen_random_uuid(),
  daily_question_id uuid not null references public.daily_questions(id) on delete cascade,
  user_id           text not null,
  selected_option   integer not null check (selected_option >= 1 and selected_option <= 4),
  is_correct        boolean,
  created_at        timestamptz not null default now()
);

-- 2r. exam_countdown
create table if not exists public.exam_countdown (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid references public.exams(id) on delete set null,
  label       text not null default 'TGPSC AEE 2025 Exam',
  exam_date   date not null,
  is_official boolean default false,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- 2s. question_reports
create table if not exists public.question_reports (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references public.questions(id) on delete cascade,
  reported_by   uuid not null references public.profiles(id) on delete cascade,
  report_type   report_type not null,
  description   text check (char_length(description) <= 500),
  status        report_status not null default 'pending',
  admin_note    text,
  resolved_by   uuid references public.profiles(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2t. question_corrections
create table if not exists public.question_corrections (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references public.questions(id) on delete cascade,
  report_id       uuid not null references public.question_reports(id) on delete cascade,
  corrected_by    uuid not null references public.profiles(id) on delete cascade,
  field_changed   text not null,
  old_value       text not null,
  new_value       text not null,
  created_at      timestamptz not null default now()
);

-- 2u. admin_profiles
create table if not exists public.admin_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade unique,
  role        admin_role not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 3. Indexes
-- ============================================================
create index if not exists idx_subjects_exam_id on public.subjects(exam_id);
create index if not exists idx_questions_exam_id on public.questions(exam_id);
create index if not exists idx_questions_subject_id on public.questions(subject_id);
create index if not exists idx_questions_year on public.questions(year);
create index if not exists idx_questions_paper on public.questions(paper);
create index if not exists idx_test_sessions_user_id on public.test_sessions(user_id);
create index if not exists idx_test_sessions_exam_id on public.test_sessions(exam_id);
create index if not exists idx_test_sessions_status on public.test_sessions(status);
create index if not exists idx_test_answers_session_id on public.test_answers(session_id);
create index if not exists idx_bookmarks_user_id on public.bookmarks(user_id);
create index if not exists idx_user_badges_user_id on public.user_badges(user_id);
create index if not exists idx_question_reports_status on public.question_reports(status);
create index if not exists idx_question_reports_question_id on public.question_reports(question_id);
create index if not exists idx_question_reports_reported_by on public.question_reports(reported_by);

-- ============================================================
-- 4. Functions
-- ============================================================

-- 4a. set_updated_at — utility for trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 4b. handle_new_user — auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4c. is_admin — check if current user has admin role
create or replace function public.is_admin()
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 4d. get_report_stats — admin dashboard stats
create or replace function public.get_report_stats()
returns table (
  total_pending           bigint,
  total_under_review      bigint,
  total_resolved_this_week bigint,
  total_rejected          bigint,
  most_reported_subject   text
)
language plpgsql stable
as $$
declare
  v_total_pending           bigint;
  v_total_under_review      bigint;
  v_total_resolved_this_week bigint;
  v_total_rejected          bigint;
  v_most_reported_subject   text;
begin
  select count(*) into v_total_pending
  from public.question_reports where status = 'pending';

  select count(*) into v_total_under_review
  from public.question_reports where status = 'under_review';

  select count(*) into v_total_resolved_this_week
  from public.question_reports
  where status = 'resolved'
    and resolved_at >= date_trunc('week', now());

  select count(*) into v_total_rejected
  from public.question_reports where status = 'rejected';

  select s.name into v_most_reported_subject
  from public.question_reports qr
  join public.questions q on qr.question_id = q.id
  join public.subjects s  on q.subject_id = s.id
  group by s.id, s.name
  order by count(*) desc
  limit 1;

  return query
  select
    v_total_pending,
    v_total_under_review,
    v_total_resolved_this_week,
    v_total_rejected,
    v_most_reported_subject;
end;
$$;

-- ============================================================
-- 5. Triggers
-- ============================================================

create trigger trg_question_reports_updated_at
  before update on public.question_reports
  for each row
  execute function public.set_updated_at();

-- Auto-create profile trigger (uncomment if auth.users schema trigger is needed)
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row
--   execute function public.handle_new_user();

-- ============================================================
-- 6. Row Level Security
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
alter table public.topics        enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.xp_transactions     enable row level security;
alter table public.user_levels         enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.spaced_repetition   enable row level security;
alter table public.daily_questions     enable row level security;
alter table public.daily_question_answers enable row level security;
alter table public.exam_countdown      enable row level security;
alter table public.question_reports    enable row level security;
alter table public.question_corrections enable row level security;
alter table public.admin_profiles      enable row level security;

-- ── exams ──
create policy "Exams are readable by all authenticated users"
  on public.exams for select to authenticated using (true);

-- ── subjects ──
create policy "Subjects are readable by all authenticated users"
  on public.subjects for select to authenticated using (true);

-- ── questions ──
create policy "Questions are readable by all authenticated users"
  on public.questions for select to authenticated using (true);

-- ── topics ──
create policy "Topics are readable by all authenticated users"
  on public.topics for select to authenticated using (true);

-- ── exam_countdown ──
create policy "Exam countdown is readable by all authenticated users"
  on public.exam_countdown for select to authenticated using (true);

-- ── profiles ──
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (id = (auth.jwt()->>'sub'));

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (auth.jwt()->>'sub'));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (auth.jwt()->>'sub'))
  with check (id = (auth.jwt()->>'sub'));

create policy "Users can delete their own profile"
  on public.profiles for delete to authenticated
  using (id = (auth.jwt()->>'sub'));

-- ── test_sessions ──
create policy "Users can insert their own sessions"
  on public.test_sessions for insert to authenticated
  with check (user_id = (auth.jwt()->>'sub'));

create policy "Users can read their own sessions"
  on public.test_sessions for select to authenticated
  using (user_id = (auth.jwt()->>'sub'));

create policy "Users can update their own sessions"
  on public.test_sessions for update to authenticated
  using (user_id = (auth.jwt()->>'sub'))
  with check (user_id = (auth.jwt()->>'sub'));

create policy "Users can delete their own sessions"
  on public.test_sessions for delete to authenticated
  using (user_id = (auth.jwt()->>'sub'));

-- ── test_answers ──
create policy "Users can insert answers for their sessions"
  on public.test_answers for insert to authenticated
  with check (
    exists (
      select 1 from public.test_sessions
      where id = session_id and user_id = (auth.jwt()->>'sub')
    )
  );

create policy "Users can read answers for their sessions"
  on public.test_answers for select to authenticated
  using (
    exists (
      select 1 from public.test_sessions
      where id = session_id and user_id = (auth.jwt()->>'sub')
    )
  );

create policy "Users can update answers for their sessions"
  on public.test_answers for update to authenticated
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
  on public.test_answers for delete to authenticated
  using (
    exists (
      select 1 from public.test_sessions
      where id = session_id and user_id = (auth.jwt()->>'sub')
    )
  );

-- ── bookmarks ──
create policy "Users can insert their own bookmarks"
  on public.bookmarks for insert to authenticated
  with check (user_id = (auth.jwt()->>'sub'));

create policy "Users can read their own bookmarks"
  on public.bookmarks for select to authenticated
  using (user_id = (auth.jwt()->>'sub'));

create policy "Users can delete their own bookmarks"
  on public.bookmarks for delete to authenticated
  using (user_id = (auth.jwt()->>'sub'));

-- ── streaks ──
create policy "Users can insert their own streak"
  on public.streaks for insert to authenticated
  with check (user_id = (auth.jwt()->>'sub'));

create policy "Users can read their own streak"
  on public.streaks for select to authenticated
  using (user_id = (auth.jwt()->>'sub'));

create policy "Users can update their own streak"
  on public.streaks for update to authenticated
  using (user_id = (auth.jwt()->>'sub'))
  with check (user_id = (auth.jwt()->>'sub'));

-- ── user_badges ──
create policy "Users can read their own badges"
  on public.user_badges for select to authenticated
  using (user_id = (auth.jwt()->>'sub'));

-- ── question_reports ──
create policy "Users can insert their own reports"
  on public.question_reports for insert to authenticated
  with check (reported_by = auth.uid());

create policy "Users can select their own reports"
  on public.question_reports for select to authenticated
  using (reported_by = auth.uid());

create policy "Admins can select all reports"
  on public.question_reports for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

create policy "Admins can update reports"
  on public.question_reports for update to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── question_corrections ──
create policy "Admins can insert corrections"
  on public.question_corrections for insert to authenticated
  with check (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

create policy "All authenticated users can view corrections"
  on public.question_corrections for select to authenticated
  using (true);

-- ── admin_profiles ──
create policy "Only admins can view admin_profiles"
  on public.admin_profiles for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

create policy "Allow first admin bootstrap"
  on public.admin_profiles for insert to authenticated
  with check (not exists (select 1 from public.admin_profiles));

-- ============================================================
-- 7. Data: exams
-- ============================================================
insert into public.exams (id, name, full_name, category, is_active, created_at) values
  ('e33338c9-740c-48c4-914b-2cca3e9c1668', 'TSPSC AEE', 'Telangana State Public Service Commission Assistant Executive Engineer', 'Engineering', true, '2026-06-23T17:02:34.653624+00:00');

-- ============================================================
-- 8. Data: subjects
-- ============================================================
insert into public.subjects (id, exam_id, name, slug, created_at) values
  ('a8556419-0986-4502-80b2-78b7defb8990', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Fluid Mechanics',     'fluid-mechanics',     '2026-06-23T17:02:34.653624+00:00'),
  ('dd2eab18-a6c2-4636-a005-1f9ea9aef419', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Solid Mechanics',     'solid-mechanics',     '2026-06-23T17:02:34.653624+00:00'),
  ('decbbdf0-3513-4574-b4ab-87507e684e56', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Structural Analysis', 'structural-analysis', '2026-06-23T17:02:34.653624+00:00'),
  ('e7eaeaa0-d839-4490-abed-c71027b61424', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'RCC Design',          'rcc-design',          '2026-06-23T17:02:34.653624+00:00'),
  ('cd7b170d-eba3-4a13-8b23-3c318071b538', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Steel Design',        'steel-design',        '2026-06-23T17:02:34.653624+00:00'),
  ('c39bc91d-4a88-42c6-b1f7-ae4fc2b0dba1', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Geotechnical Engg',   'geotechnical-engg',   '2026-06-23T17:02:34.653624+00:00'),
  ('c542f294-548d-4129-8d45-b3f75629dc1b', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Environmental Engg',  'environmental-engg',  '2026-06-23T17:02:34.653624+00:00'),
  ('64289b52-861b-4a49-9286-4c4196691af7', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Water Resources Engg','water-resources-engg','2026-06-23T17:02:34.653624+00:00'),
  ('637bf719-8dde-4035-946c-4242372328e2', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Transportation Engg', 'transportation-engg', '2026-06-23T17:02:34.653624+00:00'),
  ('3f275622-18e3-40ce-a134-ec660b48190c', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Surveying',           'surveying',           '2026-06-23T17:02:34.653624+00:00'),
  ('ef2aafdf-55ff-4b21-bbdd-ae20229236be', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Construction Mgmt',   'construction-mgmt',   '2026-06-23T17:02:34.653624+00:00'),
  ('aa8d32e0-c642-49ea-934c-af0f7fd9986a', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'General Studies',     'general-studies',     '2026-06-23T17:02:34.653624+00:00'),
  ('a3efd61d-542a-4076-8ffe-631b227f0239', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'Building Materials',  'building-materials',  '2026-06-23T17:12:41.342817+00:00');

-- ============================================================
-- 9. Data: topics
-- ============================================================
insert into public.topics (id, subject_id, parent_id, name, description, sort_order, created_at) values
  -- Construction Mgmt
  ('ceeb41ce-e9c6-4425-8cef-18750caa8c07', 'ef2aafdf-55ff-4b21-bbdd-ae20229236be', null, 'Estimation',             'Abstract & detailed, centre-line method, long-wall method, earthwork computation, plinth area method', 1, '2026-06-23T17:12:41.342817+00:00'),
  ('0972b498-bcfb-4055-9ae6-3688b5f3c432', 'ef2aafdf-55ff-4b21-bbdd-ae20229236be', null, 'Costing',                'Rate analysis, standard schedule of rates, lead & lift, lead statements', 2, '2026-06-23T17:12:41.342817+00:00'),
  ('ca4813a8-f130-47d9-b404-5f7c8ac1df86', 'ef2aafdf-55ff-4b21-bbdd-ae20229236be', null, 'Construction Management', 'Specifications, management principles', 3, '2026-06-23T17:12:41.342817+00:00'),
  -- Structural Analysis
  ('f3d692c1-91a4-4a8b-acc5-2b44896f704f', 'decbbdf0-3513-4574-b4ab-87507e684e56', null, 'Theory of Structures',   'Direct & bending stresses, columns, strain energy, moving loads, arches, suspension bridges, indeterminacy, moment distribution, slope deflection, Kani method, matrix methods', 1, '2026-06-23T17:12:41.342817+00:00'),
  -- Surveying
  ('f28c858a-cf0c-482e-a112-8845927e82f4', '3f275622-18e3-40ce-a134-ec660b48190c', null, 'Surveying',              'Principles, chain, compass, levelling, contouring, theodolite, curves, EDM, total station, GIS, GPS', 1, '2026-06-23T17:12:41.342817+00:00'),
  -- General Studies
  ('5c486b4c-2cbe-48b1-86ea-e596a5ae2a5b', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Current Affairs',                       'Regional, National and International', 1, '2026-06-23T17:24:16.253221+00:00'),
  ('a5c1ab1e-eaa7-4605-8835-fe868d38e188', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'International Relations and Events',    '', 2, '2026-06-23T17:24:16.253221+00:00'),
  ('7edb952a-3e62-4418-a9ca-56c0d12d7cf7', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'General Science & Technology',          'India Achievements in Science and Technology', 3, '2026-06-23T17:24:16.253221+00:00'),
  ('77c5bae1-6709-42b9-b4db-a4e079fc6640', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Environment & Disaster Management',     'Environmental issues; Disaster Management - Prevention and Mitigation Strategies', 4, '2026-06-23T17:24:16.253221+00:00'),
  ('3e74357f-d7ad-4652-8435-eaa0f7cdfef6', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Economic & Social Development',         'Economic and Social Development of India and Telangana', 5, '2026-06-23T17:24:16.253221+00:00'),
  ('e587b482-1005-40dc-b6dd-3d9c2119a753', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Geography of India',                    'Physical, Social and Economic Geography of India', 6, '2026-06-23T17:24:16.253221+00:00'),
  ('fece8020-1cd0-4cd3-ab7d-23d1da0243f9', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Geography of Telangana',                'Physical, Social and Economic Geography and Demography of Telangana', 7, '2026-06-23T17:24:16.253221+00:00'),
  ('13bcf297-a2d4-4044-adfe-c24a66531e41', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Modern Indian History',                  'Socio-economic, Political and Cultural History of Modern India with special emphasis on Indian National Movement', 8, '2026-06-23T17:24:16.253221+00:00'),
  ('385bbfda-8fa8-4d58-98a8-7b26d3a3c13b', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'History of Telangana',                   'Socio-economic, Political and Cultural History of Telangana with special emphasis on Telangana Statehood Movement and formation of Telangana state', 9, '2026-06-23T17:24:16.253221+00:00'),
  ('cee34a01-cf1d-4a36-8c58-9f3bc9960035', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Indian Constitution & Polity',           'Indian Constitution; Indian Political System; Governance and Public Policy', 10, '2026-06-23T17:24:16.253221+00:00'),
  ('2a7d8d9f-9f16-41fd-be1a-2dfd51462e39', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Social Exclusion & Inclusive Policies',  'Rights issues such as Gender, Caste, Tribe, Disability etc. and inclusive policies', 11, '2026-06-23T17:24:16.253221+00:00'),
  ('c14a6349-1631-4eb0-8302-f2c798195166', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Telangana Culture & Heritage',           'Society, Culture, Heritage, Arts and Literature of Telangana', 12, '2026-06-23T17:24:16.253221+00:00'),
  ('63f54208-07b4-4014-b501-f8691de5e2c1', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Policies of Telangana State',            '', 13, '2026-06-23T17:24:16.253221+00:00'),
  ('49d95aaf-8616-4a23-8440-a9f57bc710c9', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Logical Reasoning & Data Interpretation','Logical Reasoning; Analytical Ability and Data Interpretation', 14, '2026-06-23T17:24:16.253221+00:00'),
  ('66a94591-334c-4e5c-b867-b27aef0c72ec', 'aa8d32e0-c642-49ea-934c-af0f7fd9986a', null, 'Basic English',                         '10th Class Standard', 15, '2026-06-23T17:24:16.253221+00:00'),
  -- RCC Design
  ('1bba627d-75a7-47e9-8413-f09905572b33', 'e7eaeaa0-d839-4490-abed-c71027b61424', null, 'RCC Structures',       'Working stress, limit state, beams, slabs, columns, footings, shear, torsion, retaining walls, water tanks, yield line theory', 1, '2026-06-23T17:12:41.342817+00:00'),
  ('385e0a26-4498-4274-ac08-fb3af47b1ad2', 'e7eaeaa0-d839-4490-abed-c71027b61424', null, 'Pre-stressed Concrete', 'Basic concepts, losses, systems, analysis of PSC sections', 2, '2026-06-23T17:12:41.342817+00:00'),
  -- Steel Design
  ('63b1aa41-9022-4bff-b5b8-0aa71ec874fd', 'cd7b170d-eba3-4a13-8b23-3c318071b538', null, 'Steel Structures', 'Properties of steel, connections, beams, columns, column bases, roof trusses, plate girders, gantry girders, railway bridges, plastic analysis', 1, '2026-06-23T17:12:41.342817+00:00'),
  -- Fluid Mechanics
  ('315ecc01-24f7-4b37-a608-fd8fbb7ef30e', 'a8556419-0986-4502-80b2-78b7defb8990', null, 'Fluid Mechanics', 'Fluid properties, kinematics, dynamics, Bernoulli, pipe flow, compressible flow, boundary layer, dimensional analysis', 1, '2026-06-23T17:12:41.342817+00:00'),
  ('ec71764c-6040-47e0-bbc1-9777aafbeec7', 'a8556419-0986-4502-80b2-78b7defb8990', null, 'Hydraulics',      'Open channel flow, gradually varied flow, hydraulic jump, surges, turbines, centrifugal pumps', 2, '2026-06-23T17:12:41.342817+00:00'),
  -- Water Resources Engg
  ('9b40396e-3ed0-47ab-b981-52f6a8e6cdd3', '64289b52-861b-4a49-9286-4c4196691af7', null, 'Hydrology',                'Hydrological cycle, rainfall, infiltration, runoff, floods, hydrographs, groundwater', 1, '2026-06-23T17:12:41.342817+00:00'),
  ('466ae85d-fb09-4845-8324-5fd0d29ca1fd', '64289b52-861b-4a49-9286-4c4196691af7', null, 'Water Resources Engineering', 'Irrigation, duty/delta, dams, spillways, canals, weirs, seepage theories, canal falls, cross drainage works, hydropower', 2, '2026-06-23T17:12:41.342817+00:00'),
  -- Environmental Engg
  ('5005286a-c8a9-4f38-a12f-46a61fd65689', 'c542f294-548d-4129-8d45-b3f75629dc1b', null, 'Water Supply Engineering',  'Demand, treatment, distribution, Hardy Cross method', 1, '2026-06-23T17:12:41.342817+00:00'),
  ('309a5082-9ce4-4f4e-9d68-9a9ac706dd49', 'c542f294-548d-4129-8d45-b3f75629dc1b', null, 'Wastewater Engineering',   'Sewerage, BOD/COD, treatment units, disposal', 2, '2026-06-23T17:12:41.342817+00:00'),
  ('5e4f407e-7ce5-4934-9808-c406a1df2083', 'c542f294-548d-4129-8d45-b3f75629dc1b', null, 'Solid Waste Management',   'Collection, transportation, disposal', 3, '2026-06-23T17:12:41.342817+00:00'),
  ('7395c294-a064-4c5a-adc1-cb722bd4bd22', 'c542f294-548d-4129-8d45-b3f75629dc1b', null, 'Air & Noise Pollution',    'Pollutants, standards, control', 4, '2026-06-23T17:12:41.342817+00:00'),
  -- Transportation Engg
  ('29d611e8-8d9c-48f0-85c3-621cccd58722', '637bf719-8dde-4035-946c-4242372328e2', null, 'Highway Engineering',  'Classification, alignment, geometric design, traffic studies, intersections, signals, pavement design', 1, '2026-06-23T17:12:41.342817+00:00'),
  ('0606d3ae-297d-4c7b-a1af-955e7476d082', '637bf719-8dde-4035-946c-4242372328e2', null, 'Railway Engineering',  'Permanent way, rails, sleepers, ballast, curves, points & crossings', 2, '2026-06-23T17:12:41.342817+00:00'),
  ('ac98a87f-3b16-43cf-8ac3-8e3c2ad53ea1', '637bf719-8dde-4035-946c-4242372328e2', null, 'Airport Engineering',  'Site selection, runway orientation, wind rose, corrections', 3, '2026-06-23T17:12:41.342817+00:00'),
  -- Solid Mechanics
  ('4002ff85-6eee-4cd3-8c35-1d7039df2745', 'dd2eab18-a6c2-4636-a005-1f9ea9aef419', null, 'Strength of Materials', 'Stresses, strains, elastic constants, BMD/SFD, torsion, deflection, springs, cylinders, trusses, shear centre', 1, '2026-06-23T17:12:41.342817+00:00'),
  -- Geotechnical Engg
  ('4c395c9a-2cad-4ea6-ac3d-b0b7bd1a4dee', 'c39bc91d-4a88-42c6-b1f7-ae4fc2b0dba1', null, 'Soil Mechanics',        'Properties, classification, permeability, capillarity, seepage, compaction, consolidation, shear strength, earth pressure, slope stability', 1, '2026-06-23T17:12:41.342817+00:00'),
  ('8dd2ff2a-1e16-4faf-9d4e-2144ed7bc3bd', 'c39bc91d-4a88-42c6-b1f7-ae4fc2b0dba1', null, 'Foundation Engineering', 'Bearing capacity, settlement, types of foundations, pile foundations, expansive soils, cofferdams, caissons, dewatering', 2, '2026-06-23T17:12:41.342817+00:00'),
  ('82ee8eac-79fd-487b-8070-753f9ce2ecae', 'c39bc91d-4a88-42c6-b1f7-ae4fc2b0dba1', null, 'Engineering Geology',    'Mineralogy, structural geology, groundwater exploration, applications for tunnels/dams, hazards', 3, '2026-06-23T17:12:41.342817+00:00'),
  -- Building Materials
  ('880c7ee1-0204-4a42-979f-338ca32f84be', 'a3efd61d-542a-4076-8ffe-631b227f0239', null, 'Building Materials',     'Bricks, Stones, Cement, Aggregates, Mortar, Concrete, Admixtures', 1, '2026-06-23T17:12:41.342817+00:00'),
  ('7fbea21c-2d47-4c90-b4df-54d590919d9c', 'a3efd61d-542a-4076-8ffe-631b227f0239', null, 'Construction Practices', 'Methods of quarrying, dressing, polishing, etc.', 2, '2026-06-23T17:12:41.342817+00:00');

-- ============================================================
-- 10. Data: profiles
-- Note: These reference Clerk auth user IDs (text, not UUID)
-- ============================================================
insert into public.profiles (id, full_name, email, target_exam_id, avatar_url, xp, role, created_at) values
  ('4efebc13-4ecb-4a26-85d1-c9fd505ff03d', 'elementofcode2023', 'elementofcode2023@gmail.com', null, null, 0, 'user',  '2026-06-24T01:44:23.616584+00:00'),
  ('7c703ee1-1f60-4316-88ee-084565cd3669', 'rathod965250',      'rathod965250@gmail.com',      null, null, 0, 'admin', '2026-06-23T18:17:18.240105+00:00');

-- ============================================================
-- 11. Data: test_sessions
-- ============================================================
insert into public.test_sessions (id, user_id, exam_id, subject_id, year, mode, total_questions, duration_minutes, started_at, completed_at, status) values
  ('0d67afc4-d084-47d4-b9fa-4b5ee3a565be', '7c703ee1-1f60-4316-88ee-084565cd3669', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'c542f294-548d-4129-8d45-b3f75629dc1b', null, 'topic_wise', 50, 50, '2026-06-23T18:18:34.005442+00:00', '2026-06-23T18:18:57.479+00:00', 'completed');

-- ============================================================
-- 12. Data: exam_countdown
-- ============================================================
insert into public.exam_countdown (id, exam_id, label, exam_date, is_official, is_active, created_at) values
  ('a6d5e40c-921c-4339-99c1-0936b690ce50', 'e33338c9-740c-48c4-914b-2cca3e9c1668', 'TGPSC AEE 2026 Exam', '2026-11-15', false, true, '2026-06-24T02:14:24.798432+00:00');

-- ============================================================
-- Note: The following tables exist but have no data:
--   questions, test_answers, bookmarks, streaks, user_badges,
--   push_subscriptions, xp_transactions, user_levels,
--   notification_preferences, spaced_repetition, daily_questions,
--   daily_question_answers, question_reports, question_corrections,
--   admin_profiles
-- ============================================================
