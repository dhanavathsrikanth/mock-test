const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EC-electronics-and-communication-engineering'),paper=path.join(base,'papers/2023/EC'),rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('2023 complete numbering, official type counts, marks and batches',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[45,4,16]);
 for(const [a,b]of[[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`),'utf8')),rows.slice(a-1,b));
 for(const q of rows){const n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.source_metadata.session,4);assert.equal(q.source_metadata.original_question_number,n);assert.equal(q.source_metadata.key_page,n<=45?1:2);assert.equal(q.organising_institute,'IIT Kanpur');assert.equal(q.negative_marks,q.question_type==='MCQ'&&!q.marks_to_all?q.marks/3:0);}
});
test('independently read MCQ/MSQ keys and exact-set grading',()=>{
 const keys={1:'C',2:'A',3:'C',4:'C',5:'C',6:'D',7:'A',8:'B',9:'A',10:'C',11:'C',12:'B',13:'A',14:'B',15:'C',16:'A',17:'A',18:'D',19:'B',20:'D',21:'D',23:'A',24:'A',25:'A',26:'B',27:'B',28:'C',29:'B',36:'B',37:'B',38:'A',39:'A',40:'A',41:'A',42:'A',43:'A',44:'B',45:'B',47:'A',48:'C',49:'A',50:'D',51:'A'};
 for(const[n,k]of Object.entries(keys))assert.equal(rows[n-1].correct_option,k.charCodeAt()-64,`Q${n}`);
 const{gradeResponse}=load('lib/question-response.ts');for(const[n,set]of Object.entries({30:[1,2],52:[2,3],53:[1,2,4],54:[2,3,4]})){assert.deepEqual(rows[n-1].correct_options,set);for(let mask=0;mask<16;mask++){const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));assert.equal(gradeResponse(rows[n-1],chosen),chosen.length?JSON.stringify(chosen)===JSON.stringify(set):null);}}
});
test('user-corrected MTA questions no longer receive automatic marks',()=>{
 const{gradeResponse}=load('lib/question-response.ts');assert.deepEqual(rows.filter(q=>q.marks_to_all).map(q=>q.source_question_number),[]);for(const n of[]){assert.equal(gradeResponse(rows[n-1],null),true);assert.equal(rows[n-1].correct_option,null);assert.equal(rows[n-1].negative_marks,0);}
});
test('all numerical results independently recomputed with official intervals and precision',()=>{
 const ranges={31:[10,10],32:[1.3,1.4],33:[80,80],34:[2,2],35:[4,4],55:[0,0],56:[2.2,2.3],57:[4,4],58:[15,15],59:[.24,.26],60:[.12,.14],61:[60,70],62:[8.3,8.34],63:[250,250],64:[2,2],65:[1.97,1.99]};
 const values={31:(61.96-1.76)/6.02,32:15/11,33:1/(1/75-.0001/.12),34:2*1,35:2*2,55:0,56:1.5**2,57:1+1+2,58:3*(2+2+1),59:.5/2,60:.75/(4*Math.sqrt(2)),61:1e6*(4/3)**1.5*Math.exp(-.35/(.026*4/3)),62:12*Math.log(2),63:1000/4,64:(7-5)*1,65:[.5,.25,.125,1/16,1/32,1/64,1/128,1/128].reduce((s,p,i)=>s+p*Math.min(i+1,7),0)};
 const{gradeResponse}=load('lib/question-response.ts');assert.equal(Object.keys(values).length,16);for(const[n,v]of Object.entries(values)){const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],ranges[n]);assert.equal(gradeResponse(q,Number(v.toFixed(q.answer_decimal_places)).toString()),true,`Q${n}: ${v}`);assert.equal(q.options.length,0);}
 const q=rows[62];assert.equal(gradeResponse(q,'250'),true);assert.equal(gradeResponse(q,'500'),true);assert.equal(gradeResponse(q,'300'),false);assert.equal(gradeResponse(q,'250.1'),false);assert.equal(gradeResponse(rows[31],'1.364'),false);
});
test('independent circuit, vector, state and spectral calculations',()=>{
 assert.equal((2*1+1*2+3*0)/(4+1+9),2/7);assert.equal((2*2)/3,4/3);assert.equal((2*1+27)-(1*4+1),24);assert.equal(-(.2+.8),-1);
 // Nodal equations for Q32: two-node KCL, not a copied key.
 let[a,b]=[7/11,3/11];assert.ok(Math.abs(2*a-b-1)<1e-12);assert.ok(Math.abs(6*b-a-1)<1e-12);
 // Simultaneous flip-flop updates for Q63.
 let states=[],q1=1,q2=0;for(let n=0;n<5;n++){states.push([q1,q2]);[q1,q2]=[q2,1-q1];}assert.deepEqual(states,[[1,0],[0,0],[0,1],[1,1],[1,0]]);
 // Q48 polynomial convolution and Q47 Fourier synthesis.
 const x=[1,-1,0,2],h=[1,0,-.5],y=Array(6).fill(0);x.forEach((v,i)=>h.forEach((w,j)=>y[i+j]+=v*w));assert.deepEqual(y,[1,-1,-.5,2.5,0,-1]);
 let sum=0;for(let n=0;n<5;n++){let xn=1-6*Math.sin(2*Math.PI*n/5)-4*Math.sin(4*Math.PI*n/5);sum+=xn*Math.sin(4*Math.PI*n/5);}assert.ok(Math.abs(sum+10)<1e-12);
});
test('all technical taxonomy paths exist and questions have worked solutions',()=>{
 const tax=JSON.parse(fs.readFileSync(path.join(base,'syllabus/2027/taxonomy.json'),'utf8')).subjects;
 for(const q of rows.slice(10)){assert.ok(tax[q.subject][q.topic]);if(q.subtopic){assert.ok(tax[q.subject][q.topic][q.subtopic]);if(q.sub_subtopic)assert.ok(tax[q.subject][q.topic][q.subtopic].includes(q.sub_subtopic));}}
 for(const q of rows){assert.ok(q.explanation.length>200);assert.ok((q.explanation.match(/^### /gm)||[]).length>=3);}
});
test('all question, option and solution math renders without errors',()=>{
 const{renderMathToHtml}=load('lib/renderMath.ts');for(const q of rows)for(const text of[q.question_text,...q.options,q.explanation])assert.doesNotMatch(renderMathToHtml(text),/katex-error/,`Q${q.source_question_number}: ${text}`);
});
test('22 original figures and 14 graphical options with correct positions',()=>{
 assert.equal(rows.filter(q=>q.figure).length,22);assert.equal(rows.reduce((s,q)=>s+q.option_images.filter(Boolean).length,0),14);for(const q of rows){for(const image of[q.figure,...q.option_images].filter(Boolean)){assert.match(image.url,/question-images\/gate-ec-2023\//);const png=fs.readFileSync(path.join(root,'public',image.local_url));assert.equal(png.subarray(1,4).toString(),'PNG');}if(q.question_type!=='NAT')assert.equal(q.options.length,4);}
 assert.deepEqual(rows[29].option_images.slice(0,2),[null,null]);assert.ok(rows[29].options[0].includes('omega'));assert.match(rows[29].option_images[2].url,/option-3/);assert.match(rows[29].option_images[3].url,/option-4/);
});

test('Q22 editorial replacement uses D and normal one-mark MCQ scoring',()=>{const q=rows[21],{gradeResponse}=load('lib/question-response.ts');assert.match(q.question_text,/negative unity-gain/);assert.equal(q.source_metadata.official_answer_key,'MTA');assert.equal(q.source_metadata.editorial_correction.user_authorized,true);assert.equal(q.marks_to_all,false);assert.equal(q.correct_option,4);assert.equal(q.marks,1);assert.equal(q.negative_marks,1/3);for(let i=1;i<=4;i++)assert.equal(gradeResponse(q,i),i===4);assert.equal(gradeResponse(q,null),null);assert.ok(q.options.every(o=>o.includes('open-loop')));});

test('Q46 corrected diagram and A-only grading',()=>{const q=rows[45],{gradeResponse}=load('lib/question-response.ts');assert.equal(q.correct_option,1);assert.equal(q.marks_to_all,false);assert.equal(q.marks,2);assert.equal(q.negative_marks,2/3);assert.equal(q.source_metadata.official_answer_key,'MTA');assert.match(q.figure.url,/q46-corrected-h-parameter.png$/);assert.equal(gradeResponse(q,null),null);for(let i=1;i<=4;i++)assert.equal(gradeResponse(q,i),i===1);assert.match(q.explanation,/singular/);assert.match(q.explanation,/absolute values/);});
