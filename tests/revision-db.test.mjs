import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = fs.readFileSync('supabase/migrations/20261104161916_automated_revision_loop.sql', 'utf8');
const fixture = `
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.profiles (id uuid primary key);
create table public.exams (id uuid primary key);
create table public.questions (id uuid primary key default gen_random_uuid(), exam_id uuid references exams(id), stream_id uuid,
  question_text text, question_type text default 'MCQ', marks_to_all boolean not null default false);
create table public.test_sessions (id uuid primary key default gen_random_uuid(), user_id uuid, status text default 'in_progress');
create table public.test_answers (id uuid primary key default gen_random_uuid(), session_id uuid, question_id uuid references questions(id), is_correct boolean);
create table public.bookmarks (user_id uuid, question_id uuid references questions(id));
create table public.daily_questions (id uuid primary key default gen_random_uuid(), question_id uuid);
create table public.daily_question_answers (user_id text, daily_question_id uuid, is_correct boolean);
create table public.spaced_repetition (id uuid primary key default gen_random_uuid(), user_id text not null, question_id uuid references questions(id) on delete cascade,
  interval_days integer not null default 0, ease_factor real not null default 2.5, repetition_count integer not null default 0,
  next_review_date date not null, last_reviewed_at timestamptz, created_at timestamptz not null default now());
create table public.streaks (user_id uuid primary key, current_streak integer not null default 0, longest_streak integer not null default 0,
  freeze_tokens integer not null default 1, last_activity_date date, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.xp_transactions (user_id uuid, amount integer, reason text, metadata jsonb);
create table public.user_levels (user_id uuid primary key, total_xp integer not null default 0, current_level integer default 0, level_name text default 'Trainee', updated_at timestamptz default now());
insert into profiles values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into exams values ('10000000-0000-0000-0000-000000000001'), ('10000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
`;
const user = '00000000-0000-0000-0000-000000000001';
const exam = '10000000-0000-0000-0000-000000000001';
const otherExam = '10000000-0000-0000-0000-000000000002';
async function setup() {
  const db = new PGlite();
  await db.exec(fixture);
  await db.exec(migration);
  return db;
}
async function question(db, type = 'MCQ', examId = exam) {
  return (await db.query('insert into questions(exam_id, question_type) values ($1,$2) returning id', [examId, type])).rows[0].id;
}
async function due(db, id, stage = 1) {
  await db.query(`insert into spaced_repetition(user_id, question_id, next_review_date, stage) values ($1,$2, revision_private.today(),$3)`, [user, id, stage]);
}
async function queue(db, examId = exam) {
  return (await db.query('select public.revision_queue($1,null) as value', [examId])).rows[0].value;
}
async function answer(db, id, correct, day) {
  return (await db.query('select public.revision_answer($1,$2,$3) as value', [id, correct, day])).rows[0].value;
}

test('migration enrolls only wrong answers on completion, plus bookmarks and daily mistakes', async () => {
  const db = await setup();
  try {
    const ids = await Promise.all(['MCQ','MSQ','NAT','MCQ','MCQ'].map(type => question(db, type)));
    const session = (await db.query('insert into test_sessions(user_id) values ($1) returning id', [user])).rows[0].id;
    for (const [i, correct] of [false, false, false, true, null].entries()) await db.query('insert into test_answers(session_id,question_id,is_correct) values($1,$2,$3)', [session,ids[i],correct]);
    assert.equal((await db.query('select count(*)::int as n from spaced_repetition')).rows[0].n, 0);
    await db.query("update test_sessions set status = 'completed' where id = $1", [session]);
    assert.equal((await db.query('select count(*)::int as n from spaced_repetition')).rows[0].n, 3);
    await db.query('insert into bookmarks values ($1,$2)', [user,ids[3]]);
    const daily = (await db.query('insert into daily_questions(question_id) values ($1) returning id', [ids[4]])).rows[0].id;
    await db.query('insert into daily_question_answers values ($1,$2,false)', [user,daily]);
    assert.equal((await db.query('select count(*)::int as n from spaced_repetition')).rows[0].n, 5);
    assert.equal((await queue(db)).questions.length, 0, 'new mistakes start tomorrow');
    await db.query('update spaced_repetition set stage = 4 where question_id = $1', [ids[3]]);
    await db.query('select revision_add($1)', [ids[3]]);
    assert.equal((await db.query('select stage from spaced_repetition where question_id = $1',[ids[3]])).rows[0].stage, 4, 'bookmark retries preserve progress');
    const nextSession = (await db.query('insert into test_sessions(user_id) values ($1) returning id', [user])).rows[0].id;
    await db.query('insert into test_answers(session_id,question_id,is_correct) values($1,$2,false)', [nextSession,ids[3]]);
    await db.query("update test_sessions set status='completed' where id=$1", [nextSession]);
    assert.equal((await db.query('select stage from spaced_repetition where question_id=$1',[ids[3]])).rows[0].stage,1,'a new test mistake resets existing progress');
  } finally { await db.close(); }
});

test('daily cap persists across reloads and exams; lower stages take priority', async () => {
  const db = await setup();
  try {
    for (let i=0;i<24;i++) { const id = await question(db, ['MCQ','MSQ','NAT'][i%3]); await due(db,id,i<4?5:1); }
    const other = await question(db,'MCQ',otherExam); await due(db,other);
    const first = await queue(db);
    assert.equal(first.questions.length,20); assert.equal(first.summary.deferredCount,4);
    assert.ok(first.questions.every(q => q.stage === 1));
    assert.deepEqual((await queue(db)).questions.map(q=>q.id), first.questions.map(q=>q.id));
    assert.equal((await queue(db,otherExam)).questions.length,0,'switching exams cannot bypass cap');
    const item = first.questions[0];
    const saved = await answer(db,item.question.id,true,first.reviewDate);
    assert.equal(saved.stage,2); assert.equal(saved.xpAwarded,10);
    const replay = await answer(db,item.question.id,false,first.reviewDate);
    assert.equal(replay.alreadySaved,true); assert.equal(replay.xpAwarded,0);
    assert.equal((await queue(db)).questions.length,19,'reviewed questions are not replaced with backlog');
    assert.equal((await db.query('select count(*)::int as n from xp_transactions')).rows[0].n,1);
    assert.equal((await db.query('select total_xp from user_levels')).rows[0].total_xp,10);
    await assert.rejects(answer(db,other,true,first.reviewDate));
    await assert.rejects(answer(db,first.questions[1].question.id,true,'2000-01-01'));
    await db.exec(`select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false)`);
    assert.equal((await queue(db)).questions.length,0,'another user cannot see the first queue');
    await assert.rejects(answer(db,item.question.id,true,first.reviewDate));
  } finally { await db.close(); }
});

test('all five transitions, reset, graduation, persisted XP and completion streak are atomic', async () => {
  const db = await setup();
  try {
    const ids=[];
    for(let stage=1;stage<=5;stage++) { const id=await question(db); ids.push(id); await due(db,id,stage); }
    const wrong=await question(db); await due(db,wrong,4);
    const first=await queue(db);
    for(let i=0;i<5;i++) {
      const result=await answer(db,ids[i],true,first.reviewDate);
      assert.equal(result.stage,Math.min(i+2,5)); assert.equal(result.mastered,i===4);
      if(i<4) assert.equal((new Date(result.nextReviewDate)-new Date(first.reviewDate))/86400000,[3,7,14,30][i]);
    }
    const reset=await answer(db,wrong,false,first.reviewDate);
    assert.equal(reset.stage,1); assert.equal(reset.xpAwarded,5); assert.equal(reset.queueComplete,true);
    const summary=(await queue(db)).summary;
    assert.equal(summary.xpEarned,55); assert.equal(summary.completedCount,6); assert.equal(summary.queueComplete,true);
    const streak=(await db.query('select * from streaks')).rows[0]; assert.equal(streak.current_streak,1); assert.equal(streak.last_activity_date.toISOString().slice(0,10),first.reviewDate);
    await db.query('select revision_add($1)',[ids[4]]);
    const revived=(await db.query('select stage,mastered_at from spaced_repetition where question_id=$1',[ids[4]])).rows[0];
    assert.equal(revived.stage,1); assert.equal(revived.mastered_at,null);
  } finally { await db.close(); }
});

test('anonymous calls and direct authenticated writes to private manifests are rejected', async () => {
  const db = await setup();
  try {
    await db.exec(`select set_config('request.jwt.claim.sub','',false)`);
    await assert.rejects(queue(db));
    await db.exec('set role authenticated');
    await assert.rejects(db.exec('select * from revision_private.daily_queues'));
    await assert.rejects(db.exec('update public.spaced_repetition set stage = 5'));
    await db.exec('reset role');
    await db.exec(`select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`);
    assert.equal((await queue(db)).questions.length,0,'authenticated wrapper can allocate its own queue');
    await db.exec('reset role');
  } finally { await db.close(); }
});

test('a reward write failure rolls back scheduling, completion, and streak changes', async () => {
  const db = await setup();
  try {
    const id=await question(db); await due(db,id,5);
    const first=await queue(db);
    await db.exec('alter table xp_transactions add constraint force_test_failure check (amount < 1)');
    await assert.rejects(answer(db,id,true,first.reviewDate));
    const record=(await db.query('select stage,mastered_at from spaced_repetition where question_id=$1',[id])).rows[0];
    assert.equal(record.stage,5); assert.equal(record.mastered_at,null);
    assert.equal((await queue(db)).summary.completedCount,0);
    assert.equal((await db.query('select count(*)::int as n from streaks')).rows[0].n,0);
  } finally { await db.close(); }
});
