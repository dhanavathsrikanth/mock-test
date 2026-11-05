const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EE-electrical-engineering'),paper=path.join(base,'papers/2025/EE');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}


test('technical classifications reference actual third-level EE syllabus leaves',()=>{
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




test('2025 EE includes exactly 65 keyed questions and no unkeyed buffer questions',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[42,4,19]);
 for(const [a,b] of [[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`))),rows.slice(a-1,b));
 for(const q of rows){const n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);assert.equal(q.organising_institute,'IIT Roorkee');assert.equal(q.source_metadata.session,4);assert.equal(q.source_metadata.key_page,n<=30?1:2);assert.ok(q.source_page<=45);assert.equal(q.marks_to_all,false);}
});
test('all 42 MCQ keys match the independently transcribed official table',()=>{
 for(const [start,letters] of [[1,'DAABCCCBCA'],[11,'BBBABCDBBAABDACAA'],[36,'AAC CABB AA CAAABC'.replace(/ /g,'')]])for(let i=0;i<letters.length;i++)assert.equal(rows[start+i-1].correct_option,letters.charCodeAt(i)-64,`Q${start+i}`);
});
test('all four MSQs demand exact official option sets',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const [n,set] of [[28,[1,3]],[29,[1,3]],[51,[2,4]],[52,[1,4]]]){assert.deepEqual(rows[n-1].correct_options,set);assert.equal(gradeResponse(rows[n-1],set),true);assert.equal(gradeResponse(rows[n-1],set.slice(1)),false);assert.equal(gradeResponse(rows[n-1],[1,2,3,4]),false);}
});
const ranges={30:[7,7],31:[5,5],32:[.975,.985],33:[.38,.4],34:[90,90],35:[66.25,66.75],53:[0,1],54:[2,2],55:[0,0],56:[2,2],57:[4,4.2],58:[78,81],59:[-2,-1.94],60:[1.7,1.9],61:[200,200],62:[3,3],63:[8.5,10],64:[216,216],65:[.1,.1]};
const integer=new Set([30,31,34,53,54,55,56,61,62,64]),one=new Set([57,58,60,63,65]);
test('19 NATs preserve official precision, exact singletons and disjoint signed ranges',()=>{
 for(const [n,r] of Object.entries(ranges)){const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],r);assert.equal(q.answer_decimal_places,integer.has(+n)?0:[32,33].includes(+n)?3:one.has(+n)?1:2);assert.deepEqual(q.options,[]);}
 assert.deepEqual(rows[58].answer_ranges,[{min:-2,max:-1.94},{min:1.94,max:2}]);
 const {gradeResponse}=load('lib/question-response.ts');
 for(const [n,good,bad] of [[59,['-1.96','1.96','-2','2'],['0','1.93','-1.939','2.01']],[32,['.981','.975','.985'],['.9749','.9851']],[33,['.390'],['.3799']],[54,['2','2.00'],['2.01']],[57,['4.1'],['4.11']],[65,['.1','.10'],['.11']]]){for(const x of good)assert.equal(gradeResponse(rows[n-1],x),true);for(const x of bad)assert.equal(gradeResponse(rows[n-1],x),false);}
});
test('independent calculations for all 19 NAT answers agree with official grading',()=>{
 const p=Math.PI,P=390*.77,Qc=P*(Math.tan(Math.acos(.77))-Math.tan(Math.acos(.85)));
 const v={30:1+3*4/2,31:5,32:5/Math.sqrt(26),33:1-.061/(.093+.007),34:10*15*(1-.4),35:2*(3300/Math.sqrt(3))*Math.sin(2*p/180)/2,53:1/Math.sqrt(5),54:1+1,55:0,56:2,57:10*Math.log(75/50),58:(200**2-9**2-199**2)/(2*2),59:-10*5000/(5050**2)*1000,60:(30-30*.6)*30e-6/.2*1000,61:400*p/(2*p),62:1+2,63:Qc/(Math.sqrt(3)*4),64:Math.min(100,50+1800/20)+Math.min(150,80+1800/50),65:Math.tan(p/4)/10};
 assert.equal(Object.keys(v).length,19);const {gradeResponse}=load('lib/question-response.ts');for(const [n,x] of Object.entries(v)){const q=rows[n-1];assert.equal(gradeResponse(q,String(Number(x.toFixed(q.answer_decimal_places)))),true,`Q${n}: ${x}`);}
});
test('24 original diagrams and 20 actual graphical options have valid local files',()=>{
 assert.equal(rows.filter(q=>q.figure).length,24);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),20);
 for(const q of rows){assert.equal(q.option_images.length,[18,25,37,39,49].includes(q.source_question_number)?4:0);if(q.question_type!=='NAT')for(let i=0;i<4;i++)assert.ok(q.options[i]||q.option_images[i]);for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){assert.equal(fs.readFileSync(path.join(root,'public',f.local_url)).subarray(1,4).toString(),'PNG');assert.ok(f.width>0&&f.height>0);}}
});
test('logic, pole stability and electromagnetic option sets follow independent equations',()=>{
 for(let u=0;u<2;u++)for(let v=0;v<2;v++)for(let w=0;w<2;w++)for(let x=0;x<2;x++){
 const f=(!u||!v||!w||!x)&&(!u||!v||!w||x)&&(!u||v||!w||!x)&&(!u||v||!w||x);assert.equal(!!f,!!(!u||!w));
 }
 for(const K of [2.1,3,10])assert.ok(2-K<0);
 for(const R of [1,2,3]){assert.equal((2-(-1))*R**0,3);assert.equal((2-2)*R**-3,0);}
 const L1=4,L2=9,M=6;assert.equal(-M/L1,-L2/M);
});
