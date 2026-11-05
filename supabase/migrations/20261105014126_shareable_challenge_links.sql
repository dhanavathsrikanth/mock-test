begin;
-- Snapshots, recovery capabilities and answer keys are never exposed as Data API tables.
create schema challenge_private;
revoke all on schema challenge_private from public;
grant usage on schema challenge_private to anon, authenticated, service_role;

create table challenge_private.challenges (
  id text primary key default ('ch_' || replace(gen_random_uuid()::text, '-', '')),
  source_session uuid not null unique references public.test_sessions(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  creator_name text not null, exam_id uuid not null, stream_id uuid,
  label text not null, minutes integer not null check(minutes in (12,15)),
  questions jsonb not null check(jsonb_array_length(questions)=5),
  creator_result jsonb not null, creator_seconds integer not null,
  created_at timestamptz not null default now()
);
create table challenge_private.turns (
  token uuid primary key default gen_random_uuid(),
  challenge_id text not null references challenge_private.challenges(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  submitted_at timestamptz, payload jsonb, user_id uuid references public.profiles(id) on delete cascade,
  result jsonb, session_id uuid references public.test_sessions(id) on delete set null
);
create index challenge_turns_expiry on challenge_private.turns(expires_at);
create table challenge_private.passes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payment_id text not null unique, created_at timestamptz not null default now()
);
alter table challenge_private.challenges enable row level security;
alter table challenge_private.turns enable row level security;
alter table challenge_private.passes enable row level security;
revoke all on all tables in schema challenge_private from public, anon, authenticated;

-- Mirrors the application's GATE grading: exact MSQ sets, inclusive NAT ranges,
-- precision validation, marks-to-all and MCQ-only negative marking.
create function challenge_private.grade(q jsonb, a jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare chosen jsonb; expected jsonb; v numeric; precision_count integer;
begin
  if coalesce((q->>'marks_to_all')::boolean,false) then return true; end if;
  if a is null or a='null'::jsonb or a='[]'::jsonb or a='""'::jsonb then return null; end if;
  if q->>'question_type'='NAT' then
    if jsonb_typeof(a)<>'string' or (a#>>'{}') !~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$' then return null; end if;
    v := (a#>>'{}')::numeric;
    precision_count := length(rtrim(split_part(a#>>'{}','.',2),'0'));
    if q->>'answer_decimal_places' is not null and precision_count>(q->>'answer_decimal_places')::integer then return false; end if;
    if jsonb_typeof(q->'answer_ranges')='array' then
      return exists(select 1 from jsonb_array_elements(q->'answer_ranges') r where v between (r->>'min')::numeric and (r->>'max')::numeric);
    end if;
    return coalesce(v between (q->>'answer_min')::numeric and (q->>'answer_max')::numeric,false);
  end if;
  chosen := case when jsonb_typeof(a)='number' then jsonb_build_array(a) when jsonb_typeof(a)='array' then a else '[]'::jsonb end;
  if chosen='[]'::jsonb then return null; end if;
  if q->>'question_type'='MCQ' and jsonb_array_length(chosen)<>1 then return false; end if;
  if jsonb_typeof(q->'correct_option_sets')='array' then
    return exists(select 1 from jsonb_array_elements(q->'correct_option_sets') s where s @> chosen and chosen @> s);
  end if;
  expected := case when q->>'question_type'='MSQ' then q->'correct_options' else jsonb_build_array(q->'correct_option') end;
  return coalesce(expected @> chosen and chosen @> expected,false);
end $$;
create function challenge_private.evaluate(qs jsonb, answers jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare q jsonb; correct boolean; maximum numeric:=0; net numeric:=0; good integer:=0; wrong integer:=0; results jsonb:='{}';
begin
  for q in select value from jsonb_array_elements(qs) loop
    correct:=challenge_private.grade(q,answers->(q->>'id'));
    maximum:=maximum+coalesce((q->>'marks')::numeric,1);
    if correct then net:=net+coalesce((q->>'marks')::numeric,1); good:=good+1;
    elsif correct=false then
      net:=net-case when q->>'question_type'='MCQ' then coalesce((q->>'negative_marks')::numeric,0) else 0 end;
      wrong:=wrong+1;
    end if;
    results:=results || jsonb_build_object(q->>'id',correct);
  end loop;
  return jsonb_build_object('net',round(net,2),'maximum',maximum,'correct',good,'wrong',wrong,'skipped',5-good-wrong,
    'accuracy',case when good+wrong>0 then round(100.0*good/(good+wrong)) else 0 end,'questions',results);
end $$;

create function challenge_private.create_link(p_session uuid) returns text
language plpgsql security definer set search_path='' as $$
declare s public.test_sessions; qs jsonb; answers jsonb; cid text; display_name text; label text;
begin
  if auth.uid() is null then raise exception 'Sign in to share a challenge'; end if;
  select * into s from public.test_sessions where id=p_session and user_id=auth.uid() and status='completed' and mode='sprint';
  if not found or cardinality(s.question_ids)<>5 then raise exception 'Finish a five-question sprint first'; end if;
  select id into cid from challenge_private.challenges where source_session=p_session;
  if cid is not null then return cid; end if;
  -- Preserve the trusted original snapshot when an opponent shares their completed turn.
  select c.questions into qs from challenge_private.turns t join challenge_private.challenges c on c.id=t.challenge_id where t.session_id=p_session;
  if qs is null then
    select jsonb_agg(to_jsonb(q) order by ids.n) into qs from unnest(s.question_ids) with ordinality ids(id,n) join public.questions q on q.id=ids.id and q.exam_id=s.exam_id;
  end if;
  if jsonb_array_length(qs)<>5 then raise exception 'These questions are unavailable'; end if;
  select jsonb_object_agg(question_id::text,coalesce(to_jsonb(numeric_answer),to_jsonb(selected_options),to_jsonb(selected_option),'null'::jsonb))
    into answers from public.test_answers where session_id=p_session;
  select left(split_part(full_name,' ',1),40) into display_name from public.profiles where id=auth.uid();
  select concat_ws(' · ',e.name,es.name,coalesce(t.name,su.name,'Mixed sprint')) into label
    from public.exams e left join public.exam_streams es on es.id=s.stream_id
    left join public.subjects su on su.id=s.subject_id left join public.topics t on t.id=s.topic_id where e.id=s.exam_id;
  insert into challenge_private.challenges(source_session,creator_id,creator_name,exam_id,stream_id,label,minutes,questions,creator_result,creator_seconds)
    values(p_session,auth.uid(),coalesce(nullif(display_name,''),'A classmate'),s.exam_id,s.stream_id,coalesce(label,'Practice sprint'),s.duration_minutes,qs,
      challenge_private.evaluate(qs,coalesce(answers,'{}')),coalesce(s.sprint_active_seconds,s.duration_minutes*60))
    on conflict(source_session) do nothing returning id into cid;
  if cid is null then select id into cid from challenge_private.challenges where source_session=p_session; end if;
  return cid;
end $$;

create function challenge_private.view_link(p_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c challenge_private.challenges; presentations jsonb;
begin
  select * into c from challenge_private.challenges where id=p_id;
  if not found then return null; end if;
  -- Explicit allowlist: no answer keys, solutions, creator answers, or raw metadata.
  select jsonb_agg((select jsonb_object_agg(key,value) from jsonb_each(q) where key=any(array[
    'id','question_text','option_1','option_2','option_3','option_4','question_type','image_url','image_width','image_height','option_images',
    'source_question_number','year','paper','marks','negative_marks','marks_to_all','answer_decimal_places'])) order by n)
    into presentations from jsonb_array_elements(c.questions) with ordinality x(q,n);
  return jsonb_build_object('id',c.id,'creatorName',c.creator_name,'creatorScore',c.creator_result->'net',
    'maximum',c.creator_result->'maximum','creatorSeconds',c.creator_seconds,'label',c.label,'minutes',c.minutes,'questions',presentations);
end $$;

create function challenge_private.start_turn(p_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t challenge_private.turns;
begin
  if not exists(select 1 from challenge_private.challenges where id=p_id) then raise exception 'Challenge not found'; end if;
  insert into challenge_private.turns(challenge_id) values(p_id) returning * into t;
  return jsonb_build_object('token',t.token,'startedAt',t.started_at);
end $$;

create function challenge_private.save_turn(p_id text,p_token uuid,p_answers jsonb,p_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare t challenge_private.turns; c challenge_private.challenges; item record;
begin
  select * into t from challenge_private.turns where token=p_token and challenge_id=p_id for update;
  if not found or t.expires_at<now() then raise exception 'This saved turn expired. Start a new challenge'; end if;
  if t.payload is not null then return true; end if; -- first finish is immutable
  select * into c from challenge_private.challenges where id=p_id;
  if p_seconds is null or p_seconds<0 or p_seconds>c.minutes*60 or jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>4096 then raise exception 'Invalid answers or timer'; end if;
  if now()>t.started_at+make_interval(mins=>c.minutes)+interval '60 seconds' then raise exception 'Your timer expired. Start a new challenge'; end if;
  for item in select * from jsonb_each(p_answers) loop
    if not exists(select 1 from jsonb_array_elements(c.questions) q where q->>'id'=item.key) then raise exception 'Unexpected question'; end if;
    if not (item.value='null'::jsonb or (jsonb_typeof(item.value)='number' and item.value::text ~ '^[1-4]$') or
      (jsonb_typeof(item.value)='string' and length(item.value#>>'{}')<=64 and (item.value#>>'{}') ~ '^[+-]?[0-9]*(\.[0-9]*)?$') or
      (jsonb_typeof(item.value)='array' and jsonb_array_length(item.value)<=4 and not exists(select 1 from jsonb_array_elements(item.value) v where v::text !~ '^[1-4]$'))) then raise exception 'Invalid response'; end if;
  end loop;
  update challenge_private.turns set payload=jsonb_build_object('answers',p_answers,'seconds',least(c.minutes*60,greatest(p_seconds,floor(extract(epoch from now()-t.started_at))::integer))),
    submitted_at=now(),expires_at=now()+interval '30 minutes' where token=p_token;
  return true;
end $$;

create function challenge_private.submit_turn(p_id text,p_token uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t challenge_private.turns; c challenge_private.challenges; sid uuid; q jsonb; a jsonb; ids uuid[];
begin
  if auth.uid() is null then raise exception 'Sign in to see your result'; end if;
  select * into t from challenge_private.turns where token=p_token and challenge_id=p_id for update;
  if not found then raise exception 'Saved turn not found'; end if;
  if t.user_id is not null then
    if t.user_id<>auth.uid() then raise exception 'This turn belongs to another account'; end if;
    return t.session_id;
  end if;
  if t.expires_at<now() or t.payload is null then raise exception 'Saved turn expired or unfinished'; end if;
  select * into c from challenge_private.challenges where id=p_id;
  select array_agg((value->>'id')::uuid order by n) into ids from jsonb_array_elements(c.questions) with ordinality x(value,n);
  insert into public.test_sessions(user_id,exam_id,stream_id,mode,total_questions,duration_minutes,question_ids,started_at,status,sprint_active_seconds)
    values(auth.uid(),c.exam_id,c.stream_id,'sprint',5,c.minutes,ids,t.started_at,'in_progress',(t.payload->>'seconds')::integer) returning id into sid;
  for q in select value from jsonb_array_elements(c.questions) loop
    a:=t.payload->'answers'->(q->>'id');
    insert into public.test_answers(session_id,question_id,selected_option,selected_options,numeric_answer,is_correct)
      values(sid,(q->>'id')::uuid,case when jsonb_typeof(a)='number' then (a::text)::integer end,
        case when jsonb_typeof(a)='array' then array(select value::integer from jsonb_array_elements_text(a)) end,
        case when q->>'question_type'='NAT' and (a#>>'{}') ~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$' then a#>>'{}' end,
        challenge_private.grade(q,a));
  end loop;
  -- The existing completion trigger enrolls mistakes into the revision queue.
  update public.test_sessions set status='completed',completed_at=now() where id=sid;
  update challenge_private.turns set user_id=auth.uid(),session_id=sid,result=challenge_private.evaluate(c.questions,t.payload->'answers') where token=p_token;
  return sid;
end $$;

create function challenge_private.result(p_id text,p_session uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare t challenge_private.turns; c challenge_private.challenges; shared jsonb; unlocked boolean;
begin
  if auth.uid() is null then raise exception 'Sign in to see your result'; end if;
  select * into t from challenge_private.turns where challenge_id=p_id and session_id=p_session and user_id=auth.uid();
  if not found then return null; end if;
  select * into c from challenge_private.challenges where id=p_id;
  select coalesce(jsonb_agg(n),'[]') into shared from jsonb_array_elements(c.questions) with ordinality x(q,n)
    where c.creator_result->'questions'->(q->>'id')='false'::jsonb and t.result->'questions'->(q->>'id')='false'::jsonb;
  unlocked:=exists(select 1 from challenge_private.passes where user_id=auth.uid());
  return jsonb_build_object('result',t.result,'seconds',t.payload->'seconds','sharedMistakes',shared,'unlocked',unlocked,
    'solutions',case when unlocked then (select jsonb_agg(jsonb_build_object('number',n,'explanation',q->>'explanation')) from jsonb_array_elements(c.questions) with ordinality x(q,n)) else '[]'::jsonb end);
end $$;

-- Only the verified payment server can grant a pass. Never trust a browser success flag.
create function challenge_private.activate_pass(p_user uuid,p_payment text) returns void
language sql security definer set search_path='' as $$
  insert into challenge_private.passes(user_id,payment_id) values(p_user,p_payment) on conflict(user_id) do nothing;
$$;
revoke all on all functions in schema challenge_private from public,anon,authenticated;
grant execute on function challenge_private.view_link(text),challenge_private.start_turn(text),challenge_private.save_turn(text,uuid,jsonb,integer) to anon,authenticated;
grant execute on function challenge_private.create_link(uuid),challenge_private.submit_turn(text,uuid),challenge_private.result(text,uuid) to authenticated;
grant execute on function challenge_private.activate_pass(uuid,text) to service_role;

create function public.challenge_create(p_session uuid) returns text language sql security invoker set search_path='' as $$ select challenge_private.create_link(p_session) $$;
create function public.challenge_view(p_id text) returns jsonb language sql security invoker set search_path='' as $$ select challenge_private.view_link(p_id) $$;
create function public.challenge_start(p_id text) returns jsonb language sql security invoker set search_path='' as $$ select challenge_private.start_turn(p_id) $$;
create function public.challenge_save(p_id text,p_token uuid,p_answers jsonb,p_seconds integer) returns boolean language sql security invoker set search_path='' as $$ select challenge_private.save_turn(p_id,p_token,p_answers,p_seconds) $$;
create function public.challenge_submit(p_id text,p_token uuid) returns uuid language sql security invoker set search_path='' as $$ select challenge_private.submit_turn(p_id,p_token) $$;
create function public.challenge_result(p_id text,p_session uuid) returns jsonb language sql security invoker set search_path='' as $$ select challenge_private.result(p_id,p_session) $$;
create function public.challenge_activate_pass(p_user uuid,p_payment text) returns void language sql security invoker set search_path='' as $$ select challenge_private.activate_pass(p_user,p_payment) $$;
revoke all on function public.challenge_create(uuid),public.challenge_view(text),public.challenge_start(text),public.challenge_save(text,uuid,jsonb,integer),public.challenge_submit(text,uuid),public.challenge_result(text,uuid),public.challenge_activate_pass(uuid,text) from public,anon,authenticated;
grant execute on function public.challenge_view(text),public.challenge_start(text),public.challenge_save(text,uuid,jsonb,integer) to anon,authenticated;
grant execute on function public.challenge_create(uuid),public.challenge_submit(text,uuid),public.challenge_result(text,uuid) to authenticated;
grant execute on function public.challenge_activate_pass(uuid,text) to service_role;
commit;
