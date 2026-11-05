const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EC-electronics-and-communication-engineering'),paper=path.join(base,'papers/2024/EC'),rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('65 questions, 100 marks, official types, source pages and batch coverage',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[39,8,18]);
 for(const[a,b]of[[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`),'utf8')),rows.slice(a-1,b));
 for(const q of rows){const n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.source_metadata.key_page,n<=29?1:2);assert.equal(q.source_metadata.session,7);assert.equal(q.source_metadata.original_question_number,n);assert.equal(q.organising_institute,'IISc Bengaluru');assert.equal(q.negative_marks,q.question_type==='MCQ'&&!q.marks_to_all?q.marks/3:0);}
});
test('MCQ keys independently transcribed from official final key',()=>{
 const keys={1:'A',2:'A',3:'B',4:'C',5:'A',6:'C',7:'D',8:'C',9:'A',10:'A',11:'A',12:'A',13:'D',15:'A',16:'B',17:'A',18:'A',19:'A',20:'A',21:'A',22:'A',23:'A',36:'A',37:'A',38:'B',39:'A',40:'B',41:'B',42:'B',43:'D',45:'B',46:'B',47:'A',49:'D',50:'B',51:'B'};
 for(const[n,k]of Object.entries(keys))assert.equal(rows[n-1].correct_option,k.charCodeAt()-64,`Q${n}`);
 const{gradeResponse}=load('lib/question-response.ts');assert.deepEqual(rows.filter(q=>q.marks_to_all).map(q=>q.source_question_number),[14,44,48]);for(const n of[14,44,48]){assert.equal(gradeResponse(rows[n-1],null),true);assert.equal(rows[n-1].correct_option,null);assert.equal(rows[n-1].negative_marks,0);}
});
test('all MSQ combinations including corrected Q56 fundamental-period answer',()=>{
 const{gradeResponse}=load('lib/question-response.ts');const sets={24:[[1,3,4]],25:[[1,3]],26:[[1,2,3]],52:[[1,3,4]],53:[[1,3]],54:[[1,2,4]],55:[[1,2]],56:[[1,4]]};
 for(const[n,answers]of Object.entries(sets)){const q=rows[n-1];assert.deepEqual(q.correct_options,answers[0]);if(answers.length>1)assert.deepEqual(q.correct_option_sets,answers);for(let mask=0;mask<16;mask++){const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));assert.equal(gradeResponse(q,chosen),chosen.length?answers.some(a=>JSON.stringify(a)===JSON.stringify(chosen)):null,`Q${n} mask ${mask}`);}}
});
test('all 18 NAT results independently calculated and accepted at source precision',()=>{
 const intervals={27:[2047,2047],28:[2.49,2.51],29:[11,11],30:[5,5],31:[2,2],32:[.75,.75],33:[.5,.5],34:[4,4],35:[.25,.25],57:[45,45.3],58:[200,200],59:[112,112],60:[1.5,1.5],61:[4.1,4.5],62:[2.5,2.5],63:[.17,.19],64:[52.4,52.6],65:[4,4.26]};
 const values={27:2**(32-6-3*5)-1,28:Math.sqrt(50/8),29:55/5,30:70/14,31:2,32:3/(2+2),33:.5,34:Math.log2(16),35:5*10e-6*(10-5)*1000,57:10*Math.log10((2/3)/( (4/256)**2/12)),58:50*(1+.6)/(1-.6),59:16*(1+2+1+3),60:-1/2+8/4,61:4.6-1e-8/(4*8.85e-14/1e-5),62:1/(1/5+(1-3/5)/2),63:.25-.02*Math.log(38),64:50*(5/(50*.1)+.1/2),65:1e6/(11*Math.exp(10)-1)};
 const{gradeResponse}=load('lib/question-response.ts');for(const[n,v]of Object.entries(values)){const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],intervals[n]);assert.equal(gradeResponse(q,Number(v.toFixed(q.answer_decimal_places)).toString()),true,`Q${n}: ${v}`);assert.deepEqual(q.options,[]);}
 assert.equal(gradeResponse(rows[34],'.250'),true);assert.equal(gradeResponse(rows[34],'.251'),false);assert.equal(gradeResponse(rows[31],'.751'),false);
});
test('independent CRC, toggle states, periodicity and state-space transfer checks',()=>{
 const bits='1110101010000'.split('').map(Number),g=[1,0,0,1,1];for(let i=0;i<=bits.length-g.length;i++)if(bits[i])for(let j=0;j<g.length;j++)bits[i+j]^=g[j];assert.equal(bits.slice(-4).join(''),'1100');
 let a=1,b=1,states=[];for(let i=0;i<5;i++){states.push(`${a}${b}`);const ta=a||!b,tb=a||b;[a,b]=[a^Number(ta),b^Number(tb)];}assert.deepEqual(states,['11','00','10','01','00']);
 for(const[p,q,period]of[[3,40,40],[9,80,80],[3,20,20],[9,40,40]]){assert.ok(Math.abs(Math.sin(Math.PI*p*period/q))<1e-12);}
 // Numerical transfer comparisons for Q53, at several non-pole s values.
 for(const s of[0,.5,2,3]){const ref=(2*s+1)/((s+1)*(s+2));assert.ok(Math.abs(ref-(-1/(s+1)+3/(s+2)))<1e-12);assert.ok(Math.abs(ref-(1/(s+1)+2/(s+2)))>1e-4);}
});
test('mapped taxonomy and headed worked explanations for all questions',()=>{
 const tax=JSON.parse(fs.readFileSync(path.join(base,'syllabus/2027/taxonomy.json'),'utf8')).subjects;for(const q of rows.slice(10)){assert.ok(tax[q.subject][q.topic]);if(q.subtopic){assert.ok(tax[q.subject][q.topic][q.subtopic]);if(q.sub_subtopic)assert.ok(tax[q.subject][q.topic][q.subtopic].includes(q.sub_subtopic));}if(!q.sub_subtopic)assert.ok(q.source_metadata.classification_note);}
 for(const q of rows){assert.ok(q.explanation.length>200);assert.ok((q.explanation.match(/^### /gm)||[]).length>=3);}
});
test('all editable statements, formulas, options and explanations render correctly',()=>{
 const{renderMathToHtml}=load('lib/renderMath.ts');for(const q of rows)for(const t of[q.question_text,...q.options,q.explanation])assert.doesNotMatch(renderMathToHtml(t),/katex-error/,`Q${q.source_question_number}: ${t}`);
});
test('23 diagram-only question assets and 8 graphical choices in separate year folder',()=>{
 assert.equal(rows.filter(q=>q.figure).length,23);assert.equal(rows.reduce((s,q)=>s+q.option_images.filter(Boolean).length,0),8);assert.deepEqual(rows.filter(q=>q.option_images.length).map(q=>q.source_question_number),[9,22]);for(const q of rows)for(const a of[q.figure,...q.option_images].filter(Boolean)){assert.match(a.url,/question-images\/gate-ec-2024\//);const png=fs.readFileSync(path.join(root,'public',a.local_url));assert.equal(png.subarray(1,4).toString(),'PNG');}
});

test('Q56 editorial correction keeps official provenance and excludes C',()=>{const q=rows[55];assert.match(q.question_text,/fundamental period/);assert.match(q.question_text,/A\\ne0/);assert.equal(q.correct_option_sets,null);assert.equal(q.source_metadata.official_answer_key,'A;D OR A;C;D');assert.equal(q.source_metadata.editorial_correction.user_authorized,true);assert.deepEqual(q.options,['$0.15\\pi$','$0.225\\pi$','$0.3\\pi$','$0.45\\pi$']);});
