const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EE-electrical-engineering'),paper=path.join(base,'papers/2026/EE');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('65 independently sourced EE questions, official marks and types',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[47,5,13]);
 for(const q of rows){const n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);assert.equal(q.organising_institute,'IIT Guwahati');assert.equal(q.source_metadata.session,5);assert.equal(q.source_metadata.key_page,n<=38?1:2);assert.equal(q.marks_to_all,false);}
 for(const [a,b] of [[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`))),rows.slice(a-1,b));
});
test('technical classifications exist in the mapped EE syllabus',()=>{
 const tax=JSON.parse(fs.readFileSync(path.join(base,'syllabus/2027/taxonomy.json'),'utf8')).subjects;
 for(const q of rows.slice(10)){const leaves=tax[q.subject][q.topic][q.subtopic];assert.ok(leaves);if(q.sub_subtopic!==null)assert.ok(leaves.includes(q.sub_subtopic),`Q${q.source_question_number}`);else assert.equal(q.source_question_number,14);}
});
test('all statements, mathematical choices and worked solutions render',()=>{
 const {renderMathToHtml}=load('lib/renderMath.ts');let expressions=0;
 for(const q of rows){assert.ok(q.explanation.length>200);assert.ok((q.explanation.match(/^### /gm)||[]).length>=2);
  for(const text of [q.question_text,...q.options,q.explanation]){for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g)){assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true,displayMode:!!m[1]}),`Q${q.source_question_number}`);expressions++;}assert.doesNotMatch(renderMathToHtml(text),/katex-error/,`Q${q.source_question_number}`);}
 }assert.ok(expressions>300);
});
test('47 MCQ keys match the official key transcription',()=>{
 for(const [start,letters] of [[1,'AAACBABABD'],[11,'CDAACBCBDBACBBABCBA'],[36,'BAD DAD CBCBD BCAAADC'.replace(/ /g,'')]])for(let i=0;i<letters.length;i++)assert.equal(rows[start+i-1].correct_option,letters.charCodeAt(i)-64,`Q${start+i}`);
});
test('five MSQs require the exact official sets',()=>{
 const {gradeResponse}=load('lib/question-response.ts');for(const [n,set] of [[30,[1,2,4]],[31,[1]],[54,[1,4]],[55,[1,2,4]],[56,[1,2,3]]]){assert.deepEqual(rows[n-1].correct_options,set);assert.equal(gradeResponse(rows[n-1],set),true);assert.notEqual(gradeResponse(rows[n-1],set.slice(1)),true);assert.equal(gradeResponse(rows[n-1],[1,2,3,4]),false);}
});
const ranges={32:[0,0],33:[47.5,48],34:[32.3,32.5],35:[0,0],57:[750,750],59:[.09,.09],60:[2.81,2.91],61:[1.04,1.14],62:[25,25.6],63:[.38,.42],64:[.1,.1],65:[.25,.25]};
test('NAT ranges and requested precision are exact; Q58 uses approved exact-answer practice grading',()=>{
 const {gradeResponse}=load('lib/question-response.ts');for(const [n,r] of Object.entries(ranges)){const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],r);assert.deepEqual(q.options,[]);assert.equal(q.answer_decimal_places,[35,57].includes(+n)?0:[32,33,34,64].includes(+n)?1:2);assert.equal(gradeResponse(q,String(r[0])),true);assert.equal(gradeResponse(q,String(r[1]+1)),false);}
 const q=rows[57];assert.equal(q.marks_to_all,false);assert.equal(q.answer_min,20);assert.equal(q.answer_max,20);assert.equal(q.answer_decimal_places,1);for(const response of ['20','20.0','20.00'])assert.equal(gradeResponse(q,response),true);for(const response of ['19.9','20.1','19.995','20.01'])assert.equal(gradeResponse(q,response),false);assert.equal(gradeResponse(q,null),null);assert.equal(q.source_metadata.official_answer_key,'MTA');
 assert.equal(gradeResponse(rows[58],'.091'),false);assert.equal(gradeResponse(rows[64],'.2500'),true);
});
test('independent calculations for all 13 numerically graded NATs',()=>{
 const p=Math.PI,v={32:0,33:4.8/10*100,34:325/Math.hypot(10,2*p*50*.0005),35:0,57:500*3000/2000,58:.001*(27.275/.1425-50)**2,59:.27/((1500-1404)/(1500-1476)-1),60:10*4/14,61:(200*Math.cos(p/6)-50*2*p/3)/(20*p),62:18*p/Math.sqrt(5),63:32/4*(1/4-1/5),64:.9/9,65:.25};
 const {gradeResponse}=load('lib/question-response.ts');for(const [n,x] of Object.entries(v)){const q=rows[n-1];assert.equal(gradeResponse(q,String(Number(x.toFixed(q.answer_decimal_places)))),true,`Q${n}: ${x}`);}
});
test('31 diagrams and eight graphical choices are separate EE crops',()=>{
 assert.equal(rows.filter(q=>q.figure).length,31);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),8);
 for(const q of rows){assert.equal(q.option_images.length,[2,5].includes(q.source_question_number)?4:0);for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){assert.ok(f.url.includes('/question-images/gate-ee-2026/'));assert.equal(fs.readFileSync(path.join(root,'public',f.local_url)).subarray(1,4).toString(),'PNG');assert.ok(f.width>0&&f.height>0);}}
});
test('logic and switching answers agree with circuit equations',()=>{
 for(let x=0;x<=1;x++)for(let y=0;y<=1;y++)for(let z=0;z<=1;z++)assert.equal(Number(!(x||y||z)&&(!x&&(y||z))),0);
 for(let a=0;a<=1;a++)for(let b=0;b<=1;b++)for(let c=0;c<=1;c++)assert.equal(Number(!((a&&b)||!c)),Number(!(a&&b)&&c));
 assert.ok(Math.abs((28-20*Math.exp(-2.5))-26.3583)<.0001);assert.ok(Math.abs(5/Math.sqrt(6)-2.04)<.002);assert.equal(.5*.5*6*10*.5,7.5);
});
test('Q58 editorial units and approximate hint agree with exact optimal dispatch',()=>{
 const q=rows[57],p2=191.41209341653166,loss=.001*(p2-50)**2,p1=1184+loss-p2,lambda=50+.02*p1;
 assert.ok(Math.abs(50+.002*p2-lambda*(1-.002*(p2-50)))<1e-9);
 assert.equal(loss.toFixed(1),'20.0');assert.equal(lambda.toFixed(2),'70.25');
 assert.match(q.question_text,/Rs\/h/);assert.match(q.question_text,/lambda\\approx70\.25/);
 assert.equal(q.source_metadata.editorial_revision.official_grading_preserved,false);
 assert.equal(q.source_metadata.editorial_revision.worked_answer,20);
 assert.equal(q.marks_to_all,false);assert.match(q.figure.url,/q58-figure\.png$/);
});
