const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EE-electrical-engineering'),paper=path.join(base,'papers/2022/EE');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}

test('complete official 2022 EE paper and batch boundaries',()=>{
 assert.equal(rows.length,65);assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));
 assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[43,0,22]);
 for(const [a,b] of [[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`))),rows.slice(a-1,b));
 for(const q of rows){const n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);assert.equal(q.organising_institute,'IIT Kharagpur');assert.equal(q.source_metadata.session,2);assert.equal(q.source_metadata.original_question_number,n);assert.equal(q.source_metadata.key_page,n<=44?1:2);}
});
test('independently transcribed official MCQ choices and alternative single-choice grading',()=>{
 for(const [start,letters] of [[1,'DAAAC CABAC'.replace(/ /g,'')],[11,'BDADBBABCBCCCDA'.replace(/ /g,'')],[36,'CABA CAA BCBD CBB BCCB'.replace(/ /g,'')]])for(let i=0;i<letters.length;i++)assert.equal(rows[start+i-1].correct_option,letters.charCodeAt(i)-64,`Q${start+i}`);
 const {gradeResponse}=load('lib/question-response.ts');assert.deepEqual(rows[10].correct_option_sets,[[2],[4]]);for(const a of [2,4])assert.equal(gradeResponse(rows[10],a),true);assert.equal(gradeResponse(rows[10],[2,4]),false);assert.equal(gradeResponse(rows[10],1),false);
});
const ranges={26:[10,10],27:[48,48],28:[250,250],29:[12.3,12.7],30:[13,13],31:[4.95,5.05],32:[795,805],33:[.43,.47],34:[20,20],35:[580,590],54:[.99,1.01],55:[98,102],56:[188,192],57:[74,76],58:[3170,3190],59:[17.3,18],60:[.46,.48],61:[165,171],62:[480,485],63:[675,700],64:[240,248],65:[.61,.65]};
const integers=new Set([26,27,28,30,32,34,35,55,56,57,58,61,62,63,64]);
test('all numeric intervals, disjoint alternatives and source rounding instructions',()=>{
 for(const [n,r] of Object.entries(ranges)){const q=rows[n-1];assert.equal(q.question_type,'NAT');assert.deepEqual([q.answer_min,q.answer_max],r);assert.equal(q.answer_decimal_places,integers.has(+n)?0:+n===29?1:2);assert.deepEqual(q.options,[]);}
 assert.deepEqual(rows[55].answer_ranges,[{min:188,max:192},{min:198,max:202}]);assert.deepEqual(rows[62].answer_ranges,[{min:675,max:700},{min:1725,max:1740}]);
});
test('independent calculations for all 22 NAT questions agree with official intervals',()=>{
 const p=Math.PI,w1=1000*2*p/60,w2=1500*2*p/60;
 const values={26:2*5,27:60*240/(60+240),28:150000/600,29:1/(4*20e-9)/1e6,30:Math.round(10*Math.log10(20)),31:10*(6*3/(6+3))/(2+6*3/(6+3)),32:200**2/50,33:10*.5/Math.sqrt(100+16+9),34:2*100/Math.hypot(6,8),35:120*40/8*(1-1/40),54:1/(2*.5),55:4*75/3,56:500*(250/.06)/(250/.06+400/.064),57:5*(50*p)/(2*15*20)*180/p,58:10000/p,59:60/p*Math.cos(p/8),60:2*Math.SQRT2*(5000/30)/1000,61:(1-.4)*14*20e-6*1e6,62:280/(.25+11*.03),63:.05*(w2*w2-w1*w1)+2*(w1+w2)/2*4,64:Math.hypot(400/Math.sqrt(3)+12000/(Math.sqrt(3)*400*.8)*.6,12000/(Math.sqrt(3)*400*.8)*.8),65:Math.sqrt(2/5)};
 assert.equal(Object.keys(values).length,22);const {gradeResponse}=load('lib/question-response.ts');for(const [n,v] of Object.entries(values)){const q=rows[n-1];const rounded=Number(v.toFixed(q.answer_decimal_places));assert.equal(gradeResponse(q,String(rounded)),true,`Q${n}: ${rounded}`);}
});
test('actual grader rejects disjoint gaps, excess precision and rounding into range',()=>{
 const {gradeResponse}=load('lib/question-response.ts');for(const [n,good,bad] of [[56,['188','192','198','202'],['193','197','200.1']],[63,['675','700','1725','1740'],['701','1724','1732.59']],[29,['12.3','12.7','12.5'],['12.49']],[59,['17.3','18','17.64'],['17.299','17.641']],[26,['10','10.00'],['9','10.01']]]){for(const a of good)assert.equal(gradeResponse(rows[n-1],a),true,`Q${n}: ${a}`);for(const a of bad)assert.equal(gradeResponse(rows[n-1],a),false,`Q${n}: ${a}`);}
});
test('21 original diagrams and 8 graphical choices have PNG assets and sensible dimensions',()=>{
 assert.equal(rows.filter(q=>q.figure).length,21);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),8);
 for(const q of rows){assert.equal(q.option_images.length,[10,36].includes(q.source_question_number)?4:0);if(q.question_type==='MCQ')for(let i=0;i<4;i++)assert.ok(q.options[i]||q.option_images[i]);for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){const b=fs.readFileSync(path.join(root,'public',f.local_url));assert.equal(b.subarray(1,4).toString(),'PNG');assert.ok(f.width>0&&f.height>0);}}
});
test('Q37 inferred source correction is visible and does not silently rewrite the source record',()=>{
 const q=rows[36];assert.match(q.question_text,/Editorial correction/);assert.match(q.question_text,/not an official erratum/);assert.equal(q.source_metadata.editorial_correction.original_transfer_function,'100/(s^2+0.1s+10)');assert.equal(q.source_metadata.editorial_correction.displayed_transfer_function,'100/(s^2+0.1s+100)');assert.match(q.explanation,/0.1111/);
 assert.equal(100/100,1);assert.equal(.1*100/Math.hypot(100-100,1),10);
});
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



