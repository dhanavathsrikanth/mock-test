const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/ME-mechanical-engineering'),paper=path.join(base,'papers/2026/ME');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('2026 has 65 questions, 100 marks and the requested batches',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[45,0,20]);assert.equal(rows.filter(q=>q.marks_to_all).length,0);
 for(const [a,b,total] of [[1,10,15],[11,30,20],[31,65,65]]){const batch=JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`)));assert.deepEqual(batch,rows.slice(a-1,b));assert.equal(batch.reduce((s,q)=>s+q.marks,0),total);}
 for(const q of rows){assert.equal(q.marks,q.source_question_number<=5||(q.source_question_number>=11&&q.source_question_number<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);assert.equal(q.organising_institute,'IIT Guwahati');assert.equal(q.source_metadata.session,6);assert.equal(q.source_metadata.key_page,q.source_question_number<=37?1:2);}
});
test('MCQ letters match the independently read master answer key',()=>{
 for(let i=0;i<10;i++)assert.equal(rows[i].correct_option,'CAADCBBCBB'.charCodeAt(i)-64);
 for(const q of rows.slice(10).filter(q=>q.question_type==='MCQ'))assert.equal(q.correct_option,1,`Q${q.source_question_number}`);
});
const ranges={34:[102,105],35:[24.5,26],48:[18.5,19.5],49:[2.9,3.1],50:[4.2,4.29],51:[838,842],52:[-.61,-.57],53:[15.5,17.1],54:[2.5,2.6],55:[49.5,51.5],56:[396,406],57:[11,11.9],58:[57.5,61.5],59:[.59,.63],60:[572,572],61:[1353,1355],62:[.12,.16],63:[571,574],64:[.29,.33],65:[22,22]};
test('NAT bounds, singleton answers and disjoint alternatives are retained',()=>{
 for(const [n,r] of Object.entries(ranges)){const q=rows[n-1];assert.equal(q.question_type,'NAT');assert.deepEqual([q.answer_min,q.answer_max],r);assert.equal(q.answer_decimal_places,2);assert.deepEqual(q.options,[]);}
 assert.deepEqual(rows[51].answer_ranges,[{min:-.61,max:-.57},{min:.57,max:.61}]);
});
test('independent engineering calculations check all 20 numerical answers',()=>{
 const p=Math.PI,rad=p/180,V1=.075/(p*.15**2),V2=.075/(p*.25**2),pg=500*(V2**2-V1**2),v=.9*.001029+.1*3.4053,x=(v-.001070)/(.66808-.001070);
 const values={34:275/Math.sqrt(7),35:10*Math.log(380/30),48:25*(Math.sin(30*rad)+.3*Math.cos(30*rad)),49:1.8+1.2,50:Math.sqrt(18),51:.00034*2*.015*210e9/(3*(1-.3/2))/1000,52:9.25/15.75,53:Math.abs(75*(V2-V1)-pg*p*.15**2),54:1.5+1/(1/1.25+1/6.25),55:(10/Math.log(1.5))/(1/(80*2*p*.01)+Math.log(1.1)/(2*p*386)+1/(50*2*p*.011)),56:100/60*4.18*(225-298.15*Math.log(523.15/298.15)),57:(4.5*.001029-5*(1-x)*.00107)/(p*.15**2/4)*100,58:Math.atan(10/(10/Math.tan(15*rad)-p*600/60))*180/p,59:-Math.log(1.3*.85)/Math.log(.85),60:.7*635+.3*(.7*500+.3*250),61:Math.sqrt(2*10000*550/(.5*12)),62:Math.SQRT2/4*(4*26.98/(2.71*6.023e23))**(1/3)*1e7,63:800*Math.cos(20*rad)-150/Math.sqrt(1-(.23/.24)**2)*Math.sin(20*rad),64:Math.log(1.5)/Math.log((150/200)/(60/300)),65:4+6+7+5};
 assert.equal(Object.keys(values).length,20);
 for(const [n,v] of Object.entries(values)){const q=rows[n-1],intervals=q.answer_ranges||[{min:q.answer_min,max:q.answer_max}];assert.ok(intervals.some(r=>v>=r.min-1e-9&&v<=r.max+1e-9),`Q${n}: ${v}`);}
});
test('actual grader rejects alternative-interval gaps, rounding and extra precision',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const v of ['-.61','-.59','-.57','.57','.59','.61'])assert.equal(gradeResponse(rows[51],v),true);
 for(const v of ['0','.56','-.56','.591'])assert.equal(gradeResponse(rows[51],v),false);
 for(const [n,r] of Object.entries(ranges))for(const v of r)assert.equal(gradeResponse(rows[n-1],String(v)),true,`Q${n}`);
 assert.equal(gradeResponse(rows[59],'572'),true);assert.equal(gradeResponse(rows[59],'572.01'),false);assert.equal(gradeResponse(rows[64],'22'),true);assert.equal(gradeResponse(rows[64],'22.01'),false);assert.equal(gradeResponse(rows[49],'4.199'),false);
});
test('images contain diagrams and only graphical choices use option images',()=>{
 assert.equal(rows.filter(q=>q.figure).length,19);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),12);
 for(const q of rows){assert.equal(q.option_images.length,[3,40,44].includes(q.source_question_number)?4:0);if(q.question_type!=='NAT')for(let i=0;i<4;i++)assert.ok(q.options[i]||q.option_images[i]);for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){const b=fs.readFileSync(path.join(root,'public',f.local_url));assert.equal(b.subarray(1,4).toString(),'PNG');assert.ok(f.width>0&&f.height>0);}}
});
test('technical classifications reference actual third-level ME syllabus leaves',()=>{
 const tax=JSON.parse(fs.readFileSync(path.join(base,'syllabus/2027/taxonomy.json'),'utf8')).subjects;
 for(const q of rows.slice(10))assert.ok(tax[q.subject][q.topic][q.subtopic].includes(q.sub_subtopic),`Q${q.source_question_number}`);
 for(const q of rows.slice(0,10))assert.equal(q.subject,'General Aptitude');
});
test('statements, choices and structured explanations render with the actual math renderer',()=>{
 const {renderMathToHtml}=load('lib/renderMath.ts');
 for(const q of rows){
  assert.ok(q.explanation.length>200);assert.ok((q.explanation.match(/^### /gm)||[]).length>=2);
  const texts=[q.question_text,...q.options,...q.explanation.split(/\n(?=### )/).map(s=>s.replace(/^### [^\n]+\n/,''))];
  for(const text of texts){
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true,displayMode:!!m[1]}),`Q${q.source_question_number}`);
   assert.doesNotMatch(renderMathToHtml(text),/katex-error/,`Q${q.source_question_number}`);
  }
 }
});


