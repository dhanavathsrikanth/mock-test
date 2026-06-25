-- ============================================================
-- Question Report System
-- Adds reporting, correction tracking, and admin management
-- ============================================================

-- 0. Custom enum types
create type report_type as enum (
  'wrong_answer', 'unclear_question', 'typo_error',
  'wrong_options', 'outdated_content', 'other'
);

create type report_status as enum (
  'pending', 'under_review', 'resolved', 'rejected'
);

create type admin_role as enum ('admin', 'moderator');

-- 1. question_reports
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

-- 2. question_corrections
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

-- 3. admin_profiles
create table if not exists public.admin_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade unique,
  role        admin_role not null,
  created_at  timestamptz not null default now()
);

-- 4. Indexes
create index if not exists idx_question_reports_status      on public.question_reports(status);
create index if not exists idx_question_reports_question_id on public.question_reports(question_id);
create index if not exists idx_question_reports_reported_by on public.question_reports(reported_by);

-- 5. Updated-at trigger for question_reports
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_question_reports_updated_at
  before update on public.question_reports
  for each row
  execute function public.set_updated_at();

-- 6. Row Level Security
alter table public.question_reports     enable row level security;
alter table public.question_corrections enable row level security;
alter table public.admin_profiles       enable row level security;

-- ── question_reports policies ────────────────────────────────
create policy "Users can insert their own reports"
  on public.question_reports for insert
  to authenticated
  with check (reported_by = auth.uid());

create policy "Users can select their own reports"
  on public.question_reports for select
  to authenticated
  using (reported_by = auth.uid());

create policy "Admins can select all reports"
  on public.question_reports for select
  to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

create policy "Admins can update reports"
  on public.question_reports for update
  to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── question_corrections policies ────────────────────────────
create policy "Admins can insert corrections"
  on public.question_corrections for insert
  to authenticated
  with check (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

create policy "All authenticated users can view corrections"
  on public.question_corrections for select
  to authenticated
  using (true);

-- ── admin_profiles policies ──────────────────────────────────
create policy "Only admins can view admin_profiles"
  on public.admin_profiles for select
  to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

create policy "Allow first admin bootstrap"
  on public.admin_profiles for insert
  to authenticated
  with check (not exists (select 1 from public.admin_profiles));

-- 7. Database function: get_report_stats()
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
