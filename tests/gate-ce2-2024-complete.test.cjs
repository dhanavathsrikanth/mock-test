const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const base='data/gate-2027/streams/CE-civil-engineering/papers/2024/CE2/';
const data=JSON.parse(fs.readFileSync(base+'questions-31-65.json','utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const {gradeResponse,multipleAnswerLabel}=load('lib/question-response.ts');
const q=n=>data[n-31];
test('completed CE2 2024 has all 65 questions, 100 marks and official final keys',()=>{
 const all=[...JSON.parse(fs.readFileSync(base+'questions-1-30.json','utf8')), ...data];
 assert.deepEqual(all.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(all.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>all.filter(q=>q.question_type===t).length),[40,3,22]);
 assert.deepEqual(data.map(q=>q.answer_key),['B','B','1.75 to 1.85','545 to 555','2.88 to 2.94','C','A','MTA','A','D','A','A','B','A;B;D','C;D','A;C;D OR A;C','5.11 to 5.15','10 to 10','1.176 to 1.186','150 to 150','3.20 to 3.40','30 to 30','0.63 to 0.67','0.12 to 0.14 OR 12 to 14','30 to 30','0.64 to 0.65','0.70 to 0.80','102.00 to 106.00','3.30 to 3.70','3.00 to 3.40','9.9 to 10.2','112 to 116','117.00 to 120.00','6 to 8','199.704 to 199.706']);
 const tax=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
 for(const x of data){assert.ok(tax.subjects.find(s=>s.name===x.subject)?.topics.find(t=>t.name===x.topic)?.subtopics.some(t=>t.name===x.subtopic),`Q${x.source_question_number}`);assert.equal(x.organising_institute,'IISc Bengaluru');assert.ok(['easy','medium','hard'].includes(x.difficulty));assert.ok(x.explanation.startsWith('### Solution\n'));assert.equal(x.options.length,x.question_type==='NAT'?0:4);}
});
test('special official answer sets, MTA and NAT precision grade exactly',()=>{
 for(const set of [[1,3],[1,3,4],[4,3,1]])assert.equal(gradeResponse(q(46),set),true);
 for(const set of [[1],[3,4],[1,2,3],[1,2,3,4]])assert.equal(gradeResponse(q(46),set),false);
 for(const bad of [[],[[1,1]],[[0]],[[1,5]],'A;C'])assert.equal(gradeResponse({...q(46),correct_option_sets:bad},[1,3]),false);
 assert.equal(multipleAnswerLabel(q(46).correct_option_sets),'Accepted answer sets: A + C + D OR A + C');
 assert.equal(gradeResponse(q(38),undefined),true);
 for(const n of [48,50,52,55]){assert.equal(gradeResponse(q(n),String(q(n).answer_min)),true);assert.equal(gradeResponse(q(n),String(q(n).answer_min+.01)),false);}
 for(const n of data.filter(x=>x.question_type==='NAT').map(x=>x.source_question_number)){for(const r of q(n).answer_ranges||[{min:q(n).answer_min,max:q(n).answer_max}]){assert.equal(gradeResponse(q(n),String(r.min)),true);assert.equal(gradeResponse(q(n),String(r.max)),true);}}
 assert.equal(gradeResponse(q(54),'1'),false);assert.equal(gradeResponse(q(54),'13.33'),true);assert.equal(gradeResponse(q(49),'1.181'),true);assert.equal(gradeResponse(q(65),'199.705'),true);assert.equal(gradeResponse(q(65),'199.7049'),false);
});
test('all final-batch formulas render and five original diagrams retain size and mirrors',()=>{
 let images=0;
 for(const x of data){for(const text of [x.question_text,...x.options,x.explanation]){assert.ok(!/[\x00-\x09\x0b-\x1f\ufffd]/.test(text),`Q${x.source_question_number}`);for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${x.source_question_number}`);}if(x.figure){images++;const f=x.figure,b=fs.readFileSync(base+'images/'+f.url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));assert.ok(Math.abs(b.readUInt32BE(16)/b.readUInt32BE(20)-f.width/f.height)<.025);}}
 assert.equal(images,5);
});
test('independent engineering calculations support NAT solutions and summit-curve branch',()=>{
 const values={33:270/150.92,34:.5*50*Math.PI*.7*10,35:(1.1*15**2/10)**(1/3),47:100*(Math.exp(.05)-1),49:1000*(15*27/(3*2e5)+22.5*9/(2*2e5)),51:.0035/(1+.75/11)*1000,53:2.65-2,54:(2.7/1.3-2)/(2.7/1.3-1.5),56:4.5/7,57:.25**.2,58:6/(.6*Math.PI*.1**2/4*Math.sqrt(20))*(Math.sqrt(5)-Math.sqrt(3.5)),59:2/Math.sqrt(9.81*(2/3*(.4+1.25**2/(2*9.81)))**3),60:10000*2/24/250,61:1000*64/6362,64:4*Math.sqrt(3),65:200-2.05+1.05-.95+1.655};
 for(const [n,v] of Object.entries(values)){const x=q(+n),rounded=Number(v.toFixed(x.answer_decimal_places));assert.equal(gradeResponse(x,String(rounded)),true,`Q${n}: ${rounded}`);}
 const S=.278*80*2+80**2/(254*.36),L=.08*S*S/(2*(Math.sqrt(2.3)+Math.sqrt(.35))**2);assert.ok(L>S);assert.equal(Number(L.toFixed(2)),117.93);assert.equal(gradeResponse(q(63),String(Number(L.toFixed(2)))),true);
});
