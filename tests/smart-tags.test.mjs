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
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, console, URLSearchParams, AbortSignal, require: name => imports[name] ?? require(name) });
  return exports;
}
const responses = load('lib/question-response.ts');
const automatic = load('lib/automatic-smart-tags.ts', { './question-response': responses });
const smart = load('lib/smart-tags.ts', { './question-response': responses, './automatic-smart-tags': automatic });
const serverImports = db => ({ '@/lib/supabase/server': { createClient: async () => db.client }, './smart-tags': smart, './automatic-smart-tags': automatic });
const plain = x => JSON.parse(JSON.stringify(x));
function attempt(i, correct = false, extra = {}) {
  return { sessionId: `s${i % 3}`, questionId: `q${i}`, subjectId: 'subject', completedAt: `2026-11-0${i + 1}T00:00:00Z`,
    question: { question_type: 'MCQ', correct_option: 1 }, response: correct ? 1 : 2,
    tags: { reviewed: true, core_concepts: ['DAGs', ' DAGs '], common_error_triggers: ['Boundary condition'] }, ...extra };
}

test('concept counters include successes, deduplicate retries/tags, and apply the 3-attempt/60% rule', () => {
  const rows = [attempt(0), attempt(1), attempt(2, true), attempt(3, true), attempt(4)];
  const d = smart.diagnoseConcepts([...rows, rows[0]]);
  assert.equal(d.weakSpots.length, 1); assert.equal(d.concepts[0].attempts, 5);
  assert.equal(d.concepts[0].failed, 3); assert.equal(d.concepts[0].accuracy, 40);
  assert.equal(d.possibleTraps[0].questions, 3); assert.equal(d.sessionCount, 3);
  assert.equal(smart.diagnoseConcepts(rows.slice(0, 2)).weakSpots.length, 0);
  assert.equal(smart.diagnoseConcepts([...rows, attempt(5, true)]).weakSpots.length, 0);
});
test('skips and marks-to-all do not count; drafts/untagged answers only affect visible coverage', () => {
  const d = smart.diagnoseConcepts([attempt(0, false, { response: null }), attempt(1, false, { question: { correct_option: 1, marks_to_all: true } }),
    attempt(2, false, { tags: null }), attempt(3, false, { tags: { reviewed: false, core_concepts: ['DAGs'], common_error_triggers: [] } }), attempt(4)]);
  assert.equal(d.answered, 3); assert.equal(d.tagged, 1); assert.equal(d.concepts[0].attempts, 1);
});
test('NAT precision/ranges and MSQ alternatives use the existing grader, not stored correctness', () => {
  const d = smart.diagnoseConcepts([
    attempt(0, false, { question: { question_type: 'NAT', correct_option: null, answer_ranges: [{ min: -2, max: -1 }], answer_decimal_places: 2 }, response: '-1.50', is_correct: false }),
    attempt(1, false, { question: { question_type: 'MSQ', correct_option: null, correct_option_sets: [[1, 3], [2, 4]] }, response: [2, 4] }),
    attempt(2, false, { question: { question_type: 'NAT', correct_option: null, answer_min: 1, answer_max: 2, answer_decimal_places: 2 }, response: '1.234' }),
  ]);
  assert.equal(d.concepts[0].attempts, 3); assert.equal(d.concepts[0].failed, 1);
});
test('identical labels from different subjects stay separate; top-three ranking uses failure rate', () => {
  const rows = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) rows.push(attempt(i * 3 + j, false, { subjectId: `subject${i}`, tags: { reviewed: true, core_concepts: ['Boundary'], common_error_triggers: [] } }));
  const d = smart.diagnoseConcepts(rows);
  assert.equal(d.concepts.length, 4); assert.equal(d.weakSpots.length, 3);
  assert.ok(d.concepts.every(c => c.attempts === 3));
});
test('concept-fix selection prefers unseen questions, deduplicates, and permits a small pool', () => {
  const pool = ['a','b','c','d','a'].map(id => ({ id }));
  const chosen = smart.chooseConceptFix(pool, new Set(['a','b']), () => .5);
  assert.equal(chosen.length, 3); assert.deepEqual(plain(chosen.slice(0, 2).map(q => q.id)).sort(), ['c','d']);
  assert.equal(new Set(chosen.map(q => q.id)).size, 3);
  assert.equal(smart.chooseConceptFix([{ id: 'a' }], new Set()).length, 1);
});
test('tag entry normalises duplicate labels and rejects long/control/excessive input', () => {
  assert.deepEqual(plain(smart.parseTagLines(' DAGs \nDags\n Topological   sort ')), ['Dags', 'Topological sort']);
  for (const s of ['x', 'x'.repeat(81), 'a\u0000b', Array.from({ length: 9 }, (_, i) => `tag${i}`).join('\n')]) assert.throws(() => smart.parseTagLines(s));
});

function mockDb(resolver) {
  const calls = [];
  return { calls, client: { from(table) {
    const filters = [];
    const builder = new Proxy({}, { get(_, name) {
      if (name === 'then') return (resolve, reject) => Promise.resolve(resolver(table, filters)).then(resolve, reject);
      return (...args) => { filters.push([name, ...args]); calls.push([table, name, ...args]); return builder; };
    } }); return builder;
  } } };
}
test('diagnostic reads only completed owned/scoped sessions, preserves failures, and returns no keys', async () => {
  const db = mockDb(table => ({ data: table === 'test_sessions' ? [{ id: 's1', completed_at: '2026-11-05T00:00:00Z', question_ids: ['q1'] }]
    : table === 'test_answers' ? [{ session_id: 's1', question_id: 'q1', selected_option: 1, is_correct: false }]
    : table === 'questions' ? [{ id: 'q1', subject_id: 'subject', question_type: 'MCQ', correct_option: 1 }]
    : [{ question_id: 'q1', reviewed: true, core_concepts: ['DAGs'], common_error_triggers: [] }], error: null }));
  const { loadSmartDiagnostic } = load('lib/smart-tags-server.ts', serverImports(db));
  const r = await loadSmartDiagnostic({ userId: 'owner', examId: 'exam', streamId: 'stream' });
  assert.equal(r.diagnostic.concepts[0].failed, 0);
  assert.ok(db.calls.some(c => c[0] === 'test_sessions' && c[1] === 'eq' && c[2] === 'user_id' && c[3] === 'owner'));
  assert.ok(db.calls.some(c => c[1] === 'eq' && c[2] === 'status' && c[3] === 'completed'));
  assert.ok(db.calls.some(c => c[1] === 'limit' && c[2] === 6));
  assert.ok(db.calls.some(c => c[0] === 'questions' && c[1] === 'or' && c[2] === 'stream_id.eq.stream'));
  assert.doesNotMatch(JSON.stringify(r), /correct_option|answer_ranges|question_text/);
  const missingDb = mockDb(table => table === 'question_smart_tags' ? { error: { code: 'PGRST205' } } : { data: table === 'test_sessions'
    ? [{ id: 's', completed_at: 'today', question_ids: ['q'] }] : table === 'questions'
      ? [{ id:'q',subject_id:'subject',topic_id:'10000000-0000-0000-0000-000000000001',topics:{id:'10000000-0000-0000-0000-000000000001',name:'Topological sort',subject_id:'subject'},question_type:'MCQ',correct_option:1 }]
      : [{ session_id:'s',question_id:'q',selected_option:2 }] });
  const missing = load('lib/smart-tags-server.ts', serverImports(missingDb));
  const automaticResult = await missing.loadSmartDiagnostic({ userId: 'u', examId: 'e', streamId: null });
  assert.equal(automaticResult.state, 'ready'); assert.equal(automaticResult.diagnostic.automaticTagged, 1);
});
test('concept fix validates scope again on the server and retries the same request without another insert', async () => {
  const context = { user: { id: 'owner' }, exam: { id: 'exam' }, stream: { id: 'stream' } };
  let inserted;
  const db = mockDb((table, filters) => {
    if (filters.some(f => f[0] === 'insert')) { inserted = filters.find(f => f[0] === 'insert')[1]; return { data: { id: inserted.id } }; }
    if (filters.some(f => f[0] === 'select' && f[1] === 'question_ids')) return { data: [{ question_ids: ['q0'] }] };
    return { data: inserted ?? null };
  });
  const scopeCalls = [];
  const { startConceptFix } = load('app/(dashboard)/practice/concept/actions.ts', {
    '@/lib/exam-context': { requireExamContext: async () => context }, '@/lib/supabase/server': { createClient: async () => db.client },
    '@/lib/concept-fix-server': { getConceptFixPool: async (...args) => { scopeCalls.push(args); return ['q0','q1'].map(id => ({ id, core_concepts: ['DAGs'] })); } }, '@/lib/smart-tags': smart,
  });
  const subject = '10000000-0000-0000-0000-000000000001', request = '20000000-0000-0000-0000-000000000001';
  assert.ok((await startConceptFix(subject, 'DAGs', 'bad-id')).error);
  assert.equal((await startConceptFix(subject, 'DAGs', request)).sessionId, request);
  assert.deepEqual(plain(scopeCalls[0]), ['exam','stream',subject,'DAGs']);
  assert.equal(inserted.mode, 'custom'); assert.equal(inserted.duration_minutes, 10); assert.equal(inserted.total_questions, 2);
  assert.equal(inserted.concept_label, undefined, 'no new column or migration is needed');
  assert.equal((await startConceptFix(subject, 'dags', request)).sessionId, request);
  assert.equal(db.calls.filter(c => c[1] === 'insert').length, 1);
});
test('student UI shows evidence and available actions without asserting an error cause or offering a paywall', () => {
  const { SmartTagPanel } = load('components/smart-tags/SmartTagPanel.tsx', { 'next/link': { default: props => React.createElement('a', props, props.children), __esModule: true } });
  const diagnostic = smart.diagnoseConcepts([attempt(0),attempt(1),attempt(2,true)]);
  const html = renderToStaticMarkup(React.createElement(SmartTagPanel, { result: { state: 'ready', diagnostic }, variant: 'result' }));
  assert.match(html, /2 incorrect/); assert.match(html, /not confirmed reasons/); assert.match(html, /practice\/concept\?/);
  assert.doesNotMatch(html, /blur|premium|₹|unlock/i);
  assert.match(renderToStaticMarkup(React.createElement(SmartTagPanel, { result: { state: 'unavailable' } })), /could not load/);
});

test('optional diagnostics survive network exceptions and support legacy question sets', async () => {
  const broken = load('lib/smart-tags-server.ts', { ...serverImports({client:null}), '@/lib/supabase/server': { createClient: async () => { throw new Error('network'); } } });
  assert.equal((await broken.loadSmartDiagnostic({ userId: 'u', examId: 'e', streamId: null })).state, 'unavailable');
  const db = mockDb(table => ({ data: table === 'test_sessions' ? [{ id: 's', completed_at: '2026-11-05', question_ids: null }]
    : table === 'test_answers' ? [{ session_id:'s', question_id: 'q', selected_option: 2 }]
    : table === 'questions' ? [{ id: 'q', subject_id: 'subject', correct_option: 1, question_type: 'MCQ' }]
    : [{ question_id: 'q', reviewed: true, core_concepts: ['DAGs'], common_error_triggers: [] }] }));
  const legacy = load('lib/smart-tags-server.ts', serverImports(db));
  const r = await legacy.loadSmartDiagnostic({ userId: 'u', examId: 'e', streamId: null, sessionId: 's' });
  assert.equal(r.state, 'ready'); assert.equal(r.diagnostic.tagged, 1); assert.equal(r.diagnostic.concepts[0].failed, 1);
  assert.ok(db.calls.some(c => c[1] === 'limit' && c[2] === 1));
});
test('concept pool pages past the API row limit and retains exam, stream, subject and reviewed filters', async () => {
  const db = mockDb((table, filters) => {
    const offset = filters.find(f => f[0] === 'range')[1];
    return { data: Array.from({ length: offset === 0 ? 1000 : 1 }, (_, i) => ({ question_id: `q${offset+i}`, core_concepts: i === 0 ? ['DAGs'] : ['Other'] })) };
  });
  const { getConceptFixPool } = load('lib/concept-fix-server.ts', serverImports(db));
  const pool = await getConceptFixPool('exam','stream','subject','dags');
  assert.equal(pool.length, 2);
  for (const [field, value] of [['reviewed',true],['questions.exam_id','exam'],['questions.subject_id','subject'],['questions.marks_to_all',false]])
    assert.ok(db.calls.some(c => c[1] === 'eq' && c[2] === field && c[3] === value));
  assert.ok(db.calls.some(c => c[1] === 'or' && c[2] === 'stream_id.eq.stream' && c[3].referencedTable === 'questions'));
  assert.ok(db.calls.some(c => c[1] === 'range' && c[2] === 1000));
});
