const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),ts=require('typescript'),vm=require('node:vm'),katex=require('katex');
const base='data/gate-2027/streams/CS-computer-science/papers/2026/CS1/';
const rows=JSON.parse(fs.readFileSync(base+'questions-34-65.json','utf8')),full=JSON.parse(fs.readFileSync(base+'questions-1-65.json','utf8'));
function load(file,deps={}){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require:n=>n in deps?deps[n]:require(n)});return exports;
}
const {gradeResponse,numericAnswerLabel}=load('lib/question-response.ts');
test('complete CS1 2026 matches the remaining 32 final keys and totals 65 questions / 100 marks',()=>{
 const keys=['9 to 9','6 to 6','C','B','A','B','D','A','D','B','B','B','ACD','A','BD','AD','BD','C','BD','ABD','BC','BC','ABC','34 to 34','4.24 to 4.26','77.3 to 77.3','95 to 95','65536 to 65536','7 to 7','4 to 4','9.5 to 9.5','6 to 6'];
 const pages=[24,24,25,26,27,28,29,30,31,32,33,34,35,35,36,37,38,39,40,41,42,43,43,44,44,44,44,45,45,46,46,46];
 assert.equal(rows.length,32);assert.equal(full.length,65);
 assert.deepEqual(full.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.deepEqual(full.slice(0,33),JSON.parse(fs.readFileSync(base+'questions-1-33.json','utf8')));
 assert.deepEqual(full.slice(33),rows);assert.equal(full.reduce((s,q)=>s+q.marks,0),100);
 assert.equal(rows.reduce((s,q)=>s+q.marks,0),62);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>full.filter(q=>q.question_type===t).length),[28,24,13]);
 rows.forEach((q,i)=>{
  const n=i+34;assert.equal(q.source_question_number,n);assert.equal(q.answer_key.replaceAll(';',''),keys[i]);assert.equal(q.source_page,pages[i]);
  assert.equal(q.question_type,n<=35||n>=57?'NAT':n<=45?'MCQ':'MSQ');
  assert.equal(q.marks,n<=35?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);
  assert.equal(q.source_metadata.session,3);assert.equal(q.source_metadata.key_page,n<=37?1:2);
  assert.equal(q.source_metadata.official_answer_key,q.answer_key);assert.equal(q.organising_institute,'IIT Guwahati');
 });
 assert.match(rows[51-34].options[2],/\\overline\{L_2\}/);
});
test('remaining CS taxonomy, source hashes, mathematical rendering and seven original figures validate',()=>{
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CS-computer-science/syllabus/2027/syllabus.json','utf8'));
 let figures=0;
 for(const q of rows){
  const s=syllabus.subjects.find(s=>s.name===q.subject);assert.equal(s.scope,'CS');assert.ok(s.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic));
  assert.ok(['easy','medium','hard'].includes(q.difficulty));
  for(const key of ['question_source','key_source']){const src=q.source_metadata[key];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+src.filename)).digest('hex'),src.sha256);}
  for(const text of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ue000-\uf8ff\ufffd]|\(cid:/.test(text),'Q'+q.source_question_number);
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true,strict:'error'}),'Q'+q.source_question_number+': '+m[0]);
  }
  assert.deepEqual(q.option_images,[]);
  if(q.figure){
   figures++;const f=q.figure,b=fs.readFileSync(base+'images/'+f.local_url.split('/').pop());
   assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));assert.ok(f.url.includes('/gate-cs1-2026/'));
   assert.ok(Math.abs((b.readUInt32BE(16)/b.readUInt32BE(20))/(f.width/f.height)-1)<.02);
  }
 }
 assert.equal(figures,7);assert.ok(rows[0].figure.width>280);
});
test('worked explanations render as separate cards with tables, formulas and exact or ranged answers',()=>{
 const react=require('react'),{renderToStaticMarkup}=require('react-dom/server'),math=load('lib/renderMath.ts');
 const {QuestionExplanation}=load('components/QuestionExplanation.tsx',{'@/components/MathText':load('components/MathText.tsx',{'@/lib/renderMath':math})});
 for(const q of rows){
  assert.ok(q.explanation.length>500,'Q'+q.source_question_number);assert.ok((q.explanation.match(/^### /gm)||[]).length>=3);
  const html=renderToStaticMarkup(react.createElement(QuestionExplanation,{text:q.explanation}));
  assert.equal((html.match(/<section /g)||[]).length,(q.explanation.match(/^### /gm)||[]).length);
  assert.ok(html.includes('bg-green-50'));assert.ok(!html.includes('katex-error'));assert.ok(!html.includes('### '));
  if(q.explanation.includes('|---|'))assert.ok(html.includes('<table'));
  for(const text of [q.question_text,...q.options,q.explanation]){
   const prose=text.split(/\$\$[\s\S]+?\$\$|\$[^$]+?\$/).join('');
   assert.ok(!/\d\/\d/.test(prose),'Q'+q.source_question_number+': numeric slash must be explicit math');
  }
 }
 const rendered=math.renderMathToHtml(rows[36-34].explanation);
 assert.ok(rendered.includes('mfrac'));
});
test('strict NAT precision and complete MSQ grading preserve all final-key values',()=>{
 let total=0;
 for(const q of full){
  const response=q.question_type==='NAT'?String(q.answer_min):q.question_type==='MSQ'?q.correct_options:q.correct_option;
  assert.equal(gradeResponse(q,response),true);total+=q.marks;
  if(q.source_question_number<34)continue;
  if(q.question_type==='NAT'){
   assert.deepEqual(q.options,[]);assert.equal(gradeResponse(q,String(q.answer_max)),true);
   const dp=q.source_question_number===58?2:[59,64].includes(q.source_question_number)?1:0;
   assert.equal(q.answer_decimal_places,dp);const step=10**-dp;
   assert.equal(gradeResponse(q,(q.answer_min-step).toFixed(dp)),false);assert.equal(gradeResponse(q,(q.answer_max+step).toFixed(dp)),false);
   assert.equal(gradeResponse(q,(q.answer_max+step/10).toFixed(dp+1)),false);
   if(q.answer_min===q.answer_max){assert.equal(numericAnswerLabel(q.answer_min,q.answer_max),'Exact answer: '+q.answer_min);assert.ok(!q.explanation.split('### Answer')[1].includes(' to '));}
  }
  if(q.question_type==='MSQ')for(let mask=1;mask<16;mask++){
   const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));assert.equal(gradeResponse(q,chosen),JSON.stringify(chosen)===JSON.stringify(q.correct_options));
  }
 }
 assert.equal(total,100);const q58=full[57];assert.equal(gradeResponse(q58,'4.25'),true);assert.equal(gradeResponse(q58,'4.261'),false);
 assert.equal(gradeResponse(full[58],'77.30'),true);assert.equal(gradeResponse(full[58],'77.31'),false);
});
test('IEEE addition and every saturating-counter row match the selected choices',()=>{
 const decode=hex=>{const b=Buffer.alloc(4);b.writeUInt32BE(parseInt(hex,16));return b.readFloatBE();},b=Buffer.alloc(4);
 b.writeFloatBE(decode('35C00000')+decode('34A00000'));assert.equal(b.readUInt32BE().toString(16).toUpperCase(),'35E80000');
 const valid=[true,true,true,true];
 for(const p of [0,1])for(let state=0;state<4;state++){
  const a=(state>>1)&1,c=state&1,expected=p?Math.max(0,state-1):Math.min(3,state+1);
  const pairs=[
   [(p&a)|((1-p)&c)|(a&c),(p&c)|((1-p)&a)|(a&(1-c))],
   [((1-p)&a)|((1-p)&c)|(a&c),((1-p)&(1-c))|((1-p)&a)|(a&(1-c))],
   [((1-p)&(1-a))|((1-p)&c)|(a&c),((1-p)&c)|((1-p)&a)|(a&(1-c))],
   [(p&(1-a))|((1-p)&c)|(a&c),(p&(1-c))|((1-p)&a)|(a&(1-c))]
  ];pairs.forEach(([d1,d0],i)=>valid[i]&&=((d1<<1)|d0)===expected);
 }
 assert.deepEqual(valid,[false,true,false,false]);
});
test('Boolean prime-implicant enumeration proves both exact minimum SOP choices',()=>{
 const on=new Set([1,2,3,4,5,7,10,12,13,14]),valid=[true,true,true,true],cubes=[];
 for(let n=0;n<16;n++){
  const [p,q,r,s]=[3,2,1,0].map(i=>(n>>i)&1),common=((1-p)&s)|(q&(1-r));
  const opts=[common|((1-p)&(1-q)&r)|((1-q)&r&(1-s)),common|((1-p)&(1-q)&r)|(p&r&(1-s)),common|(p&q&(1-s))|(p&r&(1-s)),common|(p&q&(1-s))|((1-q)&r&(1-s))];
  opts.forEach((v,i)=>valid[i]&&=Boolean(v)===on.has(n));
 }
 assert.deepEqual(valid,[false,true,false,true]);
 const cells=[...on];for(let code=0;code<81;code++){
  let k=code;const pattern=Array.from({length:4},()=>{const x=k%3;k=Math.floor(k/3);return x;});
  const matches=Array.from({length:16},(_,n)=>n).filter(n=>pattern.every((x,i)=>x===2||((n>>(3-i))&1)===x));
  if(matches.every(n=>on.has(n)))cubes.push({mask:matches.reduce((a,n)=>a|(1<<cells.indexOf(n)),0),literals:pattern.filter(x=>x!==2).length});
 }
 const dp=Array.from({length:1024},()=>[Infinity,Infinity]);dp[0]=[0,0];
 for(let mask=0;mask<1024;mask++)for(const c of cubes){const m=mask|c.mask,next=[dp[mask][0]+1,dp[mask][1]+c.literals];if(next[0]<dp[m][0]||next[0]===dp[m][0]&&next[1]<dp[m][1])dp[m]=next;}
 assert.deepEqual(dp[1023],[4,10]);
});
test('bounded shortest paths, matching enumeration, FCFS, recursion and superkeys independently agree',()=>{
 const edges=[[0,1,1],[1,2,1],[2,3,1],[0,3,4],[0,2,10]];let d=[0,Infinity,Infinity,Infinity];
 const budgets=[d];for(let k=1;k<=4;k++){const next=d.slice();for(const [a,b,w] of edges){next[b]=Math.min(next[b],d[a]+w);next[a]=Math.min(next[a],d[b]+w);}assert.ok(next.every((v,i)=>v<=d[i]));d=next;budgets.push(d);}
 assert.deepEqual([budgets[1][2],budgets[1][3],budgets[3][3]],[10,4,3]);
 let matchings=0;for(let mask=0;mask<128;mask++)if(!(mask&(mask<<1)))matchings++;assert.equal(matchings,34);
 assert.equal((1+2+5+7)/6+(3+4+6+8)/12,4.25);
 assert.equal(5+7+5+30*(60000/15000/2)+30*(60000/15000/400),77.3);
 assert.equal([[1.8,15],[1.5,10],[2.5,5],[1.7,10],[1.7,5],[2.8,15],[3.2,5],[.9,35]].reduce((a,[t,n])=>a+(Math.ceil(t)-1)*n,0),95);
 let previous=0;const waits=[];for(let i=1;i<=5;i++)for(const [arrival,burst] of [[10*i,6],[11*i,8]]){const start=Math.max(arrival,previous);waits.push(start-arrival);previous=start+burst;}
 assert.deepEqual(waits,[0,5,4,8,8,11,12,14,16,17]);assert.equal(waits.reduce((a,b)=>a+b)/10,9.5);
 const foo=n=>n===1?1:1+foo(Math.floor(Math.log2(n)));assert.equal(foo(65536),5);assert.equal(foo(65535),4);
 let keys=0;for(let mask=0;mask<16;mask++)if((mask&3)===3||(mask&5)===5)keys++;assert.equal(keys,6);
});
