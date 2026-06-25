-- ============================================================
-- Announcements System
-- ============================================================

create table if not exists public.announcements (
  id              uuid primary key default gen_random_uuid(),
  type            text not null default 'info' check (type in ('info', 'warning', 'success', 'alert')),
  message         text not null,
  audience        text not null default 'all' check (audience in ('all', 'free', 'pro')),
  show_on         text not null default 'dashboard' check (show_on in ('dashboard', 'all_pages', 'specific')),
  specific_page   text,
  cta_text        text,
  cta_url         text,
  is_dismissible  boolean not null default true,
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes
create index if not exists idx_announcements_active on public.announcements(is_active);
create index if not exists idx_announcements_expires on public.announcements(expires_at);

-- Updated-at trigger
create trigger trg_announcements_updated_at
  before update on public.announcements
  for each row
  execute function public.set_updated_at();

-- Row Level Security
alter table public.announcements enable row level security;

create policy "Announcements are readable by all authenticated users"
  on public.announcements for select
  to authenticated
  using (true);

create policy "Admins can insert announcements"
  on public.announcements for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update announcements"
  on public.announcements for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can delete announcements"
  on public.announcements for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
