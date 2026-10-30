const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const vm=require('node:vm');
const ts=require('typescript');
const katex=require('katex');
const root='data/gate-2027/streams/CE-civil-engineering/papers/2025/CE2/';
const batch=JSON.parse(fs.readFileSync(root+'questions-31-65.json','utf8'));
const all=[...JSON.parse(fs.readFileSync(root+'questions-1-30.json','utf8')),...batch];
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const {gradeResponse}=load('lib/question-response.ts');
const {calculateMarks}=load('lib/marking.ts');

test('complete CE2 2025 preserves all official keys, source numbers, session and 100 marks',()=>{
 const keys=['1.24 to 1.30','0.010 to 0.015','64 to 64','2.50 to 2.60','936 to 936','A','A','C','B','B','B','B','A','A;D','A;C','A;D','A;C;D','A;C','A;B;C','A;C','2.7 to 2.9','16.3 to 16.6','1 to 1','283.0 to 284.0','1.00 to 1.10','300 to 300','1.50 to 1.52','271 to 273','25 to 25','7 to 9','50 to 50','12.3 to 12.7','21.0 to 45.0','0.63 to 0.66','118 to 118'];
 assert.deepEqual(batch.map(q=>q.answer_key),keys);
 assert.deepEqual(all.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>all.filter(q=>q.question_type===t).length),[28,15,22]);
 assert.equal(all.reduce((n,q)=>n+q.marks,0),100);
 const syllabus=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
 for(const q of batch){
  assert.equal(q.organising_institute,'IIT Roorkee');assert.equal(q.source_metadata.session,8);assert.equal(q.source_metadata.key_page,2);assert.equal(q.source_metadata.paper,'CE2');
  assert.equal(q.marks,q.source_question_number<=35?1:2);assert.equal(q.options.length,q.question_type==='NAT'?0:4);
  assert.ok(syllabus.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic),`Q${q.source_question_number}`);
  for(const name of ['question_source','key_source']){const f=q.source_metadata[name];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(root+'sources/'+f.filename)).digest('hex'),f.sha256);}
 }
 const qs=all.map(q=>({...q,id:String(q.source_question_number)}));
 assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:true}))).net,100);
 assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:false}))).net,-13.67);
});

test('NATs preserve exact/ranged grading and the original three-decimal requirement in Q32',()=>{
 for(const q of batch.filter(q=>q.question_type==='NAT')){
  assert.equal(q.options.length,0);assert.equal(q.correct_option,null);assert.equal(q.correct_options,null);assert.equal(q.negative_marks,0);
  assert.equal(gradeResponse(q,String(q.answer_min)),true);assert.equal(gradeResponse(q,String(q.answer_max)),true);
  const unit=10**-q.answer_decimal_places;
  assert.equal(gradeResponse(q,(q.answer_min-unit).toFixed(q.answer_decimal_places)),false);
  assert.equal(gradeResponse(q,(q.answer_max+unit).toFixed(q.answer_decimal_places)),false);
 }
 const q=n=>batch.find(q=>q.source_question_number===n);
 assert.equal(q(32).answer_decimal_places,3);assert.equal(gradeResponse(q(32),'0.013'),true);assert.equal(gradeResponse(q(32),'0.0131'),false);
 assert.equal(gradeResponse(q(35),'936.00'),true);assert.equal(gradeResponse(q(35),'936.01'),false);assert.equal(gradeResponse(q(35),'234'),false);
 assert.ok(q(35).source_metadata.interpretation_note.includes('ambiguous'));
 assert.equal(gradeResponse(q(46),[1,4]),true);assert.equal(gradeResponse(q(46),[1]),false);
});

test('all formulae and tables render; nine original source diagrams have matching local mirrors',()=>{
 let figures=0;
 for(const q of batch){
  for(const text of [q.question_text,...q.options,q.explanation]){
   assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text),`Q${q.source_question_number} control characters`);
   for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);
  }
  if(q.figure){const f=q.figure;figures++;const b=fs.readFileSync(root+'images/'+f.url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));assert.ok(Math.abs(b.readUInt32BE(16)/b.readUInt32BE(20)-f.width/f.height)<.02);}
 }
 assert.equal(figures,9);
 assert.ok(batch.find(q=>q.source_question_number===43).question_text.includes('| Column I | Column II |'));
 assert.ok(batch.find(q=>q.source_question_number===51).question_text.includes('| $P(X=x_i)$ |'));
 assert.ok(batch.find(q=>q.source_question_number===61).question_text.includes('| $\\mathrm{Fe^{2+}}$ | 10 |'));
});

test('independent numerical checks support all NAT solutions and the structural/traffic choices',()=>{
 const E=210000,I=8e7,L=4000,w=6.25,Ar=Math.PI*12**2/4,Ac=Math.PI*30**2/4;
 const P=(5*w*L**4/(384*E*I)+(w*L/2)*1000/(E*Ar))/(1000/(E*Ac)+1000/(2*E*Ar)+L**3/(48*E*I));
 const expected={31:Number((((21-9.81)/9.81)/.9).toFixed(2)),32:Number((.197*9/2*.00151*9.81).toFixed(3)),33:2*2**5,34:Number((2000/71/11).toFixed(1)),35:468*40/20,51:Number(Math.sqrt(24.7-4.1**2).toFixed(1)),52:Number((P/1000).toFixed(1)),53:13-8-4,54:Number((.87*415*(2*Math.PI*10**2/4)*500/100/1000).toFixed(1)),55:Number((30*14**2*(80*Math.PI/180)/(3000*2.5+.5*9.81*2.5**2*(5.5+2*2.5/3))).toFixed(2)),56:Math.round(1500/(.3*16.66)),57:Number(((4*.8*Math.PI*.5-.5)/3).toFixed(2)),58:Math.round(2*Math.PI*.0005*10/Math.log(300/.3)*60000),59:(180-30)/(6.6-.2*3),60:(3924/9.81+200)/75,61:150+40+10-120-30,62:Number((750/(50+995*.01)).toFixed(1)),63:Number((Math.sqrt(18*2.1e-5*(.2*2/12)/((2650-1)*9.81))*1e6).toFixed(1)),64:Number((2*49/(2*300)+80/(9.5*Math.sqrt(300))).toFixed(2)),65:60+180-122};
 for(const q of batch.filter(q=>q.question_type==='NAT'))assert.equal(gradeResponse(q,String(expected[q.source_question_number])),true,`Q${q.source_question_number}`);
 assert.equal(Number((410/(Math.sqrt(3)*1.25)*3.5*Math.PI*250*125/1e6).toFixed(1)),65.1);
 assert.equal(Number((3/Math.sqrt(2)).toFixed(1)),2.1);
 const t=.87*415*800,x=t/(.36*20*350),a=.36/(.67/1.5)*x;
 assert.equal(Math.round(t*(560-a/2)/1e6),148);
 assert.deepEqual([1,-1].map(sign=>Number((50*(1+sign*Math.sqrt(.5))).toFixed(2))),[85.36,14.64]);
});
