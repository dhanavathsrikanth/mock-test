const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');
const katex = require('katex');
const base = 'data/gate-2027/streams/CS-computer-science/papers/2023/CS/';
const questions = JSON.parse(fs.readFileSync(base + 'questions-1-10.json', 'utf8'));
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports });
  return exports;
}
const { gradeResponse } = load('lib/question-response.ts');
const { calculateMarks } = load('lib/marking.ts');

test('CS 2023 GA matches all ten official final keys, numbering and 15 marks', () => {
  assert.deepEqual(questions.map(q => q.source_question_number), Array.from({ length: 10 }, (_, i) => i + 1));
  assert.deepEqual(questions.map(q => q.answer_key), ['B', 'MTA', 'A', 'A', 'C', 'D', 'C', 'D', 'B', 'A']);
  assert.equal(questions.reduce((sum, q) => sum + q.marks, 0), 15);
  for (const q of questions) {
    assert.equal(q.question_type, 'MCQ');
    assert.equal(q.options.length, 4);
    assert.equal(q.marks, q.source_question_number <= 5 ? 1 : 2);
    assert.equal(q.negative_marks, q.marks_to_all ? 0 : q.marks / 3);
    assert.equal(q.source_metadata.stream, 'CS');
    assert.equal(q.source_metadata.paper, 'CS');
    assert.equal(q.source_metadata.session, 1);
    assert.equal(q.source_metadata.section, 'GA');
    assert.equal(q.source_metadata.original_question_number, q.source_question_number);
    assert.equal(q.organising_institute, 'IIT Kanpur');
    assert.equal(q.subject, 'General Aptitude');
    assert.ok(q.explanation.startsWith('### Solution\n'));
    for (const key of ['question_source', 'key_source']) {
      const source = q.source_metadata[key];
      assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base + 'sources/' + source.filename)).digest('hex'), source.sha256);
      assert.ok(source.url.startsWith('https://gate2027.iitm.ac.in/'));
    }
  }
});

test('Marks To All grants Q2 credit for every choice and an unanswered response', () => {
  const q = questions[1];
  assert.equal(q.correct_option, null);
  assert.equal(q.marks_to_all, true);
  for (const answer of [null, undefined, 1, 2, 3, 4]) assert.equal(gradeResponse(q, answer), true);
  const bank = questions.map(q => ({ ...q, id: String(q.source_question_number) }));
  assert.equal(calculateMarks(bank, []).net, 1);
  assert.equal(calculateMarks(bank, bank.map(q => ({ question_id: q.id, selected_option: q.correct_option, is_correct: true }))).net, 15);
  const wrong = bank.map(q => ({ question_id: q.id, selected_option: q.correct_option === 1 ? 2 : 1, is_correct: q.marks_to_all }));
  assert.equal(calculateMarks(bank, wrong).net, -3.67);
});

test('GA formulas render, original Q10 figure preserves labels/proportions and public bytes', () => {
  for (const q of questions) {
    for (const text of [q.question_text, ...q.options, q.explanation]) {
      assert.ok(!/[\x00-\x09\x0b-\x1f\ufffd]/.test(text));
      for (const match of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g)) {
        assert.doesNotThrow(() => katex.renderToString(match[1] || match[2], { throwOnError: true }));
      }
    }
  }
  assert.deepEqual(questions.filter(q => q.figure).map(q => q.source_question_number), [10]);
  const f = questions[9].figure;
  const bytes = fs.readFileSync(base + 'images/q10-figure.png');
  assert.ok(bytes.equals(fs.readFileSync('public' + f.local_url)));
  assert.ok(Math.abs(bytes.readUInt32BE(16) / bytes.readUInt32BE(20) - f.width / f.height) < 0.025);
  assert.match(f.alt, /P, Q and R/);
  assert.ok(questions.every(q => q.option_images.length === 0));
});

test('independent recurrence and function checks support keyed GA answers', () => {
  const sequence = [4, 5];
  for (let i = 2; i < 7; i++) sequence.push(sequence[i - 1] + sequence[i - 2]);
  assert.deepEqual(sequence.slice(5), [37, 60]);
  assert.equal(0.9 * 0.6, 0.54);
  assert.ok(0.01 * 100 ** 2 < 4 * 100);
  assert.equal(0.01 * 400 ** 2, 4 * 400);
  assert.ok(0.01 * 1000 ** 2 > 4 * 1000);
  const sql = fs.readFileSync(base + 'import-1-10.sql', 'utf8');
  assert.match(sql, /es.code='CS'/);
  assert.match(sql, /s.stream_id is null/);
  assert.match(sql, /where public.questions.stream_id=excluded.stream_id/);
  assert.match(sql, /on conflict \(exam_id,year,paper,source_question_number\)/);
  assert.ok(!sql.includes("es.code='CE'"));
});
