-- ============================================================
-- Admin Notifications & Cron Job Tracking System
-- ============================================================

-- 1. admin_notifications
create table if not exists public.admin_notifications (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  body            text,
  url             text default '/daily',
  audience_type   text not null default 'all',
  audience_filter jsonb default '{}',
  status          text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  sent_count      integer default 0,
  total_count     integer default 0,
  opened_count    integer default 0,
  clicked_count   integer default 0,
  sent_by         uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- 2. cron_job_logs
create table if not exists public.cron_job_logs (
  id          uuid primary key default gen_random_uuid(),
  job_name    text not null,
  status      text not null default 'pending' check (status in ('pending', 'running', 'success', 'failed')),
  started_at  timestamptz,
  finished_at timestamptz,
  message     text,
  created_at  timestamptz not null default now()
);

-- 3. Indexes
create index if not exists idx_admin_notifications_status on public.admin_notifications(status);
create index if not exists idx_admin_notifications_sent_at on public.admin_notifications(sent_at desc);
create index if not exists idx_cron_job_logs_job_name on public.cron_job_logs(job_name);
create index if not exists idx_cron_job_logs_started_at on public.cron_job_logs(started_at desc);

-- 4. Row Level Security
alter table public.admin_notifications enable row level security;
alter table public.cron_job_logs enable row level security;

-- admin_notifications policies
create policy "Admins can select all notifications"
  on public.admin_notifications for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert notifications"
  on public.admin_notifications for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update notifications"
  on public.admin_notifications for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can delete notifications"
  on public.admin_notifications for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- cron_job_logs policies
create policy "Admins can select cron logs"
  on public.cron_job_logs for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert cron logs"
  on public.cron_job_logs for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update cron logs"
  on public.cron_job_logs for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
