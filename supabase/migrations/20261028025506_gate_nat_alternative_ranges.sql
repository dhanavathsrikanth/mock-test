-- Separate inclusive intervals; never flatten a disjoint key to its envelope.
alter table public.questions add column answer_ranges jsonb;
comment on column public.questions.answer_ranges is 'Optional NAT union of inclusive numeric {min,max} intervals. Legacy answer_min/max retain the first interval.';
alter table public.questions add constraint questions_answer_ranges_check check (
  answer_ranges is null or case
    when question_type = 'NAT' and jsonb_typeof(answer_ranges) = 'array'
      and jsonb_array_length(answer_ranges) between 1 and 20
      and not jsonb_path_exists(answer_ranges, '$[*] ? (@.type() != "object" || !exists(@.min) || !exists(@.max) || @.min.type() != "number" || @.max.type() != "number" || @.min > @.max)')
    then (answer_ranges->0->>'min')::numeric = answer_min
      and (answer_ranges->0->>'max')::numeric = answer_max
    else false end
);
