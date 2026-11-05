-- Reviewed, multi-label concepts. No student counters or correctness fields are writable here.
begin;
create schema if not exists smart_tags_private;
revoke all on schema smart_tags_private from public;
grant usage on schema smart_tags_private to authenticated;

create table public.question_smart_tags (
  question_id uuid primary key references public.questions(id) on delete cascade,
  core_concepts text[] not null default '{}',
  common_error_triggers text[] not null default '{}',
  reviewed boolean not null default false,
  review_note text not null default '',
  reviewed_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint smart_tag_concept_count check (cardinality(core_concepts) <= 8),
  constraint smart_tag_trigger_count check (cardinality(common_error_triggers) <= 8),
  constraint smart_tags_review_evidence check (not reviewed or (cardinality(core_concepts) > 0 and length(btrim(review_note)) between 3 and 1000))
);
alter table public.question_smart_tags enable row level security;
revoke all on public.question_smart_tags from public, anon, authenticated;
grant select, insert, update on public.question_smart_tags to authenticated;
grant all on public.question_smart_tags to service_role;

-- Use the existing protected admin membership, never the self-editable profiles.role.
create policy "Reviewed smart tags are readable" on public.question_smart_tags for select to authenticated
  using (reviewed or exists (select 1 from public.admin_profiles a where a.user_id = (select auth.uid())));
create policy "Admins create smart tags" on public.question_smart_tags for insert to authenticated
  with check (exists (select 1 from public.admin_profiles a where a.user_id = (select auth.uid())));
create policy "Admins edit smart tags" on public.question_smart_tags for update to authenticated
  using (exists (select 1 from public.admin_profiles a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_profiles a where a.user_id = (select auth.uid())));

create function smart_tags_private.prepare_tags() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare item text;
begin
  -- Normalise spelling/case variants without inventing concepts; retain a human-readable label.
  if array_ndims(new.core_concepts) > 1 or array_ndims(new.common_error_triggers) > 1 then
    raise exception 'Tags must be one-dimensional arrays' using errcode = '23514';
  end if;
  foreach item in array new.core_concepts || new.common_error_triggers loop
    if item is null or length(btrim(item)) not between 2 and 80 or item ~ '[[:cntrl:]]' then
      raise exception 'Each tag needs 2 to 80 printable characters' using errcode = '23514';
    end if;
  end loop;
  select coalesce(array_agg(label order by label), '{}') into new.core_concepts from
    (select min(regexp_replace(btrim(t), '\s+', ' ', 'g')) label from unnest(new.core_concepts) t group by lower(regexp_replace(btrim(t), '\s+', ' ', 'g'))) labels;
  select coalesce(array_agg(label order by label), '{}') into new.common_error_triggers from
    (select min(regexp_replace(btrim(t), '\s+', ' ', 'g')) label from unnest(new.common_error_triggers) t group by lower(regexp_replace(btrim(t), '\s+', ' ', 'g'))) labels;
  new.reviewed_by := case when new.reviewed then auth.uid() else null end;
  new.updated_at := now();
  return new;
end $$;
revoke all on function smart_tags_private.prepare_tags() from public;
create trigger prepare_question_smart_tags before insert or update on public.question_smart_tags
  for each row execute function smart_tags_private.prepare_tags();
create index question_smart_tags_concepts on public.question_smart_tags using gin(core_concepts) where reviewed;

-- Approved content-editor/import paths invalidate a stale review when question content changes.
-- Invoker rights retain the existing content/RLS boundaries.
create function smart_tags_private.invalidate_review() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
    update public.question_smart_tags set reviewed = false where question_id = new.id and reviewed;
  end if;
  return new;
end $$;
revoke all on function smart_tags_private.invalidate_review() from public;
create trigger invalidate_question_smart_tags after update on public.questions
  for each row execute function smart_tags_private.invalidate_review();

-- Use the normal timed test engine, with a fixed persisted set of at most three questions.
alter table public.test_sessions add column concept_label text;
alter table public.test_sessions drop constraint test_sessions_mode_check;
alter table public.test_sessions add constraint test_sessions_mode_check
  check (mode in ('full_mock','full_paper','subject_wise','topic_wise','custom','sprint','concept_fix'));
alter table public.test_sessions add constraint concept_fix_session_shape check (
  (mode = 'concept_fix' and concept_label is not null and length(concept_label) between 2 and 80
    and duration_minutes = 10 and total_questions between 1 and 3 and question_ids is not null
    and cardinality(question_ids) = total_questions)
  or (mode <> 'concept_fix' and concept_label is null)
);
commit;
