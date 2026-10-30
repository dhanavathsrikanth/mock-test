alter table public.questions
  add column if not exists organising_institute text;

comment on column public.questions.organising_institute is
  'Organising institute of the source examination paper, not the preparation target year.';
