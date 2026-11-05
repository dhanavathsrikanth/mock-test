const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const katex=require('katex');
const root=path.resolve(__dirname,'..');
const base=path.join(root,'data/gate-2027/streams/ME-mechanical-engineering');
const paper=path.join(base,'papers/2021/ME2');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
test('ME2 has all three requested batches and the official 100-mark distribution',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.equal(rows.filter(q=>q.question_type==='MCQ').length,38);
 assert.equal(rows.filter(q=>q.question_type==='NAT').length,27);
 for(const [a,b,total] of [[1,10,15],[11,30,20],[31,65,65]]){
  const batch=JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`),'utf8'));
  assert.deepEqual(batch,rows.slice(a-1,b));assert.equal(batch.reduce((s,q)=>s+q.marks,0),total);
 }
 for(const q of rows){
  assert.equal(q.marks,q.source_question_number<=5||(q.source_question_number>=11&&q.source_question_number<=35)?1:2);
  assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);
  assert.equal(q.source_metadata.session,8);assert.equal(q.source_metadata.paper,'ME2');
  assert.equal(q.organising_institute,'IIT Bombay');
 }
});
test('MCQ choices match the separately transcribed official key',()=>{
 const first='BAABDCBCBD'+'DCDDADDBCADBBBDBDAB';
 assert.equal(first.length,29);
 for(let i=0;i<29;i++)assert.equal(rows[i].correct_option,first.charCodeAt(i)-64,`Q${i+1}`);
 for(const [i,k] of [...'BBCADBACB'].entries())assert.equal(rows[i+35].correct_option,k.charCodeAt(0)-64,`Q${i+36}`);
});
const ranges={30:[373,377],31:[165,165],32:[134,136],33:[228,230],34:[800,840],35:[.08,.12],45:[1.66,1.68],46:[40200,40300],47:[2.6,3],48:[39,40],49:[38,39],50:[388,400],51:[3880,3886],52:[200,206],53:[6,10],54:[337,341],55:[10,10],56:[2257,2259],57:[25,25.4],58:[130,134],59:[90,92],60:[2.1,2.3],61:[.16,.19],62:[1.3,1.4],63:[48,52],64:[560,580],65:[152000,165000]};
test('NAT official ranges and singleton keys are retained, without fabricated options',()=>{
 for(const [n,range] of Object.entries(ranges)){
  const q=rows[n-1];assert.equal(q.question_type,'NAT');assert.deepEqual([q.answer_min,q.answer_max],range);
  assert.equal(q.correct_option,null);assert.equal(q.answer_decimal_places,2);assert.deepEqual(q.options,[]);
  assert.equal(q.source_metadata.numeric_evaluation.no_rounding_into_range,true);
 }
});
test('all 27 worked NAT results independently fall inside the official ranges',()=>{
 const pi=Math.PI;let x=2;for(let i=0;i<2;i++)x-=(x*x*x-x-3)/(3*x*x-1);
 const m1=75*125*20/(2*(75*125+125*20+75*20));
 const actual={30:330+300**2/(2*1005),31:150+150/10,32:50/(.2*.001084+.8*.46242),33:.6*Math.sqrt(1.3*320*350),34:100*(2/.699)**2,35:200*250*(1-.6)/2e5,45:x,46:Math.sqrt(2*4500000*1800/(20*.5)),47:2*((50/6)/m1)**2,48:pi/4*25*20/(.1*.1)/1000,49:40*40/(10*.05*5000/60),50:400*Math.sin(Math.atan(.2))/(2*.1),51:3600/(.9*1.03),52:76.2+254*.5,53:100/5*(25/225+20/220+15/285+20/290+20/250),54:350-50*Math.exp(-1.5),55:1000/100,56:10000*Math.sqrt(2/9.8)*.5,57:100*(708.6-226.7)/(2624-708.6),58:(pi/4*.32**2*6-.01*35)*1000,59:(200-17-3.5**2/(2*9.8))/200*100,60:(3*(1005*Math.log(340/300)-287*Math.log(.2))+2*(1005*Math.log(240/300)-287*Math.log(.2)))/1000,61:(750*Math.cos(pi/6)-900*.5)/(900*Math.cos(pi/6)+750*.5),62:10*(1-.1/.4)/(3.5+.32/.4**2),63:10000/200e6*1e6,64:2500/(.01*(200*2*pi/60)**2),65:10**(3+Math.log10(200/450)/(Math.log10(150/450)/3))};
 assert.equal(Object.keys(actual).length,27);
 for(const [n,value] of Object.entries(actual))assert.ok(value>=ranges[n][0]&&value<=ranges[n][1],`Q${n}: ${value}`);
 const simpson=.1*(Math.log(4)+4*Math.log(4.3)+2*Math.log(4.6)+4*Math.log(4.9)+Math.log(5.2));
 assert.equal(simpson.toFixed(2),rows[27].options[0]);
 const speed=2500*(150/250)*(18/44)*(15/33)*(33/36);assert.ok(Math.abs(speed-255.6818)<.001);
 const tf=(k,z)=>{const r=40/Math.sqrt(k/100);return Math.sqrt((1+(2*z*r)**2)/((1-r*r)**2+(2*z*r)**2));};
 const ordered=[[1,640000,.7],[2,640000,.07],[3,22500,.7],[4,22500,.07]].sort((a,b)=>tf(a[1],a[2])-tf(b[1],b[2])).map(a=>a[0]).join('-');
 assert.equal(ordered,rows[42].options[2]);
});
test('only the 14 original diagram regions are images; every answer choice stays text',()=>{
 assert.deepEqual(rows.filter(q=>q.figure).map(q=>q.source_question_number),[8,24,25,26,41,42,44,56,57,58,60,61,62,65]);
 for(const q of rows){
  assert.ok(q.question_text.trim().length>30);assert.deepEqual(q.option_images,[]);
  assert.equal(q.options.length,q.question_type==='MCQ'?4:0);
  for(const option of q.options)assert.ok(typeof option==='string'&&option.length>0);
  if(q.figure){
   const bytes=fs.readFileSync(path.join(root,'public',q.figure.local_url));
   assert.equal(bytes.subarray(1,4).toString(),'PNG');
   assert.ok(q.figure.width>0&&q.figure.height>0);
   const [x,y,x2,y2]=q.figure.source_crop;assert.ok(x>100&&y>90&&x2-x<400&&y2-y<260);
  }
 }
});
test('technical questions map to actual third-level syllabus leaves',()=>{
 const taxonomy=JSON.parse(fs.readFileSync(path.join(base,'syllabus/2027/taxonomy.json'),'utf8')).subjects;
 for(const q of rows.slice(10))assert.ok(taxonomy[q.subject][q.topic][q.subtopic].includes(q.sub_subtopic),`Q${q.source_question_number}`);
 for(const q of rows.slice(0,10))assert.equal(q.subject,'General Aptitude');
 for(const q of rows)assert.ok(['easy','medium','hard'].includes(q.difficulty));
});
test('all statements, options and structured worked solutions render their TeX',()=>{
 for(const q of rows){
  assert.ok(q.explanation.length>200);assert.ok((q.explanation.match(/^### /gm)||[]).length>=2);
  const prose=q.explanation.replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$/g,'');
  assert.doesNotMatch(prose,/\d\s*\/\s*\d/,`Q${q.source_question_number}: prose fractions need explicit math boundaries`);
  for(const text of [q.question_text,...q.options,q.explanation]){
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g))
    assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true,displayMode:!!m[1]}),`Q${q.source_question_number}: ${m[0]}`);
  }
 }
});
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require});return exports;}
test('actual grader accepts inclusive boundaries and exact values without rounding into range',()=>{
 const {gradeResponse,numericAnswerLabel}=load('lib/question-response.ts');
 for(const q of rows.filter(q=>q.question_type==='MCQ')){
  assert.equal(gradeResponse(q,q.correct_option),true);assert.equal(gradeResponse(q,q.correct_option%4+1),false);
 }
 for(const q of rows.filter(q=>q.question_type==='NAT')){
  assert.equal(gradeResponse(q,String(q.answer_min)),true);assert.equal(gradeResponse(q,String(q.answer_max)),true);
  assert.equal(gradeResponse(q,String(q.answer_min-.01)),false);assert.equal(gradeResponse(q,String(q.answer_max+.01)),false);
 }
 assert.equal(gradeResponse(rows[34],'0.121'),false);assert.equal(gradeResponse(rows[34],'0.100'),true);
 assert.equal(numericAnswerLabel(165,165),'Exact answer: 165');assert.equal(numericAnswerLabel(10,10),'Exact answer: 10');
});
