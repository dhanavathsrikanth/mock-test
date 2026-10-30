const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const katex=require('katex');
const root='data/gate-2027/streams/CE-civil-engineering/papers/2025/CE1/';
const batch=JSON.parse(fs.readFileSync(root+'questions-31-65.json','utf8'));
const all=[...JSON.parse(fs.readFileSync(root+'questions-1-30.json','utf8')),...batch];
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const {gradeResponse}=load('lib/question-response.ts');
const {calculateMarks}=load('lib/marking.ts');

test('CE1 2025 is complete: official Q31–65 keys, all 65 unique questions and 100 marks',()=>{
 const keys=['A;B','A;C','3.74 to 3.76','476 to 500','48 to 51','B','C','B','A','A','A;D','B;D','B;D','C;D','A;B','A;B','5.7 to 5.9','2.9 to 3.1','2.4 to 2.8','3 to 3','14 to 14','125 to 127','1.80 to 1.82','21 to 24','0.96 to 0.98','4.62 to 4.70','23.30 to 23.70','15 to 16','8.44 to 8.56','69 to 75','120.0 to 180.0','0.45 to 0.51','61.0 to 63.0','150.470 to 150.480','4.22 to 4.56'];
 assert.deepEqual(batch.map(q=>q.answer_key),keys);
 assert.deepEqual(all.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.equal(all.reduce((a,q)=>a+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>all.filter(q=>q.question_type===t).length),[32,11,22]);
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
 for(const q of batch){
  assert.equal(q.marks,q.source_question_number<=35?1:2);
  assert.equal(q.organising_institute,'IIT Roorkee');assert.equal(q.source_metadata.session,7);assert.equal(q.source_metadata.key_page,2);
  assert.ok(syllabus.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic),`Q${q.source_question_number} taxonomy`);
  assert.equal(q.options.length,q.question_type==='NAT'?0:4);
 }
});

test('all NATs use inclusive official bounds, exact-value keys, no negative marks and strict precision',()=>{
 for(const q of batch.filter(q=>q.question_type==='NAT')){
  assert.equal(q.correct_option,null);assert.equal(q.correct_options,null);assert.equal(q.negative_marks,0);
  assert.equal(gradeResponse(q,String(q.answer_min)),true,`Q${q.source_question_number} lower bound`);
  assert.equal(gradeResponse(q,String(q.answer_max)),true,`Q${q.source_question_number} upper bound`);
  const unit=10**-q.answer_decimal_places;
  assert.equal(gradeResponse(q,(q.answer_min-unit).toFixed(q.answer_decimal_places)),false);
  assert.equal(gradeResponse(q,(q.answer_max+unit).toFixed(q.answer_decimal_places)),false);
 }
 const q=n=>batch.find(q=>q.source_question_number===n);
 assert.equal(gradeResponse(q(50),'3.00'),true);assert.equal(gradeResponse(q(50),'3.01'),false);
 assert.equal(gradeResponse(q(51),'14'),true);assert.equal(gradeResponse(q(51),'14.01'),false);
 assert.equal(gradeResponse(q(33),'3.751'),false);
 assert.equal(q(64).answer_decimal_places,3);assert.equal(gradeResponse(q(64),'150.475'),true);assert.equal(gradeResponse(q(64),'150.4751'),false);
 const qs=all.map(q=>({...q,id:String(q.source_question_number)}));
 assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:true}))).net,100);
 assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:false}))).net,-14);
});

test('all remaining formulae parse and 11 diagram assets have intact mirrors and proportions',()=>{
 let figures=0;
 for(const q of batch){
  for(const text of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text),`Q${q.source_question_number} control characters`);
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);
  }
  if(q.figure){
   figures++;const f=q.figure;const bytes=fs.readFileSync(root+'images/'+f.url.split('/').pop());
   assert.ok(bytes.equals(fs.readFileSync('public'+f.local_url)));
   const ratio=bytes.readUInt32BE(16)/bytes.readUInt32BE(20);
   assert.ok(Math.abs(ratio-f.width/f.height)<0.02);
  }
 }
 assert.equal(figures,11);
 assert.equal(batch.find(q=>q.source_question_number===37).question_text,'In the rigid-jointed frame shown in the figure, the distribution factor of the member AD is closest to');
 assert.ok(batch.find(q=>q.source_question_number===39).question_text.includes('| Rain gauge station |'));
 assert.ok(batch.find(q=>q.source_question_number===64).question_text.includes('| Level position |'));
 assert.ok(batch.find(q=>q.source_question_number===61).source_metadata.interpretation_note.includes('not supplied'));
});

test('independent numerical solutions fit the official key without changing its acceptance intervals',()=>{
 const y2=.25*(Math.sqrt(1+8*36/(9.81*.5))-1);
 const x=(-24000+Math.sqrt(24000**2+4*150*24000*650))/300;
 const expected={33:3.75,34:Math.round(1/(1-.95**(1/25))),35:49.4,47:Number((8.7*Math.exp(-.4)).toFixed(1)),48:3,49:2.6,50:3,51:14,52:Math.round(200000*.0004*(650-x)/x),53:Number((9750/(249062.5/46.25)).toFixed(2)),54:Math.round(Math.hypot(10000*140/85750,70/6+10000*35/85750)),55:Number(((15+(95+6.5*(20-9.81))*Math.tan(Math.PI/12))/60).toFixed(2)),56:4.66,57:Number((18*85.2/65).toFixed(2)),58:15,59:Number((15000/(50/.055+30/.035)).toFixed(2)),60:Math.round(9.81*15*(y2-.5)**3/(4*.5*y2)),61:Number((.7*.005*15*100000*30/1000).toFixed(1)),62:.48,63:Number((100*(.3/3+.7*.75)).toFixed(1)),64:150+((1.8-1.35)+(1.45-.95))/2,65:Number((100*(1-2.4/2.51)).toFixed(2))};
 for(const q of batch.filter(q=>q.question_type==='NAT'))assert.equal(gradeResponse(q,String(expected[q.source_question_number])),true,`Q${q.source_question_number}`);
 assert.ok(Math.abs((80/11)/(80/11+3+8)-.398)<.0001);
});
