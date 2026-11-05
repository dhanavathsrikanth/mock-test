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
    await act(async()=>{renderer.root.findAllByType('button').find(node=>text(node)==='AAlpha').props.onClick();assert.equal(saved().answers.q1,1);});
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
