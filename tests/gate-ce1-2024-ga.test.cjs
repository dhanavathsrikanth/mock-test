const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const vm=require('node:vm');
const ts=require('typescript');
const katex=require('katex');
const root='data/gate-2027/streams/CE-civil-engineering/papers/2024/CE1/';
const data=JSON.parse(fs.readFileSync(root+'questions-1-10.json','utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const {gradeResponse}=load('lib/question-response.ts');
const {calculateMarks}=load('lib/marking.ts');

test('CE1 2024 GA preserves all ten official session-3 keys, 15 marks and source provenance',()=>{
 assert.deepEqual(data.map(q=>q.source_question_number),Array.from({length:10},(_,i)=>i+1));
 assert.deepEqual(data.map(q=>q.answer_key),['B','A','A','D','C','D','A','A','C','B']);
 const taxonomy=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/papers/2026/CE2/topics.json','utf8'));
 for(const q of data){
  assert.equal(q.question_type,'MCQ');assert.equal(q.subject,'General Aptitude');assert.equal(q.organising_institute,'IISc Bengaluru');
  assert.equal(q.source_metadata.exam_year,2024);assert.equal(q.source_metadata.paper,'CE1');assert.equal(q.source_metadata.session,3);assert.equal(q.source_metadata.section,'GA');
  assert.equal(q.marks,q.source_question_number<=5?1:2);assert.equal(q.negative_marks,q.marks/3);assert.equal(q.options.length,4);
  assert.ok(taxonomy.areas.find(t=>t.name===q.topic)?.topics.some(t=>t.name===q.subtopic));
  assert.equal(gradeResponse(q,q.correct_option),true);
  for(const name of ['question_source','key_source']){const s=q.source_metadata[name];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(root+'sources/'+s.filename)).digest('hex'),s.sha256);}
 }
 const qs=data.map(q=>({...q,id:String(q.source_question_number)}));
 assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:true}))).net,15);
 assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:false}))).net,-5);
});

test('source powers and root indices render, and both original chart/grid crops retain proportions',()=>{
 let images=0;
 for(const q of data){
  for(const text of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text));
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);
  }
  if(q.figure){const f=q.figure;images++;const b=fs.readFileSync(root+'images/'+f.url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));assert.ok(Math.abs(b.readUInt32BE(16)/b.readUInt32BE(20)-f.width/f.height)<.02);}
 }
 assert.equal(images,2);assert.equal(data[2].options[3],'$\\sqrt[p]{q}=\\sqrt[q]{p}$');
 assert.ok(data[7].explanation.includes('right MW axis'));assert.ok(data[7].explanation.includes('| T1 | 20 | 10000 |'));
});

test('independent numeric checks support algebra, clock count, chart choice and geometry',()=>{
 const p=4,q=2;assert.equal((p/q)**(p/q),p**(p/q-1));assert.equal(q**p,p**q);
 assert.equal(2*15+1,31);
 const overlaps=[];for(let k=0;k<=60;k++){const sec=3600*k/59;if(sec>=300&&sec<=3300)overlaps.push(sec);}
 assert.equal(overlaps.length,50);
 const factors=[10000/20,9000/30,7000/15,12000/40].map(x=>x/1000);assert.equal(factors.indexOf(Math.max(...factors)),0);
 assert.equal(Math.round(1/Math.cos(89.85*Math.PI/180)),382);
});

test('enumeration verifies all circular twin seatings and feasible cross-grid completions',()=>{
 const orbits=new Set();
 function visit(prefix,left){
  if(prefix.length===8){
   for(const t of ['A','B','C']){const first=prefix.indexOf(t),last=prefix.lastIndexOf(t);if((last-first)!==1&&(last-first)!==7)return;}
   orbits.add(Array.from({length:8},(_,i)=>prefix.slice(i)+prefix.slice(0,i)).sort()[0]);return;
  }
  for(const t of Object.keys(left))if(left[t]){left[t]--;visit(prefix+t,left);left[t]++;}
 }
 visit('',{A:2,B:2,C:2,_:2});assert.equal(orbits.size,12);
 const given=[[1,1,2,null],[2,'X',3,null],[2,'X',4,null],[1,2,'X',null]];
 const counts=[];
 for(let mask=0;mask<16;mask++){
  const a=given.map((row,r)=>[...row.slice(0,3),(mask>>r)&1?'X':null]);let valid=true;
  for(let r=0;r<4;r++)for(let c=0;c<3;c++)if(typeof a[r][c]==='number'){
   let n=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if((dr||dc)&&a[r+dr]?.[c+dc]==='X')n++;
   if(n!==a[r][c])valid=false;
  }
  if(valid)counts.push(a.reduce((n,row)=>n+(row[3]==='X'),0));
 }
 assert.equal(Math.max(...counts),2);
});
