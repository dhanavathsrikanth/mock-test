const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EC-electronics-and-communication-engineering'),paper=path.join(base,'papers/2025/EC'),rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('65 sequential questions, 100 marks, exact batch coverage and source precision',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[39,14,12]);
 for(const[a,b]of[[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`),'utf8')),rows.slice(a-1,b));
 for(const q of rows){const n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.organising_institute,'IIT Roorkee');assert.equal(q.source_metadata.session,6);assert.equal(q.source_metadata.key_page,n<=30?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'&&!q.marks_to_all?q.marks/3:0);assert.equal(q.source_metadata.question_source.sha256.length,64);}
});
test('MCQ keys independently read from official final key, including the user-corrected Q8',()=>{
 const keys={1:'A',2:'D',3:'B',4:'B',5:'A',6:'B',7:'D',8:'B',9:'C',10:'B',11:'A',12:'B',13:'A',14:'A',15:'A',16:'D',17:'D',18:'A',19:'A',20:'A',21:'A',22:'C',23:'A',24:'B',36:'D',37:'A',38:'A',39:'A',40:'A',41:'D',42:'A',43:'D',44:'A',45:'A',46:'B',47:'A',48:'B',49:'C',50:'A'};
 const{gradeResponse}=load('lib/question-response.ts');for(const[n,k]of Object.entries(keys)){assert.equal(rows[n-1].correct_option,k.charCodeAt()-64,`Q${n}`);for(let i=1;i<=4;i++)assert.equal(gradeResponse(rows[n-1],i),i===k.charCodeAt()-64);}
 assert.deepEqual(rows.filter(q=>q.marks_to_all).map(q=>q.source_question_number),[]);assert.equal(gradeResponse(rows[7],null),null);assert.equal(rows[7].marks,2);assert.equal(rows[7].negative_marks,2/3);assert.equal(rows[7].correct_option,2);
});
test('every MSQ selection is graded as an exact complete answer set',()=>{
 const sets={25:[1,2],26:[3],27:[3,4],28:[1,4],29:[1,3],30:[2,4],31:[1,4],51:[1],52:[1,2],53:[2],54:[2,3],55:[1,4],56:[2],57:[1,4]};
 const{gradeResponse}=load('lib/question-response.ts');for(const[n,expected]of Object.entries(sets)){const q=rows[n-1];assert.deepEqual(q.correct_options,expected);for(let mask=0;mask<16;mask++){const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));assert.equal(gradeResponse(q,chosen),chosen.length?JSON.stringify(chosen)===JSON.stringify(expected):null,`Q${n} mask ${mask}`);}}
});
test('all NAT computations, official ranges and source rounding',()=>{
 const ranges={32:[.25,.25],33:[3,3],34:[50,50],35:[250,250],58:[6.95,7.05],59:[2.95,3.05],60:[0,0],61:[13.32,13.34],62:[200,200],63:[.23,.24],64:[6.3,6.5],65:[.62,.63]};
 const values={32:.5-.5**2,33:3,34:10/.2,35:2*(1/4-1/8)*1000,58:2*(1+2+3+4+5+6)/6,59:Math.sqrt(18-(3*Math.SQRT2)**2/2),60:0,61:20*2/3,62:1000/(2+1+2),63:1.38e-23*300/1.6e-19*Math.log(1+.1/1e-5),64:10*(1-75**2/(100**2+75**2)),65:5*.5/(2+2)};
 const{gradeResponse}=load('lib/question-response.ts');for(const[n,v]of Object.entries(values)){const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],ranges[n]);assert.equal(q.answer_decimal_places,[33,34,35,62].includes(+n)?0:+n===64?1:2);assert.equal(gradeResponse(q,v.toFixed(q.answer_decimal_places)),true,`Q${n}: ${v}`);assert.equal(gradeResponse(q,null),null);assert.deepEqual(q.options,[]);}
 assert.equal(gradeResponse(rows[31],'.251'),false);assert.equal(gradeResponse(rows[31],'.250'),true);assert.equal(gradeResponse(rows[62],'.239'),false);assert.equal(gradeResponse(rows[62],'.24'),true);
});
test('independent rank, codeword, polynomial, state and circuit checks',()=>{
 const G=[[1,0,0,1,0,1],[0,1,0,0,1,1],[0,0,1,1,1,0]];let weights=[];for(let u=1;u<8;u++){const word=Array.from({length:6},(_,j)=>G.reduce((s,r,i)=>s^(((u>>i)&1)*r[j]),0));weights.push(word.reduce((s,x)=>s+x,0));}assert.equal(Math.min(...weights),3);
 const multiply=(a,b)=>a.reduce((o,x,i)=>{b.forEach((y,j)=>o[i+j]=(o[i+j]||0)+x*y);return o;},[]);assert.deepEqual(multiply(multiply(multiply([1,0,1],[1,-2]),[1,4]),[1,5]),[1,7,3,-33,2,-40]);
 assert.ok(Math.abs(10-1.01*5-1.01*3-1.92)<1e-12);assert.ok(Math.abs(1/(1.6e-19*2.5e16*.2)/1000-1.25)<1e-12);
 assert.deepEqual([[0,1],[0,0],[1,0],[0,1]].map(([a,b])=>a^b),[1,0,1,1]);
 const entropy=a=>-2*a*Math.log2(a)-(1-2*a)*Math.log2(1-2*a);assert.ok(entropy(.3)>entropy(.4));assert.ok(entropy(.3)>entropy(.25));
});
test('technical questions map to the official syllabus hierarchy and have worked explanations',()=>{
 const tax=JSON.parse(fs.readFileSync(path.join(base,'syllabus/2027/taxonomy.json'),'utf8')).subjects;for(const q of rows.slice(10)){assert.ok(tax[q.subject][q.topic][q.subtopic].includes(q.sub_subtopic),`Q${q.source_question_number}`);}
 for(const q of rows){assert.ok(q.explanation.length>200);assert.ok((q.explanation.match(/^### /gm)||[]).length>=3);}
});
test('question text, mathematical options and explanations render without errors',()=>{
 const{renderMathToHtml}=load('lib/renderMath.ts');for(const q of rows)for(const s of[q.question_text,...q.options,q.explanation])assert.doesNotMatch(renderMathToHtml(s),/katex-error/,`Q${q.source_question_number}: ${s}`);
});
test('26 question diagrams/tables and 16 graphical options use EC 2025 storage',()=>{
 assert.equal(rows.filter(q=>q.figure).length,26);assert.equal(rows.reduce((s,q)=>s+q.option_images.filter(Boolean).length,0),16);assert.deepEqual(rows.filter(q=>q.option_images.length).map(q=>q.source_question_number),[5,15,56,57]);
 for(const q of rows)for(const a of[q.figure,...q.option_images].filter(Boolean)){assert.match(a.url,/question-images\/gate-ec-2025\//);const p=fs.readFileSync(path.join(root,'public',a.local_url));assert.equal(p.subarray(1,4).toString(),'PNG');assert.ok(a.width>0&&a.height>0);}
});

test('Q8 elimination simulation, original diagram and editorial provenance',()=>{
 const q=rows[7],archived=JSON.parse(fs.readFileSync(path.join(paper,'q08-original-before-editorial-correction.json'),'utf8'));
 assert.deepEqual(q.figure,archived.figure);assert.deepEqual(q.options,archived.options);assert.equal(q.question_text,archived.question_text.replace('After round 4, the 4th student behind U leaves.','After round 4, the 4th student behind V leaves.'));assert.equal(q.source_metadata.official_answer_key,'MTA');
 let circle=['P','R','T','Q','S','V','U','W'],removed=[];
 for(const[reference,count]of[['P',4],['Q',5],['V',3],['V',4]]){const idx=(circle.indexOf(reference)-count%circle.length+circle.length)%circle.length;removed.push(circle.splice(idx,1)[0]);}
 assert.deepEqual(removed,['S','U','R','W']);assert.deepEqual(circle,['P','T','Q','V']);assert.deepEqual(q.source_metadata.editorial_correction.eliminations,removed);
 const crypto=require('node:crypto');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(paper,'images/q08-figure.png'))).digest('hex'),JSON.parse(fs.readFileSync(path.join(paper,'manifest.json'),'utf8')).verification.q8_original_image_sha256);
});
