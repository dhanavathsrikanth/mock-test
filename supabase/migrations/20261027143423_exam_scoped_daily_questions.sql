begin;

alter table public.daily_questions
  add column exam_id uuid references public.exams(id) on delete cascade;

update public.daily_questions as daily
set exam_id = question.exam_id
from public.questions as question
where question.id = daily.question_id;

alter table public.daily_questions alter column exam_id set not null;

-- Remove the old one-question-per-date constraint, regardless of its name.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.daily_questions'::regclass
      and c.contype = 'u'
      and c.conkey = array[(select attnum from pg_attribute
        where attrelid = 'public.daily_questions'::regclass and attname = 'assigned_date')]
  loop
    execute format('alter table public.daily_questions drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.daily_questions
  add constraint daily_questions_exam_date_key unique (exam_id, assigned_date);

-- Existing admin scheduling can continue supplying only question_id and date.
create function public.set_daily_question_exam()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  select exam_id into strict new.exam_id from public.questions where id = new.question_id;
  return new;
end;
$$;

create trigger daily_question_exam
before insert or update of question_id, exam_id on public.daily_questions
for each row execute function public.set_daily_question_exam();

commit;
