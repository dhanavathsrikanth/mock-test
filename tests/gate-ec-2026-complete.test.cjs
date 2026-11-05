const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EC-electronics-and-communication-engineering'),paper=path.join(base,'papers/2026/EC'),rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('65 questions, 100 marks, batches and official metadata',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[42,10,13]);
 for(const[a,b]of[[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`),'utf8')),rows.slice(a-1,b));
 for(const q of rows){const n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.organising_institute,'IIT Guwahati');assert.equal(q.source_metadata.session,7);assert.equal(q.source_metadata.key_page,n<=37?1:2);assert.equal(q.marks_to_all,false);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);}
});
test('all MCQs match independently transcribed final key and grade every option',()=>{
 const keys={1:'B',2:'A',3:'D',4:'B',5:'B',6:'A',7:'C',8:'C',9:'C',10:'C',11:'A',12:'D',13:'D',14:'C',15:'D',16:'A',17:'C',18:'D',19:'B',20:'A',21:'B',22:'C',23:'A',24:'A',36:'A',37:'A',38:'A',39:'B',40:'B',41:'C',42:'C',43:'C',44:'B',45:'B',46:'B',47:'B',48:'C',49:'A',50:'A',51:'D',52:'B',53:'C'};
 const{gradeResponse}=load('lib/question-response.ts');for(const[n,k]of Object.entries(keys)){const q=rows[n-1];assert.equal(q.correct_option,k.charCodeAt()-64);for(let i=1;i<=4;i++)assert.equal(gradeResponse(q,i),i===q.correct_option,`Q${n}`);assert.equal(gradeResponse(q,null),null);}
});
test('all MSQs require the exact complete answer set',()=>{
 const sets={25:[1],26:[2,4],27:[2],28:[1,2],29:[3,4],54:[1,2,4],55:[3],56:[1,4],57:[1,2,3],58:[1,3,4]};const{gradeResponse}=load('lib/question-response.ts');
 for(const[n,expected]of Object.entries(sets)){const q=rows[n-1];assert.deepEqual(q.correct_options,expected);for(let mask=0;mask<16;mask++){const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));assert.equal(gradeResponse(q,chosen),chosen.length?JSON.stringify(chosen)===JSON.stringify(expected):null,`Q${n} mask ${mask}`);}}
});
test('NAT calculations, source precision and disjoint Q64 ranges',()=>{
 const values={30:1,31:12**2/2,32:4e6/4/1e6,33:3e8/(2*.28*.0254)/1e9,34:100*(1-2*10**(-4/10)),35:10/2,59:18*77,60:(1+Math.sqrt(17))/2,61:2/3,62:3,63:1-.9**7-7*.1*.9**6,64:1.6e-19*(1400*.025)*(1e16-2e17)/(3e-4)/100,65:(6+2)/2};
 const{gradeResponse}=load('lib/question-response.ts');for(const[n,v]of Object.entries(values)){const q=rows[n-1];assert.equal(q.answer_decimal_places,+n===59?0:2);assert.equal(gradeResponse(q,v.toFixed(q.answer_decimal_places)),true,`Q${n} ${v}`);assert.equal(gradeResponse(q,null),null);assert.deepEqual(q.options,[]);}
 for(const v of ['-35.47','35.47'])assert.equal(gradeResponse(rows[63],v),true);for(const v of ['0','-1','1','34','37'])assert.equal(gradeResponse(rows[63],v),false);assert.equal(gradeResponse(rows[59],'2.561'),false);
});
test('independent Boolean simplifications and maximum-count circuit checks',()=>{
 const minterms=[0,2,5,7,8,10,13,14,15];for(let n=0;n<16;n++){const[w,x,y,z]=[3,2,1,0].map(i=>(n>>i)&1);assert.equal(Boolean((!x&&!z)||(x&&z)||(w&&x&&y)),minterms.includes(n));assert.equal(Boolean((!x&&!z)||(x&&z)||(w&&y&&!z)),minterms.includes(n));}
 assert.equal(Math.ceil(Math.log2(65)),7);assert.equal(0x2500+256*1024-1,0x424ff);assert.equal(4*55,220);
});
test('official syllabus leaves, worked explanations and formula rendering',()=>{
 const tax=JSON.parse(fs.readFileSync(path.join(base,'syllabus/2027/taxonomy.json'),'utf8')).subjects;const{renderMathToHtml}=load('lib/renderMath.ts');for(const q of rows){if(q.source_question_number>10)assert.ok(tax[q.subject][q.topic][q.subtopic].includes(q.sub_subtopic),`Q${q.source_question_number}`);assert.ok(q.explanation.length>200);assert.ok((q.explanation.match(/^### /gm)||[]).length>=3);for(const s of[q.question_text,...q.options,q.explanation])assert.doesNotMatch(renderMathToHtml(s),/katex-error/,`Q${q.source_question_number}`);}
});
test('24 diagrams and 8 graphical options use separate EC 2026 folder',()=>{
 assert.equal(rows.filter(q=>q.figure).length,24);assert.equal(rows.reduce((s,q)=>s+q.option_images.filter(Boolean).length,0),8);assert.deepEqual(rows.filter(q=>q.option_images.length).map(q=>q.source_question_number),[3,10]);for(const q of rows)for(const a of[q.figure,...q.option_images].filter(Boolean)){assert.match(a.url,/question-images\/gate-ec-2026\//);const p=fs.readFileSync(path.join(root,'public',a.local_url));assert.equal(p.subarray(1,4).toString(),'PNG');assert.ok(a.width>0&&a.height>0);}
});
