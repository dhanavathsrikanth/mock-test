begin;
-- Free access applies only to the signed-in owner of a completed turn.
create or replace function challenge_private.result(p_id text,p_session uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare t challenge_private.turns; c challenge_private.challenges; shared jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to see your result'; end if;
  select * into t from challenge_private.turns where challenge_id=p_id and session_id=p_session and user_id=auth.uid();
  if not found then return null; end if;
  select * into c from challenge_private.challenges where id=p_id;
  select coalesce(jsonb_agg(n),'[]') into shared from jsonb_array_elements(c.questions) with ordinality x(q,n)
    where c.creator_result->'questions'->(q->>'id')='false'::jsonb and t.result->'questions'->(q->>'id')='false'::jsonb;
  return jsonb_build_object('result',t.result,'seconds',t.payload->'seconds','sharedMistakes',shared,'unlocked',true,
    'solutions',(select jsonb_agg(jsonb_build_object('number',n,'explanation',q->>'explanation') order by n)
      from jsonb_array_elements(c.questions) with ordinality x(q,n)));
end $$;
revoke all on function challenge_private.result(text,uuid) from public,anon;
grant execute on function challenge_private.result(text,uuid) to authenticated;
commit;
