const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/ME-mechanical-engineering'),paper=path.join(base,'papers/2023/ME');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('ME 2023 has all 65 questions, 100 marks and three requested batches',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(k=>rows.filter(q=>q.question_type===k).length),[32,8,25]);
 for(const [a,b,total] of [[1,10,15],[11,30,20],[31,65,65]]){
  const batch=JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`),'utf8'));assert.deepEqual(batch,rows.slice(a-1,b));assert.equal(batch.reduce((s,q)=>s+q.marks,0),total);
 }
 for(const q of rows){assert.equal(q.marks,q.source_question_number<=5||(q.source_question_number>=11&&q.source_question_number<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'&&!q.marks_to_all?q.marks/3:0);assert.equal(q.organising_institute,'IIT Kanpur');assert.equal(q.source_metadata.session,2);}
});
test('letters, MSQ sets and Q55 MTA match the independently transcribed official key',()=>{
 for(const [start,letters] of [[1,'AAAABD acab'.replace(/ /g,'').toUpperCase()],[11,'ABABAACDDCAB'],[36,'ACDBAB BDBC'.replace(/ /g,'')]])for(let i=0;i<letters.length;i++)assert.equal(rows[start+i-1].correct_option,letters.charCodeAt(i)-64,`Q${start+i}`);
 for(const [n,set] of [[23,[2,3]],[24,[3,4]],[25,[1,2,4]],[26,[2,3]],[27,[1,3]],[28,[1,2]],[46,[1,4]],[47,[1,3]]])assert.deepEqual(rows[n-1].correct_options,set);
 assert.equal(rows.filter(q=>q.marks_to_all).length,1);assert.equal(rows[54].marks_to_all,true);assert.equal(rows[54].question_type,'NAT');assert.equal(rows[54].correct_option,null);
});
const ranges={29:[95.999,96.001],30:[6.27,6.29],31:[-.001,.001],32:[18.8,18.9],33:[1.999,2.001],34:[4.05,4.15],35:[9.999,10.001],48:[7.999,8.001],49:[8.999,9.001],50:[.999,1.001],51:[2490,2510],52:[.53,.55],53:[16.4,16.6],54:[4.999,5.001],56:[8.999,9.001],57:[206,207],58:[3023.999,3024.001],59:[2,2.16],60:[237,240],61:[3.9,4.1],62:[83.999,84.001],63:[1.1,1.2],64:[55.9,58.5],65:[.39,.41]};
test('NAT has official inclusive limits, no choices and correct precision',()=>{
 for(const [n,range] of Object.entries(ranges)){const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],range);assert.deepEqual(q.options,[]);assert.equal(q.answer_decimal_places,2);}
 assert.equal(rows[54].answer_min,null);assert.equal(rows[54].answer_max,null);
});
test('independent calculations verify all 24 keyed NAT answers',()=>{
 const pi=3.14,torque=80e9*(pi*.1**4/32)*(.5*pi/180)/1.5;
 const values={29:8*(60/5),30:10*2*pi/Math.sqrt(2000/20),31:0,32:6*pi,33:2,34:Math.exp(.3*270*pi/180),35:.5*400*50/1000,48:4*Math.sqrt(4),49:4*2+2/2,50:2/2,51:(4*.024092/6.023e23)/(.4e-9)**3,52:((1.5-.8)/(6.7-.8))/((1.5-.035)/(6.7-.035)),53:35-20+3*Math.hypot(.3,.4),54:(6+6+4+4)/4,56:12*.5/2*45/15,57:400*.3**.3*Math.exp(-.3),58:12**3+12**4/16,59:2700**2*9.8**2*10*5**3/(6*70e9),60:torque*2*pi*500/60/1000,61:(100000*10/(8314*300)-2/10)*20,62:(100000-.5*1000*2**2*(2**2+2**2))/1000,63:1+2*.2*Math.exp(-1)/(1+.2*Math.exp(-1)),64:4.9*7/3+19.6+39.2*2/3,65:2/5};
 assert.equal(Object.keys(values).length,24);for(const [n,v] of Object.entries(values))assert.ok(v>=ranges[n][0]-1e-9&&v<=ranges[n][1]+1e-9,`Q${n}: ${v}`);
});
test('all question diagrams and only graphical answer choices have separate PNGs',()=>{
 assert.equal(rows.filter(q=>q.figure).length,34);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),24);
 for(const q of rows){
  assert.ok(q.question_text.trim().length>15);
  assert.equal(q.option_images.length,[5,17,24,28,39,40].includes(q.source_question_number)?4:0);
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
test('actual grader handles NAT MTA, complete MSQ sets and strict numerical boundaries',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const response of [null,'','-100','42.35'])assert.equal(gradeResponse(rows[54],response),true);
 assert.equal(gradeResponse(rows[23],[3,4]),true);assert.equal(gradeResponse(rows[23],[3]),false);
 assert.equal(gradeResponse(rows[29],'6.27'),true);assert.equal(gradeResponse(rows[29],'6.29'),true);assert.equal(gradeResponse(rows[29],'6.269'),false);
 assert.equal(gradeResponse(rows[28],'96'),true);assert.equal(gradeResponse(rows[28],'96.01'),false);
});
