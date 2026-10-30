begin;
alter table public.questions
  add column question_type text not null default 'MCQ' check (question_type in ('MCQ','MSQ')),
  add column correct_options integer[],
  alter column correct_option drop not null;
alter table public.questions add constraint questions_answer_shape check (
  (question_type='MCQ' and correct_option is not null and correct_options is null)
  or (question_type='MSQ' and correct_option is null and correct_options is not null
      and cardinality(correct_options) between 2 and 4
      and correct_options <@ array[1,2,3,4] and negative_marks=0)
);
alter table public.test_answers add column selected_options integer[];
alter table public.test_answers add constraint test_answers_selection_shape check (
  selected_options is null or (selected_option is null and cardinality(selected_options) between 0 and 4 and selected_options <@ array[1,2,3,4])
);
commit;
