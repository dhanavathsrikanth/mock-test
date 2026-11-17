-- Batch enrollment for spaced repetition revision
begin;

create or replace function revision_private.add_questions(p_questions uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare q uuid;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_questions is null or cardinality(p_questions) = 0 then return; end if;
  foreach q in array p_questions loop
    perform revision_private.enroll(auth.uid(), q, false);
  end loop;
end $$;

create or replace function public.revision_add_batch(p_questions uuid[]) returns void
language sql security invoker set search_path = '' as $$
  select revision_private.add_questions(p_questions);
$$;

revoke all on function public.revision_add_batch(uuid[]) from public, anon;
grant execute on function public.revision_add_batch(uuid[]) to authenticated;

commit;
