-- Let each student mark a saved question as mastered without exposing any
-- other bookmark columns to direct client-side updates.
alter table public.bookmarks
  add column mastered_at timestamptz;

grant update (mastered_at) on public.bookmarks to authenticated;

create policy "Users can update mastery on their own bookmarks"
  on public.bookmarks for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
