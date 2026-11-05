import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,
    {exports,console,AbortSignal,URLSearchParams,require:name=>imports[name]??require(name)});
  return exports;
}
const response = load('lib/question-response.ts');
const auto = load('lib/automatic-smart-tags.ts', {'./question-response':response});
const smart = load('lib/smart-tags.ts', {'./question-response':response,'./automatic-smart-tags':auto});
const subject = '20000000-0000-0000-0000-000000000001';
const topic = '10000000-0000-0000-0000-000000000001';
const mapped = {subject_id:subject,topic_id:topic,topics:{id:topic,name:'Topological sort',subject_id:subject}};
const codes = (key,value) => Array.from(auto.analyseAnswerPatterns(key,value),p=>p.code);
const nat = {question_type:'NAT',correct_option:null,answer_min:3.14,answer_max:3.16,answer_decimal_places:2};

test('existing syllabus leaves create automatic tags without pretending to be editorially reviewed',()=>{
  const tags = auto.resolveAutomaticTags(mapped);
  assert.equal(tags.reviewed,false); assert.equal(tags.source,'syllabus'); assert.equal(tags.concept_keys[0],`topic:${topic}`);
  assert.equal(tags.core_concepts[0],'Topological sort');
  const d=smart.diagnoseConcepts([{sessionId:'s',questionId:'q',subjectId:subject,completedAt:'2026-11-05',question:{question_type:'MCQ',correct_option:1},response:2,tags}]);
  assert.equal(d.tagged,1); assert.equal(d.automaticTagged,1); assert.equal(d.concepts[0].key,`topic:${topic}`);
});
test('editor-reviewed overrides win, drafts fall back automatically, missing/cross-subject/general mappings do not invent tags',()=>{
  const reviewed={reviewed:true,core_concepts:['DAGs'],common_error_triggers:[]};
  assert.equal(auto.resolveAutomaticTags(mapped,reviewed).source,'reviewed');
  assert.equal(auto.resolveAutomaticTags(mapped,{...reviewed,reviewed:false}).source,'syllabus');
  for(const q of [{subject_id:subject,topic_id:null}, {...mapped,subject_id:'other'}, {...mapped,topic_id:'wrong'}, {...mapped,topics:{...mapped.topics,name:'General'}}]) assert.equal(auto.resolveAutomaticTags(q),null);
  assert.equal(auto.resolveAutomaticTags({...mapped,topics:[mapped.topics]}).source,'syllabus');
});
test('same-named syllabus nodes have stable separate identities',()=>{
  const rows=[topic,'10000000-0000-0000-0000-000000000002'].map((id,i)=>({sessionId:'s',questionId:`q${i}`,subjectId:subject,completedAt:'2026-11-05',question:{question_type:'MCQ',correct_option:1},response:2,
    tags:auto.resolveAutomaticTags({...mapped,topic_id:id,topics:{...mapped.topics,id}})}));
  assert.equal(smart.diagnoseConcepts(rows).concepts.length,2);
});
test('MSQ analysis describes missing or extra options and respects alternative complete sets',()=>{
  const key={question_type:'MSQ',correct_option:null,correct_option_sets:[[1,3],[2,4]]};
  assert.deepEqual(codes(key,[1]),['msq_missing']);
  assert.deepEqual(codes(key,[1,2,3]),['msq_extra']);
  assert.deepEqual(codes(key,[1,2]),['msq_mixed']);
  assert.deepEqual(codes(key,[2,4]),[]); assert.deepEqual(codes(key,null),[]);
  assert.deepEqual(codes({...key,correct_option_sets:[[1,1]]},[1]),[]);
  assert.deepEqual(codes({question_type:'MCQ',correct_option:1},2),[]);
});
test('NAT sign checks require the flipped response to satisfy the actual grader',()=>{
  assert.deepEqual(codes(nat,'-3.15'),['nat_sign']);
  assert.deepEqual(codes(nat,'-3.50'),[]);
  const disjoint={...nat,answer_ranges:[{min:-4,max:-3},{min:3,max:4}]};
  assert.deepEqual(codes(disjoint,'-3.15'),[],'accepted signed alternatives are not errors');
  assert.deepEqual(codes({...nat,answer_min:0,answer_max:0},'-0.00'),[]);
});
test('NAT precision uses significant decimals and interval checks use decimal units rather than a fixed tolerance',()=>{
  assert.deepEqual(codes(nat,'3.150'),[]);
  assert.deepEqual(codes(nat,'3.151'),['nat_precision']);
  assert.deepEqual(codes(nat,'3.13'),['nat_boundary']);
  assert.deepEqual(codes(nat,'3.17'),['nat_boundary']);
  assert.deepEqual(codes(nat,'3.19'),[],'being within 0.05 is not proof of rounding trouble');
  assert.deepEqual(codes({...nat,answer_min:-.5,answer_max:-.5},'-.51'),['nat_boundary']);
  assert.deepEqual(codes({...nat,answer_min:1,answer_max:1,answer_decimal_places:0},'2'),['nat_boundary']);
  for(const invalid of ['-','NaN','Infinity','1e3','']) assert.deepEqual(codes(nat,invalid),[]);
  assert.deepEqual(codes({...nat,marks_to_all:true},'-3.15'),[]);
});
test('behaviour observations work without tags and never change concept denominators',()=>{
  const rows=[0,1,2].map(i=>({sessionId:'s',questionId:`q${i}`,subjectId:subject,completedAt:'2026-11-05',question:nat,response:i===2?'3.15':'-3.15',tags:null}));
  const d=smart.diagnoseConcepts(rows);
  assert.equal(d.answered,3); assert.equal(d.tagged,0); assert.equal(d.answerPatterns[0].count,2); assert.equal(d.concepts.length,0);
});
test('progress comparisons need independent evidence in both windows and compare the same concept identity',()=>{
  const make=(accuracy,attempts=3)=>({concepts:[{key:`topic:${topic}`,label:'Topological sort',subjectId:subject,accuracy,attempts}],weakSpots:[],possibleTraps:[],answered:attempts,tagged:attempts,sessionCount:3});
  const improved=smart.compareConceptProgress(make(67),make(33));
  assert.equal(improved.improvements[0].before,33); assert.equal(improved.improvements[0].after,67);
  assert.equal(smart.compareConceptProgress(make(67,2),make(33)).improvements.length,0);
  assert.equal(smart.compareConceptProgress(make(33),make(67)).improvements.length,0);
});

function dbMock(resolve) {
  const calls=[];
  return {calls,client:{from(table){const filters=[]; const b=new Proxy({}, {get(_,name){if(name==='then')return (yes,no)=>Promise.resolve(resolve(table,filters)).then(yes,no);
    return (...args)=>{filters.push([name,...args]);calls.push([table,name,...args]);return b;};}});return b;}}};
}
test('automatic concept selection uses the stable topic UUID, filters scope, and needs no tagging table',async()=>{
  const db=dbMock(table=>({data:table==='questions'?[{id:'q1',...mapped}]:[]}));
  const {getConceptFixPool}=load('lib/concept-fix-server.ts',{'@/lib/supabase/server':{createClient:async()=>db.client},'./smart-tags':smart,'./automatic-smart-tags':auto});
  const pool=await getConceptFixPool('exam','stream',subject,`topic:${topic}`);
  assert.equal(pool[0].label,'Topological sort'); assert.equal(pool[0].topic_id,topic);
  assert.ok(db.calls.every(c=>c[0]==='questions'));
  assert.ok(db.calls.some(c=>c[1]==='eq'&&c[2]==='topic_id'&&c[3]===topic));
  assert.ok(db.calls.some(c=>c[1]==='or'&&c[2]==='stream_id.eq.stream'));
});
test('six-session server window separates recent/prior evidence and batches REST IDs',async()=>{
  const sessions=Array.from({length:6},(_,i)=>({id:`s${i}`,completed_at:`2026-11-0${6-i}`,question_ids:[`q${i}`]}));
  const db=dbMock((table,filters)=>({data:table==='test_sessions'?sessions:table==='test_answers'?sessions.map((s,i)=>({session_id:s.id,question_id:`q${i}`,selected_option:i<3?1:2}))
    :table==='questions'?filters.find(f=>f[0]==='in')[2].map(id=>({id,...mapped,question_type:'MCQ',correct_option:1})):[],error:table==='question_smart_tags'?{code:'PGRST205'}:null}));
  const {loadSmartDiagnostic}=load('lib/smart-tags-server.ts',{'@/lib/supabase/server':{createClient:async()=>db.client},'./smart-tags':smart,'./automatic-smart-tags':auto});
  const r=await loadSmartDiagnostic({userId:'student',examId:'exam',streamId:'stream'});
  assert.equal(r.state,'ready'); assert.equal(r.diagnostic.answered,3); assert.equal(r.diagnostic.concepts[0].attempts,3);
  assert.equal(r.diagnostic.improvements[0].before,0); assert.equal(r.diagnostic.improvements[0].after,100);
  assert.ok(db.calls.some(c=>c[1]==='eq'&&c[2]==='user_id'&&c[3]==='student'));
  assert.ok(db.calls.some(c=>c[1]==='limit'&&c[2]===6));
  assert.ok(db.calls.filter(c=>c[0]==='questions'&&c[1]==='in').every(c=>c[3].length<=150));
  assert.doesNotMatch(JSON.stringify(r),/correct_option|selected_option|answer_min/);
});
test('dashboard offers a first practice action without calling one mistake a proven weak spot',()=>{
  const {SmartTagPanel}=load('components/smart-tags/SmartTagPanel.tsx',{'next/link':{__esModule:true,default:props=>React.createElement('a',props,props.children)}});
  const d=smart.diagnoseConcepts([{sessionId:'s',questionId:'q',subjectId:subject,completedAt:'2026-11-05',question:{question_type:'MCQ',correct_option:1},response:2,tags:auto.resolveAutomaticTags(mapped)}]);
  const html=renderToStaticMarkup(React.createElement(SmartTagPanel,{result:{state:'ready',diagnostic:d}}));
  assert.match(html,/early practice suggestion/); assert.match(html,/topic%3A/); assert.match(html,/auto-mapped from the syllabus/);
  assert.doesNotMatch(html,/premium|blur|₹/i);
});
