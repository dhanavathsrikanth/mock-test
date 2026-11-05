const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),ts=require('typescript'),vm=require('node:vm'),katex=require('katex');
const base='data/gate-2027/streams/CS-computer-science/papers/2026/CS2/';
const rows=JSON.parse(fs.readFileSync(base+'questions-1-33.json','utf8'));
function load(file,deps={}){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require:n=>n in deps?deps[n]:require(n)});return exports;
}
const {gradeResponse,numericAnswerLabel}=load('lib/question-response.ts');
test('CS2 2026 Q1-Q33 preserves official session-4 keys, 38 marks and every source page',()=>{
 const keys=['A','C','A','A','C','A','A','A','B','C','A','A','D','B','C','B','C','C','A','A','B','C','B','A','AB','ABC','AC','BD','BC','3 to 3','24 to 24','3 to 3','4094 to 4094'];
 const pages=[1,2,3,4,4,5,6,7,8,9,10,11,12,12,13,14,14,15,16,17,17,18,18,19,20,20,21,21,22,22,22,22,23];
 assert.equal(rows.length,33);assert.equal(rows.reduce((s,q)=>s+q.marks,0),38);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[24,5,4]);
 rows.forEach((q,i)=>{
  assert.equal(q.source_question_number,i+1);assert.equal(q.source_page,pages[i]);
  assert.equal(q.answer_key.replaceAll(';',''),keys[i]);assert.equal(q.source_metadata.official_answer_key,q.answer_key);
  assert.equal(q.question_type,i<24?'MCQ':i<29?'MSQ':'NAT');assert.equal(q.marks,i>=5&&i<10?2:1);
  assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);
  assert.equal(q.organising_institute,'IIT Guwahati');assert.equal(q.source_metadata.session,4);
  assert.equal(q.source_metadata.paper,'CS2');assert.equal(q.source_metadata.exam_year,2026);
 });
 assert.deepEqual(rows[20].options,['731','64','8','16']);
});
test('CS and common-GA classification, source hashes, explicit mathematics and 17 proportional images validate',()=>{
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CS-computer-science/syllabus/2027/syllabus.json','utf8'));
 const extension=JSON.parse(fs.readFileSync(base+'taxonomy-extensions.json','utf8'));
 let figures=0,options=0;
 for(const q of rows){
  const s=syllabus.subjects.find(s=>s.name===q.subject);assert.ok(s);
  if(q.source_question_number===22){
   assert.equal(q.subject,extension.subject);assert.equal(q.topic,extension.topic);assert.equal(q.subtopic,extension.subtopic);
   assert.equal(extension.official_syllabus_heading,false);assert.ok(q.source_metadata.classification.extension_basis);
  }else assert.ok(s.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic),'Q'+q.source_question_number);
  assert.equal(q.subject==='General Aptitude',q.source_question_number<=10);
  for(const key of ['question_source','key_source']){const src=q.source_metadata[key];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+src.filename)).digest('hex'),src.sha256);}
  for(const str of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ue000-\uf8ff\ufffd]|\(cid:/.test(str));
   for(const m of str.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true,strict:'error'}),'Q'+q.source_question_number+': '+m[0]);
  }
  if(q.figure)figures++;options+=q.option_images.length;
  if(q.option_images.length){assert.ok([2,7,9].includes(q.source_question_number));assert.equal(q.option_images.length,4);}
  for(const f of [q.figure,...q.option_images].filter(Boolean)){
   const b=fs.readFileSync(base+'images/'+f.local_url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));
   assert.ok(Math.abs((b.readUInt32BE(16)/b.readUInt32BE(20))/(f.width/f.height)-1)<.02);assert.ok(f.url.includes('/gate-cs2-2026/'));
  }
 }
 assert.equal(figures,5);assert.equal(options,12);
});
test('worked explanations display separate teaching, calculation/check and answer cards with readable math',()=>{
 const react=require('react'),{renderToStaticMarkup}=require('react-dom/server'),math=load('lib/renderMath.ts');
 const {QuestionExplanation}=load('components/QuestionExplanation.tsx',{'@/components/MathText':load('components/MathText.tsx',{'@/lib/renderMath':math})});
 for(const q of rows){
  assert.ok(q.explanation.length>500,'Q'+q.source_question_number);assert.ok((q.explanation.match(/^### /gm)||[]).length>=3);
  const html=renderToStaticMarkup(react.createElement(QuestionExplanation,{text:q.explanation}));
  assert.equal((html.match(/<section /g)||[]).length,(q.explanation.match(/^### /gm)||[]).length);
  assert.ok(html.includes('bg-green-50'));assert.ok(!html.includes('katex-error'));assert.ok(!html.includes('### '));
  if(q.explanation.includes('|---|'))assert.ok(html.includes('<table'));
  for(const str of [q.question_text,...q.options,q.explanation])assert.ok(!/\d\/\d/.test(str.split(/\$\$[\s\S]+?\$\$|\$[^$]+?\$/).join('')));
 }
 for(const n of [12,15])assert.ok(math.renderMathToHtml(rows[n-1].question_text).includes('<table'));
});
test('all responses reach 38 marks; integer NATs reject nearby decimals and MSQs require the full set',()=>{
 let total=0;
 for(const q of rows){
  const response=q.question_type==='NAT'?String(q.answer_min):q.question_type==='MSQ'?q.correct_options:q.correct_option;
  assert.equal(gradeResponse(q,response),true);total+=q.marks;assert.equal(gradeResponse(q,null),null);
  if(q.question_type==='NAT'){
   assert.deepEqual(q.options,[]);assert.equal(q.answer_min,q.answer_max);assert.equal(q.answer_decimal_places,0);
   assert.equal(gradeResponse(q,String(q.answer_min+.01)),false);assert.equal(gradeResponse(q,String(q.answer_min-1)),false);
   assert.equal(numericAnswerLabel(q.answer_min,q.answer_max),'Exact answer: '+q.answer_min);
   assert.ok(!q.explanation.split('### Answer')[1].includes(' to '));
  }
  if(q.question_type==='MSQ')for(let mask=1;mask<16;mask++){
   const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));assert.equal(gradeResponse(q,chosen),JSON.stringify(chosen)===JSON.stringify(q.correct_options));
  }
 }
 assert.equal(total,38);
});
test('independent source-grid complements, magic-square counts and Hamiltonian paths verify the visual answers',()=>{
 const retained=['111111','101100','100001','111011','100011','111111'].map(s=>[...s].map(Number));
 const missing=retained.slice(1,5).map(r=>r.slice(1).map(x=>1-x));
 assert.deepEqual(missing,[[1,0,0,1,1],[1,1,1,1,0],[0,0,1,0,0],[1,1,1,0,0]]);
 const candidates=[[[1,0,0,1,1],[1,1,1,1,0],[0,0,1,0,0],[1,1,1,1,0]],[[1,0,0,1,1],[1,1,1,1,0],[0,0,1,0,0],[0,1,1,1,0]],missing,[[1,0,0,1,1],[1,1,1,1,0],[0,0,1,1,0],[0,1,1,0,0]]];
 assert.deepEqual(candidates.map(c=>JSON.stringify(c)===JSON.stringify(missing)),[false,false,true,false]);
 const magic=[[8,1,6],[3,5,7],[4,9,2]];for(let i=0;i<3;i++){assert.equal(magic[i].reduce((a,b)=>a+b),15);assert.equal(magic.reduce((a,r)=>a+r[i],0),15);}
 assert.deepEqual([[7,2],[6,2],[7,3],[6,4]].map(([a,b])=>a===magic[1][2]&&b===magic[2][2]),[true,false,false,false]);
 const visit=[[1,2,3,4],[16,7,6,5],[15,8,9,10],[14,13,12,11]],pos=[];
 visit.forEach((r,i)=>r.forEach((v,j)=>pos[v]=[i,j]));
 for(let n=1;n<=16;n++){const a=pos[n],b=pos[n%16+1];assert.equal(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]),1);}
 // The second source graph is K2,3. Enumerate all possible Hamilton cycles.
 const edges=new Set(['0,2','0,3','0,4','1,2','1,3','1,4']),adj=(a,b)=>edges.has([a,b].sort().join(','));
 const perms=a=>a.length?a.flatMap((v,i)=>perms(a.filter((_,j)=>j!==i)).map(p=>[v,...p])):[[]];
 assert.equal(perms([1,2,3,4]).filter(p=>[0,...p].every((v,i,a)=>adj(v,a[(i+1)%a.length]))).length,0);
 const grids=[['1011','0101','0010','1100'],['1011','0100','0011','1100'],['1011','0110','0010','1100'],['1011','0100','0010','1101']];
 assert.deepEqual(grids.map(g=>JSON.stringify(g.map(r=>[...r].reduce((a,b)=>a+Number(b),0)))===JSON.stringify([3,1,2,2])&&[0,1,2,3].every(i=>g.reduce((a,r)=>a+Number(r[i]),0)===2)),[false,true,false,false]);
});
test('exhaustive probabilities, prime-parity relations and signed operations support the official answers',()=>{
 let cloudy=0;for(let mask=0;mask<16;mask++)if(mask.toString(2).replaceAll('0','').length===3)cloudy++;assert.equal(cloudy/16,1/4);
 let prime=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)if([2,3,5,7,11].includes(a+b))prime++;assert.equal(prime,15);
 const R=(a,b)=>Number.isInteger(Math.sqrt(a*b));
 for(let a=1;a<=10;a++)for(let b=1;b<=10;b++){
  assert.ok(R(a,a));assert.equal(R(a,b),R(b,a));for(let c=1;c<=10;c++)if(R(a,b)&&R(b,c))assert.ok(R(a,c));
 }
 assert.ok(R(1,4)&&R(4,1));const [a,b,c,d]=[0b1011,0b1101,0b1010,0b1001].map(n=>n-16);
 assert.deepEqual([a+b,b+c,c-d,a+d].map(n=>n < -8||n>7),[false,true,false,true]);
 for(const x of [0,1])assert.equal(x&(1-x),0);
 assert.equal(4e6*8/500e3,64);assert.equal(2*55+70-180,0);
});
test('independent hashing, linear-dependence and merge traces verify all four NAT answers',()=>{
 const buckets=Array.from({length:9},()=>[]);[5,28,19,15,26,33,12,17,10].forEach(x=>buckets[x%9].push(x));
 assert.equal(Math.max(...buckets.map(b=>b.length)),3);assert.deepEqual(buckets[1],[28,19,10]);
 for(const a of [4,-4]){const b=24/a;assert.equal(a*a-16,0);for(const x of [-3,0,5]){const y=b-a*x;assert.equal(16*x+a*y,24);}assert.equal(a*b,24);}
 let voids=0,merges=0;function sort(a){if(a.length<2)return a;const m=a.length>>1,l=sort(a.slice(0,m)),r=sort(a.slice(m));merges++;if(l.at(-1)<=r[0])voids++;return [...l,...r].sort((a,b)=>a-b);}
 assert.deepEqual(sort([10,7,8,19,41,35,25,31]),[7,8,10,19,25,31,35,41]);assert.equal(merges,7);assert.equal(voids,3);
 const prefix=[255,255,240,0].reduce((a,n)=>a+n.toString(2).replaceAll('0','').length,0);assert.equal(prefix,20);assert.equal(2**(32-prefix)-2,4094);
});
