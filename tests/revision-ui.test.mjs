import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { create, act } from 'react-test-renderer';

const require = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function load(file, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  }}).outputText;
  vm.runInNewContext(source, { exports, console, ...globals, require: name => dependencies[name] ?? require(name) });
  return exports;
}
const box = props => React.createElement('div', props, props.children);
const textComponent = props => React.createElement('p', null, props.text);
function text(node) { return typeof node === 'string' ? node : (node?.children || []).map(text).join(''); }
const response = (ok, data) => ({ ok, json: async () => data });

test('flashcards hide solutions, retain the card on failure, prevent double submission, and show persisted rewards', async () => {
  let saveFails = true;
  let posts = 0;
  const questions = ['MCQ','NAT','MSQ'].map((type,i) => ({ id: `srs${i}`, stage: i+1, question: {
    id: `q${i}`, question_text: `Question ${i}`, question_type: type, year: 2026,
    option_1:'Option Alpha', option_2:'Option Beta', option_3:'Option Gamma', option_4:'Option Delta',
    correct_option:1, correct_options:[1,3], answer_min:3, answer_max:3,
    explanation:`Derivation ${i}`,
  }}));
  const queue = { reviewDate:'2026-11-04', questions, summary: {
    dueCount:3, totalCount:3, completedCount:0, deferredCount:0, dailyCap:20, xpEarned:0, queueComplete:false,
  }};
  const { default: Page } = load('app/(dashboard)/revision/revision-content.tsx', {
    './revision.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
    'next/link': { default: props => React.createElement('a', props, props.children) },
    '@/components/ui/button': { Button: props => React.createElement('button',props,props.children) },
    '@/components/ui/card': { Card: box, CardContent: box, CardHeader: box, CardTitle: box, CardDescription: box },
    '@/components/ui/badge': { Badge: box },
    '@/components/QuestionPrompt': { QuestionPrompt:textComponent },
    '@/components/QuestionFigure': { QuestionFigure:() => null },
    '@/components/QuestionExplanation': { QuestionExplanation:textComponent },
    '@/components/MathText': { MathText:textComponent },
    '@/components/MatchingQuestion': { MatchingQuestion:textComponent },
    '@/components/MatchOption': { MatchOption:textComponent },
    '@/lib/matching-question-utils': { isMatchingQuestion:() => false, isMatchCodeOption:() => false },
    '@/components/calculator/GateCalculator': { GateCalculator:() => React.createElement('output', null, 'calculator') },
    '@/components/workspace/PageHeading': { PageHeading: () => null },
    '@/lib/question-response':load('lib/question-response.ts',{}),
    '@/lib/revision':{ DAILY_REVISION_CAP:20, REVISION_INTERVALS:[1,3,7,14,30] },
  }, {
    window:{scrollTo(){}}, requestAnimationFrame:callback => callback(),
    fetch:async (_url,options) => {
      if (!options?.method) return response(true, _url.includes('action=deck') ? {
        questions: questions.map(q => ({ ...q, source: 'srs' })), totalCount: 3,
        stageCounts: { 1: 1, 2: 1, 3: 1, 4: 0, 5: 0 }, masteredCount: 0,
        scheduledTomorrow: 0, srsSelectFailed: false,
      } : queue);
      posts++;
      assert.equal(JSON.parse(options.body).reviewDate,'2026-11-04');
      if(saveFails) return response(false,{error:'Unable to save review. Please retry.'});
      return response(true,{stage:2,mastered:false,xpAwarded:10,xpEarned:10,queueComplete:posts === 4});
    },
  });
  let renderer;
  try {
    await act(async () => { renderer=create(React.createElement(Page)); });
    const screen = () => text(renderer.toJSON());
    const button = label => renderer.root.findAllByType('button').find(node=>text(node).includes(label));
    assert.match(screen(), /Revision studio/);
    assert.match(screen(), /From first recall to second nature/);
    assert.ok(button('Continue revision'));
    assert.match(screen(),/Option Alpha/);
    assert.doesNotMatch(screen(),/Derivation 0/);
    await act(async () => button('Reveal Answer').props.onClick());
    assert.match(screen(),/Option Alpha/); assert.match(screen(),/Derivation 0/);
    await act(async () => button('Solved it Easily').props.onClick());
    assert.match(screen(),/Unable to save review/); assert.match(screen(),/Question 0/);
    assert.match(screen(),/0 of 3 reviewed/);
    saveFails=false;
    await act(async () => {
      const save=button('Solved it Easily').props.onClick;
      const a=save(); const b=save(); await Promise.all([a,b]);
    });
    assert.equal(posts,2,'one failed request plus one successful request; same-tick double taps are ignored');
    assert.match(screen(),/Question 1/); assert.match(screen(),/1 of 3 reviewed/); assert.match(screen(),/10 XP earned/);
    assert.doesNotMatch(screen(),/Derivation 1|Exact answer/);
    await act(async () => button('Reveal Answer').props.onClick());
    assert.match(screen(),/Exact answer: 3/); assert.match(screen(),/Derivation 1/);
    assert.doesNotMatch(screen(),/Option Alpha/,'NAT has no choice options');
    await act(async () => button('Solved it Easily').props.onClick());
    await act(async () => button('Reveal Answer').props.onClick());
    await act(async () => button('Solved it Easily').props.onClick());
    assert.match(screen(), /Session complete/);
    await act(async () => button('Practice Deck Flashcards').props.onClick());
    assert.doesNotMatch(screen(), /Derivation 0/);
    await act(async () => button('Reveal Answer').props.onClick());
    assert.match(screen(), /Derivation 0/);
    assert.match(screen(), /daily queue is where reviews, stages, and XP are saved/);
    const savedPosts = posts;
    await act(async () => button('Next flashcard').props.onClick());
    assert.equal(posts, savedPosts, 'free practice does not submit ineligible daily reviews');
    assert.match(screen(), /Question 1/);
  } finally { if(renderer) await act(async () => renderer.unmount()); }
});
