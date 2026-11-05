const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => name in imports ? imports[name] : require(name) });
  return exports;
}
const availability = load('lib/content-availability.ts');
const serialise = value => JSON.parse(JSON.stringify(value));

test('availability reports actual papers, question totals and numbering without certifying completeness', () => {
  const rows = [
    { year: 2026, paper: 'CS1', source_question_number: 1, marks: 1 },
    { year: 2026, paper: 'CS1', source_question_number: 3, marks: 2 },
    { year: 2026, paper: 'CS2', source_question_number: 1, marks: 1 },
    { year: 2024, paper: 'CS1', source_question_number: 1, marks: 1 },
  ];
  const result = availability.summariseAvailability(rows);
  assert.equal(result.questionCount, 4);
  assert.equal(result.paperCount, 3);
  assert.equal(result.papers[0].sequentialNumbering, false);
  assert.equal(result.papers[0].marks, 3);
  assert.equal(availability.describeYears(result.years), '2024, 2026');
  assert.equal(availability.describeYears([2023, 2021, 2022]), '2021–2023');
});

test('empty and unlabelled availability are explicit', () => {
  assert.equal(availability.summariseAvailability([]).paperCount, 0);
  const result = availability.summariseAvailability([{ year: null, paper: null, source_question_number: null, marks: null }]);
  assert.equal(result.questionCount, 1);
  assert.equal(result.papers[0].sequentialNumbering, false);
  assert.equal(availability.describeYears(result.years), 'Year not labelled');
});

function catalogClient(pages, error = null) {
  const calls = [];
  return { calls, from(table) {
    const query = {
      select(fields) { calls.push(['select', table, fields]); return this; },
      in(field, ids) { calls.push(['in', field, ids]); return this; },
      order(field) { calls.push(['order', field]); return this; },
      async range(start, end) { calls.push(['range', start, end]); return { data: pages[start / 1000] ?? [], error }; },
    };
    return query;
  } };
}
function loadCatalog(client) {
  return load('lib/test-catalog.ts', {
    '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/content-availability': availability,
    '@/lib/stream-scope': {},
  });
}

test('onboarding counts page past the API limit and isolate stream and unstreamed scopes', async () => {
  const row = { exam_id: 'gate', stream_id: 'cs', year: 2026, paper: 'CS1', marks: 1, source_question_number: null };
  const client = catalogClient([Array.from({ length: 1000 }, () => row), [
    { ...row, stream_id: 'ce' }, { ...row, stream_id: null },
  ]]);
  const result = await loadCatalog(client).getContentAvailability(['gate']);
  assert.equal(result[availability.availabilityScope('gate', 'cs')].questionCount, 1000);
  assert.equal(result[availability.availabilityScope('gate', 'ce')].questionCount, 1);
  assert.equal(result[availability.availabilityScope('gate', null)].questionCount, 1);
  assert.deepEqual(client.calls.filter(c => c[0] === 'range'), [['range', 0, 999], ['range', 1000, 1999]]);
  assert.equal(client.calls[0][2].includes('correct_option'), false);
  assert.equal(client.calls[0][2].includes('question_text'), false);
});

test('catalogue query failure cannot become a no-questions claim', async () => {
  await assert.rejects(loadCatalog(catalogClient([], new Error('unavailable'))).getContentAvailability(['gate']), /unavailable/);
  const client = catalogClient([]);
  assert.deepEqual(serialise(await loadCatalog(client).getContentAvailability([])), {});
  assert.equal(client.calls.length, 0);
});

test('active presentation allowlist removes keys and nested source metadata while retaining option positions', () => {
  const { toQuestionPresentation } = load('lib/question-contract.ts');
  const source = {
    id: 'q', question_text: 'Choose every matching diagram', question_type: 'MSQ',
    option_1: '', option_2: '', option_3: '', option_4: '', correct_options: [1, 4],
    explanation: 'secret solution', answer_ranges: [{ min: 2, max: 3 }],
    option_images: [{ url: '/a.png', width: 10, height: 20, secret: 'key' }, null, null, { url: '/d.png' }],
    source_metadata: { official_answer_key: 'AD', presentation: { compact_prompt: true, answer: 'AD' } },
  };
  const result = serialise(toQuestionPresentation(source));
  assert.equal(result.option_images.length, 4);
  assert.equal(result.option_images[1], null);
  assert.equal(result.option_images[3].url, '/d.png');
  assert.equal(result.option_images[0].secret, undefined);
  assert.deepEqual(result.source_metadata, { presentation: { compact_prompt: true } });
  for (const key of ['correct_options', 'explanation', 'answer_ranges']) assert.equal(key in result, false);
  assert.equal(source.option_images[0].secret, 'key', 'projection must not mutate the source');
});

test('NAT presentation retains input precision without exposing the accepted range', () => {
  const { toQuestionPresentation } = load('lib/question-contract.ts');
  const result = toQuestionPresentation({ id: 'n', question_text: 'Calculate', question_type: 'NAT',
    option_1: null, option_2: null, option_3: null, option_4: null,
    answer_decimal_places: 3, answer_min: 1.2, answer_max: 1.4 });
  assert.equal(result.answer_decimal_places, 3);
  assert.equal(result.answer_min, undefined);
  assert.equal(result.option_1, '');
});

test('solution section rendering is identical for LF and CRLF, including Answer styling', () => {
  const { QuestionExplanation } = load('components/QuestionExplanation.tsx', {
    '@/components/MathText': { MathText: ({ text }) => React.createElement('div', null, text) },
  });
  const solution = '### Method\nWork through the calculation.\n### Answer\n42';
  const render = text => renderToStaticMarkup(React.createElement(QuestionExplanation, { text }));
  assert.equal(render(solution), render(solution.replaceAll('\n', '\r\n')));
  assert.match(render(solution), /text-green-800/);
});
