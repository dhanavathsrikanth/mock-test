-- ============================================================
-- Badges & XP Management System
-- Adds badge_definitions, level_thresholds, xp_rules tables
-- ============================================================

-- 1. badge_definitions
create table if not exists public.badge_definitions (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text not null default '',
  icon_emoji      text not null default '🏆',
  condition_type  text not null default 'streak_days',
  condition_value integer not null default 0,
  xp_reward       integer not null default 0,
  slug            text not null unique,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. level_thresholds
create table if not exists public.level_thresholds (
  level       integer primary key,
  name        text not null,
  xp_required integer not null,
  updated_at  timestamptz not null default now()
);

-- 3. xp_rules
create table if not exists public.xp_rules (
  id          uuid primary key default gen_random_uuid(),
  event_key   text not null unique,
  label       text not null,
  description text,
  amount      integer not null,
  updated_at  timestamptz not null default now()
);

-- 4. Indexes
create index if not exists idx_badge_definitions_slug on public.badge_definitions(slug);
create index if not exists idx_badge_definitions_active on public.badge_definitions(is_active);

-- 5. Updated-at trigger for badge_definitions
create trigger trg_badge_definitions_updated_at
  before update on public.badge_definitions
  for each row
  execute function public.set_updated_at();

-- 6. Updated-at trigger for level_thresholds
create trigger trg_level_thresholds_updated_at
  before update on public.level_thresholds
  for each row
  execute function public.set_updated_at();

-- 7. Updated-at trigger for xp_rules
create trigger trg_xp_rules_updated_at
  before update on public.xp_rules
  for each row
  execute function public.set_updated_at();

-- 8. Row Level Security
alter table public.badge_definitions  enable row level security;
alter table public.level_thresholds   enable row level security;
alter table public.xp_rules           enable row level security;

-- badge_definitions policies
create policy "Badge definitions are readable by all authenticated users"
  on public.badge_definitions for select
  to authenticated
  using (true);

create policy "Admins can insert badge definitions"
  on public.badge_definitions for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update badge definitions"
  on public.badge_definitions for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can delete badge definitions"
  on public.badge_definitions for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- level_thresholds policies
create policy "Level thresholds are readable by all authenticated users"
  on public.level_thresholds for select
  to authenticated
  using (true);

create policy "Admins can update level thresholds"
  on public.level_thresholds for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert level thresholds"
  on public.level_thresholds for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- xp_rules policies
create policy "XP rules are readable by all authenticated users"
  on public.xp_rules for select
  to authenticated
  using (true);

create policy "Admins can update XP rules"
  on public.xp_rules for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert XP rules"
  on public.xp_rules for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 9. Seed data

-- Seed badge definitions (matching existing hardcoded badges)
insert into public.badge_definitions (name, description, icon_emoji, condition_type, condition_value, xp_reward, slug, is_active) values
  ('Week Warrior', 'Maintained a 7-day practice streak', '🔥', 'streak_days', 7, 150, 'week_warrior', true),
  ('Iron Will', 'Maintained a 30-day practice streak', '💪', 'streak_days', 30, 500, 'iron_will', true)
on conflict (slug) do nothing;

-- Seed level thresholds (matching XP_THRESHOLDS in lib/xp.ts)
insert into public.level_thresholds (level, name, xp_required) values
  (0, 'Trainee', 0),
  (1, 'Junior AEE', 500),
  (2, 'AEE', 1500),
  (3, 'Senior AEE', 3500),
  (4, 'Assistant Executive', 7000),
  (5, 'Executive Engineer', 12000),
  (6, 'Chief Engineer', 20000)
on conflict (level) do nothing;

-- Seed XP rules (matching XP_REWARDS in lib/xp.ts)
insert into public.xp_rules (event_key, label, description, amount) values
  ('correct_answer', 'Correct Answer', 'Per correct answer in a test', 10),
  ('perfect_score_bonus', 'Perfect Score Bonus', 'Bonus for answering all questions correctly', 50),
  ('daily_question_correct', 'Daily Question Correct', 'Answering the daily question correctly', 25),
  ('daily_question_attempted', 'Daily Question Attempted', 'Attempting the daily question', 10),
  ('week_warrior_streak', 'Week Warrior Streak', '7-day streak milestone', 150),
  ('iron_will_streak', 'Iron Will Streak', '30-day streak milestone', 500),
  ('first_test_bonus', 'First Test Bonus', 'Completing first test', 100)
on conflict (event_key) do nothing;
