const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/ME-mechanical-engineering'),paper=path.join(base,'papers/2022/ME1');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('ME1 2022 has all 65 questions, 100 marks and three requested batches',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(k=>rows.filter(q=>q.question_type===k).length),[35,6,24]);
 for(const [a,b,total] of [[1,10,15],[11,30,20],[31,65,65]]){
  const batch=JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`),'utf8'));assert.deepEqual(batch,rows.slice(a-1,b));assert.equal(batch.reduce((s,q)=>s+q.marks,0),total);
 }
 for(const q of rows){assert.equal(q.marks,q.source_question_number<=5||(q.source_question_number>=11&&q.source_question_number<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'&&!q.marks_to_all?q.marks/3:0);assert.equal(q.organising_institute,'IIT Kharagpur');assert.equal(q.source_metadata.session,7);}
});
test('MCQ letters, MSQ sets and MTA match the separately read official key',()=>{
 const ga='DACBABABA';for(let i=0;i<9;i++)assert.equal(rows[i].correct_option,ga.charCodeAt(i)-64,`Q${i+1}`);
 const technical='ABAAAABABBCDBCD';for(let i=0;i<15;i++)assert.equal(rows[i+10].correct_option,technical.charCodeAt(i)-64,`Q${i+11}`);
 const latter='AAAAAABCBC';for(let i=0;i<10;i++)assert.equal(rows[i+35].correct_option,latter.charCodeAt(i)-64,`Q${i+36}`);
 assert.equal(rows[9].marks_to_all,true);assert.equal(rows[9].correct_option,null);
 for(const [n,set] of [[26,[1,2]],[27,[1,2,4]],[28,[2,4]],[30,[2,3]],[46,[1,2]]])assert.deepEqual(rows[n-1].correct_options,set);
 assert.deepEqual(rows[28].correct_option_sets,[[1,2,4],[1,2]]);
});
const ranges={31:[10,10],32:[2.62,2.7],33:[27,30],34:[404,414],35:[210,225],47:[.17,.19],48:[7.9,8.7],49:[18,18],50:[5.7,5.8],51:[.24,.26],52:[-.062,-.058],53:[600,600],54:[2570,2576],55:[30,32],56:[340,360],57:[10.5,10.9],58:[520,520],59:[110,110],60:[1.12,1.24],61:[2620,2630],62:[4780,4825],63:[4.2,4.28],64:[315,323],65:[.4,.44]};
test('NAT intervals, exact values, choices and original precision are correct',()=>{
 for(const [n,range] of Object.entries(ranges)){
  const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],range);assert.deepEqual(q.options,[]);assert.deepEqual(q.option_images,[]);assert.equal(q.answer_decimal_places,+n===52?3:2);
 }
});
test('independent calculations validate all 24 worked NAT answers',()=>{
 const pi=Math.PI,r=(250+35.7)/35.7,deg=v=>v*pi/180;
 const v={31:.001*200*10/(.1+.001*100),32:Math.sqrt(5*Math.sqrt(2)),33:100*(27/3)/(63/2),34:Math.abs((110*5-110*2**1.2*2.5)/.2),35:(600/(.21*5.669e-8)+298.15**4)**.25-273.15,47:Math.exp(-2)*8/6,48:Math.sqrt(78-400/46),49:(2*1.5+4*6)/1.5,50:(12/5)/(5/12),51:.15*5/3,52:-.1*.6,53:80*900/120,54:600/Math.sin(deg(25))*Math.cos(deg(40))/Math.cos(deg(65)),55:6*pi*100*1000/60/1000,56:1.15*(207+207*Math.log(4/3))*(1+.1*10/(2*3.5))*100*10/1000,57:.6*.7*.6*20*150/(10*pi*9/4),58:500+20,59:10*(4+2*3*2)-50,60:4500*(1/323.15-1/353.15),61:1235*(1/.32-1),62:100*r**1.4+100*r/300*800/.718,63:Math.hypot(3,3),64:300+.2/10*(100*7+.5*5.67e-8*300**4),65:14/33};
 assert.equal(Object.keys(v).length,24);for(const [n,value] of Object.entries(v))assert.ok(value>=ranges[n][0]&&value<=ranges[n][1],`Q${n}: ${value}`);
});
test('all question diagrams and only graphical answer choices have separate PNGs',()=>{
 assert.equal(rows.filter(q=>q.figure).length,15);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),4);
 for(const q of rows){
  assert.ok(q.question_text.trim().length>30);
  assert.equal(q.option_images.length,q.source_question_number===5?4:0);
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
test('actual grader honors MTA, both accepted MSQ sets, and strict NAT boundaries',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const answer of [null,1,2,3,4])assert.equal(gradeResponse(rows[9],answer),true);
 for(const answer of [[1,2],[1,2,4]])assert.equal(gradeResponse(rows[28],answer),true);
 for(const answer of [[1],[1,4],[1,2,3],[1,2,3,4]])assert.equal(gradeResponse(rows[28],answer),false);
 assert.equal(gradeResponse(rows[51],'-.060'),true);assert.equal(gradeResponse(rows[51],'-.062'),true);assert.equal(gradeResponse(rows[51],'-.058'),true);assert.equal(gradeResponse(rows[51],'-.057'),false);
 assert.equal(gradeResponse(rows[31],'2.619'),false);assert.equal(gradeResponse(rows[30],'10.00'),true);assert.equal(gradeResponse(rows[30],'10.01'),false);
});
