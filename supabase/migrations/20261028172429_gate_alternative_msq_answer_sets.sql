begin;
alter table public.questions add column correct_option_sets jsonb;
alter table public.questions add constraint questions_correct_option_sets_check check (
  correct_option_sets is null or case
    when question_type='MSQ' and not marks_to_all and jsonb_typeof(correct_option_sets)='array' then
      jsonb_array_length(correct_option_sets) between 1 and 20
      and to_jsonb(correct_options)=correct_option_sets->0
      and not jsonb_path_exists(correct_option_sets, '$[*] ? (@.type() != "array" || @.size() < 1 || @.size() > 4)')
      and not jsonb_path_exists(correct_option_sets, '$[*][*] ? (@.type() != "number" || @ < 1 || @ > 4 || @ != @.floor())')
    else false end
);
comment on column public.questions.correct_option_sets is 'Alternative complete MSQ answer sets from an official key. Any one exact set earns full credit; no partial credit. correct_options mirrors the first set.';
notify pgrst, 'reload schema';
commit;
