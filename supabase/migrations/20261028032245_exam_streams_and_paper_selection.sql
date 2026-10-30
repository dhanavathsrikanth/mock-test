begin;
alter table public.exams add column requires_stream boolean not null default false;
update public.exams set requires_stream=true where name='GATE 2027';

create table public.exam_streams (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  unique(exam_id,code), unique(id,exam_id)
);
alter table public.exam_streams enable row level security;
revoke all on public.exam_streams from anon, authenticated;
grant select on public.exam_streams to authenticated;
grant all on public.exam_streams to service_role;
create policy "Signed in users read active streams" on public.exam_streams for select to authenticated using (is_active);

-- Official GATE 2027 test papers; source https://gate2027.iitm.ac.in/exam_papers_and_syllabus
insert into public.exam_streams(exam_id,code,name)
select e.id,v.code,v.name from public.exams e cross join (values
('AE','Aerospace Engineering'),('AG','Agricultural Engineering'),('AR','Architecture and Planning'),
('BM','Biomedical Engineering'),('BT','Biotechnology'),('CE','Civil Engineering'),('CH','Chemical Engineering'),
('CS','Computer Science and Information Technology'),('CY','Chemistry'),('DA','Data Science and Artificial Intelligence'),
('EC','Electronics and Communication Engineering'),('EE','Electrical Engineering'),('ES','Environmental Science and Engineering'),
('EY','Ecology and Evolution'),('GE','Geomatics Engineering'),('GG','Geology and Geophysics'),('IN','Instrumentation Engineering'),
('MA','Mathematics'),('ME','Mechanical Engineering'),('MN','Mining Engineering'),('MT','Metallurgical Engineering'),
('NM','Naval Architecture and Marine Engineering'),('PE','Petroleum Engineering'),('PH','Physics'),
('PI','Production and Industrial Engineering'),('RA','Robotics and Automation'),('ST','Statistics'),
('XE','Engineering Sciences'),('XH','Humanities and Social Sciences'),('XL','Life Sciences')
) v(code,name) where e.name='GATE 2027';

alter table public.profiles add column target_stream_id uuid;
alter table public.profiles add constraint profiles_target_stream_exam_fk foreign key(target_stream_id,target_exam_id) references public.exam_streams(id,exam_id);
alter table public.subjects add column stream_id uuid;
alter table public.subjects add constraint subjects_stream_exam_fk foreign key(stream_id,exam_id) references public.exam_streams(id,exam_id);
alter table public.questions add column stream_id uuid;
alter table public.questions add constraint questions_stream_exam_fk foreign key(stream_id,exam_id) references public.exam_streams(id,exam_id);
alter table public.test_sessions add column stream_id uuid;
alter table public.test_sessions add column paper text;
alter table public.test_sessions add column topic_id uuid references public.topics(id);
alter table public.test_sessions add constraint test_sessions_stream_exam_fk foreign key(stream_id,exam_id) references public.exam_streams(id,exam_id);
alter table public.test_sessions drop constraint test_sessions_mode_check;
alter table public.test_sessions add constraint test_sessions_mode_check check(mode in ('full_mock','full_paper','subject_wise','topic_wise','custom'));

update public.questions q set stream_id=s.id from public.exam_streams s
where q.exam_id=s.exam_id and s.code='CE' and q.paper in ('CE1','CE2');
-- General Aptitude is a shared subject; each sourced GA question still belongs to its paper's stream.
update public.subjects sub set stream_id=s.id from public.exam_streams s
where sub.exam_id=s.exam_id and s.code='CE' and sub.name<>'General Aptitude';
-- All previously imported GATE questions belong to CE. Preserve legacy test snapshots and timing.
update public.test_sessions t set stream_id=s.id from public.exam_streams s
where t.exam_id=s.exam_id and s.code='CE' and not exists(
  select 1 from public.questions q where q.exam_id=t.exam_id and q.stream_id is distinct from s.id
);
create index questions_stream_paper_pool on public.questions(exam_id,stream_id,year,paper);
create index subjects_stream_lookup on public.subjects(exam_id,stream_id);
create index test_sessions_user_stream on public.test_sessions(user_id,exam_id,stream_id);
create index profiles_target_stream on public.profiles(target_stream_id);
create index test_sessions_topic_lookup on public.test_sessions(topic_id);
create index exam_streams_exam_lookup on public.exam_streams(exam_id);

-- Keep every import, including the existing reproducible CE builders, stream-aware.
create function public.assign_question_stream() returns trigger language plpgsql security invoker set search_path='' as $$
declare subject_stream uuid;
begin
  if new.stream_id is null then
    select stream_id into subject_stream from public.subjects where id=new.subject_id and exam_id=new.exam_id;
    new.stream_id:=subject_stream;
    if new.stream_id is null and new.paper in ('CE1','CE2') then
      select id into new.stream_id from public.exam_streams where exam_id=new.exam_id and code='CE';
    end if;
  end if;
  if exists(select 1 from public.exams where id=new.exam_id and requires_stream) and new.stream_id is null then
    raise exception 'A stream is required for questions in this exam';
  end if;
  if new.stream_id is not null and exists(select 1 from public.subjects where id=new.subject_id and (exam_id<>new.exam_id or (stream_id is not null and stream_id<>new.stream_id))) then
    raise exception 'Question subject does not belong to its stream';
  end if;
  return new;
end $$;
create trigger assign_question_stream before insert or update of exam_id,subject_id,stream_id,paper on public.questions for each row execute function public.assign_question_stream();

-- The live database still has a global daily-date key. Scope daily assignments by exam and stream.
alter table public.daily_questions add column if not exists exam_id uuid references public.exams(id);
alter table public.daily_questions add column stream_id uuid;
alter table public.daily_questions add constraint daily_questions_stream_exam_fk foreign key(stream_id,exam_id) references public.exam_streams(id,exam_id);
update public.daily_questions d set exam_id=q.exam_id,stream_id=q.stream_id from public.questions q where q.id=d.question_id;
alter table public.daily_questions alter column exam_id set not null;
alter table public.daily_questions drop constraint if exists daily_questions_assigned_date_key;
alter table public.daily_questions drop constraint if exists daily_questions_exam_date_key;
create unique index daily_questions_exam_stream_date on public.daily_questions(exam_id,stream_id,assigned_date) nulls not distinct;
create or replace function public.set_daily_question_exam() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  select exam_id,stream_id into strict new.exam_id,new.stream_id from public.questions where id=new.question_id;
  return new;
end $$;
drop trigger if exists daily_question_exam on public.daily_questions;
create trigger daily_question_exam before insert or update of question_id,exam_id,stream_id on public.daily_questions for each row execute function public.set_daily_question_exam();
commit;
