const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const katex = require('katex');
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});
  return exports;
}
const data = JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/papers/2026/CE2/technical-11-30.json','utf8'));
const { renderMathToHtml } = load('lib/renderMath.ts');
const { calculateMarks } = load('lib/marking.ts');
const { gradeResponse } = load('lib/question-response.ts');
test('technical import matches original Q11–30, including the A+C MSQ key',()=>{
  assert.deepEqual(data.map(q=>q.source_question_number),Array.from({length:20},(_,i)=>i+11));
  assert.deepEqual(data.map(q=>q.answer_key),['B','A','A','A','C','B','A','A','A','A','B','A','C','A','B','A','A','A','A','A;C']);
  const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
  for(const q of data){
    assert.equal(q.marks,1);assert.equal(q.options.length,4);assert.ok(q.explanation);assert.equal(q.organising_institute,'IIT Guwahati');
    const subject=syllabus.subjects.find(s=>s.name===q.subject);
    assert.ok(subject?.topics.find(t=>t.name===q.topic)?.subtopics.find(t=>t.name===q.subtopic),`Q${q.source_question_number} syllabus mapping`);
  }
  assert.equal(data.at(-1).question_type,'MSQ');assert.deepEqual(data.at(-1).correct_options,[1,3]);assert.equal(data.at(-1).correct_option,null);assert.equal(data.at(-1).negative_marks,0);
});
test('technical formulas, cases, table cells and all explanations render without errors',()=>{
  for(const q of data)for(const text of [q.question_text,...q.options,q.explanation]){
    for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);
    assert.ok(!renderMathToHtml(text).includes('katex-error'));
  }
  assert.ok(renderMathToHtml(data[2].question_text).includes('katex'));
  assert.ok(renderMathToHtml(data[11].question_text).includes('<table'));
  assert.ok(renderMathToHtml(data[16].question_text).includes('<table'));
  assert.ok(renderMathToHtml(data[16].question_text).includes('class="katex"'));
  assert.ok(!renderMathToHtml(data[16].question_text).includes('$\\mathrm'));
  assert.ok(renderMathToHtml('| Value |\n|---|\n| <img src=x onerror=alert(1)> |').includes('&lt;img'));
});
test('five original technical diagram crops preserve source display proportions',()=>{
  const images=data.flatMap(q=>[...(q.figure?[q.figure]:[]),...q.option_images]);assert.equal(images.length,5);
  for(const img of images){const png=fs.readFileSync(`public${img.local_url}`);assert.ok(Math.abs((png.readUInt32BE(16)/png.readUInt32BE(20))/(img.width/img.height)-1)<0.02);}
});
test('technical grading awards 20 marks for all correct and zero for partial MSQ',()=>{
  const qs=data.map(q=>({...q,id:String(q.source_question_number)}));
  const answers=qs.map(q=>{const response=q.correct_options||q.correct_option;return {question_id:q.id,selected_option:q.correct_option,selected_options:q.correct_options,is_correct:gradeResponse(q,response)};});
  assert.equal(calculateMarks(qs,answers).net,20);
  const msq=qs.at(-1);
  for(const selected of [[1],[3],[1,2,3]])assert.equal(calculateMarks([msq],[{question_id:msq.id,selected_option:null,selected_options:selected,is_correct:gradeResponse(msq,selected)}]).net,0);
  assert.equal(calculateMarks(qs,[]).net,0);
});
