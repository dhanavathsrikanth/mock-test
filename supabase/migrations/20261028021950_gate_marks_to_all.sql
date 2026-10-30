begin;
alter table public.questions add column marks_to_all boolean not null default false;
alter table public.questions drop constraint questions_answer_shape;
alter table public.questions add constraint questions_answer_shape check (
  (marks_to_all and question_type='MCQ' and correct_option is null and correct_options is null
    and answer_min is null and answer_max is null and negative_marks=0
    and option_1 is not null and option_2 is not null and option_3 is not null and option_4 is not null)
  or (not marks_to_all and (
    (question_type='MCQ' and correct_option is not null and correct_options is null and answer_min is null and answer_max is null
      and option_1 is not null and option_2 is not null and option_3 is not null and option_4 is not null)
    or (question_type='MSQ' and correct_option is null and correct_options is not null
      and cardinality(correct_options) between 1 and 4 and correct_options <@ array[1,2,3,4]
      and answer_min is null and answer_max is null and negative_marks=0
      and option_1 is not null and option_2 is not null and option_3 is not null and option_4 is not null)
    or (question_type='NAT' and correct_option is null and correct_options is null
      and answer_min is not null and answer_max is not null and answer_min<=answer_max and negative_marks=0
      and option_1 is null and option_2 is null and option_3 is null and option_4 is null)
  ))
);
comment on column public.questions.marks_to_all is 'Official answer key MTA: full marks for every candidate, including an unattempted question. No option is designated correct.';
commit;
