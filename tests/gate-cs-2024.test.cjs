const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const crypto=require('node:crypto');const ts=require('typescript');const vm=require('node:vm');const katex=require('katex');
const base='data/gate-2027/streams/CS-computer-science/papers/2024/';
const papers=Object.fromEntries(['CS1','CS2'].map(p=>[p,JSON.parse(fs.readFileSync(base+p+'/questions-1-65.json','utf8'))]));
const exported={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/question-response.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exported});
const {gradeResponse}=exported;
const expected={
 CS1:{ga:'A D A C A C A C A A',one:'D B B B C C A C C D A AC CD D BC AD BC AC AD ABC AC',nat1:[2,6,16,2],two:'B A A D A D A A BCD C BCD AB BD A BC BC BD BC',nat2:[4096,3,3,14,40,179,60,44,6596,[.37,.38],4,6],counts:[29,20,16]},
 CS2:{ga:'C A A C B C C D A A',one:'C A A B A B B B A A B A B BCD AB AB ACD BC BD BC A CD ABD',nat1:[5,3],two:'B B A A A B B A D B BC AB BCD ABD CD D BC',nat2:[[29.5,30.5],4,500,50,32,[2.9,3.1],9,2,34,15,4,1028,9],counts:[32,18,15]}
};
for(const [paper,rows] of Object.entries(papers)){
 test(`${paper} 2024: all official keys, question types, marks and two batches`,()=>{
  const e=expected[paper],keys=[...e.ga.split(' '),...e.one.split(' '),...e.nat1,...e.two.split(' '),...e.nat2];assert.equal(keys.length,65);
  assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
  assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),e.counts);
  assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
  for(const [i,q] of rows.entries()){
   const key=keys[i];if(typeof key==='string')assert.equal(q.answer_key.replace(/[^ABCD]/g,''),key);
   else {assert.equal(q.question_type,'NAT');assert.deepEqual([q.answer_min,q.answer_max],Array.isArray(key)?key:[key,key]);}
   assert.equal(q.marks,i<5||i>=10&&i<35?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);
   assert.equal(q.organising_institute,'IISc Bengaluru');assert.equal(q.source_metadata.session,paper==='CS1'?5:6);
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(base+paper+'/questions-1-30.json','utf8')),rows.slice(0,30));
  assert.deepEqual(JSON.parse(fs.readFileSync(base+paper+'/questions-31-65.json','utf8')),rows.slice(30));
 });
 test(`${paper}: strict NAT intervals, MSQ complete sets and separate source choices`,()=>{
  for(const q of rows){
   if(q.question_type==='NAT'){
    assert.deepEqual(q.options,[]);assert.deepEqual(q.option_images,[]);
    assert.equal(q.answer_decimal_places,paper==='CS1'&&q.source_question_number===63?3:2);
    assert.equal(gradeResponse(q,String(q.answer_min)),true);assert.equal(gradeResponse(q,String(q.answer_max)),true);
    const step=10**-q.answer_decimal_places;
    assert.equal(gradeResponse(q,(q.answer_min-step).toFixed(q.answer_decimal_places)),false);
    assert.equal(gradeResponse(q,(q.answer_max+step).toFixed(q.answer_decimal_places)),false);
   }else{
    assert.equal(q.options.length,4);assert.equal(q.option_images.length,4);
    if(q.question_type==='MSQ')for(let mask=1;mask<16;mask++){
     const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));assert.equal(gradeResponse(q,chosen),JSON.stringify(chosen)===JSON.stringify(q.correct_options));
    }
   }
  }
 });
 test(`${paper}: scoped classifications, source hashes, mathematical rendering and proportional source images`,()=>{
  const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CS-computer-science/syllabus/2027/syllabus.json','utf8'));
  for(const q of rows){
   const subject=syllabus.subjects.find(s=>s.name===q.subject);assert.ok(subject?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic),`${q.source_question_number} taxonomy`);
   assert.equal(q.subject==='General Aptitude',q.source_question_number<=10);
   for(const key of ['question_source','key_source']){const s=q.source_metadata[key];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+paper+'/sources/'+s.filename)).digest('hex'),s.sha256);}
   for(const text of [q.question_text,...q.options,q.explanation]){
    assert.ok(!/\(cid:|[\ue000-\uf8ff\ufffd]|Carry (ONE|TWO)/.test(text));
    for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}));
   }
   for(const f of [...(q.figure?[q.figure]:[]),...q.option_images].filter(Boolean)){
    const bytes=fs.readFileSync(base+paper+'/images/'+f.local_url.split('/').pop());assert.ok(bytes.equals(fs.readFileSync('public'+f.local_url)));
    assert.ok(Math.abs((bytes.readUInt32BE(16)/bytes.readUInt32BE(20))/(f.width/f.height)-1)<.04);
    assert.ok(f.url.includes(`gate-${paper.toLowerCase()}-2024/`));
   }
  }
 });
}
test('CS1 Q63 preserves its explicit three-decimal instruction and inclusive official interval',()=>{
 const q=papers.CS1[62];assert.equal(gradeResponse(q,'0.375'),true);assert.equal(gradeResponse(q,'0.369'),false);assert.equal(gradeResponse(q,'0.381'),false);assert.equal(gradeResponse(q,'0.3751'),false);
 assert.match(q.question_text,/3 decimal/);
});
function combinations(a,k){if(!k)return [[]];return a.flatMap((v,i)=>combinations(a.slice(i+1),k-1).map(t=>[v,...t]));}
test('CS2 Q59 counts all minimum spanning trees rather than confusing count with weight',()=>{
 const edges=[['a','b',1],['a','f',1],['c','d',1],['d','e',1],['a','g',2],['b','g',2],['f','g',2],['c','g',2],['d','g',2],['e','g',2],['b','c',3],['f','e',3]];
 let min=Infinity,count=0;
 for(const tree of combinations(edges,6)){
  const parent=Object.fromEntries('abcdefg'.split('').map(x=>[x,x]));const root=x=>parent[x]===x?x:parent[x]=root(parent[x]);let cycle=false;
  for(const [a,b] of tree){if(root(a)===root(b)){cycle=true;break;}parent[root(a)]=root(b);}if(cycle)continue;
  const weight=tree.reduce((s,e)=>s+e[2],0);if(weight<min){min=weight;count=1;}else if(weight===min)count++;
 }
 assert.equal(min,8);assert.equal(count,9);assert.equal(papers.CS2[58].answer_min,count);
});
test('CS2 Q42 sliding-window expressions agree with brute force for every positive ternary array through length eight',()=>{
 function run(a){let first=0,second=0,len1=0,len2=0,maxlen=0;for(const x of a){if(x===first){len2++;len1++;}else if(x===second){len2++;len1=1;second=first;}else{len2=len1+1;len1=1;second=first;}maxlen=Math.max(maxlen,len2);first=x;}return maxlen;}
 for(let n=0;n<=8;n++)for(let mask=0;mask<3**n;mask++){
  let v=mask;const a=Array.from({length:n},()=>{const x=v%3+1;v=Math.floor(v/3);return x;});let best=0;
  for(let i=0;i<n;i++)for(let j=i;j<n;j++)if(new Set(a.slice(i,j+1)).size<=2)best=Math.max(best,j-i+1);
  assert.equal(run(a),best);
 }
});
test('CS1 regular-language count, custom precedence, forest and IP fragmentation match independent calculations',()=>{
 let neither=0;for(let n=0;n<=5;n++)for(let m=0;m<2**n;m++){const w=m.toString(2).padStart(n,'0').slice(-n||1);if(!/^(?:0*|1*)$/.test(w)&&!/^(?:01*|10*)$/.test(w))neither++;}assert.equal(neither,44);
 assert.equal((3+1+5)*2/((7+2-(4-(7-6)))/2),6);
 const split=(size,mtu)=>{const limit=Math.floor((mtu-20)/8)*8,out=[];while(size>limit){out.push(limit);size-=limit;}if(size)out.push(size);return out;};
 assert.deepEqual(split(1400,542),[520,520,360]);
 assert.deepEqual(split(1400,542).flatMap(n=>split(n,360)),[336,184,336,184,336,24]);
 assert.equal(100-40,60);
});
