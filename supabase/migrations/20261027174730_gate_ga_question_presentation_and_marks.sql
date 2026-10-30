begin;

alter table public.questions
  add column marks numeric not null default 1 check (marks > 0),
  add column negative_marks numeric not null default 0 check (negative_marks >= 0 and negative_marks <= marks),
  add column source_question_number integer check (source_question_number > 0),
  add column source_metadata jsonb not null default '{}'::jsonb,
  add column image_width integer check (image_width > 0),
  add column image_height integer check (image_height > 0),
  add column option_images jsonb not null default '[]'::jsonb check (jsonb_typeof(option_images) = 'array');

create unique index questions_source_identity
  on public.questions(exam_id, year, paper, source_question_number)
  where source_question_number is not null;

-- Persist the exact question set and order so reloading a test cannot reshuffle it.
alter table public.test_sessions add column question_ids uuid[];

commit;
