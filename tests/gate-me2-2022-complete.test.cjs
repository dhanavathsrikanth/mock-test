const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/ME-mechanical-engineering'),paper=path.join(base,'papers/2022/ME2');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('ME2 2022 has all 65 questions, 100 marks and three requested batches',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(k=>rows.filter(q=>q.question_type===k).length),[35,6,24]);
 for(const [a,b,total] of [[1,10,15],[11,30,20],[31,65,65]]){
  const batch=JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`),'utf8'));assert.deepEqual(batch,rows.slice(a-1,b));assert.equal(batch.reduce((s,q)=>s+q.marks,0),total);
 }
 for(const q of rows){assert.equal(q.marks,q.source_question_number<=5||(q.source_question_number>=11&&q.source_question_number<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'&&!q.marks_to_all?q.marks/3:0);assert.equal(q.organising_institute,'IIT Kharagpur');assert.equal(q.source_metadata.session,8);}
});
test('MCQ letters and both official alternative answer sets are preserved',()=>{
 const ga='BCCABCCAAB',technical='BADBBBAADAADBBC',latter='CAAACBBDCB';
 for(let i=0;i<10;i++)assert.equal(rows[i].correct_option,ga.charCodeAt(i)-64,`Q${i+1}`);
 for(let i=0;i<15;i++)assert.equal(rows[i+10].correct_option,technical.charCodeAt(i)-64,`Q${i+11}`);
 for(let i=0;i<10;i++)assert.equal(rows[i+35].correct_option,latter.charCodeAt(i)-64,`Q${i+36}`);
 for(const [n,set] of [[26,[2,3,4]],[27,[1,2]],[28,[2,3,4]],[29,[2,3,4]],[46,[2,3]],[47,[2,4]]])assert.deepEqual(rows[n-1].correct_options,set);
 assert.deepEqual(rows[4].correct_option_sets,[[2],[3]]);assert.deepEqual(rows[26].correct_option_sets,[[1,2],[2]]);
 assert.ok(rows.every(q=>!q.marks_to_all));
});
const ranges={30:[3,3],31:[1.95,2.05],32:[104,104],33:[13,15],34:[2,2],35:[4825,4835],48:[2,2],49:[.2,.2],50:[1.48,1.52],51:[1.48,1.52],52:[1.24,1.26],53:[23.6,24.2],54:[2.4,2.6],55:[2700,2750],56:[2.29,2.33],57:[25,25],58:[2426,2432],59:[15,15],60:[385,405],61:[450,450],62:[3.48,3.7],63:[1000,1000],64:[1000,1000],65:[317,324]};
test('all NAT intervals, exact values, empty choices and two-decimal grading match the key',()=>{
 for(const [n,range] of Object.entries(ranges)){
  const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],range);assert.deepEqual(q.options,[]);assert.deepEqual(q.option_images,[]);assert.equal(q.answer_decimal_places,2);
 }
});
test('independent calculations validate all 24 numerical solutions',()=>{
 const pi=Math.PI,rad=pi/180,area=pi*100**2/4,nu=.023*85000**.8*5**.4;
 const v={30:Math.ceil(100/(20*2)),31:4*Math.exp(-Math.log(2)),32:100+.2*(120-100),33:Math.round(1000*5/365),34:(300+225/.75)/300,35:2898/.6,48:Math.sqrt(3*(4-3)+1),49:1/5,50:3/2,51:9*2/12,52:2*5/8,53:(16*Math.hypot(200000,80000)/(pi*80))**(1/3),54:10*(1000/(4*100))*100/1000,55:500/(Math.sin(15*rad)*(Math.cos(15*rad)-Math.sin(15*rad))),56:4/(2*Math.cos(30*rad)),57:500*50/1000,58:1.05*50*(.8+1.5*Math.log(area/1000)+2)*area/1000,59:5+Math.max(3,2+4)+4,60:4800*1.005*306/(4800*.718+1000*.287),61:500*(3500-2500+500*(6.3-6.5))/1000,62:(3*(.4*3.14*.02**2*8/20.8)/(4*3.14))**(1/3)*100,63:Math.sqrt(600**2+1280000/2),64:150*2400/(.9*4*100),65:200+15000*pi*.1*40/2600+15000/(nu*.08/.1)};
 assert.equal(Object.keys(v).length,24);for(const [n,x] of Object.entries(v))assert.ok(x>=ranges[n][0]-1e-9&&x<=ranges[n][1]+1e-9,`Q${n}: ${x}`);
});
test('all question diagrams and only graphical answer choices have separate PNGs',()=>{
 assert.equal(rows.filter(q=>q.figure).length,25);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),8);
 for(const q of rows){
  assert.ok(q.question_text.trim().length>30);
  assert.equal(q.option_images.length,q.source_question_number===5||q.source_question_number===2?4:0);
  if(q.question_type!=='NAT')for(let i=0;i<4;i++)assert.ok(q.options[i]||q.option_images[i]);
  for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){const b=fs.readFileSync(path.join(root,'public',f.local_url));assert.equal(b.subarray(1,4).toString(),'PNG');assert.ok(f.width>0&&f.height>0);}
 }
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
test('actual grader honors MCQ alternatives, MSQ exact sets and strict NAT precision',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const answer of [2,3])assert.equal(gradeResponse(rows[4],answer),true);
 for(const answer of [1,4,[2,3]])assert.equal(gradeResponse(rows[4],answer),false);
 for(const answer of [[1,2],[2]])assert.equal(gradeResponse(rows[26],answer),true);
 for(const answer of [[1],[1,2,3],[2,4]])assert.equal(gradeResponse(rows[26],answer),false);
 assert.equal(gradeResponse(rows[29],'3.00'),true);assert.equal(gradeResponse(rows[29],'3.01'),false);
 assert.equal(gradeResponse(rows[30],'1.95'),true);assert.equal(gradeResponse(rows[30],'2.05'),true);assert.equal(gradeResponse(rows[30],'2.051'),false);
 assert.equal(gradeResponse(rows[51],'1.251'),false);assert.equal(gradeResponse(rows[51],'1.25'),true);
});
