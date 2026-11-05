const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/ME-mechanical-engineering'),paper=path.join(base,'papers/2024/ME');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
test('ME 2024 contains 65 ordered questions, 100 marks and the requested batches',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(k=>rows.filter(q=>q.question_type===k).length),[39,2,24]);
 for(const [a,b,total] of [[1,10,15],[11,30,20],[31,65,65]]){const batch=JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`)));assert.deepEqual(batch,rows.slice(a-1,b));assert.equal(batch.reduce((s,q)=>s+q.marks,0),total);}
 for(const q of rows){assert.equal(q.marks,q.source_question_number<=5||(q.source_question_number>=11&&q.source_question_number<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'&&!q.marks_to_all?q.marks/3:0);assert.equal(q.organising_institute,'IISc Bengaluru');assert.equal(q.source_metadata.key_page,q.source_question_number<=30?1:2);}
});
test('MCQ and MSQ answers match independently transcribed final key',()=>{
 const letters='AACADBM C A M DCDDBCBAMADCBCAA B C A D D C A M C A B A A'.replace(/ /g,'');
 assert.equal(letters.length,39);
 for(let i=0;i<39;i++){assert.equal(rows[i].answer_key,letters[i]==='M'?'MTA':letters[i],`Q${i+1}`);if(letters[i]!=='M')assert.equal(rows[i].correct_option,letters.charCodeAt(i)-64);}
 assert.deepEqual(rows[39].correct_options,[1,2,4]);assert.deepEqual(rows[40].correct_options,[3,4]);
 assert.deepEqual(rows.filter(q=>q.marks_to_all).map(q=>q.source_question_number),[7,10,19,34,63]);
});
const ranges={42:[25,25],43:[-1.4,-1.38],44:[.38,.39],45:[40,40],46:[58,61],47:[1620,1620],48:[6,6],49:[.590,.633],50:[2720,2740],51:[.5,.5],52:[15,16],53:[9,9.5],54:[11.3,12.7],55:[29,31],56:[4.3,4.7],57:[12.3,12.7],58:[37,38],59:[115,119],60:[21,22.5],61:[1,1],62:[19.84,19.92],64:[2.2,2.65],65:[12300,12300]};
test('official numerical limits and explicit three-decimal exception are retained',()=>{
 for(const [n,r] of Object.entries(ranges)){const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],r);assert.equal(q.answer_decimal_places,+n===49?3:2);assert.deepEqual(q.options,[]);}
 assert.equal(rows[62].answer_min,null);assert.equal(rows[62].answer_max,null);
});
test('independent calculations verify all 23 keyed NAT answers',()=>{
 const pi=Math.PI,sy=4*100000/(pi*50**2),tau=16*600000/(pi*50**3),n=Math.log(100/60)/Math.log(6);
 const values={42:24*(25/24),43:-2*Math.log(2),44:2*Math.log(2)-1,45:100*((1250-800)-(550-300))/(1250-(550+800-600)),46:.287*(350+273.15)/3,47:150*(300/1000)+150*(1-300/1000)*300/20,48:(.02/2+200*(110-150)/(1e8*.02))*1000,49:430*2326/(20000*4*20),50:5.67e-8*(1200**4-300**4)/(.3/(.7*18*pi)+1/(9*pi))/1000,51:.5,52:20*67/(19+67),53:100*1.2**2/(9*Math.sqrt(3)),54:7*Math.tan(pi/3),55:Math.sqrt(6*1500/10),56:300/Math.sqrt(sy**2+3*tau**2),57:10*.75+20*.25,58:(6*87.5-3*100)/6,59:.2*1500*Math.exp(-.3*pi),60:60*(.75)**(1/n),61:(20/6/(10/3))**2,62:20-2*.04*2,64:(100+Math.sqrt(2*98))/(.1*8*20000/(100*pi)),65:300*(11+7+14+9)};
 assert.equal(Object.keys(values).length,23);for(const [n,v] of Object.entries(values))assert.ok(v>=ranges[n][0]-1e-9&&v<=ranges[n][1]+1e-9,`Q${n}: ${v}`);
});
test('diagram-only crops and graphical choices have real PNG assets',()=>{
 assert.equal(rows.filter(q=>q.figure).length,20);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),8);
 for(const q of rows){assert.equal(q.option_images.length,[17,41].includes(q.source_question_number)?4:0);if(q.question_type!=='NAT')for(let i=0;i<4;i++)assert.ok(q.options[i]||q.option_images[i]);for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){const b=fs.readFileSync(path.join(root,'public',f.local_url));assert.equal(b.subarray(1,4).toString(),'PNG');assert.ok(f.width>0&&f.height>0);}}
});
test('actual grader honours five MTA questions, MSQ and strict numerical precision',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const q of rows.filter(q=>q.marks_to_all))for(const r of [null,'','-99'])assert.equal(gradeResponse(q,r),true);
 assert.equal(gradeResponse(rows[39],[1,2,4]),true);assert.equal(gradeResponse(rows[39],[1,2]),false);
 assert.equal(gradeResponse(rows[42],'-1.40'),true);assert.equal(gradeResponse(rows[42],'-1.38'),true);assert.equal(gradeResponse(rows[42],'-1.399'),false);
 assert.equal(gradeResponse(rows[48],'0.625'),true);assert.equal(gradeResponse(rows[48],'0.6251'),false);
 assert.equal(gradeResponse(rows[41],'25'),true);assert.equal(gradeResponse(rows[41],'25.01'),false);
});
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
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
