import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { create, act } from 'react-test-renderer';

const require=createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
function load(file,imports={},globals={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,
    {exports,console,...globals,require:name=>imports[name]??require(name)});
  return exports;
}

test('launcher submits checkbox arrays, prunes topics when subjects change, and blocks empty years', async () => {
  const scope=load('lib/stream-scope.ts');
  const pools=load('lib/test-pool.ts',{'./stream-scope':scope});
  const engine=load('lib/micro-practice.ts',{'./test-pool':pools});
  let submitted;
  const {SprintLauncher}=load('components/practice/SprintLauncher.tsx',{
    'next/navigation':{useRouter:()=>({push(){}})},'next/link':{default:p=>React.createElement('a',p,p.children)},
    '@/components/ui/button':{Button:p=>React.createElement('button',p,p.children)},
    './FilterDropdown':{FilterDropdown:p=>React.createElement('filter-dropdown',p)},
    '@/lib/micro-practice':engine,
    '@/app/(dashboard)/practice/actions':{createSprint:async selection=>{submitted=selection;return {sessionId:'new'};}},
  },{crypto:{randomUUID:()=> 'request'}});
  const catalog={examId:'gate',streamId:'cs',mixed:true,resumeId:null,subjects:[{id:'a',name:'Algorithms'},{id:'b',name:'Databases'}],
    topics:[{id:'ta',subject_id:'a',parent_id:null,name:'Sorting'},{id:'tb',subject_id:'b',parent_id:null,name:'SQL'}],
    pool:['MCQ','MCQ','MCQ','MSQ','NAT'].flatMap((question_type,i)=>['a','b'].map(subject_id=>({id:`${subject_id}${i}`,subject_id,topic_id:subject_id==='a'?'ta':'tb',year:i%2?2024:2021,question_type})))};
  let renderer; await act(async()=>{renderer=create(React.createElement(SprintLauncher,{catalog}));});
  const field=label=>renderer.root.findAllByType('filter-dropdown').find(node=>node.props.label===label);
  const start=()=>renderer.root.findAllByType('button').find(node=>node.props.onClick);
  try {
    await act(async()=>field('Subjects').props.onChange(['a','b']));
    await act(async()=>field('Topics').props.onChange(['ta','tb']));
    await act(async()=>field('Subjects').props.onChange(['b']));
    assert.deepEqual(Array.from(field('Topics').props.selected),['tb']);
    await act(async()=>field('Years').props.onChange([]));
    assert.equal(start().props.disabled,true);
    await act(async()=>field('Subjects').props.onChange(['a','b']));
    await act(async()=>field('Topics').props.onChange(['ta','tb']));
    await act(async()=>field('Years').props.onChange(['2021','2024']));
    await act(async()=>field('Focus timer').props.onChange(['12']));
    await act(async()=>start().props.onClick());
    assert.deepEqual(Array.from(submitted.subjectIds),['a','b']);
    assert.deepEqual(Array.from(submitted.topicIds),['ta','tb']);
    assert.deepEqual(Array.from(submitted.years),[2021,2024]);
    assert.equal(submitted.minutes,12);
  } finally { await act(async()=>renderer.unmount()); }
});
function text(node){return typeof node==='string'?node:(node?.children||[]).map(text).join('');}

test('sprint taps save synchronously, reload restores the same second, and background/offline time is paused',async()=>{
  const items=new Map();
  const storage={getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value),removeItem:key=>items.delete(key)};
  const events=new Map(); const intervals=new Map(); const timeouts=new Map(); const cloudRows=[]; let intervalId=0; let timeoutId=0; let now=100000;
  const navigatorMock={onLine:true};
  const documentMock={visibilityState:'visible',addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
  const windowMock={localStorage:storage,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
  const clock=class extends Date{static now(){return now;}};
  const timer={setInterval:fn=>{intervals.set(++intervalId,fn);return intervalId;},clearInterval:id=>intervals.delete(id),setTimeout:(fn,delay)=>{timeouts.set(++timeoutId,{fn,delay});return timeoutId;},clearTimeout:id=>timeouts.delete(id)};
  const deps={
    'next/navigation':{useRouter:()=>({push(){},replace(){}})},
    '@/components/ui/button':{Button:props=>React.createElement('button',props,props.children)},
    '@/components/QuestionPrompt':{QuestionPrompt:props=>React.createElement('p',null,props.text)},
    '@/components/QuestionFigure':{QuestionFigure:()=>null},
    '@/components/NumericAnswerInput':{NumericAnswerInput:props=>React.createElement('input',props)},
    '@/components/QuestionTypeTag':{QuestionTypeTag:props=>React.createElement('span',null,props.type)},
    '@/components/MathText':{MathText:props=>React.createElement('span',null,props.text)},
    '@/components/MatchingQuestion':{MatchingQuestion:()=>null},
    '@/components/MatchOption':{MatchOption:()=>null},
    '@/components/calculator/GateCalculator':{GateCalculator:()=>null},
    '@/lib/matching-question-utils':{isMatchingQuestion:()=>false,isMatchCodeOption:()=>false},
    '@/lib/question-response':load('lib/question-response.ts'),
    '@/lib/sprint-draft':load('lib/sprint-draft.ts'),
    '@/lib/supabase/client':{createClient:()=>({from:()=>({upsert:rows=>{cloudRows.push(rows);return {abortSignal:async()=>({error:null})};}})})},
    '@/app/(dashboard)/test/[sessionId]/actions':{submitTest:async()=>({success:true})},
  };
  const {SprintClient}=load('components/practice/SprintClient.tsx',deps,{window:windowMock,document:documentMock,navigator:navigatorMock,Date:clock,...timer,AbortController,fetch:async()=>({ok:true})});
  const props={userId:'student',session:{id:'sprint',started_at:'2026-11-04T00:00:00Z',duration_minutes:15},
    questions:Array.from({length:5},(_,i)=>({id:`q${i}`,question_text:`Question ${i}`,question_type:i===0?'NAT':i===2?'MSQ':'MCQ',option_1:'Alpha',option_2:'Beta',option_3:'Gamma',option_4:'Delta'})),initialAnswers:{}};
  let renderer;
  const saved=()=>JSON.parse([...items.values()][0]);
  const tick=async seconds=>act(async()=>{now+=seconds*1000;for(const callback of [...intervals.values()])callback();});
  try{
    await act(async()=>{renderer=create(React.createElement(SprintClient,props));});
    await act(async()=>{
      renderer.root.findByType('input').props.onChange('-');
      assert.equal(saved().answers.q0,'-','localStorage is written inside the input callback');
    });
    await tick(3); assert.equal(saved().remainingSeconds,897);
    await act(async()=>{renderer.root.findByProps({'aria-label':'Question 2'}).props.onClick();});
    await act(async()=>{renderer.root.findAllByType('input').find(node=>node.props['data-option']===1).props.onChange();assert.equal(saved().answers.q1,1);});
    await act(async()=>{documentMock.visibilityState='hidden';events.get('visibilitychange')();});
    await tick(120);assert.equal(saved().remainingSeconds,897);
    await act(async()=>{documentMock.visibilityState='visible';events.get('visibilitychange')();});
    await tick(1);assert.equal(saved().remainingSeconds,896);
    await act(async()=>{navigatorMock.onLine=false;events.get('offline')();});
    await tick(120);assert.equal(saved().remainingSeconds,896);
    assert.match(text(renderer.toJSON()),/Offline. Timer paused/);
    await act(async()=>renderer.unmount());renderer=null;
    now+=3600000;
    await act(async()=>{renderer=create(React.createElement(SprintClient,props));});
    assert.equal(saved().remainingSeconds,896);assert.equal(saved().currentIndex,1);assert.equal(saved().answers.q0,'-');
    assert.equal(renderer.root.findByProps({'aria-label':'Time remaining'}).children.map(text).join(''),'14:56');
    await act(async()=>{navigatorMock.onLine=true;events.get('online')();});
    await tick(1);assert.equal(saved().remainingSeconds,895);
    await act(async()=>{for(const [id,item] of [...timeouts])if(item.delay===500){timeouts.delete(id);item.fn();}});
    assert.equal(cloudRows.at(-1).find(row=>row.question_id==='q1').selected_option,1,'reconnect syncs restored local choices');
    await act(async()=>{renderer.root.findByProps({'aria-label':'Question 1'}).props.onClick();});
    await act(async()=>{renderer.root.findByType('input').props.onChange('-1.25');assert.equal(saved().answers.q0,'-1.25');});
    await act(async()=>{for(const [id,item] of [...timeouts])if(item.delay===500){timeouts.delete(id);item.fn();}});
    assert.equal(cloudRows.at(-1).find(row=>row.question_id==='q0').numeric_answer,'-1.25','numeric text is synced without rounding');
  }finally{if(renderer)await act(async()=>renderer.unmount());}
});
