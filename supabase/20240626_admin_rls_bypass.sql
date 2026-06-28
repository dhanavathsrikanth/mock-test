-- ============================================================
-- Admin RLS Bypass — Allow admin users to read all data
-- Required for analytics page and admin panels
-- ============================================================

-- Helper: check if current user is an admin
-- Uses admin_profiles table (existing pattern from question_reports)

-- ── profiles ──
create policy "Admins can read all profiles"
  on public.profiles for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── test_sessions ──
create policy "Admins can read all test sessions"
  on public.test_sessions for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── test_answers ──
create policy "Admins can read all test answers"
  on public.test_answers for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── bookmarks ──
create policy "Admins can read all bookmarks"
  on public.bookmarks for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── streaks ──
create policy "Admins can read all streaks"
  on public.streaks for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── user_badges ──
create policy "Admins can read all user badges"
  on public.user_badges for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── xp_transactions ──
create policy "Admins can read all xp transactions"
  on public.xp_transactions for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── user_levels ──
create policy "Admins can read all user levels"
  on public.user_levels for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── spaced_repetition ──
create policy "Admins can read all spaced repetition records"
  on public.spaced_repetition for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── daily_question_answers ──
create policy "Admins can read all daily question answers"
  on public.daily_question_answers for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── daily_questions ──
create policy "Admins can read all daily questions"
  on public.daily_questions for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── notification_preferences ──
create policy "Admins can read all notification preferences"
  on public.notification_preferences for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ── push_subscriptions ──
create policy "Admins can read all push subscriptions"
  on public.push_subscriptions for select to authenticated
  using (exists (select 1 from public.admin_profiles where user_id = auth.uid()));

-- ============================================================
-- Storage: Make avatars bucket public for profile images
-- ============================================================
-- Note: Run this in Supabase Dashboard > Storage > avatars > Settings
-- OR use the Supabase CLI: supabase storage update avatars --public
-- This SQL handles it programmatically:
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Allow authenticated users to upload their own avatar
create policy "Avatar upload for own profile"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to view avatars (public bucket)
create policy "Avatar public read"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

-- Allow users to delete their own avatar
create policy "Avatar delete for own profile"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
