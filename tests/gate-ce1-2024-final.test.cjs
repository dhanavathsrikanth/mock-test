const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const katex=require('katex');const crypto=require('node:crypto');
const base='data/gate-2027/streams/CE-civil-engineering/papers/2024/CE1/';const data=JSON.parse(fs.readFileSync(base+'questions-36-65.json','utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const {gradeResponse}=load('lib/question-response.ts');const {calculateMarks}=load('lib/marking.ts');
test('complete CE1 2024 matches all official final keys, source hashes, taxonomy and 100 marks',()=>{
 assert.deepEqual(data.map(q=>q.source_question_number),Array.from({length:30},(_,i)=>i+36));
 assert.deepEqual(data.map(q=>q.answer_key),['A','D','A','A','A','B','A','A','A','B','A;B','21 to 23','24.50 to 25.50','7.0 to 8.0','299 to 301','6000 to 6000','99 to 102','1550 to 1600','48 to 50','0.09 to 0.11 OR 0.55 to 0.65','86 to 88','1.09 to 1.12','4.40 to 4.70','5575 to 5585','7.8 to 8.0','99 to 100 OR 154 to 156','86 to 90','52 to 58','MTA','10 to 10']);
 const tax=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
 for(const q of data){assert.equal(q.organising_institute,'IISc Bengaluru');assert.equal(q.source_metadata.session,3);assert.equal(q.source_metadata.key_page,2);assert.equal(q.marks,2);assert.equal(q.negative_marks,q.question_type==='MCQ'?2/3:0);assert.ok(tax.subjects.find(s=>s.name===q.subject)?.topics.find(t=>t.name===q.topic)?.subtopics.some(t=>t.name===q.subtopic),`Q${q.source_question_number}`);for(const k of ['question_source','key_source']){const s=q.source_metadata[k];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+s.filename)).digest('hex'),s.sha256);}}
 const all=['questions-1-10.json','questions-11-35.json','questions-36-65.json'].flatMap(f=>JSON.parse(fs.readFileSync(base+f,'utf8')));
 assert.deepEqual(all.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(all.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>all.filter(q=>q.question_type===t).length),[37,5,23]);
});
test('disjoint NATs reject gaps, exact keys stay exact and Q64 awards marks even unanswered',()=>{
 for(const q of data){
  if(q.marks_to_all){assert.equal(q.source_question_number,64);for(const r of [null,'','0','12.34'])assert.equal(gradeResponse(q,r),true);assert.equal(q.answer_min,null);assert.equal(q.answer_max,null);continue;}
  assert.equal(gradeResponse(q,null),null);
  if(q.question_type==='NAT'){
   assert.deepEqual(q.options,[]);assert.equal(q.correct_option,null);assert.equal(q.correct_options,null);assert.equal(q.answer_decimal_places,2);
   const ranges=q.answer_ranges||[{min:q.answer_min,max:q.answer_max}];for(const r of ranges){assert.equal(gradeResponse(q,String(r.min)),true);assert.equal(gradeResponse(q,String(r.max)),true);assert.equal(gradeResponse(q,(r.min-.01).toFixed(2)),false);assert.equal(gradeResponse(q,(r.max+.01).toFixed(2)),false);assert.equal(gradeResponse(q,(r.min+.001).toFixed(3)),false);}
   if(ranges.length>1){assert.equal(q.answer_min,ranges[0].min);assert.equal(q.answer_max,ranges[0].max);assert.equal(gradeResponse(q,String((ranges[0].max+ranges[1].min)/2)),false);}
  }else {assert.equal(q.options.length,4);assert.equal(gradeResponse(q,q.question_type==='MCQ'?q.correct_option:q.correct_options),true);}
 }
 assert.equal(gradeResponse(data.find(q=>q.source_question_number===51),'6000.00'),true);assert.equal(gradeResponse(data.find(q=>q.source_question_number===65),'10.01'),false);
 const qs=data.map(q=>({...q,id:String(q.source_question_number)}));assert.equal(calculateMarks(qs,[]).net,2);assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:true}))).net,60);assert.equal(calculateMarks(qs,qs.map(q=>({question_id:q.id,is_correct:false}))).net,-4.67);
});
test('every matrix, formula and table parses and eight original diagram mirrors retain dimensions',()=>{
 for(const q of data){assert.ok(q.explanation.startsWith('### Solution\n')&&q.explanation.includes('### Answer\n'));for(const s of [q.question_text,...q.options,q.explanation]){assert.ok(!/[\x00-\x09\x0b-\x1f]/.test(s),`control character Q${q.source_question_number}`);for(const m of s.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);}if(q.figure){const f=q.figure,b=fs.readFileSync(base+'images/'+f.url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));assert.ok(Math.abs(b.readUInt32BE(16)/b.readUInt32BE(20)-f.width/f.height)<.015);}}
 assert.deepEqual(data.filter(q=>q.figure).map(q=>q.source_question_number),[38,39,40,49,50,57,59,63]);
});
test('independent numeric solutions fit official NAT intervals with the requested rounding',()=>{
 const values={47:Math.round(100*(1-Math.exp(-.25))),48:25,49:7.5,50:300,51:6000,52:Math.round(1000*Math.PI*8**2/4/500),53:300*((.5/.2)**2-1),54:Math.round(Math.atan(2*Math.tan(Math.PI/6))*180/Math.PI),55:.1,56:Math.round((80+95+85)/3),57:Number((20/(150*(1.5+Math.atan(1/1.5))*Math.sqrt(.005/2)))**.4).toFixed(2),58:(.25*(Math.sqrt(1+8*15**2/(9.81*.5))-1)).toFixed(2),59:5*(4*(68+100)/2+6*(100+160)/2),60:(-Math.log(.05)/.38).toFixed(1),61:((450*100/162-100)*56/100).toFixed(2),62:Math.round(1750/(127*437)*((20*40+15*50+12*60+8*70+3*80)/58)**2),63:Math.round(1650/105*3.6),65:10};
 for(const [n,value] of Object.entries(values))assert.equal(gradeResponse(data.find(q=>q.source_question_number===+n),String(value)),true,`Q${n}: ${value}`);
 const matrix=[[2,1,1],[1,4,1],[1,1,2]];const det=a=>a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])-a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])+a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]);for(const l of [1,2,5])assert.equal(det(matrix.map((row,i)=>row.map((x,j)=>x-(i===j?l:0)))),0);
});
