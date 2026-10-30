const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const katex=require('katex');
const base='data/gate-2027/streams/CS-computer-science/papers/2023/CS/';
const rows=JSON.parse(fs.readFileSync(base+'questions-1-65.json','utf8'));
const exported={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/question-response.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exported});
const {gradeResponse,numericKeypress}=exported;
test('CS 2023 has 65 continuous questions, official types, keys and 100 marks',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[34,15,16]);
 const mcq={11:'B',12:'B',13:'D',14:'C',15:'A',16:'A',17:'B',18:'B',19:'C',20:'C',21:'B',36:'A',37:'D',38:'C',39:'B',40:'A',41:'B',42:'C',43:'A',44:'C',45:'C',46:'B',47:'C',48:'D'};
 const msq={22:[2,3,4],23:[3,4],24:[1,3,4],25:[1,3],26:[2,3],28:[2,4],29:[1,3],49:[2,3,4],50:[2,3,4],51:[1,4],52:[3,4],53:[3,4],54:[1,4],55:[1,2]};
 for(const [n,key]of Object.entries(mcq))assert.equal(rows[n-1].correct_option,key.charCodeAt(0)-64);
 for(const [n,key]of Object.entries(msq))assert.deepEqual(rows[n-1].correct_options,key);
 for(const q of rows.slice(10)){
  assert.equal(q.source_metadata.stream,'CS');assert.notEqual(q.subject,'General Aptitude');
  assert.equal(q.organising_institute,'IIT Kanpur');assert.equal(q.options.length,q.question_type==='NAT'?0:4);
  assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);
 }
 assert.deepEqual(JSON.parse(fs.readFileSync(base+'questions-11-35.json','utf8')),rows.slice(10,35));
 assert.deepEqual(JSON.parse(fs.readFileSync(base+'questions-36-65.json','utf8')),rows.slice(35));
 assert.deepEqual(JSON.parse(fs.readFileSync(base+'questions-1-10.json','utf8')),rows.slice(0,10));
});
test('grading preserves alternative sets, disjoint exact NAT answers and approved precision',()=>{
 for(let mask=0;mask<16;mask++){
  const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));
  assert.equal(gradeResponse(rows[26],chosen),mask===0?null:mask===13||mask===12);
 }
 for(const answer of ['2','2.00','4'])assert.equal(gradeResponse(rows[29],answer),true);
 for(const answer of ['2.01','3','3.99'])assert.equal(gradeResponse(rows[29],answer),false);
 for(const answer of ['2.374','2.375','2.376'])assert.equal(gradeResponse(rows[59],answer),true);
 for(const answer of ['2.37','2.38','2.373','2.377','2.3749'])assert.equal(gradeResponse(rows[59],answer),false);
 assert.equal(numericKeypress('2.37','5',rows[59].answer_decimal_places),'2.375');
 const exact={31:0,32:110,33:2040,34:10.2,35:7,56:5040,57:4096,58:5,59:8,61:2,62:6,63:4,64:19,65:3};
 for(const[n,a]of Object.entries(exact)){
  const q=rows[n-1];assert.equal(q.answer_min,a);assert.equal(q.answer_max,a);
  assert.equal(gradeResponse(q,String(a)),true);assert.equal(gradeResponse(q,String(a+.01)),false);
 }
});
test('all classifications resolve to CS syllabus leaves; formulas and original assets are valid',()=>{
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CS-computer-science/syllabus/2027/syllabus.json','utf8'));
 assert.equal(syllabus.subjects.filter(s=>s.scope==='CS').length,10);
 for(const q of rows.slice(10)){
  const s=syllabus.subjects.find(s=>s.name===q.subject&&s.scope==='CS');
  assert.ok(s?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic));
  for(const text of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/\(cid:|\ufffd|```/.test(text));
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}));
  }
  for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){
   const b=fs.readFileSync('public'+f.local_url);assert.ok(b.equals(fs.readFileSync(base+'images/'+f.local_url.split('/').pop())));
   assert.ok(Math.abs(b.readUInt32BE(16)/b.readUInt32BE(20)-f.width/f.height)<.03);
  }
 }
});
test('independent circuit, heap, LRU and arithmetic calculations support worked solutions',()=>{
 let state=[0,1,1];const visited=new Set();
 while(!visited.has(state.join(''))){visited.add(state.join(''));const[a,b,c]=state;state=[a^(1-c),a,c^b];}
 assert.equal(visited.has('001'),false);for(const v of ['100','101','111'])assert.ok(visited.has(v));
 const memory=[];let faults=0;
 for(let i=0;i<128;i++)for(let j=0;j<128;j++){
  const page=Math.floor((j*128+i)/512),old=memory.indexOf(page);
  if(old<0){faults++;if(memory.length===30)memory.shift();}else memory.splice(old,1);
  memory.push(page);
 }
 assert.equal(faults,4096);
 for(const [i,option]of rows[11].options.entries()){
  const a=option.split(',').map(Number);const valid=a.every((v,k)=>k===0||a[Math.floor((k-1)/2)]>=v);assert.equal(valid,i===1);
 }
 const buf=Buffer.alloc(4);buf.writeUInt32BE(0x3f5c2ef4);const q=buf.readFloatBE();buf.writeFloatBE(-16*q);assert.equal(buf.readUInt32BE(),0xc15c2ef4);
 assert.equal(2+1/4+1/8,2.375);assert.equal(Math.ceil(Math.log2(Math.ceil(2500/51))),6);
});
