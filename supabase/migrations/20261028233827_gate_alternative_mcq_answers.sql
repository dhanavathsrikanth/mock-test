begin;
alter table public.questions drop constraint questions_correct_option_sets_check;
alter table public.questions add constraint questions_correct_option_sets_check check (
  correct_option_sets is null or case
    when question_type in ('MCQ','MSQ') and not marks_to_all and jsonb_typeof(correct_option_sets)='array' then
      jsonb_array_length(correct_option_sets) between 1 and 20
      and case when question_type='MCQ' then
        jsonb_build_array(correct_option)=correct_option_sets->0
        and not jsonb_path_exists(correct_option_sets, 'strict $[*] ? (@.type() != "array" || @.size() != 1)')
      else to_jsonb(correct_options)=correct_option_sets->0
        and not jsonb_path_exists(correct_option_sets, 'strict $[*] ? (@.type() != "array" || @.size() < 1 || @.size() > 4)') end
      and not jsonb_path_exists(correct_option_sets, '$[*][*] ? (@.type() != "number" || @ < 1 || @ > 4 || @ != @.floor())')
    else false end
);
comment on column public.questions.correct_option_sets is 'Alternative official complete answer sets. MCQ: each set contains exactly one option and correct_option mirrors the first. MSQ: correct_options mirrors the first set. Any one exact set earns full credit; no partial credit.';
commit;
