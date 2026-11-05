import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const admin = '00000000-0000-0000-0000-000000000001';
const student = '00000000-0000-0000-0000-000000000002';
const q = '10000000-0000-0000-0000-000000000001';
const migration = fs.readFileSync('supabase/migrations/20261105012708_smart_concept_diagnostics.sql', 'utf8');
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    create table public.profiles(id uuid primary key,role text);
    create table public.admin_profiles(user_id uuid primary key);
    alter table public.admin_profiles enable row level security;
    create policy own_membership on public.admin_profiles for select to authenticated using(user_id=auth.uid());
    grant select on public.admin_profiles to authenticated;
    create table public.questions(id uuid primary key,question_text text default 'Prompt');
    create table public.test_sessions(id uuid primary key default gen_random_uuid(), mode text not null default 'full_paper', total_questions integer,
      duration_minutes integer, question_ids uuid[], constraint test_sessions_mode_check check(mode in ('full_paper','sprint')));
    insert into profiles values ('${admin}','admin'),('${student}','admin');
    insert into admin_profiles values ('${admin}'); insert into questions values ('${q}');
    insert into test_sessions(total_questions,duration_minutes,question_ids) values(1,180,array['${q}'::uuid]);
  `);
  await db.exec(migration);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
  return db;
}

test('real PostgreSQL migration normalises tags and stamps the authenticated reviewer', async () => {
  const db = await setup();
  try {
    await db.query(`insert into question_smart_tags(question_id,core_concepts,common_error_triggers,reviewed,review_note,reviewed_by)
      values($1,array[' DAGs ','dags','Topological   sort'],array[' Boundary '],true,'Checked against the worked solution.',$2)`, [q,student]);
    const tag = (await db.query('select * from question_smart_tags')).rows[0];
    assert.equal(tag.core_concepts.length,2); assert.ok(tag.core_concepts.includes('Topological sort'));
    assert.equal(tag.reviewed_by,admin);
    await db.exec('reset role;');
    await db.query('update questions set question_text=$1 where id=$2',['Corrected prompt',q]);
    assert.equal((await db.query('select reviewed from question_smart_tags')).rows[0].reviewed,false,'edited content returns tags to draft');
    assert.equal((await db.query('select reviewed_by from question_smart_tags')).rows[0].reviewed_by,null);
  } finally { await db.close(); }
});
test('drafts and tag writes are protected by membership even when a student profile says admin', async () => {
  const db = await setup();
  try {
    await db.query(`insert into question_smart_tags(question_id,core_concepts) values($1,array['DAGs'])`,[q]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[student]);
    assert.equal((await db.query('select * from question_smart_tags')).rows.length,0);
    await assert.rejects(db.query(`insert into question_smart_tags(question_id,core_concepts) values($1,array['DAGs'])`,[q]),/row-level security/);
    assert.equal((await db.query(`update question_smart_tags set reviewed=true,review_note='forged' returning question_id`)).rows.length,0);
    await assert.rejects(db.query('delete from question_smart_tags'),/permission denied/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
    await db.query("update question_smart_tags set reviewed=true,review_note='Reviewed solution.'");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[student]);
    assert.equal((await db.query('select * from question_smart_tags')).rows.length,1);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from question_smart_tags'),/permission denied/);
  } finally { await db.close(); }
});
test('database rejects empty reviews, invalid tags and malformed concept-fix sessions; old sessions survive', async () => {
  const db = await setup();
  try {
    await assert.rejects(db.query(`insert into question_smart_tags(question_id,reviewed,review_note) values($1,true,'checked')`,[q]));
    await assert.rejects(db.query(`insert into question_smart_tags(question_id,core_concepts) values($1,array['a'])`,[q]));
    await assert.rejects(db.query(`insert into question_smart_tags(question_id,core_concepts) values($1,array['t1','t2','t3','t4','t5','t6','t7','t8','t9'])`,[q]));
    await db.exec('reset role;');
    await db.query(`insert into test_sessions(mode,total_questions,duration_minutes,question_ids,concept_label) values('concept_fix',1,10,array[$1::uuid],'DAGs')`,[q]);
    for (const values of [[4,10],[1,15],[0,10]]) await assert.rejects(db.query(`insert into test_sessions(mode,total_questions,duration_minutes,question_ids,concept_label) values('concept_fix',$1,$2,array[$3::uuid],'DAGs')`,[...values,q]));
    await assert.rejects(db.query(`insert into test_sessions(mode,total_questions,duration_minutes,question_ids) values('concept_fix',1,10,array[$1::uuid])`,[q]));
    assert.equal((await db.query("select count(*)::int n from test_sessions where mode='full_paper'")).rows[0].n,1);
  } finally { await db.close(); }
});
