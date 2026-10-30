const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const vm=require('node:vm');
const ts=require('typescript');
const katex=require('katex');
const root='data/gate-2027/streams/CE-civil-engineering/papers/2025/CE2/';
const data=JSON.parse(fs.readFileSync(root+'questions-1-30.json','utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const {gradeResponse}=load('lib/question-response.ts');
const {calculateMarks}=load('lib/marking.ts');

test('CE2 2025 Q1–30 preserve official session-8 keys, types, marking and source provenance',()=>{
 assert.deepEqual(data.map(q=>q.source_question_number),Array.from({length:30},(_,i)=>i+1));
 assert.deepEqual(data.map(q=>q.answer_key),['D','B','B','C','A','A','B','C','A','C','A','A','A','B','D','B','C','A','A','C','A;C','B;C','A;C;D','A;D','B;C','B;C','D','A','3 to 3','5.7 to 6.0']);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>data.filter(q=>q.question_type===t).length),[20,8,2]);
 for(const q of data){
  assert.equal(q.organising_institute,'IIT Roorkee');assert.equal(q.source_metadata.session,8);assert.equal(q.source_metadata.paper,'CE2');assert.equal(q.source_metadata.stream,'CE');
  assert.equal(q.marks,q.source_question_number>=6&&q.source_question_number<=10?2:1);
  assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);
  assert.equal(q.options.length,q.question_type==='NAT'?0:4);
  for(const name of ['question_source','key_source']){const source=q.source_metadata[name];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(root+'sources/'+source.filename)).digest('hex'),source.sha256);}
 }
 const qs=data.map(q=>({...q,id:String(q.source_question_number)}));
 assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:true}))).net,35);
 assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:false}))).net,-8.33);
});

test('every question resolves to a syllabus topic or the explicit editorial ODE classification',()=>{
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
 const ga=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/papers/2026/CE2/topics.json','utf8'));
 const extra=JSON.parse(fs.readFileSync(root+'topics.json','utf8')).topics;
 for(const q of data){
  const found=q.subject==='General Aptitude'?ga.areas.find(t=>t.name===q.topic)?.topics.some(t=>t.name===q.subtopic):syllabus.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic);
  assert.ok(found||extra.some(t=>t.subject===q.subject&&t.parent===q.topic&&t.name===q.subtopic),`Q${q.source_question_number}`);
 }
 assert.equal(data[28].subtopic,'Order, Degree and Classification of ODEs');
});

test('formulae, matrices and 12 source crops preserve content and proportions across both Q5 pages',()=>{
 let images=0;
 for(const q of data){
  for(const text of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text),`Q${q.source_question_number} control characters`);
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);
  }
  for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){
   images++;const bytes=fs.readFileSync(root+'images/'+f.url.split('/').pop());assert.ok(bytes.equals(fs.readFileSync('public'+f.local_url)));
   assert.ok(Math.abs(bytes.readUInt32BE(16)/bytes.readUInt32BE(20)-f.width/f.height)<.02);
   assert.ok(f.url.includes('/gate-ce2-2025/'));
  }
 }
 assert.equal(images,12);assert.deepEqual(data[4].option_images.map(f=>f.source_page),[4,4,5,5]);
 assert.equal(data[13].option_images.length,4);assert.ok(data[10].question_text.includes('2&3&4\\\\1&4&5\\\\4&3&2'));
 assert.ok(data[16].source_metadata.interpretation_note.includes('sulfur-oxidizing'));
});

test('single-answer MSQs and exact/ranged NATs use the official grading without widening or rounding',()=>{
 assert.equal(data[26].question_type,'MSQ');assert.equal(gradeResponse(data[26],[4]),true);assert.equal(gradeResponse(data[26],[3,4]),false);
 assert.equal(data[27].question_type,'MSQ');assert.equal(gradeResponse(data[27],[1]),true);assert.equal(gradeResponse(data[27],[1,2]),false);
 assert.equal(gradeResponse(data[28],'3.00'),true);assert.equal(gradeResponse(data[28],'3.01'),false);
 for(const value of ['5.7','5.9','6.00'])assert.equal(gradeResponse(data[29],value),true);
 for(const value of ['5.69','6.01','5.859'])assert.equal(gradeResponse(data[29],value),false);
 assert.equal(40/1000*10*180*7,504);assert.equal((12-10)/10*100,20);
 const cost=192/1.08;assert.ok(Math.abs((200-cost)/(cost-160)-5/4)<1e-12);
 assert.equal(2*Math.sqrt(21*8*7*6)/14,12);
 assert.equal(gradeResponse(data[29],(.3*250**2*500/1.6/1e6).toFixed(1)),true);
 const clock='OPQRSTUVWXYZ';assert.equal([0,2,4,-1,1,3,5].map(offset=>clock[(1+offset+12)%12]).join(' '),data[6].options[1]);
});
