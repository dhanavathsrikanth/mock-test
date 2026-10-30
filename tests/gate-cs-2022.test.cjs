const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const crypto=require('node:crypto');const ts=require('typescript');const vm=require('node:vm');const katex=require('katex');
const base='data/gate-2027/streams/CS-computer-science/papers/2022/CS/';
const rows=JSON.parse(fs.readFileSync(base+'questions-1-65.json','utf8'));
const exported={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/question-response.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exported});
const {gradeResponse}=exported;
test('CS 2022 preserves all 65 final keys, two batches, types, marks and organiser',()=>{
 const keys=['D','C','D','A','B','B','D','D','B','D','A','D','D','A','A','B','A','B','C','C','D','C','B,C,D','A,B,D','A,B','A,D','A,B,C','509 to 509','5 to 5','36 to 36','8 to 8','7 to 7','0.85 to 0.85','-0.5 to -0.5','4 to 4','A','D','C','A','C','B','D','A','A','D','A,B,C','A,B,C','B,C,D','A,B,C','A,B,C','A,B,C','A','A,C,D','A,B,D','B,D','2 to 2','0.5 to 0.5','24 to 24','7.07 to 7.09','33 to 33','1.42 to 1.45','0 to 0','153 to 153','0.6 to 0.6','80 to 80'];
 assert.deepEqual(rows.map(q=>q.answer_key),keys);
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[32,15,18]);
 assert.equal(rows.reduce((a,q)=>a+q.marks,0),100);
 assert.deepEqual(JSON.parse(fs.readFileSync(base+'questions-1-30.json','utf8')),rows.slice(0,30));
 assert.deepEqual(JSON.parse(fs.readFileSync(base+'questions-31-65.json','utf8')),rows.slice(30));
 for(const q of rows){assert.equal(q.organising_institute,'IIT Kharagpur');assert.equal(q.source_metadata.session,1);assert.equal(q.source_metadata.exam_year,2022);assert.equal(q.source_metadata.stream,'CS');assert.equal(q.options.length,q.question_type==='NAT'?0:4);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);}
});
test('exact and ranged NAT grading remains strict; MSQ choices must match all and only the keyed options',()=>{
 for(const q of rows){
  if(q.question_type==='NAT'){
   assert.equal(q.answer_decimal_places,2);assert.equal(gradeResponse(q,String(q.answer_min)),true);assert.equal(gradeResponse(q,String(q.answer_max)),true);
   assert.equal(gradeResponse(q,(q.answer_min-.01).toFixed(2)),false);assert.equal(gradeResponse(q,(q.answer_max+.01).toFixed(2)),false);
   assert.equal(gradeResponse(q,(q.answer_min+.001).toFixed(3)),false);
  }else if(q.question_type==='MSQ')for(let mask=1;mask<16;mask++){
   const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));assert.equal(gradeResponse(q,chosen),JSON.stringify(chosen)===JSON.stringify(q.correct_options));
  }
 }
 assert.equal(gradeResponse(rows[61],'0'),true);assert.equal(gradeResponse(rows[61],'0.01'),false);
 assert.equal(gradeResponse(rows[33],'-0.50'),true);assert.equal(gradeResponse(rows[33],'0.50'),false);
});
test('CS/common-GA classifications, source hashes, formulas and all original graphical files validate',()=>{
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CS-computer-science/syllabus/2027/syllabus.json','utf8'));
 let stems=0,options=0;
 for(const q of rows){
  const s=syllabus.subjects.find(s=>s.name===q.subject);assert.ok(s);assert.ok(s.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic));
  assert.equal(q.subject==='General Aptitude',q.source_question_number<=10);
  for(const k of ['question_source','key_source']){const src=q.source_metadata[k];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+src.filename)).digest('hex'),src.sha256);}
  for(const text of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/\(cid:|[\ue000-\uf8ff\ufffd]|```/.test(text));
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}));
  }
  stems+=!!q.figure;options+=q.option_images.filter(Boolean).length;
  for(const f of [...(q.figure?[q.figure]:[]),...q.option_images].filter(Boolean)){
   const bytes=fs.readFileSync(base+'images/'+f.local_url.split('/').pop());assert.ok(bytes.equals(fs.readFileSync('public'+f.local_url)));
   assert.ok(Math.abs((bytes.readUInt32BE(16)/bytes.readUInt32BE(20))/(f.width/f.height)-1)<.02);
  }
 }
 assert.equal(stems,15);assert.equal(options,5);
 assert.match(rows[44].source_metadata.interpretation_note,/Doolittle/);assert.match(rows[55].source_metadata.interpretation_note,/NOT EXISTS/);
});
function permutations(a){if(!a.length)return [[]];return a.flatMap((v,i)=>permutations(a.filter((_,j)=>i!==j)).map(p=>[v,...p]));}
test('exhaustive GA Q9 geometry supports only B; the three-rope construction forms four similar plots',()=>{
 const pts=[[0,0],[2,0],[0,2],[1,0],[1,1],[0,1]],sides=[[0,1,3],[1,2,4],[0,2,5]];const valid=[];
 for(const x of permutations([0,1,2,3,4,5])){
  const[p,q,r,s,t,u]=x;if(t>2||!sides.some(side=>side.includes(p)&&!side.includes(t))||sides.some(side=>side.includes(s)&&side.includes(u)))continue;
  const[a,b,c,d]=[p,r,q,s].map(i=>pts[i]),v=[b[0]-a[0],b[1]-a[1]],w=[d[0]-c[0],d[1]-c[1]];
  if(v[0]*w[1]-v[1]*w[0]===0&&v[0]*(c[1]-a[1])-v[1]*(c[0]-a[0])!==0)valid.push(x);
 }
 assert.equal(valid.length,30);assert.ok(valid.every(x=>x[3]>=3));
 assert.ok(valid.some(x=>x[0]<3));assert.ok(valid.some(x=>x[2]<3));assert.ok(valid.some(x=>x[5]>=3));
 const area=p=>Math.abs(p.reduce((s,[x,y],i)=>s+x*p[(i+1)%p.length][1]-y*p[(i+1)%p.length][0],0))/2;
 const parts=[[[0,0],[4,0],[4,2],[2,4],[0,4]],[[4,0],[5,0],[6,1],[6,2],[4,2]],[[0,4],[2,4],[2,6],[1,6],[0,5]],[[4,2],[6,2],[6,6],[2,6],[2,4]]];
 assert.equal(parts.reduce((s,p)=>s+area(p),0),35);assert.deepEqual(parts.map(area),[14,3.5,3.5,14]);
});
test('independent tree, key-closure, partitions, scheduling, cache and numeric checks support the solutions',()=>{
 const inorder=i=>i>=1000?[]:[...inorder(2*i+1),i,...inorder(2*i+2)];assert.equal(inorder(0).at(-3),509);
 let keys=0;for(let set=0;set<32;set++){let c=set,old;do{old=c;if((c&3)===3)c|=4;if((c&6)===6)c|=8;if(c&4)c|=16;}while(c!==old);if(c===31)keys++;}assert.equal(keys,8);
 let count=0;for(let a=0;a<=6;a++)for(let b=0;b<=a;b++)for(let c=0;c<=b;c++)if(a+b+c===6)count++;assert.equal(count,7);
 const rr=bursts=>{const ready=bursts.map((_,i)=>i),seq=[];while(ready.length){const i=ready.shift();seq.push(i);bursts[i]-=4;if(bursts[i]>0)ready.push(i);}return seq.join('');};
 assert.equal(rr([4,10,6,2]),'0123121');assert.equal(rr([3,7,7,3]),'012312');
 const frames=[];let faults=0;for(const p of [7,2,7,3,2,5,3,4,6,7,7,1,5,6,1]){const i=frames.indexOf(p);if(i<0){faults++;if(frames.length===4)frames.shift();}else frames.splice(i,1);frames.push(p);}assert.equal(faults,9);
 const cache=Array(32).fill(null),hits=[];for(let j=0;j<10;j++)for(const a of [0xA248,0xC28A,0xCA8A,0xA262]){const block=Math.floor(a/64),i=block%32;hits.push(cache[i]===block);cache[i]=block;}assert.ok(hits.filter((_,i)=>i%4===3).every(Boolean));assert.ok(hits.filter((_,i)=>i%4===2).every(h=>!h));
 assert.equal(2100e3/3e8*1000+8000/1e8*1000,7.08);assert.equal(Math.ceil(Math.log2(1e9/8*60)),33);assert.equal((1.6/1.12).toFixed(2),'1.43');
 assert.equal(4*3*2*1,24);assert.equal(101+52,153);assert.equal(20*(10/5)*((8/2)/2),80);
 const A=[[-9,-6,-2,-4],[-8,-6,-3,-1],[20,15,8,5],[32,21,7,12]],vs=[[-1,1,0,1],[1,0,-1,0],[-1,0,2,2],[0,1,-3,0]];
 assert.deepEqual(vs.map(v=>A.map(r=>r.reduce((s,x,i)=>s+x*v[i],0))),[[-1,1,0,1],[-7,-5,12,25],[-3,0,6,6],[0,3,-9,0]]);
});
test('keyed automaton expression agrees with the original NFA on every binary word through length nine',()=>{
 const re=/^(?:ba*a|ab*b)*(?:ab*|ba*)$/;
 for(let n=0;n<=9;n++)for(let mask=0;mask<(1<<n);mask++){
  const word=Array.from({length:n},(_,i)=>(mask>>i)&1?'a':'b').join('');let states=new Set([0]);
  for(const c of word){const next=new Set();for(const s of states){if(s===0)next.add(c==='a'?1:2);if(s===1&&c==='b'){next.add(1);next.add(0);}if(s===2&&c==='a'){next.add(2);next.add(0);}}states=next;}
  assert.equal(re.test(word),states.has(1)||states.has(2),word);
 }
});
