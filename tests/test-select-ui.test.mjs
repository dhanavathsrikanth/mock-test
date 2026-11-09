import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, console, require: name => imports[name] ?? require(name) });
  return exports;
}

test('test setup submits multiple filters, resets dependent choices, and switches full-paper sources to single choice', async () => {
  const scope = load('lib/stream-scope.ts');
  const engine = load('lib/test-pool.ts', {'./stream-scope':scope});
  let submitted;
  const {TestSelectForm} = load('app/(dashboard)/test/select/test-select-form.tsx', {
    'next/navigation':{useRouter:()=>({push(){}})}, 'next/link':{default:p=>React.createElement('a',p,p.children)},
    '@/components/ui/button':{Button:p=>React.createElement('button',p,p.children)},
    '@/components/workspace/PageHeading':{PageHeading:p=>React.createElement('div',null,p.title)},
    '@/components/practice/FilterDropdown':{FilterDropdown:p=>React.createElement('filter-dropdown',p)},
    '@/components/practice/filters.module.css':{default:{}}, '@/lib/test-pool':engine,
    '@/lib/content-availability':load('lib/content-availability.ts'),
    './actions':{createTest:async selection=>{submitted=selection;return {sessionId:'test'};}},
  });
  const props={examId:'gate',examName:'GATE',stream:{id:'cs',name:'Computer Science',code:'CS'},requiresStream:true,initialSelection:{mode:'custom'},
    subjects:[{id:'a',name:'Algorithms'},{id:'b',name:'Databases'}],topics:[{id:'ta',subject_id:'a',parent_id:null,name:'Sorting'},{id:'tb',subject_id:'b',parent_id:null,name:'SQL'}],
    pool:[2021,2024].flatMap(year=>['CS1','CS2'].flatMap(paper=>['a','b'].map(subject_id=>({id:`${year}-${paper}-${subject_id}`,year,paper,subject_id,topic_id:subject_id==='a'?'ta':'tb',marks:2,source_question_number:1}))))};
  let renderer; await act(async()=>{renderer=create(React.createElement(TestSelectForm,props));});
  const field=label=>renderer.root.findAllByType('filter-dropdown').find(node=>node.props.label===label);
  const start=()=>renderer.root.findAllByType('button').find(node=>node.props['aria-busy']!==undefined);
  const mode=value=>renderer.root.findAllByType('button').find(node=>node.children.some(child=>typeof child==='object'&&child.children?.includes(value)));
  try {
    assert.equal(start().props.disabled,true);
    await act(async()=>field('Source years').props.onChange(['2021','2024']));
    await act(async()=>field('Papers / shifts').props.onChange(['CS1','CS2']));
    await act(async()=>field('Subjects').props.onChange(['a','b']));
    await act(async()=>field('Topics / subtopics').props.onChange(['ta','tb']));
    await act(async()=>field('Subjects').props.onChange(['b']));
    assert.deepEqual(Array.from(field('Topics / subtopics').props.selected),['tb']);
    await act(async()=>field('Subjects').props.onChange(['a','b']));
    await act(async()=>field('Topics / subtopics').props.onChange(['ta','tb']));
    await act(async()=>field('Timing').props.onChange(['practice']));
    assert.equal(field('Timing').props.single,true); assert.equal(field('Number of questions').props.single,true);
    await act(async()=>start().props.onClick());
    assert.deepEqual(Array.from(submitted.years),[2021,2024]); assert.deepEqual(Array.from(submitted.papers),['CS1','CS2']);
    assert.deepEqual(Array.from(submitted.subjectIds),['a','b']); assert.deepEqual(Array.from(submitted.topicIds),['ta','tb']); assert.equal(submitted.timed,false);
    // Re-render to finish a new setup after the mocked successful navigation.
    await act(async()=>{renderer.unmount();renderer=create(React.createElement(TestSelectForm,props));});
    await act(async()=>field('Source years').props.onChange(['2021','2024']));
    await act(async()=>field('Papers / shifts').props.onChange(['CS1','CS2']));
    await act(async()=>mode('Full paper').props.onClick());
    assert.equal(field('Source years').props.single,true);assert.equal(field('Papers / shifts').props.single,true);
    assert.equal(field('Source years').props.selected.length,1);assert.equal(field('Papers / shifts').props.selected.length,1);
    await act(async()=>field('Source years').props.onChange(['2024']));
    assert.equal(field('Papers / shifts').props.selected.length,0);assert.equal(start().props.disabled,true);
  } finally { await act(async()=>renderer.unmount()); }
});
