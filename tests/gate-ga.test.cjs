const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const katex = require("katex");

function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, { exports, require });
  return exports;
}
const { calculateMarks, negativeMarkLabel } = load("lib/marking.ts");
const { renderMathToHtml } = load("lib/renderMath.ts");
const data = JSON.parse(fs.readFileSync("data/gate-2027/streams/CE-civil-engineering/papers/2026/CE2/questions.json", "utf8"));
const questions = data.map(q => ({ ...q, id: String(q.source_question_number), negative_marks: q.marks / 3 }));

test("GA import exactly matches the ten supplied answer-key rows and 15 marks", () => {
  assert.equal(data.length, 10);
  assert.deepEqual(data.map(q => q.source_question_number), [1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(data.map(q => q.answer_key), ["C","A","A","D","C","B","B","C","B","B"]);
  assert.deepEqual(data.map(q => q.marks), [1,1,1,1,1,2,2,2,2,2]);
  for (const q of data) {
    assert.equal(q.options.length, 4);
    assert.equal(q.correct_option, q.answer_key.charCodeAt(0) - 64);
    assert.equal(q.reviewed, true);
    assert.ok(!JSON.stringify(q).includes("�"));
  }
});

test("all formula segments compile and are rendered in question and option text", () => {
  for (const q of data) {
    for (const value of [q.question_text, ...q.options]) {
      for (const match of value.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g)) {
        assert.doesNotThrow(() => katex.renderToString(match[1] || match[2], { throwOnError: true }));
      }
      assert.ok(!renderMathToHtml(value).includes('class="katex-error"'));
    }
  }
  assert.ok(renderMathToHtml(data[1].options[0]).includes('class="msupsub"'));
  assert.ok(renderMathToHtml(data[7].options[2]).includes('class="mfrac"'));
  assert.ok(renderMathToHtml(data[6].question_text).includes("<table"));
});

test("the original eight diagram crops exist and preserve their display aspect ratios", () => {
  const images = data.flatMap(q => [...(q.figure ? [q.figure] : []), ...(q.option_images || [])]);
  assert.equal(images.length, 8);
  for (const image of images) {
    const png = fs.readFileSync(path.join("public", image.local_url));
    const ratio = png.readUInt32BE(16) / png.readUInt32BE(20);
    assert.ok(Math.abs(ratio / (image.width / image.height) - 1) < 0.02);
    assert.ok(png.readUInt32BE(16) > image.width, "retina-resolution source crop");
  }
  assert.equal(data[2].option_images.length, 4);
});

test("GATE MCQ scores: all correct 15, all wrong -5, all skipped 0", () => {
  const correct = questions.map(q => ({ question_id: q.id, selected_option: q.correct_option, is_correct: true }));
  const wrong = questions.map(q => ({ question_id: q.id, selected_option: q.correct_option % 4 + 1, is_correct: false }));
  assert.equal(calculateMarks(questions, correct).net, 15);
  assert.equal(calculateMarks(questions, wrong).net, -5);
  assert.equal(calculateMarks(questions, []).net, 0);
  assert.equal(calculateMarks(questions, []).maximum, 15);
  assert.equal(negativeMarkLabel(questions[0]), "1/3");
  assert.equal(negativeMarkLabel(questions[5]), "2/3");
});

test("penalties are summed before rounding and legacy marking remains compatible", () => {
  const firstThree = questions.slice(0,3);
  assert.equal(calculateMarks(firstThree, firstThree.map(q => ({ question_id: q.id, selected_option: 4, is_correct: false }))).net, -1);
  assert.equal(calculateMarks([{ id: "legacy" }], [{ question_id: "legacy", selected_option: 1, is_correct: false }]).net, 0);
});
