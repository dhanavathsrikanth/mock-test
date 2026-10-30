const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const crypto=require('node:crypto');const vm=require('node:vm');const ts=require('typescript');const katex=require('katex');
const base='data/gate-2027/streams/CS-computer-science/papers/2021/';
const papers=Object.fromEntries(['CS1','CS2'].map(p=>[p,JSON.parse(fs.readFileSync(base+p+'/questions-1-65.json','utf8'))]));
const exported={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/question-response.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exported});const {gradeResponse}=exported;
const official={
CS1:'C|A|C|A|C|C|C|C|C OR D|D|C|C|D|C|C|A|B|C|C|D|A,C|D|A|A,C|A,C|11 to 11|3 to 3|0.35 to 0.39|65 to 65|0.25 to 0.25|86 to 86|17 to 17|819 to 820 OR 205 to 205|-7.75 to -7.75|12 to 12|B|C|A|A|C|A|B|A|B|D|A|B|D|A|A,C|B|B,C,D|C|A,B,C|A,C|A,B,D|C|1023 to 1023|50 to 52|6 to 6|50 to 50|3 to 3|17160 to 17160|0.04 to 0.04|50 to 50',
CS2:'A|B|B|B|C|C|A|C|A|C|C|C|C|C|A|D|C|B|C|C|B,C|B,C,D|D|A,C,D|B,D|1 to 1|256 to 256|3 to 3|2 to 2|80000 to 80000|698 to 698|15 to 16|15 to 15|4 to 4|19 to 19|B|A|B|D|D|B|B|A|C|D|C|B|A|C|A,C,D|B,C,D|A,D|A,B,C|A,D|B,C|A,B|A,B,C|4108 to 4108|60 to 60|59049 to 59049|8 to 8|6 to 6|1.87 to 1.88|130 to 140|929 to 929'};
for(const [paper,rows] of Object.entries(papers)){
 test(`${paper} 2021 matches every final key, session, type, mark and batch boundary`,()=>{
  assert.deepEqual(rows.map(q=>q.answer_key),official[paper].split('|'));
  assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
  assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[34,13,18]);
  assert.deepEqual(JSON.parse(fs.readFileSync(base+paper+'/questions-1-30.json')),rows.slice(0,30));assert.deepEqual(JSON.parse(fs.readFileSync(base+paper+'/questions-31-65.json')),rows.slice(30));
  for(const q of rows){const n=q.source_question_number;assert.equal(q.source_metadata.session,paper==='CS1'?5:6);assert.equal(q.organising_institute,'IIT Bombay');assert.equal(q.source_metadata.exam_year,2021);assert.equal(q.source_metadata.paper,paper);assert.equal(q.source_metadata.original_question_number,n<=10?n:n-10);assert.equal(q.marks,n<=5||n>=11&&n<=35?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);assert.equal(q.options.length,q.question_type==='NAT'?0:4);}
 });
 test(`${paper} exact MCQ/MSQ and strict inclusive/disjoint NAT grading`,()=>{
  for(const q of rows){
   if(q.question_type==='NAT'){
    const ranges=q.answer_ranges||[{min:q.answer_min,max:q.answer_max}];assert.equal(q.answer_decimal_places,2);
    for(const r of ranges){assert.equal(gradeResponse(q,String(r.min)),true);assert.equal(gradeResponse(q,String(r.max)),true);}
    for(const value of [-8,-7.76,-7.75,-7.74,0,.249,.25,.251,.35,.37,.39,.4,1.87,1.88,1.881,15,16,17,205,205.01,206,500,818.99,819,819.5,820,820.01,17160]){
     const expected=(String(value).split('.')[1]?.length||0)<=2&&ranges.some(r=>value>=r.min&&value<=r.max);assert.equal(gradeResponse(q,String(value)),expected,`${paper} Q${q.source_question_number}: ${value}`);
    }
   }else for(let mask=1;mask<16;mask++){
    const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));const valid=q.correct_option_sets||(q.question_type==='MSQ'?[q.correct_options]:[[q.correct_option]]);
    assert.equal(gradeResponse(q,chosen),valid.some(s=>JSON.stringify(s)===JSON.stringify(chosen)));
   }
  }
  if(paper==='CS1'){assert.equal(gradeResponse(rows[8],3),true);assert.equal(gradeResponse(rows[8],4),true);assert.equal(gradeResponse(rows[8],[3,4]),false);assert.equal(gradeResponse(rows[32],'500'),false);}
 });
 test(`${paper} syllabus links, source hashes, source image proportions and explanation math validate`,()=>{
  const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CS-computer-science/syllabus/2027/syllabus.json'));
  let assets=0;
  for(const q of rows){
   const s=syllabus.subjects.find(s=>s.name===q.subject);assert.ok(s?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic));assert.equal(q.subject==='General Aptitude',q.source_question_number<=10);
   for(const k of ['question_source','key_source']){const src=q.source_metadata[k];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+src.filename)).digest('hex'),src.sha256);}
   assert.match(q.explanation,/### Solution[\s\S]+### Answer/);assert.ok(!/\(cid:|[\ue000-\uf8ff\ufffd]|must be read carefully|before import|\? Source/.test(q.explanation));
   for(const m of q.explanation.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`${paper} Q${q.source_question_number}`);
   assert.equal(q.option_images.length,q.question_type==='NAT'?0:4);
   for(const [i,f] of [q.figure,...q.option_images].entries()){
    const data=fs.readFileSync(base+paper+'/images/'+f.local_url.split('/').pop());assert.ok(data.equals(fs.readFileSync('public'+f.local_url)));assert.ok(data.length>100);assert.ok(Math.abs((data.readUInt32BE(16)/data.readUInt32BE(20))/(f.width/f.height)-1)<.025);assets++;
    if(i>0)assert.ok(q.figure.source_crop[3]<f.source_crop[1],'No option content in expandable statement');
   }
  }
  assert.equal(assets,253);
 });
}
test('independent enumerations support CS1 grid MST, rod cuts, T-counter and numeric results',()=>{
 const edges=[[0,1,1],[1,2,1],[3,4,1],[4,5,9],[6,7,9],[7,8,1],[0,3,9],[3,6,1],[1,4,9],[4,7,1],[2,5,9],[5,8,1]];
 let minimum=Infinity,count=0;for(let mask=0;mask<1<<12;mask++){
  if(mask.toString(2).replace(/0/g,'').length!==8)continue;const p=Array.from({length:9},(_,i)=>i);const find=x=>p[x]===x?x:p[x]=find(p[x]);let cost=0,tree=true;
  edges.forEach(([a,b,w],i)=>{if(mask&(1<<i)){a=find(a);b=find(b);if(a===b)tree=false;else p[a]=b;cost+=w;}});
  if(tree){if(cost<minimum){minimum=cost;count=1;}else if(cost===minimum)count++;}
 }assert.equal(count,3);
 const prices=[0,1,5,8,9,10,17,18],parts=[];function partition(left,min,sofar){if(left===0){parts.push(sofar);return;}for(let v=min;v<=left;v++)partition(left-v,v,[...sofar,v]);}partition(7,1,[]);const revenues=parts.map(p=>p.reduce((s,l)=>s+prices[l],0));assert.equal(Math.max(...revenues),18);assert.equal(revenues.filter(v=>v===18).length,3);
 let [p,q,r]=[0,0,0];const states=[];for(let i=0;i<3;i++){[p,q,r]=[p^r,q^(1-p),r^(1-q)];states.push(''+p+q+r);}assert.deepEqual(states,['011','101','000']);
 assert.equal(3**4-2**4,65);assert.equal((Math.exp(-1)).toFixed(2),'0.37');assert.equal(1200*(10/15+1/20-10/15/20),820);assert.equal((.1*.3/(.1*.3+.9*.8)).toFixed(2),'0.04');assert.equal(104*165,17160);assert.equal(Math.ceil(.5*202.01/2),51);
});
test('independent CS2 numeric and Boolean minimum-cover checks support the solutions',()=>{
 assert.equal((400+296)/.87/((300+210)/.85),4/3);assert.equal(Math.ceil(150000/Math.floor(4096/19)),698);assert.equal(2e6*.005*8,80000);assert.equal(Math.sqrt(240).toFixed(2),'15.49');assert.equal(3**10,59049);assert.equal(1027*4,4108);assert.equal((30/16).toFixed(2),'1.88');assert.equal(Math.round(1000*Math.exp(-2)),135);
 const foo=(x,y)=>x<=0&&y<=0?10:x<=0?foo(x,y-10):y<=0?foo(x-10,y):foo(x,y-10)+foo(x-10,y);assert.equal(foo(15,15),60);
 // CRC long division over GF(2).
 let word=0b11000000;for(let i=7;i>=3;i--)if(word&(1<<i))word^=0b1011<<(i-3);assert.equal(word,0b100);
 // Exact set-cover DP over every valid Boolean cube; minimize literal count.
 let ones=0,zeros=0;for(let v=0;v<16;v++){const w=v>>3,x=v>>2&1,y=v>>1&1,z=v&1;const vals=[];if(x===0&&y===0)vals.push(1);if(w===1&&y===1)vals.push(x||z);if(x===1)vals.push(w&&z||y);assert.ok(new Set(vals).size<=1);if(vals.length)(vals[0]?ones|=1<<v:zeros|=1<<v);}
 const cubes=[];for(let code=0;code<81;code++){let a=code,p=[];for(let i=0;i<4;i++){p.push(a%3);a=Math.floor(a/3);}let cover=0;for(let v=0;v<16;v++)if(p.every((x,i)=>x===2||x===(v>>(3-i)&1)))cover|=1<<v;if(!(cover&zeros)&&(cover&ones))cubes.push([cover&ones,p.filter(x=>x!==2).length]);}
 const dp=new Map([[0,0]]);for(const [cover,cost] of cubes)for(const [mask,old] of [...dp]){const next=mask|cover;if(old+cost<(dp.get(next)??Infinity))dp.set(next,old+cost);}assert.equal(dp.get(ones),6);
 for(let v=0;v<16;v++){const w=v>>3,x=v>>2&1,y=v>>1&1,z=v&1;const f=w&&z||!x&&!y||x&&y;if(ones>>v&1)assert.ok(f);if(zeros>>v&1)assert.ok(!f);}
});
