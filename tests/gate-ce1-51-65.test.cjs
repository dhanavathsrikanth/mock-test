const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const katex=require('katex');
const data=require('../data/gate-2027/streams/CE-civil-engineering/papers/2026/CE1/technical-51-65.json');
const exportsTS={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/question-response.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsTS});
const {gradeResponse,numericAnswerLabel}=exportsTS;

test('CE1 final 15 retain official keys, precision, syllabus classification and 30 marks',()=>{
  assert.deepEqual(data.map(q=>q.source_question_number),Array.from({length:15},(_,i)=>51+i));
  assert.deepEqual(data.map(q=>q.answer_key),['7.0 to 7.4','12 to 12','35.0 to 40.0','1000 to 1000','0.38 to 0.41','6.40 to 6.80','2.50 to 2.65','3.2 to 3.6','0.00 to 0.00','2200 to 2200','48 to 52','-5 to -5 OR 5 to 5','230 to 250','300 to 300','11.00 to 12.00']);
  assert.deepEqual(data.map(q=>q.answer_decimal_places),[1,0,1,0,2,2,2,1,2,0,0,0,0,0,2]);
  assert.equal(data.reduce((sum,q)=>sum+q.marks,0),30);
  const syllabus=require('../data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json');
  for(const q of data){
    assert.equal(q.question_type,'NAT');assert.deepEqual(q.options,[]);assert.equal(q.negative_marks,0);
    assert.equal(q.correct_option,null);assert.equal(q.organising_institute,'IIT Guwahati');
    assert.ok(syllabus.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic),`Q${q.source_question_number}`);
  }
});
test('Q62 accepts either exact signed key but rejects the gap and outside values',()=>{
  const q=data[11];
  for(const value of ['-5','5','+5','-5.00','5.000'])assert.equal(gradeResponse(q,value),true,value);
  for(const value of ['-6','-4','-1','0','1','4','6','4.999','5.001','-5.001'])assert.equal(gradeResponse(q,value),false,value);
  assert.equal(gradeResponse(q,''),null);
  assert.equal(numericAnswerLabel(q.answer_min,q.answer_max,q.answer_ranges),'Exact answer: -5 OR Exact answer: 5');
  for(const invalid of [[],[{}],[{min:5,max:-5}],[{min:'-5',max:5}]])assert.equal(gradeResponse({...q,answer_ranges:invalid},'-5'),false);
});
test('computed solutions obey each official range and required precision, including exact zero',()=>{
  const solutions=['7.2','12','37.4','1000','0.39','6.53','2.59','3.4','0','2200','50','-5','240','300','11.57'];
  data.forEach((q,i)=>assert.equal(gradeResponse(q,solutions[i]),true,`Q${q.source_question_number}`));
  assert.equal(gradeResponse(data[8],'0.00'),true);assert.equal(gradeResponse(data[8],'0.01'),false);assert.equal(gradeResponse(data[8],null),null);
  assert.equal(gradeResponse(data[0],'7.21'),false);assert.equal(gradeResponse(data[1],'120000'),false);
});
test('final batch formulas and both source figure assets are valid',()=>{
  for(const q of data){
    for(const text of [q.question_text,q.explanation])for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);
    if(q.figure){assert.ok(fs.existsSync('public'+q.figure.local_url));assert.ok(q.figure.width>100);}
  }
  assert.equal(data.filter(q=>q.figure).length,2);
});
test('completed CE1 contains source questions 1 through 65 once and totals 100 marks',()=>{
  const all=[...require('../data/gate-2027/streams/CE-civil-engineering/papers/2026/CE1/questions.json'),...require('../data/gate-2027/streams/CE-civil-engineering/papers/2026/CE1/technical-11-30.json'),...require('../data/gate-2027/streams/CE-civil-engineering/papers/2026/CE1/technical-31-50.json'),...data];
  assert.deepEqual(all.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
  assert.equal(all.reduce((sum,q)=>sum+q.marks,0),100);
});
