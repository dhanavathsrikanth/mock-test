const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),ts=require('typescript'),vm=require('node:vm'),katex=require('katex');
const base='data/gate-2027/streams/CS-computer-science/papers/2026/CS1/';
const rows=JSON.parse(fs.readFileSync(base+'questions-1-33.json','utf8'));
const exported={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/question-response.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exported});
test('CS1 2026 first half matches the official keys, modes, marks and source pages',()=>{
 const keys=['B','C','C','D','C','B','D','A','A','C','B','A','A','B','D','B','A','D','ACD','BD','AC','BC','BC','C','ABC','BD','C','C','AC','CD','ABC','3 to 3','11 to 11'];
 assert.equal(rows.length,33);
 const pages=[1,2,3,4,4,5,6,7,8,9,10,10,11,11,12,13,14,15,15,16,16,17,18,19,20,20,21,21,22,22,23,23,23];
 rows.forEach((q,i)=>{
  assert.equal(q.source_question_number,i+1);assert.equal(q.source_page,pages[i]);
  assert.equal(q.answer_key.replaceAll(';',''),keys[i]);assert.equal(q.source_metadata.official_answer_key,q.answer_key);
  assert.equal(q.question_type,i<18?'MCQ':i<31?'MSQ':'NAT');
  assert.equal(q.marks,i>=5&&i<10?2:1);
  assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);
  assert.equal(q.organising_institute,'IIT Guwahati');assert.equal(q.source_metadata.session,3);
  assert.equal(q.source_metadata.exam_year,2026);assert.equal(q.source_metadata.stream,'CS');
  assert.equal(q.marks_to_all,false);
 });
 assert.equal(rows.reduce((a,q)=>a+q.marks,0),38);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[18,13,2]);
});
test('all explanations teach the method in separate visual sections and all math compiles',()=>{
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CS-computer-science/syllabus/2027/syllabus.json','utf8'));
 for(const q of rows){
  assert.ok(q.explanation.length>500,'Q'+q.source_question_number+': worked explanation');
  assert.ok((q.explanation.match(/^### /gm)||[]).length>=3);
  const s=syllabus.subjects.find(s=>s.name===q.subject);
  assert.ok(s?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic),'Q'+q.source_question_number+': classification');
  assert.equal(q.subject==='General Aptitude',q.source_question_number<=10);
  assert.ok(['easy','medium','hard'].includes(q.difficulty));
  for(const str of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ue000-\uf8ff\ufffd]|\(cid:|\x60{3}/.test(str));
   for(const m of str.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true,strict:'error'}),'Q'+q.source_question_number+': '+m[0]);
  }
  for(const k of ['question_source','key_source']){
   const src=q.source_metadata[k];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+src.filename)).digest('hex'),src.sha256);
  }
 }
 assert.match(rows[23].explanation,/Positions checked/);
 assert.match(rows[24].explanation,/two different leftmost derivations/);
 assert.match(rows[29].explanation,/Counterexample/);
});
test('original cropped figures preserve proportions and their public mirror bytes',()=>{
 let stems=0,options=0;
 for(const q of rows){
  if(q.figure)stems++;
  if(q.option_images.length){assert.ok([2,7].includes(q.source_question_number));assert.equal(q.option_images.length,4);options+=4;}
  for(const f of [q.figure,...q.option_images].filter(Boolean)){
   const b=fs.readFileSync(base+'images/'+f.local_url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));
   assert.ok(Math.abs((b.readUInt32BE(16)/b.readUInt32BE(20))/(f.width/f.height)-1)<.02);
   assert.ok(f.url.includes('/gate-cs1-2026/'));assert.ok(f.alt.length>10);
  }
 }
 assert.equal(stems,4);assert.equal(options,8);
 assert.ok(rows[6].option_images[2].height>130);
 assert.match(rows[26].source_metadata.figure.alt,/missing closing quote/);
});
test('the actual review renderer shows worked sections, readable tables and a distinct answer card',()=>{
 const react=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 function load(file,deps={}){
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require:n=>n in deps?deps[n]:require(n)});
  return exports;
 }
 const math=load('lib/renderMath.ts');
 const component=load('components/MathText.tsx',{'@/lib/renderMath':math});
 const {QuestionExplanation}=load('components/QuestionExplanation.tsx',{'@/components/MathText':component});
 for(const q of rows){
  const html=renderToStaticMarkup(react.createElement(QuestionExplanation,{text:q.explanation}));
  assert.equal((html.match(/<section /g)||[]).length,(q.explanation.match(/^### /gm)||[]).length);
  assert.ok(html.includes('bg-green-50'));assert.ok(!html.includes('katex-error'));assert.ok(!html.includes('### '));
  if(q.explanation.includes('|---|'))assert.ok(html.includes('<table'));
  const prose=q.explanation.split(/\$\$[\s\S]+?\$\$|\$[^$]+?\$/).join('');
  assert.ok(!/\d\/\d/.test(prose),'Q'+q.source_question_number+': prose fractions need explicit math delimiters');
 }
});
test('production grading uses exact MSQ sets, strict integer NATs and the 38-mark maximum',()=>{
 const {gradeResponse,numericAnswerLabel}=exported;let score=0;
 for(const q of rows){
  const response=q.question_type==='NAT'?String(q.answer_min):q.question_type==='MSQ'?q.correct_options:q.correct_option;
  assert.equal(gradeResponse(q,response),true);score+=q.marks;
  assert.equal(gradeResponse(q,null),null);
  if(q.question_type==='MSQ')for(let mask=1;mask<16;mask++){
   const selected=[1,2,3,4].filter((_,i)=>mask&(1<<i));
   assert.equal(gradeResponse(q,selected),JSON.stringify(selected)===JSON.stringify(q.correct_options));
  }
  if(q.question_type==='NAT'){
   assert.deepEqual(q.options,[]);assert.equal(q.answer_decimal_places,0);
   assert.equal(q.answer_min,q.answer_max);assert.equal(gradeResponse(q,String(q.answer_min+.01)),false);
   assert.equal(gradeResponse(q,String(q.answer_min-1)),false);
   assert.equal(numericAnswerLabel(q.answer_min,q.answer_max),'Exact answer: '+q.answer_min);
   assert.ok(!q.explanation.split('### Answer')[1].includes(' to '));
  }
 }
 assert.equal(score,38);assert.equal(rows[31].answer_min,3);assert.equal(rows[32].answer_min,11);
});
test('independent probability, parity, Boolean, overflow and hashing calculations agree',()=>{
 let favourable=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)if(b%a===0)favourable++;
 assert.equal(favourable,14);assert.equal(1/2*1/3+1/2*1/3,1/3);
 let matrices=0;
 for(let mask=0;mask<65536;mask++){
  let ok=true;for(let i=0;i<4;i++){let rp=0,cp=0;for(let j=0;j<4;j++){rp^=(mask>>(i*4+j))&1;cp^=(mask>>(j*4+i))&1;}if(rp||cp){ok=false;break;}}
  if(ok)matrices++;
 }
 assert.equal(matrices,512);
 const valid=[true,true,true,true];
 for(const p of [0,1])for(const q of [0,1]){
  const f=((1-p)|q)^((1-p)&q),offered=[1-(p^q),p^q,(1-p)^q,(1-p)^(1-q)];
  offered.forEach((v,i)=>valid[i]&&=v===f);
 }
 assert.deepEqual(valid,[true,false,true,false]);
 const x=-parseInt('0110100',2),y=parseInt('1001100',2);
 assert.deepEqual([x+y,x-y,-x+y,-x-y].map(n=>Math.abs(n)>127),[false,true,true,false]);
 const table=Array(11).fill(null),placed=[];
 for(const x of [1,13,22,15,11,24]){let i=(x+7)%11;while(table[i]!=null)i=(i+1)%11;table[i]=x;placed.push(i);}
 assert.deepEqual(placed,[8,9,7,0,10,1]);assert.deepEqual(table.flatMap((v,i)=>v==null?[i]:[]),[2,3,4,5,6]);
 assert.ok(Math.log(5)/Math.log(4)<2);
 assert.equal((23-1)/2,11);
});
test('grammar ambiguity is genuine and the abab parse is unique; FD counterexamples are valid',()=>{
 const memo=new Map();
 function parses(w){
  if(memo.has(w))return memo.get(w);
  if(!w.length)return 1;
  let count=w[0]==='b'?parses(w.slice(1)):0;
  if(w[0]==='a')for(let i=1;i<w.length;i++)if(w[i]==='b')count+=parses(w.slice(1,i))*parses(w.slice(i+1));
  memo.set(w,count);return count;
 }
 assert.equal(parses('abb'),2);assert.equal(parses('abab'),1);assert.equal(parses('ba'),0);
 const fd=(rows,x,y)=>rows.every(a=>rows.every(b=>!x.every(i=>a[i]===b[i])||y.every(i=>a[i]===b[i])));
 const ca=[[0,0,0],[1,0,1]],cb=[[0,0,0],[0,1,1],[1,0,1]];
 assert.ok(fd(ca,[0],[2])&&fd(ca,[0,1],[2])&&!fd(ca,[1],[2]));
 assert.ok(fd(cb,[0,1],[2])&&!fd(cb,[0],[2])&&!fd(cb,[1],[2]));
});
