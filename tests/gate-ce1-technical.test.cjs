const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const katex=require('katex');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
const {calculateMarks}=load('lib/marking.ts');
const {gradeResponse}=load('lib/question-response.ts');
const {renderMathToHtml}=load('lib/renderMath.ts');
const root='data/gate-2027/streams/CE-civil-engineering/papers/2026/CE1/';
const questions=JSON.parse(fs.readFileSync(root+'technical-11-30.json','utf8'));

test('CE1 Q11–30 preserve key provenance, question types, ranges, marks and topic mappings',()=>{
  assert.deepEqual(questions.map(q=>q.source_question_number),Array.from({length:20},(_,i)=>i+11));
  assert.deepEqual(questions.map(q=>q.source_metadata.editorial_revision?.original.answer_key||q.answer_key),['A','B','B','D','A','D','A','A','MTA','C','D','B','B;C;D','A;B','A;C;D','0.50 to 0.66','5 to 5','91 to 91','214 to 218','120 to 130']);
  assert.equal(questions.filter(q=>q.question_type==='MCQ').length,12);
  assert.equal(questions.filter(q=>q.question_type==='MSQ').length,3);
  assert.equal(questions.filter(q=>q.question_type==='NAT').length,5);
  const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
  for(const q of questions){
    assert.equal(q.marks,1);assert.equal(q.source_metadata.paper,'CE1');assert.equal(q.source_metadata.session,5);
    assert.ok(syllabus.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic)?.subtopics.find(t=>t.name===q.subtopic),`Q${q.source_question_number}`);
    assert.equal(q.organising_institute,'IIT Guwahati');assert.ok(q.explanation.includes('### Answer\n'));
    assert.equal(q.negative_marks,q.question_type==='MCQ'&&!q.marks_to_all?1/3:0);
  }
  const q19=questions[8];assert.equal(q19.marks_to_all,false);assert.equal(q19.correct_option,1);assert.equal(q19.correct_options,null);
  const revision=q19.source_metadata.editorial_revision;
  assert.equal(revision.original.marking_override.official_key,'MTA*');
  assert.equal(revision.original.marks_to_all,true);assert.equal(revision.original.correct_option,null);
  assert.ok(q19.question_text.startsWith('Edited practice version'));
  assert.equal(new Set(q19.options).size,4);
  assert.equal(q19.options[0],'$0.07\\dfrac{H}{300}$ ; $0.01T$ ; $0.20G$');
  assert.ok(q19.question_text.includes('rise of the airport reference temperature'));
  assert.ok(q19.question_text.includes('$G=1$ for a 1% gradient'));
  assert.ok(q19.question_text.includes('fractional increases'));
});

test('MTA awards its mark independently of answers; ordinary skipped questions stay zero-credit',()=>{
  const qs=questions.map(q=>({...q,id:String(q.source_question_number)}));
  assert.equal(calculateMarks(qs,[]).net,0);
  const answers=qs.map(q=>{const value=q.question_type==='NAT'?q.answer_min:q.correct_options||q.correct_option;return {question_id:q.id,selected_option:q.correct_option,is_correct:gradeResponse(q,value)};});
  assert.equal(calculateMarks(qs,answers).net,20);
  const q19=qs[8];
  assert.equal(gradeResponse(q19,1),true);
  for(const response of [2,3,4])assert.equal(gradeResponse(q19,response),false);
  for(const response of [undefined,null])assert.equal(gradeResponse(q19,response),null);
  assert.equal(calculateMarks([q19],[{question_id:q19.id,selected_option:2,is_correct:false}]).net,-0.33);
  const original={...q19,...q19.source_metadata.editorial_revision.original};
  for(const response of [undefined,null,1,2,3,4])assert.equal(gradeResponse(original,response),true);
  assert.equal(calculateMarks([original],[]).net,1);
  for(const [n,value] of [[26,'0.58'],[27,'5'],[28,'91'],[29,'216'],[30,'125']])assert.equal(gradeResponse(qs[n-11],value),true);
  assert.equal(gradeResponse(qs[15],'0.581'),false);
});

test('CE1 technical formulas, semantic tables and four source option diagrams render correctly',()=>{
  for(const q of questions)for(const text of [q.question_text,...q.options,q.explanation]){
    for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`CE1 Q${q.source_question_number}`);
    assert.ok(!renderMathToHtml(text).includes('katex-error'));
  }
  for(const n of [18,23])assert.ok(renderMathToHtml(questions[n-11].question_text).includes('<table'));
  const images=questions.flatMap(q=>q.option_images);assert.equal(images.length,4);
  for(const img of images){const png=fs.readFileSync('public'+img.local_url);assert.ok(Math.abs((png.readUInt32BE(16)/png.readUInt32BE(20))/(img.width/img.height)-1)<0.02);}
  assert.ok(questions[2].source_metadata.interpretation_note.includes('in-plane'));
});
