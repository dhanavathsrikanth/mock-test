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
function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, console, ...globals, require: name => imports[name] ?? require(name) });
  return exports;
}
const countdown = load('lib/exam-countdown.ts');
const text = node => typeof node === 'string' ? node : (node?.children || []).map(text).join('');

test('GATE defaults stay scoped to the verified exam year', () => {
  assert.equal(countdown.defaultExamDate('GATE 2027'), '2027-02-06');
  assert.equal(countdown.defaultExamDate('GATE 2028'), null);
  assert.equal(countdown.defaultExamDate('Other exam 2027'), null);
});
test('calendar targets use IST and expired countdowns never become negative', () => {
  const target = countdown.countdownTarget('2027-02-06');
  assert.equal(new Date(target).toISOString(), '2027-02-05T18:30:00.000Z');
  const remaining = countdown.countdownRemaining(target, target - 90061000);
  assert.deepEqual(JSON.parse(JSON.stringify(remaining)), { days: 1, hours: 1, minutes: 1, seconds: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(countdown.countdownRemaining(target, target + 1))), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.equal(countdown.countdownTarget('invalid'), null);
  assert.equal(countdown.countdownTarget(null), null);
});
test('profile XP expands, reports remaining XP correctly, and refreshes without polling hidden pages', async () => {
  let data = { totalXP: 280, currentLevel: 0, levelName: 'Trainee', xpForNextLevel: 220, xpProgress: 56, nextLevelName: 'Explorer' };
  let tick, calls = 0, cleared = false;
  const events = new Map();
  const document = { hidden: false, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) };
  const motion = new Proxy({}, { get: (_, tag) => props => React.createElement(tag, props, props.children) });
  const { XPBar } = load('components/xp/XPBar.tsx', {
    'next/link': { default: props => React.createElement('a', props, props.children) },
    'framer-motion': { motion, AnimatePresence: props => props.children, useReducedMotion: () => true },
    './xp-profile.module.css': { default: {} },
  }, { document, AbortController, fetch: async () => { calls++; return { ok: true, json: async () => data }; }, setInterval: fn => { tick = fn; return 1; }, clearInterval: () => { cleared = true; } });
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(XPBar)); });
    assert.match(text(renderer.toJSON()), /280 total XP/);
    assert.match(text(renderer.toJSON()), /220 XP to Explorer/);
    assert.equal(renderer.root.findByType('button').props['aria-expanded'], false);
    await act(async () => { renderer.root.findByType('button').props.onClick(); });
    assert.equal(renderer.root.findByType('button').props['aria-expanded'], true);
    assert.match(text(renderer.toJSON()), /Earn XP by answering questions/);
    document.hidden = true;
    await act(async () => { await tick(); });
    assert.equal(calls, 1);
    document.hidden = false;
    data = { totalXP: 520, currentLevel: 1, levelName: 'Explorer', xpForNextLevel: 980, xpProgress: 2, nextLevelName: 'Practitioner' };
    await act(async () => { await events.get('visibilitychange')(); });
    assert.match(text(renderer.toJSON()), /980 XP to Practitioner/);
    assert.equal(renderer.root.findByProps({ role: 'progressbar' }).props['aria-valuenow'], 2);
  } finally { if (renderer) await act(async () => renderer.unmount()); }
  assert.equal(cleared, true);
  assert.equal(events.size, 0);
});

test('countdown keeps the official fallback on network failure and saves/resets a personal paper date', async () => {
  const stored = new Map();
  const events = new Map();
  let intervalCleared = false;
  const motion = new Proxy({}, { get: (_, tag) => props => React.createElement(tag, props, props.children) });
  const { ExamCountdown } = load('components/countdown/ExamCountdown.tsx', {
    'framer-motion': { motion, useReducedMotion: () => true },
    '@/components/ui/card': { Card: props => React.createElement('section', props, props.children) },
    '@/components/ui/button': { Button: props => React.createElement('button', props, props.children) },
    '@/components/ui/calendar': { Calendar: props => React.createElement('calendar', props) },
    '@/components/ui/popover': {
      Popover: props => React.createElement('popover', props, props.children),
      PopoverTrigger: props => props.children,
      PopoverContent: props => React.createElement('div', props, props.children),
    },
    '@/lib/exam-countdown': countdown,
    './countdown.module.css': { default: {} },
  }, {
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) },
    document: { hidden: false, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) },
    AbortController, fetch: async () => { throw new Error('Offline'); },
    setInterval: () => 1, clearInterval: () => { intervalCleared = true; },
  });
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(ExamCountdown, { examId: 'gate', examName: 'GATE 2027', userId: 'student' })); });
    assert.match(text(renderer.toJSON()), /Exams begin/);
    assert.match(text(renderer.toJSON()), /6 Feb 2027/);
    await act(async () => { renderer.root.findByType('popover').props.onOpenChange(true); });
    await act(async () => { renderer.root.findByType('calendar').props.onSelect(new Date(2027, 1, 13)); });
    assert.equal(stored.size, 0, 'Choosing a calendar day does not save until Apply is pressed');
    await act(async () => { renderer.root.findAllByType('button').find(node => text(node) === 'Apply date').props.onClick(); });
    assert.equal(renderer.root.findByType('popover').props.open, false);
    assert.equal(stored.get('exam-prep:countdown:student:gate'), '2027-02-13');
    assert.match(text(renderer.toJSON()), /Your paper date13 Feb 2027/);
    await act(async () => { renderer.root.findAllByType('button').find(node => text(node) === 'Use default date').props.onClick(); });
    assert.equal(stored.size, 0);
    assert.match(text(renderer.toJSON()), /Exams begin6 Feb 2027/);
  } finally { if (renderer) await act(async () => renderer.unmount()); }
  assert.equal(intervalCleared, true);
  assert.equal(events.size, 0);
});
