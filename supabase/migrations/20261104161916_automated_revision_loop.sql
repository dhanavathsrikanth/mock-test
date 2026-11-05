-- Five-stage revision. Review days use Asia/Kolkata consistently, independent of server TZ.
-- Apply after the existing schema and question-type migrations.
begin;
create schema if not exists revision_private;
revoke all on schema revision_private from public;
grant usage on schema revision_private to authenticated;

alter table public.spaced_repetition add column if not exists stage integer not null default 1;
alter table public.spaced_repetition add column if not exists mastered_at timestamptz;
-- Preserve old scheduling dates, mapping the former ease-based intervals to fixed stages.
update public.spaced_repetition set stage = case
  when interval_days >= 30 then 5 when interval_days >= 14 then 4
  when interval_days >= 7 then 3 when interval_days >= 3 then 2 else 1 end;
alter table public.spaced_repetition add constraint revision_stage_valid check (stage between 1 and 5);
-- Earlier clients inserted duplicates without a unique constraint. Keep the latest review.
delete from public.spaced_repetition a using public.spaced_repetition b
where a.user_id = b.user_id and a.question_id = b.question_id
  and (coalesce(a.last_reviewed_at, a.created_at), a.id) < (coalesce(b.last_reviewed_at, b.created_at), b.id);
create unique index if not exists revision_user_question on public.spaced_repetition(user_id, question_id);
create index if not exists revision_due_stage on public.spaced_repetition(user_id, stage, next_review_date) where mastered_at is null;

-- Private daily manifests keep the cap and rewards safe from direct REST writes.
create table revision_private.daily_queues (
  user_id uuid not null references public.profiles(id) on delete cascade,
  review_day date not null,
  exam_id uuid not null references public.exams(id) on delete cascade,
  scope text not null,
  question_ids uuid[] not null default '{}',
  results jsonb not null default '{}',
  xp_earned integer not null default 0,
  completed_at timestamptz,
  primary key (user_id, review_day, exam_id, scope),
  check (cardinality(question_ids) <= 20)
);
alter table revision_private.daily_queues enable row level security;
revoke all on revision_private.daily_queues from public, anon, authenticated;

create function revision_private.today() returns date language sql stable
set search_path = '' as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

-- Internal helper: ordinary mistakes reset an existing item; bookmarks preserve active progress.
create function revision_private.enroll(p_user uuid, p_question uuid, p_reset boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.questions where id = p_question and not marks_to_all) then return; end if;
  insert into public.spaced_repetition(user_id, question_id, stage, interval_days, repetition_count, next_review_date)
  values (p_user::text, p_question, 1, 1, 0, revision_private.today() + 1)
  on conflict (user_id, question_id) do update set
    stage = 1, interval_days = 1, repetition_count = 0, mastered_at = null,
    next_review_date = revision_private.today() + 1
  where p_reset or public.spaced_repetition.mastered_at is not null;
end $$;

create function revision_private.on_test_completed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare q record;
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    for q in select question_id from public.test_answers where session_id = new.id and is_correct = false loop
      perform revision_private.enroll(new.user_id, q.question_id, true);
    end loop;
  end if;
  return new;
end $$;
create trigger revision_on_test_completed after update of status on public.test_sessions
for each row execute function revision_private.on_test_completed();

create function revision_private.on_bookmark() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform revision_private.enroll(new.user_id, new.question_id, false);
  return new;
end $$;
create trigger revision_on_bookmark after insert on public.bookmarks
for each row execute function revision_private.on_bookmark();

create function revision_private.on_daily_answer() returns trigger
language plpgsql security definer set search_path = '' as $$
declare q uuid;
begin
  if new.is_correct = false then
    select question_id into q from public.daily_questions where id = new.daily_question_id;
    perform revision_private.enroll(new.user_id::uuid, q, true);
  end if;
  return new;
end $$;
create trigger revision_on_daily_answer after insert on public.daily_question_answers
for each row execute function revision_private.on_daily_answer();

-- Bring existing bookmarks and completed mistakes into the loop without resetting progress.
insert into public.spaced_repetition(user_id, question_id, stage, interval_days, repetition_count, next_review_date)
select source.user_id, source.question_id, 1, 1, 0, revision_private.today() + 1 from (
  select b.user_id::text as user_id, b.question_id from public.bookmarks b
  union
  select s.user_id::text, a.question_id from public.test_sessions s
    join public.test_answers a on a.session_id = s.id where s.status = 'completed' and a.is_correct = false
) source join public.questions q on q.id = source.question_id where not q.marks_to_all
on conflict (user_id, question_id) do nothing;

-- Public entry points use the authenticated identity, never a caller-supplied user ID.
create function revision_private.add_question(p_question uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  perform revision_private.enroll(auth.uid(), p_question, false);
end $$;

create function revision_private.queue(p_exam uuid, p_stream uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid(); d date := revision_private.today();
  s text := coalesce(p_stream::text, 'none');
  daily revision_private.daily_queues%rowtype;
  ids uuid[]; allocated integer; deferred integer; items jsonb;
begin
  if u is null then raise exception 'Unauthorized'; end if;
  -- One allocation lock per student also enforces the cap across exams and streams.
  perform pg_advisory_xact_lock(hashtextextended(u::text, 817));
  select * into daily from revision_private.daily_queues
    where user_id = u and review_day = d and exam_id = p_exam and scope = s for update;
  if not found then
    select coalesce(sum(cardinality(question_ids)), 0) into allocated
      from revision_private.daily_queues where user_id = u and review_day = d;
    select coalesce(array_agg(id order by stage, next_review_date, id), '{}') into ids from (
      select r.question_id as id, r.stage, r.next_review_date from public.spaced_repetition r
      join public.questions q on q.id = r.question_id
      where r.user_id = u::text and r.mastered_at is null and r.next_review_date <= d
        and q.exam_id = p_exam and q.stream_id is not distinct from p_stream and not q.marks_to_all
      order by r.stage, r.next_review_date, r.question_id limit greatest(0, 20 - allocated)
    ) candidates;
    insert into revision_private.daily_queues(user_id, review_day, exam_id, scope, question_ids)
      values (u, d, p_exam, s, ids) returning * into daily;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'stage', r.stage, 'question', to_jsonb(q)) order by idx.ordinality), '[]')
  into items from unnest(daily.question_ids) with ordinality idx(question_id, ordinality)
    join public.questions q on q.id = idx.question_id
    join public.spaced_repetition r on r.question_id = q.id and r.user_id = u::text
  where not (daily.results ? q.id::text) and not q.marks_to_all;
  select count(*) into deferred from public.spaced_repetition r join public.questions q on q.id = r.question_id
    where r.user_id = u::text and r.mastered_at is null and r.next_review_date <= d
      and q.exam_id = p_exam and q.stream_id is not distinct from p_stream and not q.marks_to_all
      and not (q.id = any(daily.question_ids));
  return jsonb_build_object('reviewDate', d, 'questions', items, 'summary', jsonb_build_object(
    'dueCount', jsonb_array_length(items), 'deferredCount', deferred, 'dailyCap', 20,
    'completedCount', (select count(*) from jsonb_object_keys(daily.results)),
    'totalCount', cardinality(daily.question_ids), 'xpEarned', daily.xp_earned,
    'queueComplete', daily.completed_at is not null));
end $$;

-- PostgreSQL has no jsonb_object_length; keep result counting explicit.
-- This helper is installed before the queue can be called.
create function revision_private.result_count(p_results jsonb) returns integer language sql immutable
set search_path = '' as $$ select count(*)::integer from jsonb_object_keys(p_results) $$;

create function revision_private.answer(p_question uuid, p_correct boolean, p_day date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid(); d date := revision_private.today();
  daily revision_private.daily_queues%rowtype;
  r public.spaced_repetition%rowtype;
  next_stage integer; days integer; mastered boolean; reward integer; outcome jsonb;
  streak public.streaks%rowtype; streak_count integer; freezes integer;
  total integer; level integer; level_label text;
begin
  if u is null then raise exception 'Unauthorized'; end if;
  if p_day is distinct from d or p_correct is null then raise exception 'Review day expired'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text, 817));
  select * into daily from revision_private.daily_queues
    where user_id = u and review_day = d and p_question = any(question_ids) for update;
  if not found then raise exception 'Question is not in today''s queue'; end if;
  if daily.results ? p_question::text then
    return (daily.results -> p_question::text) || jsonb_build_object('alreadySaved', true, 'xpAwarded', 0,
      'xpEarned', daily.xp_earned, 'queueComplete', daily.completed_at is not null);
  end if;
  select * into r from public.spaced_repetition where user_id = u::text and question_id = p_question for update;
  if not found then raise exception 'Revision record missing'; end if;
  mastered := p_correct and r.stage = 5;
  next_stage := case when p_correct then least(r.stage + 1, 5) else 1 end;
  days := (array[1,3,7,14,30])[next_stage];
  update public.spaced_repetition set stage = next_stage, interval_days = days,
    repetition_count = case when p_correct then repetition_count + 1 else 0 end,
    next_review_date = d + days, last_reviewed_at = now(), mastered_at = case when mastered then now() end
    where id = r.id;
  reward := case when p_correct then 10 else 5 end;
  outcome := jsonb_build_object('stage', next_stage, 'mastered', mastered, 'nextReviewDate', case when mastered then null else d + days end,
    'xpAwarded', reward);
  daily.results := daily.results || jsonb_build_object(p_question::text, outcome);
  daily.xp_earned := daily.xp_earned + reward;
  if revision_private.result_count(daily.results) = cardinality(daily.question_ids) then
    daily.completed_at := now();
    select * into streak from public.streaks where user_id = u for update;
    if not found then
      streak_count := 1; freezes := 1;
    elsif streak.last_activity_date = d then
      streak_count := streak.current_streak; freezes := streak.freeze_tokens;
    elsif streak.last_activity_date = d - 1 then
      streak_count := greatest(1, streak.current_streak + 1); freezes := streak.freeze_tokens;
    elsif streak.last_activity_date = d - 2 and streak.freeze_tokens > 0 then
      streak_count := greatest(1, streak.current_streak + 1); freezes := streak.freeze_tokens - 1;
    else
      streak_count := 1; freezes := streak.freeze_tokens;
    end if;
    insert into public.streaks(user_id, current_streak, longest_streak, freeze_tokens, last_activity_date)
      values (u, streak_count, streak_count, freezes, d)
    on conflict (user_id) do update set current_streak = streak_count,
      longest_streak = greatest(public.streaks.longest_streak, streak_count), freeze_tokens = freezes,
      last_activity_date = d, updated_at = now();
  end if;
  update revision_private.daily_queues set results = daily.results, xp_earned = daily.xp_earned, completed_at = daily.completed_at
    where user_id = u and review_day = d and exam_id = daily.exam_id and scope = daily.scope;
  insert into public.xp_transactions(user_id, amount, reason, metadata)
    values (u, reward, 'Revision review', jsonb_build_object('question_id', p_question, 'review_day', d, 'correct', p_correct));
  insert into public.user_levels(user_id, total_xp) values (u, reward)
    on conflict (user_id) do update set total_xp = public.user_levels.total_xp + reward, updated_at = now()
    returning total_xp into total;
  select v.n, v.label into level, level_label from (values
    (0, 'Trainee', 0), (1, 'Explorer', 500), (2, 'Practitioner', 1500), (3, 'Achiever', 3500),
    (4, 'Advanced Learner', 7000), (5, 'Expert', 12000), (6, 'Master', 20000)
  ) v(n,label,threshold) where total >= threshold order by threshold desc limit 1;
  update public.user_levels set current_level = level, level_name = level_label where user_id = u;
  return outcome || jsonb_build_object('xpEarned', daily.xp_earned, 'queueComplete', daily.completed_at is not null);
end $$;

-- Definer functions stay in a private schema; wrappers expose only the three scoped operations.
revoke all on all functions in schema revision_private from public, anon, authenticated;
grant execute on function revision_private.queue(uuid, uuid), revision_private.answer(uuid, boolean, date),
  revision_private.add_question(uuid) to authenticated;
create function public.revision_queue(p_exam uuid, p_stream uuid default null) returns jsonb
language sql security invoker set search_path = '' as $$ select revision_private.queue(p_exam, p_stream) $$;
create function public.revision_answer(p_question uuid, p_correct boolean, p_day date) returns jsonb
language sql security invoker set search_path = '' as $$ select revision_private.answer(p_question, p_correct, p_day) $$;
create function public.revision_add(p_question uuid) returns void
language sql security invoker set search_path = '' as $$ select revision_private.add_question(p_question) $$;
revoke all on function public.revision_queue(uuid, uuid), public.revision_answer(uuid, boolean, date), public.revision_add(uuid) from public, anon;
grant execute on function public.revision_queue(uuid, uuid), public.revision_answer(uuid, boolean, date), public.revision_add(uuid) to authenticated;
-- Queue reads and existing admin cleanup retain their RLS policies. Enrollment and
-- progression must go through the scoped functions; deleting cannot refill a daily manifest.
revoke insert, update on public.spaced_repetition from authenticated, anon;
commit;
