begin;
alter table public.questions
  add column answer_min numeric,
  add column answer_max numeric,
  add column answer_decimal_places integer check (answer_decimal_places between 0 and 10),
  alter column option_1 drop not null,
  alter column option_2 drop not null,
  alter column option_3 drop not null,
  alter column option_4 drop not null,
  drop constraint questions_question_type_check,
  drop constraint questions_answer_shape;
alter table public.questions add constraint questions_question_type_check check (question_type in ('MCQ','MSQ','NAT'));
alter table public.questions add constraint questions_answer_shape check (
  (question_type='MCQ' and correct_option is not null and correct_options is null and answer_min is null and answer_max is null
    and option_1 is not null and option_2 is not null and option_3 is not null and option_4 is not null)
  or (question_type='MSQ' and correct_option is null and correct_options is not null
    and cardinality(correct_options) between 1 and 4 and correct_options <@ array[1,2,3,4]
    and answer_min is null and answer_max is null and negative_marks=0
    and option_1 is not null and option_2 is not null and option_3 is not null and option_4 is not null)
  or (question_type='NAT' and correct_option is null and correct_options is null
    and answer_min is not null and answer_max is not null and answer_min<=answer_max and negative_marks=0
    and option_1 is null and option_2 is null and option_3 is null and option_4 is null)
);
alter table public.test_answers add column numeric_answer text;
alter table public.test_answers add constraint test_answers_numeric_response check (
  numeric_answer is null or (selected_option is null and selected_options is null
    and length(numeric_answer)<=64 and numeric_answer ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$')
);
comment on column public.questions.answer_min is 'Inclusive lower bound from the official NAT answer key.';
comment on column public.questions.answer_max is 'Inclusive upper bound from the official NAT answer key.';
comment on column public.test_answers.numeric_answer is 'Submitted decimal text; preserves zero, sign and precision without floating-point conversion.';
commit;
