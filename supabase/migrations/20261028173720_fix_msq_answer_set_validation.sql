begin;
alter table public.questions drop constraint questions_correct_option_sets_check;
alter table public.questions add constraint questions_correct_option_sets_check check (
  correct_option_sets is null or case
    when question_type='MSQ' and not marks_to_all and jsonb_typeof(correct_option_sets)='array' then
      jsonb_array_length(correct_option_sets) between 1 and 20
      and to_jsonb(correct_options)=correct_option_sets->0
      and not jsonb_path_exists(correct_option_sets, 'strict $[*] ? (@.type() != "array" || @.size() < 1 || @.size() > 4)')
      and not jsonb_path_exists(correct_option_sets, '$[*][*] ? (@.type() != "number" || @ < 1 || @ > 4 || @ != @.floor())')
    else false end
);
commit;
