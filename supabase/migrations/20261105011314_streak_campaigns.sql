begin;
create schema if not exists engagement_private;
revoke all on schema engagement_private from public, anon, authenticated;

-- The hosted project has the original preference table. Fill the fields used by
-- the current settings UI without enabling campaigns or marketing for anyone.
do $$ declare field text; begin
  foreach field in array array['system','success','warning','error','info','achievement','reminder','exam','mock_test','pyq','leaderboard','streak','friend_activity','feature_release','announcement'] loop
    execute format('alter table public.notification_preferences add column if not exists %I boolean not null default true', field);
  end loop;
end $$;
alter table public.notification_preferences add column if not exists push_enabled boolean not null default true;
alter table public.notification_preferences add column if not exists email_enabled boolean not null default false;
alter table public.notification_preferences add column if not exists marketing boolean not null default false;
alter table public.notification_preferences add column if not exists quiet_hours_start time;
alter table public.notification_preferences add column if not exists quiet_hours_end time;
alter table public.notification_preferences add column if not exists created_at timestamptz not null default now();
alter table public.notification_preferences add column milestone_enabled boolean not null default false;
alter table public.notification_preferences add column milestone_channel text not null default 'in_app' check (milestone_channel in ('in_app','push','email'));
alter table public.notification_preferences add column milestone_consent_at timestamptz;
alter table public.notification_preferences add column milestone_consent_version text;
alter table public.notification_preferences enable row level security;
grant select,insert,update on public.notification_preferences to authenticated;
create policy "Streak preferences own select" on public.notification_preferences for select to authenticated using(user_id=(select auth.uid())::text);
create policy "Streak preferences own insert" on public.notification_preferences for insert to authenticated with check(user_id=(select auth.uid())::text);
create policy "Streak preferences own update" on public.notification_preferences for update to authenticated using(user_id=(select auth.uid())::text) with check(user_id=(select auth.uid())::text);
alter table public.push_subscriptions add column if not exists endpoint text;
alter table public.push_subscriptions add column if not exists p256dh text;
alter table public.push_subscriptions add column if not exists auth text;
alter table public.push_subscriptions add column if not exists user_agent text;
alter table public.push_subscriptions add column if not exists updated_at timestamptz default now();

create table public.streak_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  exam_id uuid not null references public.exams(id) on delete cascade,
  stream_id uuid,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (stream_id,exam_id) references public.exam_streams(id,exam_id)
);
create table public.streak_campaign_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.streak_campaigns(id) on delete cascade,
  milestone integer not null check (milestone in (5,7)),
  exam_id uuid not null,
  stream_id uuid,
  channel text not null check (channel in ('in_app','email','push')),
  status text not null default 'pending' check (status in ('pending','processing','delivered','skipped','dead')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '72 hours',
  lease_token uuid,
  lease_until timestamptz,
  last_error text,
  provider_id text,
  send_started_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,campaign_id,milestone)
);
create index streak_campaign_jobs_due on public.streak_campaign_jobs(available_at,created_at) where status in ('pending','processing');
create index streak_campaign_jobs_campaign on public.streak_campaign_jobs(campaign_id);
create index streak_campaign_jobs_user_delivery on public.streak_campaign_jobs(user_id,delivered_at desc);
create index streak_campaigns_exam on public.streak_campaigns(exam_id);
create index streak_campaigns_stream on public.streak_campaigns(stream_id,exam_id);

create table public.streak_campaign_consent (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  enabled boolean not null, channel text not null, policy_version text not null,
  recorded_at timestamptz not null default now()
);
create index streak_campaign_consent_user on public.streak_campaign_consent(user_id,recorded_at desc);
create table public.streak_email_suppressions (
  email text primary key, reason text not null, recorded_at timestamptz not null default now()
);
create table public.streak_email_events (id text primary key, recorded_at timestamptz not null default now());
create table public.streak_campaign_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  job_id uuid not null, next_allowed_at timestamptz not null
);

alter table public.streak_campaigns enable row level security;
alter table public.streak_campaign_jobs enable row level security;
alter table public.streak_campaign_consent enable row level security;
alter table public.streak_email_suppressions enable row level security;
alter table public.streak_email_events enable row level security;
alter table public.streak_campaign_contacts enable row level security;
revoke all on public.streak_campaigns,public.streak_campaign_jobs,public.streak_campaign_consent,public.streak_email_suppressions,public.streak_email_events from public,anon,authenticated;
grant all on public.streak_campaigns,public.streak_campaign_jobs,public.streak_campaign_consent,public.streak_email_suppressions,public.streak_email_events to service_role;
revoke all on public.streak_campaign_contacts from public,anon,authenticated;
grant all on public.streak_campaign_contacts to service_role;
-- Configuration and queue access are service-only; HTTP admin routes separately
-- verify the authenticated administrator before obtaining that client.

create function engagement_private.prevent_scope_overlap() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.exam_id::text,511));
  if new.enabled and exists(select 1 from public.streak_campaigns c where c.enabled and c.id<>new.id and c.exam_id=new.exam_id
    and (c.stream_id is null or new.stream_id is null or c.stream_id=new.stream_id)) then
    raise exception 'Another campaign already covers this exam or stream';
  end if;
  return new;
end $$;
create trigger streak_campaign_scope before insert or update on public.streak_campaigns
for each row execute function engagement_private.prevent_scope_overlap();

create function engagement_private.capture_milestone() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous integer:=0; reached_milestone integer;
begin
  if tg_op='UPDATE' then previous:=old.current_streak; end if;
  if new.last_activity_date is distinct from (now() at time zone 'Asia/Kolkata')::date then return new; end if;
  if new.current_streak>=7 and previous<7 then reached_milestone:=7;
  elsif new.current_streak>=5 and previous<5 then reached_milestone:=5;
  else return new; end if;
  insert into public.streak_campaign_jobs(user_id,campaign_id,milestone,exam_id,stream_id,channel)
  select new.user_id,c.id,reached_milestone,p.target_exam_id,p.target_stream_id,n.milestone_channel
    from public.profiles p join public.streak_campaigns c on c.exam_id=p.target_exam_id
      and (c.stream_id is null or c.stream_id=p.target_stream_id)
    join public.notification_preferences n on n.user_id=p.id::text
  where p.id=new.user_id and not p.banned and c.enabled and n.milestone_enabled
    and n.milestone_consent_at is not null and n.milestone_consent_version='streak-milestones-v1' and n.streak
  on conflict(user_id,campaign_id,milestone) do nothing;
  return new;
end $$;
create trigger capture_streak_campaign_milestone after insert or update of current_streak,last_activity_date on public.streaks
for each row execute function engagement_private.capture_milestone();

create function engagement_private.record_consent() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    if not new.milestone_enabled then return new; end if;
  elsif new.milestone_enabled is not distinct from old.milestone_enabled and new.milestone_channel is not distinct from old.milestone_channel
    and new.milestone_consent_at is not distinct from old.milestone_consent_at then return new;
  end if;
  insert into public.streak_campaign_consent(user_id,enabled,channel,policy_version)
    values(new.user_id::uuid,new.milestone_enabled,new.milestone_channel,coalesce(new.milestone_consent_version,'streak-milestones-v1'));
  return new;
end $$;
create trigger record_streak_campaign_consent after insert or update on public.notification_preferences
for each row execute function engagement_private.record_consent();

create function public.claim_streak_campaign_jobs(p_limit integer default 5)
returns setof public.streak_campaign_jobs language plpgsql security invoker set search_path='' as $$
begin
  update public.streak_campaign_jobs set status='dead',last_error='Retry limit reached'
    where attempts>=5 and (status='pending' or (status='processing' and lease_until<now()));
  return query with candidates as (
    select id from public.streak_campaign_jobs where attempts<5 and available_at<=now()
      and (status='pending' or (status='processing' and lease_until<now()))
    order by available_at,created_at for update skip locked limit least(5,greatest(0,p_limit))
  ) update public.streak_campaign_jobs j set status='processing',attempts=j.attempts+1,
    lease_token=gen_random_uuid(),lease_until=now()+interval '120 seconds'
    from candidates c where j.id=c.id returning j.*;
end $$;
create function public.finish_streak_campaign_job(p_id uuid,p_lease uuid,p_status text,p_retry_at timestamptz default null,p_error text default null,p_provider_id text default null)
returns boolean language plpgsql security invoker set search_path='' as $$
declare affected integer;
begin
  if p_status not in ('pending','deferred','delivered','skipped','dead') then raise exception 'Invalid job status'; end if;
  update public.streak_campaign_jobs set status=case when p_status='deferred' then 'pending' else p_status end,
    attempts=case when p_status='deferred' then greatest(0,attempts-1) else attempts end,available_at=coalesce(p_retry_at,now()),
    last_error=left(p_error,500),provider_id=coalesce(p_provider_id,provider_id),
    delivered_at=case when p_status='delivered' then now() else delivered_at end,
    lease_token=null,lease_until=null
    where id=p_id and lease_token=p_lease and status='processing';
  get diagnostics affected=row_count;
  return affected=1;
end $$;
create function public.mark_streak_campaign_send(p_id uuid,p_lease uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare affected integer;
begin
  update public.streak_campaign_jobs set send_started_at=coalesce(send_started_at,now())
    where id=p_id and lease_token=p_lease and status='processing';
  get diagnostics affected=row_count;
  return affected=1;
end $$;
create function public.reserve_streak_campaign_contact(p_id uuid,p_lease uuid) returns timestamptz
language plpgsql security invoker set search_path='' as $$
declare u uuid; contact public.streak_campaign_contacts%rowtype;
begin
  select user_id into u from public.streak_campaign_jobs where id=p_id and lease_token=p_lease and status='processing';
  if not found then raise exception 'Job lease lost'; end if;
  insert into public.streak_campaign_contacts(user_id,job_id,next_allowed_at) values(u,p_id,now()+interval '24 hours') on conflict do nothing;
  select * into contact from public.streak_campaign_contacts where user_id=u for update;
  if contact.job_id=p_id then return null; end if;
  if contact.next_allowed_at>now() then return contact.next_allowed_at; end if;
  update public.streak_campaign_contacts set job_id=p_id,next_allowed_at=now()+interval '24 hours' where user_id=u;
  return null;
end $$;
create function public.record_streak_email_event(p_event_id text,p_emails text[],p_reason text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_reason not in ('email.bounced','email.complained') or cardinality(p_emails)>100 then raise exception 'Invalid email event'; end if;
  insert into public.streak_email_events(id) values(p_event_id) on conflict do nothing;
  if not found then return; end if;
  insert into public.streak_email_suppressions(email,reason)
    select distinct lower(trim(e)),p_reason from unnest(p_emails) e
    where length(e) between 3 and 320
    on conflict(email) do update set reason=excluded.reason,recorded_at=now();
end $$;
revoke all on all functions in schema engagement_private from public,anon,authenticated;
revoke all on function public.claim_streak_campaign_jobs(integer),public.finish_streak_campaign_job(uuid,uuid,text,timestamptz,text,text),public.mark_streak_campaign_send(uuid,uuid),public.reserve_streak_campaign_contact(uuid,uuid),public.record_streak_email_event(text,text[],text) from public,anon,authenticated;
grant execute on function public.claim_streak_campaign_jobs(integer),public.finish_streak_campaign_job(uuid,uuid,text,timestamptz,text,text),public.mark_streak_campaign_send(uuid,uuid),public.reserve_streak_campaign_contact(uuid,uuid),public.record_streak_email_event(text,text[],text) to service_role;
commit;
