begin;
-- The inbox service already uses these V2 fields. Upgrade the legacy table
-- additively, preserving existing messages, read flags and RLS policies.
alter table public.notifications
  add column if not exists deep_link_url text,
  add column if not exists image_url text,
  add column if not exists read_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists status text not null default 'delivered'
    check (status in ('pending','delivered','failed','archived','deleted','scheduled','expired')),
  add column if not exists priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  add column if not exists channel text not null default 'in_app'
    check (channel in ('in_app','push','email')),
  add column if not exists group_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists expires_at timestamptz,
  add column if not exists retry_count integer not null default 0 check (retry_count>=0),
  add column if not exists updated_at timestamptz not null default now();

update public.notifications set read_at=created_at where is_read and read_at is null;
create index if not exists notifications_inbox_user_status_created_idx
  on public.notifications(user_id,status,created_at desc);
notify pgrst, 'reload schema';
commit;
