import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { create,act } from 'react-test-renderer';
const require=createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
function load(file,imports={},globals={}) {
  const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,
    {exports,console,Date,URL,URLSearchParams,...globals,require:name=>imports[name]??require(name)});return exports;
}
function text(node){return typeof node==='string'?node:(node?.children??[]).map(text).join('');}
const challenge={id:'ch_'+'a'.repeat(32),creatorName:'Rohan',creatorScore:3.33,maximum:10,creatorSeconds:412,label:'GATE · Graph theory',minutes:12,
  questions:Array.from({length:5},(_,i)=>({id:`q${i}`,question_text:`Question ${i+1}`,question_type:'MCQ',option_1:'Alpha',option_2:'Beta',option_3:'Gamma',option_4:'Delta',option_images:[]}))};

function harness({blocked=false,returning=false}={}) {
  const items=new Map(),calls=[],redirects=[],intervals=new Map();let timerId=0,now=Date.now(),user=returning?{id:'student'}:null,failSave=false,failSubmit=false,authCalls=0;
  const token='00000000-0000-4000-8000-000000000090';
  const storage={getItem:key=>items.get(key)??null,setItem:(key,value)=>{if(blocked)throw Error('blocked');items.set(key,value);},removeItem:key=>items.delete(key)};
  const windowMock={localStorage:storage,location:new URL(`https://example.com/c/${challenge.id}${returning?'#resume='+token:''}`),history:{replaceState(_s,_t,path){windowMock.location=new URL(path,'https://example.com');}}};
  const clock=class extends Date{static now(){return now;}};
  const drafts=load('lib/challenges.ts',{}, {Date:clock});
  const auth={getUser:async()=>{authCalls++;return {data:{user}};},signInWithOAuth:async value=>{calls.push({action:'oauth',...value});return {error:null};}};
  const deps={
    'next/navigation':{useRouter:()=>({replace:path=>redirects.push(path)})},
    '@/components/ui/button':{Button:props=>React.createElement('button',props,props.children)},
    '@/components/QuestionPrompt':{QuestionPrompt:props=>React.createElement('p',null,props.text)},
    '@/components/QuestionFigure':{QuestionFigure:()=>null},'@/components/NumericAnswerInput':{NumericAnswerInput:()=>null},
    '@/components/QuestionTypeTag':{QuestionTypeTag:props=>React.createElement('span',null,props.type)},
    '@/components/MathText':{MathText:props=>React.createElement('span',null,props.text)},
    '@/components/MatchingQuestion':{MatchingQuestion:()=>null},'@/components/MatchOption':{MatchOption:()=>null},
    '@/components/calculator/GateCalculator':{GateCalculator:()=>null},'@/lib/matching-question-utils':{isMatchingQuestion:()=>false,isMatchCodeOption:()=>false},
    '@/lib/question-response':load('lib/question-response.ts'),'@/lib/challenges':drafts,'@/lib/marking':load('lib/marking.ts'),
    '@/lib/supabase/client':{createClient:()=>({auth})},
  };
  const {ChallengeClient}=load('components/challenges/ChallengeClient.tsx',deps,{window:windowMock,localStorage:storage,Date:clock,
    setInterval:fn=>{intervals.set(++timerId,fn);return timerId;},clearInterval:id=>intervals.delete(id),
    fetch:async(_url,options)=>{
      const body=JSON.parse(options.body);calls.push(body);
      if(body.action==='save' && failSave) throw Error('Network unavailable');
      if(body.action==='submit' && failSubmit) return {ok:false,json:async()=>({error:'Try saving again'})};
      return {ok:true,json:async()=>({data:body.action==='start'?{token,startedAt:new Date(now).toISOString()}:body.action==='submit'?'saved-session':true})};
    }});
  return {Component:ChallengeClient,items,calls,redirects,token,drafts,window:windowMock,authCalls:()=>authCalls,
    setUser:value=>{user=value;},setFailSave:value=>{failSave=value;},setFailSubmit:value=>{failSubmit=value;},
    tick:async(seconds)=>act(async()=>{now+=seconds*1000;for(const fn of intervals.values())fn();})};
}
const mount=async h=>{let r;await act(async()=>{r=create(React.createElement(h.Component,{challenge}),{createNodeMock:element=>element.type==='dialog'?{showModal(){},close(){}}:null});});return r;};
const click=async(r,label)=>act(async()=>{await r.root.findAllByType('button').find(n=>text(n)===label).props.onClick();});

test('guest starts without auth, edits save synchronously, and network failure retains answers before Google redirect',async()=>{
  const h=harness();let r=await mount(h);
  try{
    assert.equal(h.authCalls(),0);await click(r,'Take the challenge →');assert.equal(h.authCalls(),0);
    await act(async()=>{r.root.findAllByType('button').find(n=>text(n)==='AAlpha').props.onClick();assert.equal(JSON.parse([...h.items.values()][0]).answers.q0,1);});
    await h.tick(15);await act(async()=>r.unmount());r=await mount(h);
    assert.ok(text(r.toJSON()).includes('11:45'),'refresh keeps elapsed wall time');
    await act(async()=>r.root.findByProps({'aria-label':'Question 5'}).props.onClick());
    h.setFailSave(true);await click(r,'Submit test');
    assert.equal(h.calls.filter(c=>c.action==='oauth').length,0);assert.equal(JSON.parse([...h.items.values()][0]).answers.q0,1);
    assert.ok(!text(r.toJSON()).includes('copy your recovery link'),'no false backup claim when save fails');
    h.setFailSave(false);await click(r,'Continue with Google');
    const oauth=h.calls.find(c=>c.action==='oauth');assert.equal(oauth.provider,'google');
    const next=new URL(oauth.options.redirectTo).searchParams.get('next');assert.equal(next,`/c/${challenge.id}#resume=${h.token}`);
    assert.ok(h.calls.findIndex(c=>c.action==='save')<h.calls.findIndex(c=>c.action==='oauth'));
    assert.ok(h.items.size>0,'device draft stays until authenticated acknowledgement');
  }finally{await act(async()=>r.unmount());}
});

test('blocked local storage still commits a server backup before sign-in',async()=>{
  const h=harness({blocked:true});const r=await mount(h);
  try{
    await click(r,'Take the challenge →');await act(async()=>r.root.findByProps({'aria-label':'Question 5'}).props.onClick());
    await click(r,'Submit test');await click(r,'Continue with Google');
    assert.equal(h.items.size,0);assert.ok(h.calls.some(c=>c.action==='save'));assert.ok(h.calls.some(c=>c.action==='oauth'));
  }finally{await act(async()=>r.unmount());}
});

test('a returning signed-in user retries a failed claim without losing the recovery capability',async()=>{
  const h=harness({returning:true});h.setFailSubmit(true);const r=await mount(h);
  try{
    assert.ok(text(r.toJSON()).includes('Try saving again'));assert.equal(h.redirects.length,0);
    h.setFailSubmit(false);await click(r,'Continue with Google');assert.equal(h.redirects.at(-1),`/c/${challenge.id}/result?session=saved-session`);
    assert.equal(h.calls.filter(c=>c.action==='oauth').length,0,'existing sessions do not sign in again');
  }finally{await act(async()=>r.unmount());}
});
