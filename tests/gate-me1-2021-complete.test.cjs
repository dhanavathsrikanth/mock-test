const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const katex = require('katex');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'data/gate-2027/streams/ME-mechanical-engineering');
const rows = JSON.parse(fs.readFileSync(path.join(base, 'papers/2021/ME1/questions-1-65.json'), 'utf8'));
const taxonomy = JSON.parse(fs.readFileSync(path.join(base, 'syllabus/2027/taxonomy.json'), 'utf8')).subjects;

test('ME1 2021 is a complete 65-question, 100-mark paper with official type blocks', () => {
  assert.deepEqual(rows.map(q => q.source_question_number), Array.from({length:65}, (_,i)=>i+1));
  assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
  assert.equal(rows.filter(q=>q.question_type==='MCQ').length,38);
  assert.equal(rows.filter(q=>q.question_type==='NAT').length,27);
  for(const q of rows){
    const n=q.source_question_number;
    assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);
    assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);
    assert.equal(q.organising_institute,'IIT Bombay');
    assert.equal(q.source_metadata.session,7);
    assert.equal(q.source_metadata.paper,'ME1');
    assert.equal(q.source_metadata.stream,'ME');
    assert.equal(q.source_metadata.original_question_number,n<=10?n:n-10);
  }
});
test('every MCQ letter matches the separately transcribed official key', () => {
  const key = [...'DDDDCCACCD', ...'CCDADBBAABBCAAACCDC'];
  for(let i=0;i<29;i++) assert.equal(rows[i].correct_option,key[i].charCodeAt(0)-64,`Q${i+1}`);
  const latter=[...'BCABBABAC'];
  for(let i=0;i<9;i++) assert.equal(rows[i+35].correct_option,latter[i].charCodeAt(0)-64,`Q${i+36}`);
});
test('NAT official inclusive ranges and exact values are preserved',()=>{
 const expected={30:[331,333],31:[397,399],32:[79,81],33:[555,565],34:[0,0],35:[.085,.09],45:[.5,.5],46:[660,664],47:[30,36],48:[625,750],49:[45,50],50:[775,784],51:[.2,.3],52:[4,4],53:[.1,.12],54:[.76,.78],55:[92,96],56:[195.1,195.3],57:[11.2,11.4],58:[2.5,2.8],59:[4.9,5.1],60:[124,126],61:[249,251],62:[1.9,2.1],63:[199,201],64:[1.9,2.1],65:[6.4,6.9]};
 for(const [n,range] of Object.entries(expected)){
  const q=rows[n-1];assert.equal(q.question_type,'NAT');assert.deepEqual([q.answer_min,q.answer_max],range);
  assert.deepEqual(q.options,[]);assert.deepEqual(q.option_images,[]);assert.equal(q.correct_option,null);
  assert.equal(q.answer_decimal_places,+n===35?3:2);
  assert.equal(q.source_metadata.numeric_evaluation.no_rounding_into_range,true);
 }
});
test('worked numeric answers independently fit every official NAT interval',()=>{
 const pi=Math.PI;
 const phi=Math.atan(.5*Math.cos(12*pi/180)/(1-.5*Math.sin(12*pi/180)));
 const ft=(600-1000*Math.sin(12*pi/180))/Math.cos(12*pi/180);
 const delta=Math.log(8/1.5)/3;
 const actual={30:250+1.64*50,31:(4.2e6-101e3)/(1050*9.8),32:800*1.25e-4*4/.005,33:1.005/.718*400,34:0,35:delta/Math.sqrt(4*pi*pi+delta*delta),45:.5,46:60/(2*pi)*Math.sqrt(60*10/.125),47:70*12/(1e8*.0001*.25)*100,48:1000*Math.cos(phi)-ft*Math.sin(phi),49:15*(6000/60)/(pi*.2*3000/60),50:300*Math.pow(Math.log(20/18),.2)/1.2*200*Math.sqrt(300*2)/1000,51:50*1.8/360,52:12/(15-12),53:Math.log(2)/(2*pi),54:1-4*pi*100/(6*900),55:2230/2400*100,56:691/3.54,57:Math.sqrt(10/(1000*pi*.01*.01/4)),58:1000*5*(pi*2*300/60)*(40-pi*2*300/60)*(1+Math.cos(15*pi/180))/1e6,59:(105*1.25/(.287*278.15))*2.6*1.005*(24-(5+1.6*34)/2.6),60:100*250/200,61:10e6/(24*100*100/6),62:(180+60)/(180-60),63:.4*(1e6/(500+.4*50))*.260,64:1/(50/200+150/600),65:Math.sqrt(Math.pow(562.5/2,2)+25*25)/60/.707};
 for(const [n,value] of Object.entries(actual)){
  const q=rows[n-1];assert.ok(value>=q.answer_min&&value<=q.answer_max,`Q${n}: ${value}`);
 }
 assert.match(rows[29].explanation,/Independence/);
 assert.match(rows[50].explanation,/accumulat/);
});
test('full official ME syllabus uses subjects and three topic levels; each technical question maps to a leaf',()=>{
 assert.equal(Object.keys(taxonomy).length,4);
 const topics=Object.values(taxonomy).flatMap(s=>Object.values(s));
 assert.equal(topics.length,23);
 const groups=topics.flatMap(t=>Object.values(t));assert.equal(groups.length,75);
 assert.equal(groups.flat().length,303);
 for(const q of rows.slice(10)){
  assert.ok(taxonomy[q.subject][q.topic][q.subtopic].includes(q.sub_subtopic),`Q${q.source_question_number}`);
 }
 assert.ok(taxonomy['Applied Mechanics and Design'].Vibrations.Control.includes('PID Controller'));
 assert.ok(taxonomy['Materials, Manufacturing and Industrial Engineering']['Additive Manufacturing']);
});
test('source statement and choices are separate complete images with local mirrors',()=>{
 let assets=0;
 for(const q of rows){
  assert.equal(q.option_images.length,q.question_type==='MCQ'?4:0);
  for(const f of [q.figure,...q.option_images]){
   const p=path.join(root,'public',f.local_url);assert.ok(fs.existsSync(p));
   const bytes=fs.readFileSync(p);assert.equal(bytes.subarray(1,4).toString(),'PNG');
   assert.ok(f.width>0&&f.height>0);assert.ok(f.source_crop[3]>f.source_crop[1]);assets++;
  }
 }
 assert.equal(assets,217);
});
test('worked solutions use sections and all embedded TeX renders',()=>{
 for(const q of rows){
  assert.ok(q.explanation.length>200,`Q${q.source_question_number}`);
  assert.ok((q.explanation.match(/^### /gm)||[]).length>=2);
  for(const match of q.explanation.matchAll(/\$\$([\s\S]+?)\$\$/g)) assert.doesNotThrow(()=>katex.renderToString(match[1],{throwOnError:true,displayMode:true}),`Q${q.source_question_number}`);
 }
});
test('SQL resolves deepest technical leaf, keeps shared GA and refuses cross-stream overwrite',()=>{
 const sql=fs.readFileSync(path.join(base,'papers/2021/ME1/import-1-65.sql'),'utf8');
 assert.match(sql,/coalesce\(l.id,t.id\)/);assert.match(sql,/l.parent_id=t.id/);
 assert.match(sql,/s.stream_id is null/);assert.match(sql,/2021,'ME1'/);
 assert.match(sql,/where public.questions.stream_id=excluded.stream_id/);
});
function load(file,deps={}){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>deps[n]||require(n)});return exports;
}
test('actual grader accepts ME1 answers and rejects out-of-range decimals without rounding',()=>{
 const {gradeResponse,numericAnswerLabel}=load('lib/question-response.ts');
 for(const q of rows.filter(q=>q.question_type==='MCQ')){
  assert.equal(gradeResponse(q,q.correct_option),true);
  assert.equal(gradeResponse(q,q.correct_option%4+1),false);
 }
 assert.equal(gradeResponse(rows[34],'0.088'),true);
 assert.equal(gradeResponse(rows[34],'0.084'),false);
 assert.equal(gradeResponse(rows[52],'0.11'),true);
 assert.equal(gradeResponse(rows[52],'0.121'),false);
 assert.equal(gradeResponse(rows[33],'0.00'),true);
 assert.equal(gradeResponse(rows[33],'0.01'),false);
 assert.equal(numericAnswerLabel(rows[33].answer_min,rows[33].answer_max),'Exact answer: 0');
});
test('topic-wise pool includes all three levels and stays inside ME1 2021',()=>{
 const scope=load('lib/stream-scope.ts');const {filterTestPool}=load('lib/test-pool.ts',{'./stream-scope':scope});
 const topics=[{id:'root',parent_id:null,subject_id:'me',name:'Heat Transfer'},{id:'sub',parent_id:'root',subject_id:'me',name:'Conduction'},{id:'leaf',parent_id:'sub',subject_id:'me',name:'Heat Transfer Through Fins'}];
 const pool=[{id:'match',subject_id:'me',topic_id:'leaf',year:2021,paper:'ME1'}, {id:'wrong-shift',subject_id:'me',topic_id:'leaf',year:2021,paper:'ME2'}, {id:'wrong-year',subject_id:'me',topic_id:'leaf',year:2022,paper:'ME1'}];
 for(const topicId of ['root','sub','leaf']){
  const result=filterTestPool(pool,{subjectId:'me',topicId,year:2021,paper:'ME1'},topics);assert.equal(result.length,1);assert.equal(result[0].id,'match');
 }
});
