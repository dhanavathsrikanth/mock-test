/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const renderExports = {};
const source = fs.readFileSync('lib/renderMath.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
vm.runInNewContext(compiled, { exports: renderExports, require });

test('CE 2021 Simpson one-third wording remains normal text instead of turning red', () => {
  const rows = JSON.parse(fs.readFileSync(
    'data/gate-2027/streams/CE-civil-engineering/papers/2021/CE1/questions-1-65.json',
    'utf8',
  ));
  const question = rows.find(row => row.source_question_number === 46);
  const html = renderExports.renderMathToHtml(question.question_text);

  assert.match(question.question_text, /Simpson’s 1\/3rd rule/);
  assert.doesNotMatch(html, /katex-error/);
  assert.match(html, /Simpson’s 1\/3rd rule/);
  assert.match(html, /<table/);
});

test('an unwrapped inline fraction renders both groups and leaves its suffix as text', () => {
  const html = renderExports.renderMathToHtml('Simpson’s \\frac{1}{3}rd rule');

  assert.doesNotMatch(html, /katex-error/);
  assert.match(html, /class="mfrac"/);
  assert.match(html, /rd rule/);
});
