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
function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console, ...globals, require: name => imports[name] ?? require(name) });
  return exports;
}
const box = props => React.createElement('div', props, props.children);
const text = node => typeof node === 'string' ? node : (node?.children || []).map(text).join('');

test('navigation warms on pointer, keyboard, and touch intent without prefetching every sidebar page', async () => {
  let pending = false;
  const { NavigationLink } = load('components/navigation-link.tsx', {
    'next/link': { default: props => React.createElement('a', props, props.children), useLinkStatus: () => ({ pending }) },
  });
  for (const event of ['onMouseEnter', 'onFocus', 'onTouchStart']) {
    let renderer, forwarded = 0;
    try {
      await act(async () => { renderer = create(React.createElement(NavigationLink, { href: '/analytics', [event]: () => forwarded++ }, 'Analytics')); });
      assert.equal(renderer.root.findByType('a').props.prefetch, false);
      await act(async () => renderer.root.findByType('a').props[event]({}));
      assert.equal(renderer.root.findByType('a').props.prefetch, true);
      assert.equal(forwarded, 1);
      pending = true;
      await act(async () => renderer.update(React.createElement(NavigationLink, { href: '/analytics', prefetch: false }, 'Analytics')));
      assert.equal(renderer.root.findByType('a').props.prefetch, false, 'explicit caller opt-out wins');
      assert.match(text(renderer.toJSON()), /Opening page/);
    } finally {
      pending = false;
      if (renderer) await act(async () => renderer.unmount());
    }
  }
});

test('profile starts all seven independent reads before waiting for results and preserves user/exam scope', async () => {
  const queries = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const client = { from(table) {
    const query = { table, filters: {} };
    const builder = {
      select() { return this; }, eq(key, value) { query.filters[key] = value; return this; },
      or(value) { query.scope = value; return this; }, order() { return this; }, limit() { return this; }, maybeSingle() { return this; },
      then(resolve, reject) { queries.push(query); return gate.then(() => ({ data: table === 'profiles' ? { id: 'student' } : [], count: 0 })).then(resolve, reject); },
    };
    return builder;
  } };
  const { default: Page } = load('app/(dashboard)/profile/page.tsx', {
    '@/lib/exam-context': { requireExamContext: async () => ({ user: { id: 'student' }, exam: { id: 'gate' }, stream: { id: 'civil' } }) },
    '@/lib/supabase/server': { createClient: async () => client },
    './profile-content': { ProfileContent: box },
  });
  const page = Page();
  await new Promise(resolve => setImmediate(resolve));
  try {
    assert.equal(queries.length, 7, 'no query should block the remaining independent reads');
    for (const q of queries.filter(q => q.table !== 'exams')) {
      assert.equal(q.filters[q.table === 'profiles' ? 'id' : 'user_id'], 'student');
    }
    assert.equal(queries.find(q => q.table === 'test_sessions').filters.exam_id, 'gate');
    assert.equal(queries.find(q => q.table === 'bookmarks').scope, 'stream_id.eq.civil');
  } finally { release(); }
  assert.equal((await page).props.profile.id, 'student');
});

test('server-loaded Daily renders immediately without repeating the initial request or exposing an unanswered solution', async () => {
  let fetches = 0;
  const motion = new Proxy({}, { get: (_, tag) => props => React.createElement(tag, props, props.children) });
  const { default: Daily } = load('app/(dashboard)/daily/daily-content.tsx', {
    'framer-motion': { motion, useReducedMotion: () => true },
    'next/link': { default: props => React.createElement('a', props, props.children) },
    '@/components/workspace/PageHeading': { PageHeading: box },
    '@/components/ui/card': { Card: box, CardContent: box },
    '@/components/ui/button': { Button: props => React.createElement('button', props, props.children) },
    '@/components/ui/badge': { Badge: box },
    '@/components/ui/skeleton': { Skeleton: () => React.createElement('skeleton') },
    '@/lib/supabase/client': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
    '@/components/ui/toast-provider': { useToast: () => ({ toast() {} }) },
  }, { fetch: async () => { fetches++; throw new Error('unexpected fetch'); } });
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Daily, { initialData: {
      id: 'daily', assignedDate: '2026-11-09', userAnswer: null,
      question: { id: 'q', text: 'Ready to study', options: ['Alpha', 'Beta', 'Gamma', 'Delta'], correctOption: null, explanation: null, year: 2026, subject: 'Surveying' },
    } })); });
    assert.match(text(renderer.toJSON()), /Ready to study/);
    assert.equal(renderer.root.findAllByType('skeleton').length, 0);
    assert.equal(fetches, 0);
  } finally { if (renderer) await act(async () => renderer.unmount()); }
});

test('daily loader scopes answers to the student and only reveals a solution after their answer exists', async () => {
  const queries = [];
  let answered = false;
  const client = { from(table) {
    const filters = {};
    const builder = {
      select() { return this; }, eq(key, value) { filters[key] = value; return this; }, or() { return this; }, maybeSingle() { return this; },
      then(resolve) {
        queries.push({ table, filters });
        return Promise.resolve({ data: table === 'daily_questions' ? { id: 'daily', assigned_date: '2026-11-09', questions: { id: 'q', question_text: 'Ready', correct_option: 4, explanation: 'Saved solution', subjects: { name: 'Surveying' } } } : answered ? [{ user_id: 'student', selected_option: 4, is_correct: true }] : [], error: null }).then(resolve);
      },
    };
    return builder;
  } };
  const { getDailyQuestion } = load('lib/daily-question.ts', {
    react: { cache: fn => fn },
    '@/lib/exam-context': { requireExamContext: async () => ({ user: { id: 'student' }, exam: { id: 'gate' }, stream: { id: 'civil' } }) },
    '@/lib/supabase/server': { createClient: async () => client },
  });
  const first = await getDailyQuestion();
  assert.equal(first.question.correctOption, null);
  assert.equal(first.question.explanation, null);
  assert.equal(queries[0].filters['questions.exam_id'], 'gate');
  assert.equal(queries[1].filters.user_id, 'student');
  answered = true;
  const saved = await getDailyQuestion();
  assert.equal(saved.question.correctOption, 4);
  assert.equal(saved.userAnswer.isCorrect, true);
});
