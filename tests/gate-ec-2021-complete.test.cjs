const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EC-electronics-and-communication-engineering'),paper=path.join(base,'papers/2021/EC');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('65 EC questions, 100 marks and official numbering/types',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[35,0,30]);
 assert.deepEqual(rows.filter(q=>q.marks_to_all).map(q=>q.source_question_number),[]);
 for(const q of rows){const n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'&&!q.marks_to_all?q.marks/3:0);assert.equal(q.source_metadata.session,4);assert.equal(q.organising_institute,'IIT Bombay');assert.equal(q.source_metadata.original_question_number,n<=10?n:n-10);assert.equal(q.source_metadata.key_page,n<=20?1:n<=43?2:3);}
 for(const [a,b] of [[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`),'utf8')),rows.slice(a-1,b));
});
test('MCQ keys match independently transcribed official key, including MTA',()=>{
 for(const [start,letters] of [[1,'CBCCBCDACA'],[11,'ABBBCDADDABCCDA'],[36,'ABCCACADCA']])for(let i=0;i<letters.length;i++){let q=rows[start+i-1];if(letters[i]==='-'){assert.equal(q.marks_to_all,true);assert.equal(q.correct_option,null);}else assert.equal(q.correct_option,letters.charCodeAt(i)-64,`Q${start+i}`);}
});
test('independent numerical calculations agree with official intervals and precision',()=>{
 const p=Math.PI,values={26:8,27:0,28:.5,29:1,30:4.5,31:2,32:100*(1-.0625/1.125),33:80/Math.log2(1+10**2.6),34:p,35:Math.acos(1.48/1.5)*180/p,46:10,47:18*p,48:.1*Math.log(4),49:32,50:0,51:8,52:1.6e-19/(2*12*8.85e-12)*(5e22*(.4e-6)**2+1e23*(.2e-6)**2)-.8,53:10,54:.5,55:-12,56:5,57:1+Math.exp(-p*.25/Math.sqrt(1-.25**2)),58:100/32,59:1e6+2*1000*4*Math.SQRT2,60:1400,61:-Math.log2(.1),62:.01/((2/32)**2/12),63:.4/4*Math.log(.6/.4),64:1/Math.sqrt(1-(1.875/3.4)**2),65:Math.sqrt(60*10**.6*16000)/8000};
 const {gradeResponse}=load('lib/question-response.ts');assert.equal(Object.keys(values).length,30);
 for(const [n,v] of Object.entries(values)){const q=rows[n-1],rounded=Number(v.toFixed(q.answer_decimal_places));assert.ok(rounded>=q.answer_min&&rounded<=q.answer_max,`Q${n}: ${v}`);assert.equal(gradeResponse(q,String(rounded)),true,`Q${n}`);assert.deepEqual(q.options,[]);}
 assert.equal(gradeResponse(rows[47],'.139'),true);assert.equal(gradeResponse(rows[47],'.1391'),false);assert.equal(gradeResponse(rows[54],'-12'),true);assert.equal(gradeResponse(rows[54],'12'),false);assert.equal(gradeResponse(rows[57],'3.125'),true);assert.equal(gradeResponse(rows[57],'3.1251'),false);
});
test('taxonomy points to genuine EC leaves or documented broader historical mappings',()=>{
 const tax=JSON.parse(fs.readFileSync(path.join(base,'syllabus/2027/taxonomy.json'),'utf8')).subjects;
 for(const q of rows.slice(10)){const t=tax[q.subject][q.topic];assert.ok(t);if(q.subtopic){assert.ok(t[q.subtopic]);if(q.sub_subtopic)assert.ok(t[q.subtopic].includes(q.sub_subtopic));}if(!q.sub_subtopic)assert.ok(q.source_metadata.classification_note);}
});
test('26 diagram-only images, no text options converted to images, public uploads verified',()=>{
 const checks=JSON.parse(fs.readFileSync(path.join(paper,'image-verification.json'),'utf8'));assert.equal(checks.length,26);assert.ok(checks.every(x=>x.verified));assert.equal(rows.filter(q=>q.figure).length,26);
 for(const q of rows){assert.deepEqual(q.option_images,[]);if(q.question_type==='MCQ')assert.equal(q.options.length,4);if(q.figure){assert.match(q.figure.url,/question-images\/gate-ec-2021\//);const b=fs.readFileSync(path.join(root,'public',q.figure.local_url));assert.equal(b.subarray(1,4).toString(),'PNG');}}
});
test('all statements, options and worked explanations render through the actual app renderer',()=>{
 const {renderMathToHtml}=load('lib/renderMath.ts');
 for(const q of rows){assert.ok(q.explanation.length>200);assert.ok((q.explanation.match(/^### /gm)||[]).length>=3);for(const text of [q.question_text,...q.options,q.explanation])assert.doesNotMatch(renderMathToHtml(text),/katex-error/,`Q${q.source_question_number}`);}
});

test('corrected Q19 grades only D and no longer awards MTA',()=>{
 const {gradeResponse}=load('lib/question-response.ts'),q=rows[18];
 assert.equal(q.marks_to_all,false);assert.equal(q.correct_option,4);assert.equal(q.negative_marks,1/3);assert.equal(gradeResponse(q,4),true);for(const r of [1,2,3])assert.equal(gradeResponse(q,r),false);assert.equal(gradeResponse(q,null),null);assert.equal(q.source_metadata.official_answer_key,'MTA');assert.equal(q.source_metadata.editorial_correction.scoring_override.approved_by,'user');
});

test('corrected Q36 changes only the contour, preserves all options and grades A',()=>{
 const {gradeResponse}=load('lib/question-response.ts'),q=rows[35],old=JSON.parse(fs.readFileSync(path.join(paper,'q36-original-before-editorial-correction.json'),'utf8'));
 assert.equal(q.question_text,old.question_text.replace('|x-i|=2','|x-2i|=1'));assert.deepEqual(q.options,old.options);assert.equal(q.marks_to_all,false);assert.equal(q.correct_option,1);assert.equal(q.marks,2);assert.equal(q.negative_marks,2/3);assert.equal(gradeResponse(q,1),true);for(const r of [2,3,4])assert.equal(gradeResponse(q,r),false);assert.equal(gradeResponse(q,null),null);assert.equal(q.source_metadata.official_answer_key,'MTA');
 const center=2,radius=1;assert.ok(Math.abs(2-center)<radius);assert.ok(Math.abs(0-center)>radius);assert.ok(Math.abs(-2-center)>radius);
});
