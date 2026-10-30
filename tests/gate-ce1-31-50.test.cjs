const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const katex=require('katex');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
const {gradeResponse,numericKeypress}=load('lib/question-response.ts');
const {calculateMarks}=load('lib/marking.ts');
const {renderMathToHtml}=load('lib/renderMath.ts');
const root='data/gate-2027/streams/CE-civil-engineering/papers/2026/CE1/';
const questions=JSON.parse(fs.readFileSync(root+'technical-31-50.json','utf8'));

test('CE1 Q31–50 preserve official keys, marks, types, precision and syllabus links',()=>{
  assert.deepEqual(questions.map(q=>q.source_question_number),Array.from({length:20},(_,i)=>i+31));
  assert.deepEqual(questions.map(q=>q.answer_key),['0.28 to 0.32','48.2 to 48.6','20.00 to 21.90','22 to 22','98.500 to 98.500','C','A','C','A','A','C','D','A','A','A;B','B;D','A','0.55 to 0.58','2 to 2','0.39 to 0.44']);
  assert.equal(questions.filter(q=>q.question_type==='MCQ').length,9);
  assert.equal(questions.filter(q=>q.question_type==='MSQ').length,3);
  assert.equal(questions.filter(q=>q.question_type==='NAT').length,8);
  const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
  questions.forEach((q,i)=>{
    assert.equal(q.marks,i<5?1:2);assert.equal(q.marks_to_all,false);
    assert.equal(q.negative_marks,q.question_type==='MCQ'?2/3:0);
    assert.equal(q.source_metadata.paper,'CE1');assert.equal(q.source_metadata.session,5);
    assert.equal(q.organising_institute,'IIT Guwahati');
    assert.ok(syllabus.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic)?.subtopics.find(t=>t.name===q.subtopic));
    assert.ok(q.explanation.includes('### Solution\n'));assert.ok(q.explanation.includes('### Answer\n'));
  });
  assert.deepEqual(questions.filter(q=>q.question_type==='NAT').map(q=>q.answer_decimal_places),[2,1,2,0,3,2,0,2]);
});

test('numerical solutions grade correctly and a single-correct MSQ remains an MSQ',()=>{
  for(const [n,response] of [[31,'0.29'],[32,'48.4'],[33,'21.18'],[34,'22'],[35,'98.500'],[48,'0.57'],[49,'2'],[50,'0.41']]){
    assert.equal(gradeResponse(questions[n-31],response),true,`CE1 Q${n}`);
    assert.deepEqual(questions[n-31].options,[]);
  }
  assert.equal(numericKeypress('98.50','0',questions[4].answer_decimal_places),'98.500');
  assert.equal(numericKeypress('98.500','1',questions[4].answer_decimal_places),'98.500');
  assert.equal(gradeResponse(questions[4],'98.501'),false);
  const q47=questions[16];assert.equal(q47.question_type,'MSQ');assert.deepEqual(q47.correct_options,[1]);
  assert.equal(gradeResponse(q47,[1]),true);assert.equal(gradeResponse(q47,[1,2]),false);
  assert.equal(gradeResponse(questions[15],[2,4]),true);assert.equal(gradeResponse(questions[15],[2]),false);
});

test('all formulas, interpolation table and four original figures render correctly',()=>{
  for(const q of questions)for(const text of [q.question_text,...q.options,q.explanation]){
    for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`CE1 Q${q.source_question_number}`);
    assert.ok(!renderMathToHtml(text).includes('katex-error'));
  }
  assert.ok(renderMathToHtml(questions[18].question_text).includes('<table'));
  const figures=questions.filter(q=>q.figure);assert.equal(figures.length,4);
  for(const q of figures){const img=q.figure,png=fs.readFileSync('public'+img.local_url);assert.ok(Math.abs((png.readUInt32BE(16)/png.readUInt32BE(20))/(img.width/img.height)-1)<0.02);}
  for(const [x,y] of [[-2,28],[1,4],[2,16]])assert.equal(5*x*x-3*x+2,y);
  assert.ok(Math.abs((Math.sqrt(2)-1)**2+2*(Math.sqrt(2)-1)-1)<1e-12);
});

test('CE1 Q31–50 total 35 marks and complete imported Q1–50 total 70 without duplicates',()=>{
  const qs=questions.map(q=>({...q,id:String(q.source_question_number)}));
  const answers=wrong=>qs.map(q=>{const response=q.question_type==='NAT'?(wrong?'999':q.answer_min):q.question_type==='MSQ'?(wrong?[4]:q.correct_options):(wrong?q.correct_option%4+1:q.correct_option);return {question_id:q.id,selected_option:typeof response==='number'?response:null,is_correct:gradeResponse(q,response)};});
  assert.equal(calculateMarks(qs,answers(false)).net,35);assert.equal(calculateMarks(qs,answers(true)).net,-6);
  const all=['questions.json','technical-11-30.json','technical-31-50.json'].flatMap(file=>JSON.parse(fs.readFileSync(root+file,'utf8')));
  assert.equal(all.length,50);assert.equal(new Set(all.map(q=>q.source_question_number)).size,50);assert.equal(all.reduce((n,q)=>n+q.marks,0),70);
});
