import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
function load(file,imports={},globals={}) {
  const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,Date,console,Buffer,process,...globals,require:name=>imports[name]??require(name)});return exports;
}
const drafts=load('lib/challenges.ts');
const responses=load('lib/question-response.ts');
const migration=fs.readFileSync('supabase/migrations/20261105014126_shareable_challenge_links.sql','utf8');
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const user=uid(1), opponent=uid(2), stranger=uid(3), source=uid(20);
const qs=Array.from({length:5},(_,i)=>({id:uid(100+i),exam_id:uid(10),question_text:`Question ${i+1}`,option_1:'A',option_2:'B',option_3:'C',option_4:'D',
  question_type:i===3?'MSQ':i===4?'NAT':'MCQ',correct_option:1,correct_options:i===3?[1,3]:null,correct_option_sets:null,
  answer_min:i===4?3:null,answer_max:i===4?3.1:null,answer_decimal_places:2,answer_ranges:null,marks:2,negative_marks:2/3,explanation:'SECRET_SOLUTION',marks_to_all:false}));
async function fixture(){
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table profiles(id uuid primary key,full_name text);create table exams(id uuid primary key,name text);create table exam_streams(id uuid primary key,name text);
    create table subjects(id uuid primary key,name text);create table topics(id uuid primary key,name text);
    create table questions(id uuid primary key,exam_id uuid,question_text text,option_1 text,option_2 text,option_3 text,option_4 text,question_type text,correct_option integer,
      correct_options integer[],correct_option_sets jsonb,answer_min numeric,answer_max numeric,answer_ranges jsonb,answer_decimal_places integer,marks numeric,negative_marks numeric,explanation text,marks_to_all boolean);
    create table test_sessions(id uuid primary key default gen_random_uuid(),user_id uuid,exam_id uuid,stream_id uuid,subject_id uuid,topic_id uuid,mode text,total_questions integer,duration_minutes integer,
      question_ids uuid[],status text,started_at timestamptz default now(),completed_at timestamptz,sprint_active_seconds integer);
    create table test_answers(session_id uuid,question_id uuid,selected_option integer,selected_options integer[],numeric_answer text,is_correct boolean);
    insert into profiles values('${user}','Rohan Kumar'),('${opponent}','Opponent'),('${stranger}','Stranger');insert into exams values('${uid(10)}','GATE');`);
  for(const q of qs) await db.query(`insert into questions select * from jsonb_populate_record(null::questions,$1::jsonb)`,[JSON.stringify(q)]);
  await db.query(`insert into test_sessions(id,user_id,exam_id,mode,total_questions,duration_minutes,question_ids,status,sprint_active_seconds) values($1,$2,$3,'sprint',5,12,$4,'completed',412)`,[source,user,uid(10),qs.map(q=>q.id)]);
  for(const q of qs) await db.query('insert into test_answers(session_id,question_id,selected_option,is_correct) values($1,$2,2,true)',[source,q.id]);
  await db.exec(migration);
  await db.exec(fs.readFileSync('supabase/migrations/20261105020450_free_challenge_solutions.sql','utf8'));
  const login=async id=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);};
  await login(user);
  const call=async(sql,args=[]) => (await db.query(`select ${sql} as value`,args)).rows[0].value;
  return {db,login,call};
}

test('guest drafts survive reload and blocked storage fails safely; timer does not pause in hidden tabs',()=>{
  const items=new Map(),storage={getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v)};
  const d={version:1,challengeId:'ch_'+'a'.repeat(32),token:uid(90),startedAt:new Date().toISOString(),answers:{[qs[0].id]:[1,3],[qs[4].id]:'-.'},currentIndex:4};
  assert.equal(drafts.saveChallengeDraft(storage,d),true);
  assert.deepEqual(JSON.parse(JSON.stringify(drafts.readChallengeDraft(storage,d.challengeId))),d);
  assert.equal(drafts.readChallengeDraft(storage,'ch_'+'b'.repeat(32)),null);
  assert.equal(drafts.saveChallengeDraft({setItem(){throw Error('blocked');}},d),false);
  assert.equal(drafts.challengeSeconds('2026-11-05T00:00:00Z',12,Date.parse('2026-11-05T00:20:00Z')),720);
  items.set(drafts.challengeKey(d.challengeId),'{broken');assert.equal(drafts.readChallengeDraft(storage,d.challengeId),null);
});

test('database grading agrees with GATE MCQ/MSQ/NAT keys and does not award partial MSQ credit',async()=>{
  const {db,call}=await fixture();
  try {
    const cases=[...qs.flatMap(q=>[null,1,2,[1,3],'3','3.1','3.11','3.000','-.'].map(a=>[q,a])),
      [{...qs[0],correct_option_sets:[[1],[2]]},2],[{...qs[3],correct_option_sets:[[1,3],[2,4]]},[2,4]],
      [{...qs[4],answer_ranges:[{min:0,max:0},{min:4,max:5}]},'4.5'],[{...qs[0],marks_to_all:true},null]];
    for(const [q,a] of cases) assert.equal(await call('challenge_private.grade($1::jsonb,$2::jsonb)',[JSON.stringify(q),JSON.stringify(a)]),responses.gradeResponse(q,a),JSON.stringify({q:q.question_type,a}));
    const result=await call('challenge_private.evaluate($1,$2)',[JSON.stringify(qs),JSON.stringify({[qs[0].id]:2,[qs[1].id]:2,[qs[2].id]:2,[qs[3].id]:[1]})]);
    assert.equal(result.net,-2,'only the three wrong MCQs deduct marks');assert.equal(result.wrong,4);
  }finally{await db.close();}
});

test('guest-to-Google handoff is private, immutable, atomic and idempotent; completed owners get free solutions',async()=>{
  const {db,login,call}=await fixture();
  try{
    const id=await call('challenge_create($1)',[source]);
    assert.match(id,/^ch_[a-f0-9]{32}$/);assert.equal(await call('challenge_create($1)',[source]),id);
    const c=await call('challenge_view($1)',[id]);assert.equal(c.creatorName,'Rohan');assert.equal(c.creatorScore,-2,'ignore forged saved correctness flags');
    assert.equal(c.questions.length,5);assert.ok(!JSON.stringify(c).includes('SECRET'));assert.ok(!JSON.stringify(c).includes('correct_option'));
    await db.exec('set role anon');await assert.rejects(db.exec('select * from challenge_private.challenges'));
    await assert.rejects(call('challenge_create($1)',[source]));
    const turn=await call('challenge_start($1)',[id]);
    const answers=Object.fromEntries(qs.map((q,i)=>[q.id,i===3?[1,3]:i===4?'3.05':1]));
    await assert.rejects(call('challenge_save($1,$2,$3,10)',[id,turn.token,JSON.stringify({foreign:1})]));
    await call('challenge_save($1,$2,$3,10)',[id,turn.token,JSON.stringify(answers)]);
    await call('challenge_save($1,$2,$3,10)',[id,turn.token,JSON.stringify({})]);
    await assert.rejects(call('challenge_submit($1,$2)',[id,turn.token]));
    await db.exec('reset role');await login(opponent);await db.exec('set role authenticated');
    const sid=await call('challenge_submit($1,$2)',[id,turn.token]);assert.equal(await call('challenge_submit($1,$2)',[id,turn.token]),sid);
    let result=await call('challenge_result($1,$2)',[id,sid]);assert.equal(result.result.net,10);assert.equal(result.unlocked,true);assert.equal(result.solutions.length,5);
    await assert.rejects(call('challenge_activate_pass($1,$2)',[opponent,'pay_forged']));
    await db.exec('reset role');await login(stranger);await db.exec('set role authenticated');
    assert.equal(await call('challenge_result($1,$2)',[id,sid]),null);await assert.rejects(call('challenge_submit($1,$2)',[id,turn.token]));
    await db.exec('reset role');await db.exec('set role service_role');await call('challenge_activate_pass($1,$2)',[opponent,'pay_verified']);
    await db.exec('reset role');await login(opponent);await db.exec('set role authenticated');result=await call('challenge_result($1,$2)',[id,sid]);assert.equal(result.unlocked,true);assert.equal(result.solutions.length,5);
    await db.exec('reset role');await db.exec('delete from challenge_private.passes');
    result=await call('challenge_result($1,$2)',[id,sid]);assert.equal(result.solutions.length,5,'free access does not depend on a pass');
    assert.equal((await db.query('select count(*)::integer n from test_sessions')).rows[0].n,2);
    assert.equal((await db.query('select count(*)::integer n from test_answers where session_id=$1',[sid])).rows[0].n,5);
    // Bank edits do not change a published challenge or its opponent's re-share.
    await db.exec("update questions set explanation='EDITED',correct_option=4");
    const reshared=await call('challenge_create($1)',[sid]);assert.equal((await call('challenge_view($1)',[reshared])).creatorScore,10);
  }finally{await db.close();}
});

test('stale recovery payloads expire; a different token cannot retrieve or claim a turn',async()=>{
  const {db,call,login}=await fixture();
  try{
    const id=await call('challenge_create($1)',[source]),turn=await call('challenge_start($1)',[id]);
    await call('challenge_save($1,$2,$3,5)',[id,turn.token,'{}']);
    await db.query("update challenge_private.turns set expires_at=now()-interval '1 second' where token=$1",[turn.token]);await login(opponent);
    await assert.rejects(call('challenge_submit($1,$2)',[id,turn.token]),/expired/);
    await assert.rejects(call('challenge_submit($1,$2)',[id,uid(999)]),/not found/);
  }finally{await db.close();}
});

test('payment HMAC validation rejects malformed and forged signatures',()=>{
  const payments=load('lib/challenge-payments.ts',{'@/lib/supabase/cron':{}});
  const crypto=require('node:crypto'),secret='test-secret',body='order_123|pay_123';
  const sig=crypto.createHmac('sha256',secret).update(body).digest('hex');
  assert.equal(payments.validPaymentSignature(body,sig,secret),true);
  assert.equal(payments.validPaymentSignature(body+'x',sig,secret),false);
  assert.equal(payments.validPaymentSignature(body,'00',secret),false);
});

test('a pass is granted only for a captured ₹199 INR payment bound to the same account and product',async()=>{
  const grants=[];
  let payment={id:'pay_verified',order_id:'order_verified',status:'captured',amount:19900,currency:'INR',amount_refunded:0};
  let order={id:'order_verified',amount:19900,currency:'INR',notes:{user_id:user,product:'challenge_pass_v1'}};
  const payments=load('lib/challenge-payments.ts',{'@/lib/supabase/cron':{createCronClient:()=>({rpc:async(name,args)=>{grants.push({name,args});return {error:null};}})}},
    {AbortSignal,fetch:async url=>({ok:true,json:async()=>url.includes('/payments/')?payment:order})});
  await assert.rejects(payments.activateCapturedPayment('pay_verified',opponent),/does not belong/);assert.equal(grants.length,0);
  payment={...payment,status:'authorized'};await assert.rejects(payments.activateCapturedPayment('pay_verified',user),/not been captured/);
  payment={...payment,status:'captured',amount:199};await assert.rejects(payments.activateCapturedPayment('pay_verified',user));
  payment={...payment,amount:19900,currency:'USD'};await assert.rejects(payments.activateCapturedPayment('pay_verified',user));
  payment={...payment,currency:'INR',amount_refunded:100};await assert.rejects(payments.activateCapturedPayment('pay_verified',user));
  payment={...payment,amount_refunded:0};order={...order,notes:{...order.notes,product:'another_product'}};
  await assert.rejects(payments.activateCapturedPayment('pay_verified',user));assert.equal(grants.length,0);
  order={...order,notes:{...order.notes,product:'challenge_pass_v1'}};await payments.activateCapturedPayment('pay_verified',user);
  assert.equal(grants.length,1);assert.equal(grants[0].args.p_user,user);assert.equal(grants[0].args.p_payment,'pay_verified');
});
