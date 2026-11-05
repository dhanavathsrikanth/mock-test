import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { selectQuestionRows, normaliseImportRow, compareQuestion } from '../tools/audit-content.mjs';

const md5 = text => crypto.createHash('md5').update(text).digest('hex');
const question = { source_question_number: 1, question_text: 'Calculate', question_type: 'NAT', options: [],
  marks: 2, negative_marks: 0, correct_option: null, answer_min: -2, answer_max: -1,
  answer_ranges: [{ min: -2, max: -1 }, { min: 1, max: 2 }], explanation: 'Work\nAnswer',
  subject: 'Maths', topic: 'Algebra' };
const live = { ...question, question_hash: md5(question.question_text), explanation_hash: md5(question.explanation),
  option_1_hash: md5(''), option_2_hash: md5(''), option_3_hash: md5(''), option_4_hash: md5(''),
  subject_name: 'Maths', topic_name: 'Algebra', topic_id: 'topic' };

test('audit compares JSON object keys semantically but detects a changed accepted range', () => {
  assert.deepEqual(compareQuestion(question, { ...live, answer_ranges: [{ max: -1, min: -2 }, { max: 2, min: 1 }] }), []);
  assert.ok(compareQuestion(question, { ...live, answer_ranges: [{ min: -2, max: 2 }] }).includes('answer_ranges'));
});

test('line-ending differences require explicit verified normalised evidence', () => {
  const windows = { ...live, explanation_hash: md5('Work\r\nAnswer') };
  assert.deepEqual(compareQuestion(question, windows), ['explanation']);
  assert.deepEqual(compareQuestion(question, { ...windows, explanation_lf_hash: md5(question.explanation) }), []);
});

test('merged imports are not double counted and conflicting batch copies remain visible', () => {
  const result = selectQuestionRows([{ name: 'questions-1-65.json', rows: [question] },
    { name: 'questions-1-10.json', rows: [{ ...question, explanation: 'different' }] }]);
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.conflicts, [1]);
  assert.deepEqual(compareQuestion(question, null), ['missing_live_question']);
});

test('legacy GA import shape derives classification and fractional penalty without mutating input', () => {
  const source = { question_text: 'Legacy', source_metadata: { section: 'GA',
    negative_mark_fraction: { numerator: 2, denominator: 3 },
    classification: { area: 'Verbal Aptitude', primary_topic: 'Grammar' } } };
  const result = normaliseImportRow(source);
  assert.equal(result.subject, 'General Aptitude');
  assert.equal(result.subtopic, 'Grammar');
  assert.equal(result.negative_marks, 2 / 3);
  assert.equal(source.subject, undefined);
});
