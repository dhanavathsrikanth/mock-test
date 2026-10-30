const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const vm=require('node:vm');
const ts=require('typescript');
const katex=require('katex');
const root='data/gate-2027/streams/CE-civil-engineering/papers/2025/CE1/';
const data=JSON.parse(fs.readFileSync(root+'questions-1-30.json','utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const {gradeResponse}=load('lib/question-response.ts');
const {calculateMarks}=load('lib/marking.ts');

test('CE1 2025 Q1–30 preserve the official keys, session 7, types, marks and provenance',()=>{
 assert.deepEqual(data.map(q=>q.source_question_number),Array.from({length:30},(_,i)=>i+1));
 assert.deepEqual(data.map(q=>q.answer_key),['D','D','C','A','B','B','C','A','B','B','D','B','C','A','D','B','B','C','A','A','C','D','A','C','D','C','D','B','B;C','A;B;C']);
 assert.equal(data.filter(q=>q.question_type==='MCQ').length,27);assert.equal(data.filter(q=>q.question_type==='MSQ').length,3);
 assert.equal(data.reduce((n,q)=>n+q.marks,0),35);
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
 const ga=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/papers/2026/CE2/topics.json','utf8'));
 for(const q of data){
  assert.equal(q.organising_institute,'IIT Roorkee');assert.equal(q.source_metadata.exam_year,2025);assert.equal(q.source_metadata.session,7);assert.equal(q.source_metadata.stream,'CE');assert.equal(q.marks,nMarks(q.source_question_number));
  assert.equal(q.options.length,4);assert.equal(q.marks_to_all,false);
  if(q.subject==='General Aptitude') assert.ok(ga.areas.find(t=>t.name===q.topic)?.topics.some(t=>t.name===q.subtopic));
  else assert.ok(syllabus.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic),`Q${q.source_question_number}`);
  for(const name of ['question_source','key_source']){const source=q.source_metadata[name];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(root+'sources/'+source.filename)).digest('hex'),source.sha256);}
 }
});
function nMarks(n){return n>=6&&n<=10?2:1;}
test('MCQ penalties and exact MSQ sets award 35 marks; the single-answer Q28 remains MSQ',()=>{
 const questions=data.map(q=>({...q,id:String(q.source_question_number)}));
 const answers=questions.map(q=>({question_id:q.id,is_correct:gradeResponse(q,q.correct_options||q.correct_option)}));
 assert.equal(calculateMarks(questions,answers).net,35);
 assert.equal(calculateMarks(questions,questions.map(q=>({question_id:q.id,is_correct:false}))).net,-10.67);
 assert.equal(calculateMarks(questions,[]).net,0);
 assert.equal(data[27].question_type,'MSQ');assert.deepEqual(data[27].correct_options,[2]);
 assert.equal(gradeResponse(data[27],[2]),true);assert.equal(gradeResponse(data[27],[1,2]),false);
 assert.equal(gradeResponse(data[28],[2]),false);assert.equal(gradeResponse(data[28],[2,3]),true);
 assert.equal(gradeResponse(data[29],[1,2]),false);assert.equal(gradeResponse(data[29],[1,2,3]),true);
});
test('formula-heavy options, semantic tables and 17 original source crops remain intact',()=>{
 let images=0;
 for(const q of data){
  for(const text of [q.question_text,...q.options,q.explanation])for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);
  for(const image of [...(q.figure?[q.figure]:[]),...q.option_images]){
   images++;assert.ok(image.width>50&&image.height>50);const name=image.local_url.split('/').pop();assert.ok(fs.readFileSync(root+'images/'+name).equals(fs.readFileSync('public'+image.local_url)));assert.ok(image.url.includes('/gate-ce1-2025/'));
  }
 }
 assert.equal(images,17);assert.equal(data[4].option_images.length,4);assert.equal(data[7].option_images.length,4);assert.equal(data[9].option_images.length,4);
 assert.ok(data[13].question_text.includes('| $P(X=x)$ |'));assert.ok(data[19].question_text.includes('| P |'));
 assert.ok(data[11].question_text.includes('1&1\\\\1&3\\\\-2&-3'));
 assert.ok(data[24].source_metadata.interpretation_note.includes('omits gauge'));
});
test('numerical solution checks support the official choices independently',()=>{
 assert.equal(720/11,65+5/11);
 const x=[0,1,7,11,12],p=[.4,.3,.1,.1,.1];
 const mean=x.reduce((sum,v,i)=>sum+v*p[i],0),second=x.reduce((sum,v,i)=>sum+v*v*p[i],0);
 assert.ok(Math.abs(second-mean*mean-20.81)<1e-12);
 assert.ok(Math.abs(Math.log10(10780/23)-2.67)<.005);
 const theta=100/(4*4/8+4*2/6),momentAtC=2*4/8*theta;
 assert.ok(Math.abs(momentAtC-30)<1e-12);assert.ok(2*(2*momentAtC+momentAtC)/8>0);
});
