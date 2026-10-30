const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const crypto=require('node:crypto');const ts=require('typescript');const vm=require('node:vm');const katex=require('katex');
const base='data/gate-2027/streams/CS-computer-science/papers/2025/CS1/';
const rows=JSON.parse(fs.readFileSync(base+'questions-1-65.json','utf8'));
const exported={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/question-response.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exported});const {gradeResponse,numericKeypress}=exported;
test('CS1 2025 preserves all 65 official keys, modes, source pages, marks and two batches',()=>{
 const keys=['A','B','C','A','C','C','A','A','A','B','A','C','B','A','C','B','D','B','A','A','BD','BD','AD','BD','BD','AB','ABC','D',21,195,[-2.1,-1.9],[.49,.51],435,25,5,'A','B','A','A','A','D','A','C','C','C','AD','BC','BD','B','C',65468,6,[11.83,11.87],6,26,[.949,.952],7,[.300,.302],5,[7,8],5,5,46,5,[10,11]];
 assert.equal(keys.length,65);assert.equal(rows.length,65);
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[30,13,22]);
 assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 for(const [i,q] of rows.entries()){
  const k=keys[i];if(typeof k==='string')assert.equal(q.answer_key.replace(/[^ABCD]/g,''),k);else assert.deepEqual([q.answer_min,q.answer_max],Array.isArray(k)?k:[k,k]);
  assert.equal(q.marks,i<5||i>=10&&i<35?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);
  assert.equal(q.organising_institute,'IIT Roorkee');assert.equal(q.source_metadata.session,1);assert.equal(q.source_page,i===64?64:i+1);
 }
 assert.deepEqual(rows[10].source_metadata.question_pages,[10,11]);assert.equal(rows[30].source_metadata.key_page,2);
 assert.deepEqual(JSON.parse(fs.readFileSync(base+'questions-1-30.json','utf8')),rows.slice(0,30));
 assert.deepEqual(JSON.parse(fs.readFileSync(base+'questions-31-65.json','utf8')),rows.slice(30));
});
test('only genuinely graphical Q9 options use images; every other choice is nonempty text',()=>{
 let choiceImages=0,figures=0;
 for(const q of rows){
  if(q.question_type==='NAT'){assert.deepEqual(q.options,[]);assert.deepEqual(q.option_images,[]);}
  else if(q.source_question_number===9){assert.deepEqual(q.options,['','','','']);assert.equal(q.option_images.length,4);choiceImages+=4;}
  else {assert.equal(q.options.length,4);assert.ok(q.options.every(s=>s.trim().length>0));assert.deepEqual(q.option_images,[]);}
  if(q.figure)figures++;
 }
 assert.equal(choiceImages,4);assert.equal(figures,19);
 assert.deepEqual(rows[10].options,['(iii), (i), (ii)','(i), (iii), (ii)','(i), (ii), (iii)','(iii), (ii), (i)']);
 assert.deepEqual(rows[39].options,['E3','E1','E2','E5']);
});
test('integer and decimal NAT evaluation follows the statement and inclusive key without rounding',()=>{
 for(const q of rows){
  if(q.question_type==='NAT'){
   assert.equal(gradeResponse(q,String(q.answer_min)),true);assert.equal(gradeResponse(q,String(q.answer_max)),true);
   const dp=q.answer_decimal_places,step=10**-dp;
   assert.equal(gradeResponse(q,(q.answer_min-step).toFixed(dp)),false);assert.equal(gradeResponse(q,(q.answer_max+step).toFixed(dp)),false);
   assert.equal(dp,[56,58].includes(q.source_question_number)?3:[31,32,53].includes(q.source_question_number)?2:0);
  }else if(q.question_type==='MSQ')for(let mask=1;mask<16;mask++){
   const selected=[1,2,3,4].filter((_,i)=>mask&(1<<i));assert.equal(gradeResponse(q,selected),JSON.stringify(selected)===JSON.stringify(q.correct_options));
  }
 }
 assert.equal(gradeResponse(rows[55],'0.951'),true);assert.equal(gradeResponse(rows[55],'0.9521'),false);
 assert.equal(gradeResponse(rows[57],'0.302'),true);assert.equal(gradeResponse(rows[57],'0.3021'),false);
 assert.equal(gradeResponse(rows[59],'7'),true);assert.equal(gradeResponse(rows[59],'8'),true);assert.equal(gradeResponse(rows[59],'7.5'),false);
 assert.equal(gradeResponse(rows[64],'10'),true);assert.equal(gradeResponse(rows[64],'11'),true);assert.equal(gradeResponse(rows[64],'10.5'),false);
 assert.equal(numericKeypress('7','.',0),'7');
});
test('CS/common-GA taxonomy, source hashes, all mathematical text and proportional public mirrors validate',()=>{
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CS-computer-science/syllabus/2027/syllabus.json','utf8'));
 for(const q of rows){
  const subject=syllabus.subjects.find(s=>s.name===q.subject);assert.ok(subject?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic),`${q.source_question_number}: classification`);
  assert.equal(q.subject==='General Aptitude',q.source_question_number<=10);
  for(const key of ['question_source','key_source']){const src=q.source_metadata[key];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+src.filename)).digest('hex'),src.sha256);}
  for(const text of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/\(cid:|[\ue000-\uf8ff\ufffd]|```|Carry (ONE|TWO)/.test(text));
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true,strict:'error'}),`${q.source_question_number}: ${m[0]}`);
  }
  for(const f of [q.figure,...q.option_images].filter(Boolean)){
   const bytes=fs.readFileSync(base+'images/'+f.local_url.split('/').pop());assert.ok(bytes.equals(fs.readFileSync('public'+f.local_url)));
   assert.ok(Math.abs((bytes.readUInt32BE(16)/bytes.readUInt32BE(20))/(f.width/f.height)-1)<.02);
   assert.ok(f.url.includes('/gate-cs1-2025/'));
  }
 }
});
test('Boolean majority identities and Karnaugh-map choices match exhaustive truth tables',()=>{
 const m=(a,b,c)=>Number(a+b+c>=2),valid=[true,true,true,true];
 for(let mask=0;mask<32;mask++){
  const [a,b,c,d,e]=Array.from({length:5},(_,i)=>(mask>>i)&1);
  const checks=[m(a,b,m(c,d,e))===m(m(a,b,c),d,e),m(a,b,m(a,b,c))===m(a,b,c),m(a,b,m(a,c,d))===(m(a,b,a)&m(c,d,c)),m(a,b,c)===m(a,m(a,b,c),m(a,c,c))];checks.forEach((v,i)=>valid[i]&&=v);
 }
 assert.deepEqual(valid,[false,true,false,true]);
 const expected=new Set([0,2,4,8,10,11,12]),works=[true,true,true,true];
 for(let n=0;n<16;n++){
  const [b0,b1,b2,b3]=[0,1,2,3].map(i=>(n>>i)&1),answers=[(!b1&&!b0)||(!b2&&!b0)||(b1&&!b2&&b3),(!b1&&!b0)||(!b2&&!b0),(!b2&&!b0)||(b1&&b2&&b3),(!b0&&!b2)||!b3];
  answers.forEach((v,i)=>works[i]&&=Boolean(v)===expected.has(n));
 }
 assert.deepEqual(works,[true,false,false,false]);
});
test('independent scheduling, page replacement, hashing and numeric calculations support the worked answers',()=>{
 assert.ok(Math.abs((42-24)/(31.4-30.8)-30)<1e-10);assert.equal(243-3*2**4,195);assert.equal(30*29/2,435);assert.equal((16+20)/4,9);
 const refs=[1,3,2,4,2,3,1,2,4,3,1,4],frames=[],faults=[];
 refs.forEach((p,i)=>{if(frames.includes(p))return;faults.push(i+1);if(frames.length===3){const next=frames.map(x=>{const k=refs.slice(i+1,i+4).indexOf(x);return k<0?Infinity:k;});frames.splice(next.indexOf(Math.max(...next)),1);}frames.push(p);});
 assert.deepEqual(faults,[1,2,3,4,7,10]);
 const table=Array(11).fill(null),placed=[];for(const k of [63,50,25,79,67,24]){let i=0,j;do{j=(k%11+i*(1+k%7))%11;i++;}while(table[j]!=null);table[j]=k;placed.push(j);}assert.deepEqual(placed,[8,6,3,2,1,10]);
 assert.equal(Math.ceil(2**20/(2**16-4))*(2**16-4)-2**20,65468);assert.equal(.95*10+.05*.85*20+.05*.15*200,11.85);
 assert.equal((.99**5).toFixed(3),'0.951');assert.equal((19/63).toFixed(3),'0.302');
 const split=(n,mtu)=>{const max=Math.floor((mtu-20)/8)*8,out=[];while(n>max){out.push(max);n-=max;}if(n)out.push(n);return out;};assert.equal(split(15000,5000).flatMap(n=>split(n,3000)).length,7);
});
test('FSM partition refinement, Johnson cycles and both C digit/run calculations agree with the keys',()=>{
 const names='ABCDEFGH',next=[[5,1],[3,2],[5,4],[6,0],[3,2],[5,1],[6,7],[6,0]],output=['00','00','00','10','00','11','01','10'];let classes=output.map(s=>output.indexOf(s));
 for(;;){const sig=names.split('').map((_,i)=>output[i]+':'+next[i].map(j=>classes[j]).join(',')),updated=sig.map(s=>sig.indexOf(s));if(updated.every((c,i)=>c===classes[i]))break;classes=updated;}
 assert.equal(new Set(classes).size,5);
 for(let initial=0;initial<16;initial++){let state=initial,period=0;do{state=((state<<1)&15)|(1-((state>>3)&1));period++;}while(state!==initial&&period<17);assert.equal(period,8);}
 const a=[0,1,2,2,2,0,0,1,1];assert.equal(1+a.slice(1).filter((v,i)=>v!==a[i]).length,5);
 assert.equal(Number(String(14362).split('').filter((_,i)=>i%2===1).join('')),46);
});
test('MST enumeration establishes the maximum mandatory-edge integer weight as five',()=>{
 const choose=(a,k)=>!k?[[]]:a.flatMap((v,i)=>choose(a.slice(i+1),k-1).map(t=>[v,...t]));
 const always=[];
 for(let x=0;x<=9;x++){
  const edges=[['A','B',7],['A','D',6],['D','C',8],['A','C',3],['B','D',1],['B','C',x]],trees=[];
  for(const es of choose(edges,3)){const p={A:'A',B:'B',C:'C',D:'D'},root=a=>p[a]===a?a:root(p[a]);let ok=true;for(const [a,b] of es){if(root(a)===root(b)){ok=false;break;}p[root(a)]=root(b);}if(ok)trees.push({es,w:es.reduce((s,e)=>s+e[2],0)});}
  const min=Math.min(...trees.map(t=>t.w));if(trees.filter(t=>t.w===min).every(t=>t.es.some(e=>e[0]==='B'&&e[1]==='C')))always.push(x);
 }
 assert.equal(Math.max(...always),5);
});
