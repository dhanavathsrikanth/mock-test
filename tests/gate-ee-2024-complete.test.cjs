const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EE-electrical-engineering'),paper=path.join(base,'papers/2024/EE');
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




test('2024 EE has all 65 questions, 100 marks and the official question-type distribution',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[35,7,23]);
 for(const [a,b] of [[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`))),rows.slice(a-1,b));
 for(const q of rows){const n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'&&!q.marks_to_all?q.marks/3:0);assert.equal(q.organising_institute,'IISc Bengaluru');assert.equal(q.source_metadata.session,8);assert.equal(q.source_metadata.key_page,n<=29?1:2);}
});
test('every MCQ is independently checked against the final official key',()=>{
 const answers={1:'A',2:'A',3:'D',4:'C',5:'A',6:'C',8:'C',9:'B',10:'A',11:'C',12:'A',13:'A',14:'A',15:'A',16:'A',17:'C',19:'C',20:'D',21:'B',22:'B',23:'C',24:'A',25:'C',26:'B',27:'D',28:'B',36:'C',37:'B',38:'D',39:'C',40:'A',41:'A',42:'A'};
 for(const [n,k] of Object.entries(answers))assert.equal(rows[n-1].correct_option,k.charCodeAt(0)-64,`Q${n}`);
});
test('official marks-to-all questions earn full marks even unattempted',()=>{
 const {gradeResponse,getQuestionScore}=load('lib/question-response.ts');
 assert.deepEqual(rows.filter(q=>q.marks_to_all).map(q=>q.source_question_number),[7,18]);
 for(const n of [7,18]){const q=rows[n-1];assert.equal(q.correct_option,null);assert.equal(q.correct_options,null);assert.equal(q.negative_marks,0);assert.equal(gradeResponse(q,null),true);}
});
test('all seven MSQs use exact option sets',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const [n,set] of [[29,[2,4]],[30,[4]],[43,[2]],[44,[2]],[45,[2,4]],[46,[1,4]],[47,[2,4]]]){assert.deepEqual(rows[n-1].correct_options,set);assert.equal(gradeResponse(rows[n-1],set),true);assert.equal(gradeResponse(rows[n-1],[1,2,3,4]),false);if(set.length>1)assert.equal(gradeResponse(rows[n-1],set.slice(1)),false);}
});
const ranges={31:[0,0],32:[29,29],33:[0,0],34:[35,35],35:[50,50],48:[-19.9,-19.7],49:[5.32,5.34],50:[692,693],51:[-1.7,-1.5],52:[2,2],53:[2,2],54:[.26,.29],55:[27.19,27.39],56:[.10,.12],57:[4,8],58:[.09,.11],59:[1.11,1.13],60:[1.64,1.70],61:[39.5,41.5],62:[.940,.970],63:[50,50],64:[13,13],65:[113,116]};
const integers=new Set([32,34,35,52,57,63,64]),one=new Set([31,33,51,53]);
test('all NAT limits and source decimal instructions are retained',()=>{
 for(const [n,r] of Object.entries(ranges)){const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],r);assert.equal(q.answer_decimal_places,integers.has(+n)?0:one.has(+n)?1:+n===62?3:2);assert.deepEqual(q.options,[]);}
 const {gradeResponse}=load('lib/question-response.ts');
 for(const [n,good,bad] of [[48,['-19.9','-19.70'],['19.8','-19.901']],[62,['.955','.940','.970'],['.9701','.9399']],[32,['29','29.00'],['29.01']],[51,['-1.6'],['-1.61']],[50,['692.82'],['692.821']]]){for(const a of good)assert.equal(gradeResponse(rows[n-1],a),true);for(const a of bad)assert.equal(gradeResponse(rows[n-1],a),false);}
});
test('independent calculations for all 23 NATs fall within the official intervals',()=>{
 const p=Math.PI,a=-101/10.5,b=(1+101/10.5)*101.5/111;
 const values={31:0,32:7+22,33:0,34:(7400-6000)/40,35:10e-6*50/10*1e6,48:.5*.4-10*2,49:4+4*2/(4+2),50:400*2*Math.cos(p/6),51:-2.25/(1.25**1.5),52:2,53:4/2,54:(Math.hypot(3,2+2)-2.5)/9,55:221-Math.sqrt(440**2-4*10876)/2,56:.5-p/8,57:(180+Math.atan2(1,-2)*180/p+Math.atan2(3,-2)*180/p-90)%360,58:1/10,59:.5/(10**(-7/20)),60:3-(13/3-3),61:20*Math.log10(Math.abs((b-a)/(2*(a+b)))),62:3/p,63:100/.02/(2*50),64:8+20*.5/(.002*500)/2,65:Math.acos(-90*p/(2*Math.sqrt(2)*240))*180/p};
 assert.equal(Object.keys(values).length,23);const {gradeResponse}=load('lib/question-response.ts');for(const [n,v] of Object.entries(values)){const q=rows[n-1];assert.equal(gradeResponse(q,String(Number(v.toFixed(q.answer_decimal_places)))),true,`Q${n}: ${v}`);}
});
test('26 diagram-only crops and eight graphical options have valid local assets',()=>{
 assert.equal(rows.filter(q=>q.figure).length,26);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),8);
 for(const q of rows){assert.equal(q.option_images.length,[2,18].includes(q.source_question_number)?4:0);if(q.question_type!=='NAT')for(let i=0;i<4;i++)assert.ok(q.options[i]||q.option_images[i]);for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){assert.equal(fs.readFileSync(path.join(root,'public',f.local_url)).subarray(1,4).toString(),'PNG');assert.ok(f.width>0&&f.height>0);}}
});
test('Boolean simplification and post-clock feedback are independently correct',()=>{
 for(let P=0;P<2;P++)for(let Q=0;Q<2;Q++)for(let R=0;R<2;R++)for(let S=0;S<2;S++){
 const given=(!P&&!Q)||(!P&&Q&&S)||(P&&!Q&&!R&&!S)||(P&&!Q&&R&&!S),simple=(!P&&S)||(!Q&&!S);assert.equal(!!given,!!simple);
 }
 const oldZ=1,oldS=1^0^oldZ,newZ=oldS,newS=1^0^newZ;assert.deepEqual([newS,newZ],[1,0]);
});
