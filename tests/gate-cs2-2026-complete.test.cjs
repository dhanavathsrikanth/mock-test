const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),ts=require('typescript'),vm=require('node:vm'),katex=require('katex');
const base='data/gate-2027/streams/CS-computer-science/papers/2026/CS2/';
const rows=JSON.parse(fs.readFileSync(base+'questions-34-65.json','utf8')),full=JSON.parse(fs.readFileSync(base+'questions-1-65.json','utf8'));
function load(file,deps={}){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require:n=>n in deps?deps[n]:require(n)});return exports;
}
const {gradeResponse,numericAnswerLabel}=load('lib/question-response.ts');
test('completed CS2 2026 preserves every remaining official key, source page and 100-mark total',()=>{
 const keys=['-60.25 to -60.25','13 to 13','C','A','A','A','B','D','D','D','B','A','A','CD','ACD','AC','AB','ABC','AB','16417 to 16417','1536 to 1536','3 to 3','128 to 128','2.30 to 2.40','4 to 4','6 to 6','9 to 9','1 to 1','48 to 48','0.5 to 0.5','40 to 40','30 to 30'];
 const pages=[23,23,24,25,25,26,27,28,29,30,30,31,32,33,34,35,36,37,38,38,39,39,39,39,40,40,40,41,41,41,41,42];
 assert.equal(rows.length,32);assert.equal(full.length,65);
 assert.deepEqual(full.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.deepEqual(full.slice(0,33),JSON.parse(fs.readFileSync(base+'questions-1-33.json','utf8')));assert.deepEqual(full.slice(33),rows);
 assert.equal(rows.reduce((s,q)=>s+q.marks,0),62);assert.equal(full.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>full.filter(q=>q.question_type===t).length),[35,11,19]);
 rows.forEach((q,i)=>{
  const n=i+34;assert.equal(q.source_question_number,n);assert.equal(q.answer_key.replaceAll(';',''),keys[i]);assert.equal(q.source_page,pages[i]);
  assert.equal(q.question_type,n<=35||n>=53?'NAT':n<=46?'MCQ':'MSQ');assert.equal(q.marks,n<=35?1:2);
  assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);assert.equal(q.source_metadata.session,4);
  assert.equal(q.source_metadata.key_page,n<=37?1:2);assert.equal(q.source_metadata.official_answer_key,q.answer_key);
  assert.equal(q.organising_institute,'IIT Guwahati');assert.equal(q.marks_to_all,false);
 });
});
test('all final classifications, source hashes, mathematical fields and seven original figures validate',()=>{
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CS-computer-science/syllabus/2027/syllabus.json','utf8'));
 let figures=0;
 for(const q of rows){
  const s=syllabus.subjects.find(s=>s.name===q.subject);assert.equal(s.scope,'CS');assert.ok(s.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic));
  assert.ok(['easy','medium','hard'].includes(q.difficulty));
  for(const k of ['question_source','key_source']){const src=q.source_metadata[k];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+src.filename)).digest('hex'),src.sha256);}
  for(const text of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ue000-\uf8ff\ufffd]|\(cid:/.test(text));
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true,strict:'error'}),'Q'+q.source_question_number+': '+m[0]);
  }
  assert.deepEqual(q.option_images,[]);
  if(q.figure){figures++;const f=q.figure,b=fs.readFileSync(base+'images/'+f.local_url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));assert.ok(Math.abs((b.readUInt32BE(16)/b.readUInt32BE(20))/(f.width/f.height)-1)<.02);}
 }
 assert.equal(figures,7);assert.ok(rows[61-34].figure.source_crop[2]>=490);
});
test('all worked solutions render concept/check sections and a distinct final answer card',()=>{
 const react=require('react'),{renderToStaticMarkup}=require('react-dom/server'),math=load('lib/renderMath.ts');
 const {QuestionExplanation}=load('components/QuestionExplanation.tsx',{'@/components/MathText':load('components/MathText.tsx',{'@/lib/renderMath':math})});
 for(const q of rows){
  assert.ok(q.explanation.length>500,'Q'+q.source_question_number);assert.ok((q.explanation.match(/^### /gm)||[]).length>=3);
  const html=renderToStaticMarkup(react.createElement(QuestionExplanation,{text:q.explanation}));
  assert.equal((html.match(/<section /g)||[]).length,(q.explanation.match(/^### /gm)||[]).length);
  assert.ok(html.includes('bg-green-50'));assert.ok(!html.includes('katex-error'));assert.ok(!html.includes('### '));
  if(q.explanation.includes('|---|'))assert.ok(html.includes('<table'));
  for(const text of [q.question_text,...q.options,q.explanation])assert.ok(!/\d\/\d/.test(text.split(/\$\$[\s\S]+?\$\$|\$[^$]+?\$/).join('')),'Q'+q.source_question_number);
 }
});
test('production grading reaches 100 marks with strict signed NATs and complete MSQ sets',()=>{
 let total=0;
 for(const q of full){
  const response=q.question_type==='NAT'?String(q.answer_min):q.question_type==='MSQ'?q.correct_options:q.correct_option;
  assert.equal(gradeResponse(q,response),true);total+=q.marks;
  if(q.source_question_number<34)continue;
  assert.equal(gradeResponse(q,null),null);
  if(q.question_type==='NAT'){
   const dp=[34,57].includes(q.source_question_number)?2:q.source_question_number===63?1:0;assert.equal(q.answer_decimal_places,dp);
   assert.deepEqual(q.options,[]);assert.equal(gradeResponse(q,String(q.answer_max)),true);
   const step=10**-dp;assert.equal(gradeResponse(q,(q.answer_min-step).toFixed(dp)),false);assert.equal(gradeResponse(q,(q.answer_max+step).toFixed(dp)),false);
   assert.equal(gradeResponse(q,(q.answer_max+step/10).toFixed(dp+1)),false);
   if(q.answer_min===q.answer_max){assert.equal(numericAnswerLabel(q.answer_min,q.answer_max),'Exact answer: '+q.answer_min);assert.ok(!q.explanation.split('### Answer')[1].includes(' to '));}
  }
  if(q.question_type==='MSQ')for(let mask=1;mask<16;mask++){const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));assert.equal(gradeResponse(q,chosen),JSON.stringify(chosen)===JSON.stringify(q.correct_options));}
 }
 assert.equal(total,100);assert.equal(gradeResponse(full[33],'-60.25'),true);assert.equal(gradeResponse(full[33],'-60.251'),false);
 assert.equal(gradeResponse(full[56],'2.34'),true);assert.equal(gradeResponse(full[56],'2.401'),false);
 assert.equal(gradeResponse(full[62],'0.50'),true);assert.equal(gradeResponse(full[62],'0.51'),false);
});
test('canonical LR0 construction independently finds eleven states and five shift/reduce cells',()=>{
 const rules=[["S'",['S']],['S',['A','C','B']],['A',['a','A']],['A',[]],['C',['c','C']],['C',[]],['B',['b','B']],['B',['b']]],nt=new Set(rules.map(r=>r[0]));
 const encode=items=>[...items].sort().join(';');
 function close(items){const set=new Set(items);let previous;do{previous=set.size;for(const item of [...set]){const [p,d]=item.split(',').map(Number),x=rules[p][1][d];if(nt.has(x))rules.forEach(([lhs],i)=>{if(lhs===x)set.add(i+',0');});}}while(set.size!==previous);return encode(set);}
 const states=[close(['0,0'])],edges=[];
 for(let s=0;s<states.length;s++){
  const items=states[s].split(';').map(i=>i.split(',').map(Number)),symbols=new Set(items.flatMap(([p,d])=>d<rules[p][1].length?[rules[p][1][d]]:[]));
  for(const x of symbols){const next=close(items.filter(([p,d])=>rules[p][1][d]===x).map(([p,d])=>p+','+(d+1)));if(!states.includes(next))states.push(next);edges.push([s,x,states.indexOf(next)]);}
 }
 let conflicts=0;for(let i=0;i<states.length;i++){const completed=states[i].split(';').map(s=>s.split(',').map(Number)).filter(([p,d])=>p!==0&&d===rules[p][1].length);if(completed.length)conflicts+=new Set(edges.filter(([s,x])=>s===i&&!nt.has(x)).map(e=>e[1])).size;}
 assert.equal(states.length,11);assert.equal(conflicts,5);
});
test('source automata return-block languages and semaphore output schedules match the MSQ keys',()=>{
 const d1=[{'0':[1],'1':[4]},{'0':[2],'1':[3]},{'0':[0],'1':[0]},{'0':[0]},{'0':[5]},{'1':[0]}];
 const d2=[{'0':[1],'1':[3]},{'1':[2]},{'1':[0]},{'0':[4],'1':[2,4]},{'0':[0]}];
 const accept=(nfa,w)=>{let active=new Set([0]);for(const c of w)active=new Set([...active].flatMap(q=>nfa[q][c]||[]));return active.has(0);};
 const blocks=[new Set(['000','001','010','101']),new Set(['011','100','110','111'])];
 for(let len=0;len<=9;len++)for(let n=0;n<2**len;n++){
  const w=len?n.toString(2).padStart(len,'0'):'',a=accept(d1,w),b=accept(d2,w);
  assert.equal(a,len%3===0&&Array.from({length:len/3},(_,i)=>w.slice(3*i,3*i+3)).every(s=>blocks[0].has(s)));
  assert.equal(b,len%3===0&&Array.from({length:len/3},(_,i)=>w.slice(3*i,3*i+3)).every(s=>blocks[1].has(s)));
  assert.equal(a&&b,len===0);
 }
 const outputs=new Set(),seen=new Set();
 function explore(pc,x,a,b,out){
  const key=[pc.join(','),x,a,b,out].join('|');if(seen.has(key))return;seen.add(key);if(pc.every(v=>v===10)){outputs.add(out);return;}
  pc.forEach((step,i)=>{
   if(step===10||step===0&&!a||step===7&&!b)return;
   const next=pc.slice();let xx=x,aa=a,bb=b,text=out;next[i]++;
   if(step===0)aa=0;if(step===1)text+='*';if(step===2)xx++;
   if(step===3&&x!==2)next[i]=6;if(step===4)text+='$';if(step===5)bb=1;if(step===6)aa=1;
   if(step===7)bb=0;if(step===8)text+='#';if(step===9)bb=1;
   explore(next,xx,aa,bb,text);
  });
 }
 explore([0,0,0],0,1,0,'');assert.deepEqual([...outputs].sort(),['**$*###','**$#*##','**$##*#'].sort());
});
test('fixed-point liveness, CRC division, opcode capacity and all 40 cache references independently agree',()=>{
 const use=[['b','c'],['a','e'],['a','f'],['d','e']],def=[['a'],['d'],['e'],['g']],succ=[[1,2],[3],[0],[]];let inside=use.map(v=>new Set(v)),outside=use.map(()=>new Set());
 for(;;){const out=succ.map(ss=>new Set(ss.flatMap(s=>[...inside[s]]))),inn=use.map((u,i)=>new Set([...u,...[...out[i]].filter(v=>!def[i].includes(v))]));if(inn.every((s,i)=>[...s].sort().join() === [...inside[i]].sort().join())){outside=out;break;}inside=inn;}
 assert.deepEqual(outside.map(s=>[...s].sort().join('')),['abcef','de','bcef','']);
 const mod=n=>{for(let i=31-Math.clz32(n);i>=3;i--)if(n&(1<<i))n^=0b1001<<(i-3);return n;};
 assert.equal(mod(0b110001011<<3),0b100);assert.equal(mod((0b110001011<<3)|0b100),0);
 assert.equal((1-2/4-7/16)*64,4);const codes=['00','01',...Array.from({length:7},(_,i)=>(8+i).toString(2)),...Array.from({length:4},(_,i)=>(60+i).toString(2))];assert.ok(codes.every((a,i)=>codes.every((b,j)=>i===j||!b.startsWith(a))));
 const addresses=[0x845B32,0x845B26,0x845B36,0x846B32],cache=new Map(),results=[[],[],[],[]];
 for(let t=0;t<10;t++)addresses.forEach((a,i)=>{const block=a>>4,index=block&255;results[i].push(cache.get(index)===block);cache.set(index,block);});
 assert.ok(results[0].every(v=>!v));assert.ok(results[2].every(Boolean));assert.deepEqual(results[1],[false,...Array(9).fill(true)]);assert.ok(results[3].every(v=>!v));
});
test('all fifteen NAT solutions satisfy independent lexical, memory, arithmetic and probability calculations',()=>{
 const value=n=>full[n-1],exact=(n,v)=>assert.equal(gradeResponse(value(n),String(v)),true,'Q'+n);
 const b=Buffer.alloc(4);b.writeUInt32BE(0xC2710000);exact(34,b.readFloatBE());
 const input='x1 23mm 78 y 7z zz5 14A 8H AaYcD',tokens=input.match(/[A-Za-z][A-Za-z0-9]*|[0-9]+/g);assert.equal(tokens.length,13);exact(35,tokens.length);
 exact(53,Math.ceil((16*2**30/(2*2**10))/((2*2**10-4)/4)));
 exact(54,(2**20/2**12)*(4+(36-12)+(30-12)+2)/8);
 const holes=[20,4,25,18,7,9,15,12];for(const p of [16,9]){const eligible=holes.map((s,i)=>[s,i]).filter(([s])=>s>=p).sort((a,b)=>a[0]-b[0]);holes[eligible[0][1]]-=p;}exact(55,holes.filter(s=>s>0&&s<8).length);
 const valid=[];for(let offset=0;offset<=20;offset++)for(let index=0;index+offset<=20;index++)if((Math.floor(0xA2C28/2**offset)%2**index)===176)valid.push({offset,index,capacity:2**(offset+index)});
 exact(56,Math.max(...valid.map(v=>v.capacity))/1024);assert.ok(valid.every(v=>v.offset===6));assert.equal(Math.max(...valid.map(v=>v.index)),11);
 const speed=(5/1.6)/((1+.3*2)/1.2);assert.equal(speed.toFixed(2),'2.34');exact(57,speed.toFixed(2));
 exact(58,1+Math.log2(16/2));let ones=0;for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let s=0;s<4;s++)ones+=[Number(a===0&&b===0),0,1,Number(a===1&&b===1)][s];exact(59,ones);
 const vars={a:5,b:11,c:20};let ptr='a';vars[ptr]=vars.c;ptr='c';vars.a=vars.b;vars.c=vars[ptr]-vars.a;exact(60,vars.c);
 function fun(start,end){const n=end+1-start;if(n<1||start<0||end<0)return 0;return n%3===0?fun(start+1,end):n%3===1?1+fun(start,end-1):fun(start+2,end);}
 let max=0;for(let s=-2;s<40;s++)for(let e=-2;e<60;e++)max=Math.max(max,fun(s,e));exact(61,max);assert.equal(max,1);
 exact(62,2**4*3);let denominator=0,numerator=0;
 for(let mask=0;mask<64;mask++){const h=i=>(mask>>(i-1))&1;if(h(1)+h(2)+h(3)+h(5)===2){denominator++;if(h(2)+h(4)+h(6)>=2)numerator++;}}
 assert.equal(denominator,24);assert.equal(numerator,12);exact(63,numerator/denominator);
 const selected=n=>[2,3,6,7].includes(n%10);exact(64,Array.from({length:99},(_,i)=>i+1).filter(k=>selected(k-1)!==selected(k)).length);
 exact(65,Math.ceil(Math.log2(1e8/8*60)));assert.ok(1e8/8*.03<2**29);
});
