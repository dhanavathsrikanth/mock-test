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
const root='data/gate-2027/streams/CE-civil-engineering/papers/2026/CE2/';
const questions=JSON.parse(fs.readFileSync(root+'technical-46-65.json','utf8'));

test('remaining Q46–65 preserve every supplied NAT range, precision and two-mark weighting',()=>{
  const keys=['0.37 to 0.42','170.00 to 173.00','85.50 to 87.60','4 to 4','16 to 16','98.00 to 102.00','0.90 to 1.10','4.75 to 5.00','78 to 82','3.00 to 3.20','170 to 174','18.2 to 18.6','10.00 to 11.20','10.0 to 10.0','3300 to 3350','60 to 67','0.180 to 0.184','13 to 15','8 to 10','0.90 to 1.10'];
  assert.deepEqual(questions.map(q=>q.source_question_number),Array.from({length:20},(_,i)=>46+i));
  assert.deepEqual(questions.map(q=>q.answer_key),keys);
  assert.deepEqual(questions.map(q=>q.answer_decimal_places),[2,2,1,0,0,2,2,2,0,2,0,1,2,1,0,0,3,0,0,2]);
  const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
  for(const q of questions){
    assert.equal(q.question_type,'NAT');assert.equal(q.marks,2);assert.equal(q.negative_marks,0);
    assert.deepEqual(q.options,[]);assert.equal(q.correct_option,null);assert.equal(q.correct_options,null);
    assert.ok(syllabus.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic)?.subtopics.find(t=>t.name===q.subtopic),`Q${q.source_question_number} syllabus`);
    assert.ok(q.explanation.startsWith('### Method\n'));assert.ok(q.explanation.includes('\n### Answer\n'));
    assert.equal(q.organising_institute,'IIT Guwahati');
  }
});

test('worked numerical results fall within the key; Q62 supports its required three decimals',()=>{
  const answers=['0.39','171.67','86.2','4','16','100.06','1.00','4.84','80','3.03','173','18.4','10.61','10.0','3311','63','0.182','14','9','1.00'];
  questions.forEach((q,i)=>assert.equal(gradeResponse(q,answers[i]),true,`Q${q.source_question_number}: ${answers[i]}`));
  const q62=questions[16];assert.equal(numericKeypress('0.18','2',q62.answer_decimal_places),'0.182');
  assert.equal(numericKeypress('0.182','1',q62.answer_decimal_places),'0.182');
  assert.equal(gradeResponse(q62,'0.1821'),false);
  assert.equal(gradeResponse(questions[13],'10.0'),true);assert.equal(gradeResponse(questions[13],'10.1'),false);
});

test('remaining formulas, tables and source diagrams render without truncating aspect ratios',()=>{
  for(const q of questions)for(const text of [q.question_text,q.explanation]){
    for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);
    assert.ok(!renderMathToHtml(text).includes('katex-error'));
  }
  for(const n of [62,63])assert.ok(renderMathToHtml(questions[n-46].question_text).includes('<table'));
  const figures=questions.filter(q=>q.figure);assert.equal(figures.length,3);
  for(const q of figures){const image=q.figure,png=fs.readFileSync(`public${image.local_url}`);assert.ok(Math.abs((png.readUInt32BE(16)/png.readUInt32BE(20))/(image.width/image.height)-1)<0.02);}
});

test('complete CE2 bank contains 65 unique source questions totaling 100 marks',()=>{
  const all=['questions.json','technical-11-30.json','technical-31-45.json','technical-46-65.json'].flatMap(file=>JSON.parse(fs.readFileSync(root+file,'utf8')));
  assert.equal(all.length,65);assert.equal(new Set(all.map(q=>q.source_question_number)).size,65);
  assert.equal(all.reduce((sum,q)=>sum+q.marks,0),100);
  const qs=all.map(q=>({...q,id:String(q.source_question_number)}));
  const answers=qs.map(q=>{const response=q.question_type==='NAT'?q.answer_min:q.correct_options||q.correct_option;return {question_id:q.id,selected_option:q.correct_option,numeric_answer:q.question_type==='NAT'?response:null,is_correct:gradeResponse(q,response)};});
  assert.equal(calculateMarks(qs,answers).net,100);
});
