import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const require = createRequire(import.meta.url);
export function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  }}).outputText, { exports, console, ...globals, require: name => imports[name] ?? require(name) });
  return exports;
}
const scope = load('lib/stream-scope.ts');
const testPool = load('lib/test-pool.ts', { './stream-scope': scope });
const engine = load('lib/micro-practice.ts', { './test-pool': testPool });
const drafts = load('lib/sprint-draft.ts');
const topics = [{id:'graphs',parent_id:null,subject_id:'math',name:'Graphs'}, {id:'trees',parent_id:'graphs',subject_id:'math',name:'Trees'}, {id:'fluids',parent_id:null,subject_id:'mechanics',name:'Fluids'}];
const pool = ['MCQ','MCQ','MCQ','MCQ','MSQ','NAT'].map((type,i) => ({id:`q${i}`,subject_id:'math',topic_id:'trees',year:2021+i,paper:'CS1',source_question_number:i+1,marks:2,question_type:type}));
const selected = {examId:'gate',streamId:'cs',subjectId:'math',topicId:'graphs',yearFrom:2021,yearTo:2026,minutes:15};

test('missing sprint setup, permissions and stale questions produce distinct actionable errors', () => {
  assert.match(engine.sprintCreationMessage({code:'23514',message:'new row violates check constraint "test_sessions_mode_check"'}),/not enabled/);
  assert.match(engine.sprintCreationMessage({code:'PGRST204'}),/not enabled/);
  assert.match(engine.sprintCreationMessage({code:'42501'}),/account cannot/);
  assert.match(engine.sprintCreationMessage({code:'23503'}),/Refresh/);
  assert.match(engine.sprintCreationMessage({code:'23514',message:'sprint_session_shape'}),/retry/);
});

test('sprints use exactly 3 MCQs, 1 MSQ and 1 NAT from the selected topic descendants and year range', () => {
  const extras = [{...pool[0],id:'old',year:2020},{...pool[0],id:'future',year:2027}, {...pool[0],id:'foreign',subject_id:'mechanics',topic_id:'fluids'}, {...pool[0],id:'all',marks_to_all:true}];
  const matching = engine.sprintPool([...pool,...extras],selected,topics);
  assert.equal(matching.length,6);
  const chosen = engine.chooseSprint(matching,true,()=>0.25);
  assert.equal(chosen.length,5); assert.equal(new Set(chosen.map(q=>q.id)).size,5);
  assert.deepEqual(Object.fromEntries(['MCQ','MSQ','NAT'].map(type=>[type,chosen.filter(q=>q.question_type===type).length])),{MCQ:3,MSQ:1,NAT:1});
  assert.equal(engine.chooseSprint(matching.filter(q=>q.question_type!=='NAT'),true).length,0,'no silent cross-topic fallback');
  assert.equal(engine.chooseSprint([...matching,matching[0]],true).length,5,'duplicate IDs cannot fill distribution slots');
  assert.ok(engine.validateSprint({...selected,topicId:'fluids'},topics,[{id:'math'}]));
  assert.ok(engine.validateSprint({...selected,yearFrom:2027},topics,[{id:'math'}]));
  assert.ok(engine.validateSprint({...selected,minutes:180},topics,[{id:'math'}]));
  assert.equal(engine.chooseSprint([...pool,...[{...pool[0],id:'q6'}]],false).length,5,'non-GATE MCQ banks use five MCQs');
});

test('local drafts preserve partial NAT input, cleared options, question position and exact timer; reject foreign or corrupt snapshots', () => {
  const identity = {userId:'u1',sessionId:'s1',startedAt:'2026-11-04T00:00:00Z',questionIds:['q1','q2'],durationSeconds:900};
  const items = new Map(); const storage = {getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value),removeItem:key=>items.delete(key)};
  const draft = drafts.freshSprintDraft(identity,{q1:2});
  draft.answers={q1:null,q2:'-.'}; draft.currentIndex=1; draft.remainingSeconds=713; draft.answerVersion=4;
  assert.equal(drafts.writeSprintDraft(storage,draft),true);
  let restored=drafts.readSprintDraft(storage,identity,{q1:2});
  assert.equal(restored.answers.q1,null); assert.equal(restored.answers.q2,'-.'); assert.equal(restored.currentIndex,1); assert.equal(restored.remainingSeconds,713);
  restored=drafts.readSprintDraft(storage,{...identity,userId:'another'},{}); assert.equal(Object.keys(restored.answers).length,0);
  restored=drafts.readSprintDraft(storage,{...identity,questionIds:['new1','new2']},{}); assert.equal(restored.remainingSeconds,900);
  items.set(drafts.sprintDraftKey('u1','s1'),'{broken'); assert.equal(drafts.readSprintDraft(storage,identity,{}).remainingSeconds,900);
  assert.equal(drafts.writeSprintDraft({setItem(){throw Error('Quota exceeded')}},draft),false);
  drafts.removeSprintDraft(storage,'u1','s1'); assert.equal(items.size,0);
});

test('sprint creation validates current scope, snapshots the exact mix, and reuses the same request on retry', async () => {
  let row; let existing = null;
  const client={from(){return {select(){return this},eq(){return this},or(){return this},insert(value){row=value;return this},
    maybeSingle:async()=>({data:existing,error:null}),single:async()=>({data:{id:row.id},error:null}),upsert:async()=>({error:null})};}};
  let catalog={...selected,mixed:true,pool,topics,subjects:[{id:'math',name:'Math'}]};
  const {createSprint}=load('app/(dashboard)/practice/actions.ts',{
    '@/lib/exam-context':{requireExamContext:async()=>({user:{id:'student'},exam:{id:'gate',requires_stream:true},stream:{id:'cs'}})},
    '@/lib/supabase/server':{createClient:async()=>client},'@/lib/sprint-catalog':{getSprintCatalog:async()=>catalog},'@/lib/micro-practice':engine,
  });
  const request='00000000-0000-4000-8000-000000000001';
  assert.ok((await createSprint({...selected,streamId:'civil'},request)).error); assert.equal(row,undefined);
  assert.ok((await createSprint({...selected,topicId:'fluids'},request)).error); assert.equal(row,undefined);
  catalog={...catalog,pool:pool.filter(q=>q.question_type!=='NAT')};
  assert.ok((await createSprint(selected,request)).error); assert.equal(row,undefined);
  catalog={...catalog,pool};
  assert.equal((await createSprint(selected,request)).sessionId,request);
  assert.equal(row.user_id,'student'); assert.equal(row.stream_id,'cs'); assert.equal(row.total_questions,5); assert.equal(row.duration_minutes,15); assert.equal(row.mode,'sprint');
  assert.equal(row.question_ids.length,5);
  existing={id:request}; row=undefined;
  assert.equal((await createSprint(selected,request)).sessionId,request); assert.equal(row,undefined,'retry does not create another session');
});

test('database accepts only five-question 12/15-minute sprint snapshots and keeps full mocks valid', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table test_sessions(id uuid primary key default gen_random_uuid(), user_id uuid, exam_id uuid, stream_id uuid, started_at timestamptz default now(), status text,
      mode text constraint test_sessions_mode_check check(mode in ('full_mock','full_paper','subject_wise','topic_wise','custom')), total_questions integer, duration_minutes integer, question_ids uuid[]);`);
    await db.exec(fs.readFileSync('supabase/migrations/20261104182931_micro_practice_sprints.sql','utf8'));
    const ids=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
    for(const minutes of [12,15]) await db.query("insert into test_sessions(mode,total_questions,duration_minutes,question_ids) values('sprint',5,$1,$2)",[minutes,ids]);
    await assert.rejects(db.query("insert into test_sessions(mode,total_questions,duration_minutes,question_ids) values('sprint',5,180,$1)",[ids]));
    await assert.rejects(db.exec("insert into test_sessions(mode,total_questions,duration_minutes) values('sprint',5,15)"));
    await db.exec("insert into test_sessions(mode,total_questions,duration_minutes) values('full_paper',65,180)");
    await assert.rejects(db.exec("update test_sessions set sprint_active_seconds = 901 where mode='sprint'"));
    await db.exec("update test_sessions set sprint_active_seconds = 720 where mode='sprint'");
  } finally { await db.close(); }
});

test('a first completed study session starts the shared study streak at one', async () => {
  let inserted;
  const client={from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:null,error:null}),
    insert(row){inserted=row;return this},single:async()=>({data:inserted,error:null})};}};
  const {updateStreak}=load('lib/streak.ts',{'@/lib/supabase/server':{createClient:async()=>client},'@/lib/xp':{awardXP:async()=>{},XP_REWARDS:{}}});
  const streak=await updateStreak('student');
  assert.equal(streak.current_streak,1); assert.equal(streak.longest_streak,1);
});

test('study streak days match revision and daily goals across midnight in India', async () => {
  const existing={user_id:'student',current_streak:5,longest_streak:5,freeze_tokens:1,last_activity_date:'2026-11-04'};
  let updated;
  const client={from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:existing,error:null}),
    update(row){updated=row;return this},single:async()=>({data:{...existing,...updated},error:null})};}};
  const StudyDate=class extends Date{static now(){return Date.parse('2026-11-04T19:00:00Z');}};
  const {updateStreak}=load('lib/streak.ts',{'@/lib/supabase/server':{createClient:async()=>client},'@/lib/xp':{awardXP:async()=>{},XP_REWARDS:{}}},{Date:StudyDate});
  const streak=await updateStreak('student');
  assert.equal(streak.current_streak,6); assert.equal(streak.last_activity_date,'2026-11-05'); assert.equal(streak.freeze_tokens,1);
});
