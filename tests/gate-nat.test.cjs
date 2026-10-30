const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const katex = require('katex');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
const {gradeResponse,numericKeypress,hasResponse,numericAnswerLabel}=load('lib/question-response.ts');
const {calculateMarks}=load('lib/marking.ts');
const {renderMathToHtml}=load('lib/renderMath.ts');
const data=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/papers/2026/CE2/technical-31-45.json','utf8'));
test('Q31–45 exactly preserve the supplied key types, ranges and marks',()=>{
  assert.deepEqual(data.map(q=>q.source_question_number),Array.from({length:15},(_,i)=>i+31));
  assert.deepEqual(data.map(q=>q.answer_key),['89.00 to 91.00','45.00 to 55.00','1.00 to 1.15','540 to 540','3 to 3','D','A','B','A','A','A','A','A;C;D','A;D','A;B']);
  assert.equal(data.filter(q=>q.question_type==='NAT').length,5);
  assert.equal(data.reduce((total,q)=>total+q.marks,0),25);
  for(const q of data.slice(0,5)){assert.equal(q.options.length,0);assert.equal(q.correct_option,null);assert.equal(q.negative_marks,0);}
  assert.deepEqual(data.map(q=>q.answer_decimal_places).slice(0,5),[2,2,2,0,0]);
  const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
  for(const q of data)assert.ok(syllabus.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic)?.subtopics.find(t=>t.name===q.subtopic),`Q${q.source_question_number}`);
});
test('NAT accepts inclusive endpoints and exact-value intervals without rounding outside answers in',()=>{
  for(const q of data.slice(0,5)){
    assert.equal(gradeResponse(q,q.answer_min),true);assert.equal(gradeResponse(q,q.answer_max),true);
    assert.equal(gradeResponse(q,String(Number(q.answer_min)-0.01)),false);assert.equal(gradeResponse(q,String(Number(q.answer_max)+0.01)),false);
  }
  const q={question_type:'NAT',correct_option:null,answer_min:'-0.10',answer_max:'0.10'};
  for(const value of ['-.1','+0.10','0','-0.000','0.100000000000000000'])assert.equal(gradeResponse(q,value),true,value);
  for(const value of ['0.100000000000000001','-0.100000000000000001'])assert.equal(gradeResponse(q,value),false,value);
  for(const value of ['',null,'-','.','NaN','Infinity','1+2','1e2','0x10'])assert.equal(gradeResponse(q,value),null,String(value));
  assert.equal(hasResponse('0'),true);assert.equal(hasResponse('-'),false);
});
test('keypad supports signed decimals, backspace and clearing without multiple decimal points',()=>{
  let value='';for(const key of ['sign','1','.','0','8'])value=numericKeypress(value,key);
  assert.equal(value,'-1.08');assert.equal(numericKeypress(value,'.'),value);
  assert.equal(numericKeypress(value,'sign'),'1.08');assert.equal(numericKeypress(value,'backspace'),'-1.0');assert.equal(numericKeypress(value,'clear'),'');
});

test('question precision is enforced without rounding and equal key bounds display one exact answer',()=>{
  const q=data[2];
  for(const value of ['1','1.08','1.0800','1.15'])assert.equal(gradeResponse(q,value),true,value);
  for(const value of ['1.081','1.159','1.149999'])assert.equal(gradeResponse(q,value),false,value);
  for(const value of ['3','3.0','3.00'])assert.equal(gradeResponse(data[4],value),true,value);
  for(const value of ['3.001','2.999'])assert.equal(gradeResponse(data[4],value),false,value);
  assert.equal(numericAnswerLabel('3.00',3),'Exact answer: 3');
  assert.equal(numericAnswerLabel('540','540'),'Exact answer: 540');
  assert.equal(numericAnswerLabel('1.00','1.15'),'Accepted answer range: 1.00 to 1.15 (inclusive)');
  assert.equal(numericKeypress('1.08','1',2),'1.08');
  assert.equal(numericKeypress('1.0','8',2),'1.08');
  assert.equal(numericKeypress('3','.',0),'3');
  assert.equal(numericKeypress('1.08','backspace',2),'1.0');
  assert.equal(numericKeypress('1.08','sign',2),'-1.08');
});
test('NAT/MCQ/MSQ score together; blank zero-credit and numeric zero remain distinct',()=>{
  const qs=data.map(q=>({...q,id:String(q.source_question_number)}));
  const answers=qs.map(q=>{const response=q.question_type==='NAT'?q.answer_min:q.correct_options||q.correct_option;return {question_id:q.id,selected_option:q.correct_option,numeric_answer:q.question_type==='NAT'?response:null,is_correct:gradeResponse(q,response)};});
  assert.equal(calculateMarks(qs,answers).net,25);assert.equal(calculateMarks(qs,[]).net,0);
  assert.equal(calculateMarks([qs[0]],[{question_id:qs[0].id,selected_option:null,numeric_answer:'0',is_correct:false}]).net,0);
});
test('Q31–45 formulas, matrices, matching table and original figures render correctly',()=>{
  for(const q of data)for(const text of [q.question_text,...q.options,q.explanation]){
    for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);
    assert.ok(!renderMathToHtml(text).includes('katex-error'));
  }
  assert.ok(renderMathToHtml(data[12].question_text).includes('<table'));
  const images=data.filter(q=>q.figure).map(q=>q.figure);assert.equal(images.length,3);
  for(const image of images){const png=fs.readFileSync(`public${image.local_url}`);assert.ok(Math.abs((png.readUInt32BE(16)/png.readUInt32BE(20))/(image.width/image.height)-1)<0.02);}
});
