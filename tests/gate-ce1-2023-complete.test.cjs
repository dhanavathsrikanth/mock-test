const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const base='data/gate-2027/streams/CE-civil-engineering/papers/2023/CE1/';const data=JSON.parse(fs.readFileSync(base+'questions-31-65.json','utf8')),all=['1-10','11-30','31-65'].flatMap(b=>JSON.parse(fs.readFileSync(base+`questions-${b}.json`,'utf8')));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const {gradeResponse}=load('lib/question-response.ts'),{calculateMarks}=load('lib/marking.ts'),q=n=>data[n-31];
test('complete CE1 2023 has 65 unique questions, 100 marks, official final keys and verified source hashes',()=>{
 assert.deepEqual(all.map(x=>x.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(all.reduce((s,x)=>s+x.marks,0),100);assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>all.filter(q=>q.question_type===t).length),[34,10,21]);
 assert.deepEqual(data.map(x=>x.answer_key),['134.0 to 136.0','35 to 35','0.045 to 0.047','3 to 3','15 to 15 OR 26 to 27','A','A','B','B','D','A','A','A','A','D','C','A, B, D','A','A, B','B, D','B, C','\u2013 0.152 to \u2013 0.149','7 to 7','13.5 to 14.5','464000 to 472000','4.8 to 5.2','34.0 to 37.0','3.30 to 3.35','MTA','0.60 to 0.64','69.7 to 70.1','18.0 to 19.0','12 to 15','16200 to 16200','137.500 to 137.730']);
 const tax=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
 for(const x of data){assert.equal(x.organising_institute,'IIT Kanpur');assert.equal(x.source_metadata.session,7);assert.equal(x.source_metadata.exam_year,2023);assert.equal(x.options.length,x.question_type==='NAT'?0:4);assert.equal(x.marks,x.source_question_number<=35?1:2);assert.equal(x.negative_marks,x.question_type==='MCQ'?x.marks/3:0);assert.ok(tax.subjects.find(s=>s.name===x.subject)?.topics.find(t=>t.name===x.topic)?.subtopics.some(t=>t.name===x.subtopic),`Q${x.source_question_number}`);assert.ok(['easy','medium','hard'].includes(x.difficulty));assert.ok(x.explanation.startsWith('### Solution\n'));for(const k of ['question_source','key_source']){const s=x.source_metadata[k];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+s.filename)).digest('hex'),s.sha256);}}
 const qs=all.map(x=>({...x,id:String(x.source_question_number)}));assert.equal(calculateMarks(qs,[]).net,3);assert.equal(calculateMarks(qs,qs.map(x=>({question_id:x.id,is_correct:true}))).net,100);
});
test('NAT exact keys, disjoint ranges, negative values, MTA and precision remain strict',()=>{
 for(const x of data){if(x.marks_to_all){assert.equal(gradeResponse(x,undefined),true);assert.equal(gradeResponse(x,'0'),true);}else if(x.question_type==='MCQ')assert.equal(gradeResponse(x,x.correct_option),true);else if(x.question_type==='MSQ'){assert.equal(gradeResponse(x,x.correct_options),true);assert.equal(gradeResponse(x,[1,2,3,4]),false);}else {for(const r of x.answer_ranges||[{min:x.answer_min,max:x.answer_max}]){assert.equal(gradeResponse(x,String(r.min)),true);assert.equal(gradeResponse(x,String(r.max)),true);}}}
 for(const v of ['15','26','26.5','27'])assert.equal(gradeResponse(q(35),v),true);for(const v of ['15.01','20','25.99'])assert.equal(gradeResponse(q(35),v),false);
 for(const n of [32,34,53,64])assert.equal(gradeResponse(q(n),String(q(n).answer_min+.01)),false);
 assert.equal(gradeResponse(q(52),'-0.151'),true);assert.equal(gradeResponse(q(52),'0.151'),false);assert.equal(gradeResponse(q(52),'-0.1511'),false);assert.equal(gradeResponse(q(65),'137.628'),true);assert.equal(gradeResponse(q(65),'137.6281'),false);assert.equal(gradeResponse(q(33),'0.046'),true);
});
test('all final-batch math parses and twelve original figure mirrors preserve proportions',()=>{
 for(const x of data){for(const text of [x.question_text,...x.options,x.explanation]){assert.ok(!/[\x00-\x09\x0b-\x1f\ufffd]/.test(text),`Q${x.source_question_number}`);for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${x.source_question_number}`);}if(x.figure){const f=x.figure,b=fs.readFileSync(base+'images/'+f.url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));assert.ok(Math.abs(b.readUInt32BE(16)/b.readUInt32BE(20)-f.width/f.height)<.025);}}
 assert.equal(data.filter(x=>x.figure).length,12);assert.deepEqual(q(43).options,['$M_2\\text{ and }S_2$','$M_2\\text{ only}$','$S_2\\text{ only}$','$S_2\\text{ and hydraulic jump}$']);assert.ok(q(35).question_text.includes('s$^3$'));assert.ok(q(36).source_metadata.interpretation_note.includes('concave downward'));assert.ok(q(65).explanation.includes('same-side'));
});
test('independent NAT calculations satisfy each official interval at the requested precision',()=>{
 const rad=x=>x*Math.PI/180,yn=(1000*25+400*55)/1400,ka=(1-Math.sin(rad(25)))/(1+Math.sin(rad(25))),a=Math.tan(rad(18.75)),b=Math.tan(rad(12.75));
 const values={31:8*Math.sin(Math.PI/4)*200*120/1000,32:Math.atan(.7)*180/Math.PI,33:100e4*.12/(30*86400),34:3,35:15**3/(.75*300),52:(-1+Math.sqrt(1+4*.063*1.76))/(2*.063)-1.75,53:2+Math.sqrt(16+9),54:10*Math.sqrt(2),55:20*50**3/12+1000*(25-yn)**2+40*10**3/12+400*(55-yn)**2,56:15/(19*Math.cos(rad(35))**2*(Math.tan(rad(35))-Math.tan(rad(25)))),57:150*ka-40*Math.sqrt(ka),58:2*(40-30)/(18-12),60:.2*1*1.2/(2*.2)+.2**2/2,61:60+10*(1-Math.exp(-6)),62:13.6/.74,63:100*(1-Math.sqrt(1.139/1.518)),64:43200*150/(.2*2000),65:102.34+(55*b-.68)/(a-b)*a};
 const requested={31:1,32:0,33:3,34:0,35:0,52:3,53:0,54:1,55:0,56:1,57:1,58:2,60:2,61:1,62:1,63:0,64:0,65:3};
 for(const [n,v]of Object.entries(values)){const x=q(+n),value=Number(v.toFixed(requested[n]));assert.equal(gradeResponse(x,String(value)),true,`Q${n}: ${value}`);}assert.equal(Number(values[65].toFixed(3)),137.628);
 const u=values[52]+1.75;assert.ok(Math.abs((u-1.75)/.01+2*3.15*u*u-1)<1e-10);
});
test('independent checks support matrix properties, truss energy, shape factor and channel profiles',()=>{
 const A=[[1,2,3],[3,2,1],[3,1,2]];assert.equal(A[0][0]*(4-1)-A[0][1]*(6-3)+A[0][2]*(3-6),-12);assert.deepEqual(A.map(r=>r.reduce((a,b)=>a+b,0)),[6,6,6]);assert.deepEqual([0,1,2].map(j=>A.reduce((s,r)=>s+r[j],0)),[7,5,6]);
 assert.equal(4/3*3+1/3*1.5,4.5);assert.equal(Number((99/58).toFixed(1)),1.7);const ng=(1706-18*57)/(.4*10*2.5);assert.equal(ng,68);assert.equal(.3*18*.3*ng,110.16);
 const yc=(70**2/9.81)**(1/3),n1=70**.6,n2=(70/3)**.6;assert.ok(n1>yc&&yc>n2);assert.equal(2*15*(20-15)/20**2*100,37.5);
 // A concave parabola lies above its trapezoidal chords.
 const h=.25,trap=h*((0+0)/2+[.25,.5,.75].reduce((s,x)=>s+x*(1-x),0));assert.ok(trap<1/6);
});
