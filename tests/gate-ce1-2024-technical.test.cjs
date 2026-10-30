const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const katex=require('katex');const crypto=require('node:crypto');
const base='data/gate-2027/streams/CE-civil-engineering/papers/2024/CE1/';
const data=JSON.parse(fs.readFileSync(base+'questions-11-35.json','utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const {gradeResponse,numericAnswerLabel}=load('lib/question-response.ts');const {calculateMarks}=load('lib/marking.ts');
test('CE1 2024 technical batch matches all 25 final keys and syllabus classifications',()=>{
 assert.deepEqual(data.map(q=>q.source_question_number),Array.from({length:25},(_,i)=>i+11));
 assert.deepEqual(data.map(q=>q.answer_key),['A','B','A','A','C','A','B','A','D','C','B','D','A','B','B','A','A','A;D','C;D','B;C','A;B','0.16 to 0.18','9 to 9','16.60 to 16.80','1852.00 to 1858.00']);
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
 const additions=JSON.parse(fs.readFileSync(base+'topics.json','utf8')).topics;
 for(const q of data){
  const topic=syllabus.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic);assert.ok(topic,`Q${q.source_question_number} parent`);
  assert.ok(topic.subtopics.some(t=>t.name===q.subtopic)||additions.some(t=>t.subject===q.subject&&t.parent===q.topic&&t.name===q.subtopic));
  assert.equal(q.organising_institute,'IISc Bengaluru');assert.equal(q.source_metadata.session,3);assert.equal(q.source_metadata.section,'CE-1');
  assert.equal(q.marks,1);assert.equal(q.negative_marks,q.question_type==='MCQ'?1/3:0);assert.ok(['easy','medium','hard'].includes(q.difficulty));
  assert.ok(q.explanation.startsWith('### Solution\n')&&q.explanation.includes('### Answer\n'));
  for(const k of ['question_source','key_source']){const s=q.source_metadata[k];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+s.filename)).digest('hex'),s.sha256);}
 }
 assert.equal(data.filter(q=>q.question_type==='MCQ').length,17);assert.equal(data.filter(q=>q.question_type==='MSQ').length,4);assert.equal(data.filter(q=>q.question_type==='NAT').length,4);
});
test('NAT official endpoints, exact 9, precision and MSQ exact-set grading are preserved',()=>{
 for(const q of data){
  assert.equal(gradeResponse(q,null),null);
  if(q.question_type==='MCQ'){assert.equal(q.options.length,4);assert.equal(gradeResponse(q,q.correct_option),true);}
  if(q.question_type==='MSQ'){assert.equal(q.options.length,4);assert.equal(gradeResponse(q,q.correct_options),true);assert.equal(gradeResponse(q,[q.correct_options[0]]),false);assert.equal(gradeResponse(q,[1,2,3,4]),false);}
  if(q.question_type==='NAT'){
   assert.deepEqual(q.options,[]);assert.equal(q.correct_option,null);assert.equal(q.correct_options,null);assert.equal(q.answer_decimal_places,2);
   assert.equal(gradeResponse(q,String(q.answer_min)),true);assert.equal(gradeResponse(q,String(q.answer_max)),true);
   assert.equal(gradeResponse(q,(q.answer_min-.01).toFixed(2)),false);assert.equal(gradeResponse(q,(q.answer_max+.01).toFixed(2)),false);
   assert.equal(gradeResponse(q,(q.answer_min+.001).toFixed(3)),false);
  }
 }
 const exact=data.find(q=>q.source_question_number===33);assert.equal(numericAnswerLabel(exact.answer_min,exact.answer_max),'Exact answer: 9');assert.equal(gradeResponse(exact,'9.00'),true);
 const qs=data.map(q=>({...q,id:String(q.source_question_number)}));
 assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:true}))).net,25);
 assert.ok(Math.abs(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:false}))).net+17/3)<.011);
});
test('every equation renders and original diagram crop dimensions retain proportions',()=>{
 for(const q of data){for(const text of [q.question_text,...q.options,q.explanation]){
  assert.ok(!/[\x00-\x09\x0b-\x1f]/.test(text),`control character in Q${q.source_question_number}`);
  for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);
 }
 if(q.figure){const f=q.figure;const b=fs.readFileSync(base+'images/'+f.url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));assert.ok(Math.abs(b.readUInt32BE(16)/b.readUInt32BE(20)-f.width/f.height)<.015);}
 }
 assert.deepEqual(data.filter(q=>q.figure).map(q=>q.source_question_number),[17,33]);
});
test('independent arithmetic validates roots, stopping distance, interpolation, soil and well flow',()=>{
 const f=x=>x**5-5*x**4-10*x**3+50*x*x+9*x-45;for(const x of [-3,-1,1,3,5])assert.equal(f(x),0);
 assert.ok(Math.abs(1/3+4/9+1/6-17/18)<1e-12);
 const v=60/3.6,ssd=v*2.5+v*v/(2*9.81*(.6*.7-.02));assert.ok(ssd>75&&ssd<79);
 // Lagrange interpolation independently checks the Newton solution.
 const x=1.5,ys=[0,.3010,.4771],xs=[1,2,3];const y=xs.reduce((s,xi,i)=>s+ys[i]*xs.reduce((p,xj,j)=>i===j?p:p*(x-xj)/(xi-xj),1),0);
 assert.equal(y.toFixed(2),'0.17');
 assert.equal((26.8/(1+.17*2.68/.75)).toFixed(2),'16.67');
 assert.equal((Math.PI*10*(19**2-15**2)/Math.log(100/10)).toFixed(2),'1855.55');
});
