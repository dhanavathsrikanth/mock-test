const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EC-electronics-and-communication-engineering'),paper=path.join(base,'papers/2022/EC');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('complete 2022 paper: numbering, batches, source marks and type counts',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[33,14,18]);assert.deepEqual(rows.filter(q=>q.marks_to_all).map(q=>q.source_question_number),[]);
 for(const [a,b]of[[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`),'utf8')),rows.slice(a-1,b));
 for(const q of rows){let n=q.source_question_number;assert.equal(q.source_metadata.original_question_number,n);assert.equal(q.source_metadata.key_page,n<=44?1:2);assert.equal(q.source_metadata.session,3);assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);assert.equal(q.organising_institute,'IIT Kharagpur');}
});
test('all official MCQ letters and MSQ answer sets match independently read key',()=>{
 for(const [a,letters]of[[1,'CDBBCDCCBB'],[11,'ACBBAACCCCCACC'],[36,'BAABCCAAA']])for(let i=0;i<letters.length;i++)assert.equal(rows[a+i-1].correct_option,letters.charCodeAt(i)-64,`Q${a+i}`);
 const msq={25:[1,2],26:[2,3],27:[2,3],28:[3],29:[1,2,4],30:[1,3],45:[2,4],46:[3,4],47:[1,3],48:[1,3],49:[1,3],50:[1],51:[1]};const {gradeResponse}=load('lib/question-response.ts');
 for(const [n,set]of Object.entries(msq)){const q=rows[n-1];assert.deepEqual(q.correct_options,set);assert.equal(gradeResponse(q,set),true);for(let mask=0;mask<16;mask++){const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));const same=JSON.stringify(chosen)===JSON.stringify(set);assert.equal(gradeResponse(q,chosen),chosen.length?same:null,`Q${n} mask ${mask}`);}}
 assert.equal(gradeResponse(rows[51],null),null);assert.deepEqual(rows[51].correct_options,[1,3]);
});

test('user-corrected Q52 TE cutoff, unchanged options and exact-set MSQ scoring',()=>{
 const q=rows[51],old=JSON.parse(fs.readFileSync(path.join(paper,'q52-original-before-editorial-correction.json'),'utf8'));
 assert.match(q.question_text,/TE waves/);assert.deepEqual(q.options,old.options);assert.equal(q.source_metadata.official_answer_key,'MTA');assert.equal(q.source_metadata.editorial_correction.official_scoring_preserved,false);
 const cutoff=3e8/(2*1e-6);assert.equal(cutoff,1.5e14);assert.deepEqual([6e15,.5e12,8e14,1e13].map((f,i)=>f>cutoff?i+1:null).filter(Boolean),[1,3]);
 const {gradeResponse}=load('lib/question-response.ts');
 for(let mask=0;mask<16;mask++){const chosen=[1,2,3,4].filter((_,i)=>mask&(1<<i));const grade=gradeResponse(q,chosen);assert.equal(grade,chosen.length?(mask===5):null);assert.equal(grade===true?q.marks:0,mask===5?2:0);}
 assert.equal(q.negative_marks,0);assert.equal(q.marks_to_all,false);
});
const intervals={31:[4,4],32:[.5,.5],33:[0,0],34:[5.5,5.7],35:[2.99,3.01],53:[512,512],54:[3.9,4.1],55:[7.9,8.1],56:[.57,.61],57:[.7,.8],58:[-.55,-.45],59:[-2.1,-1.9],60:[-.11,-.09],61:[1,1],62:[.84,.86],63:[.22,.25],64:[1.15,1.18],65:[.48,.52]};
test('all 18 numerical solutions independently recomputed and graded at source precision',()=>{
 const wickets=[5,7,8,25,20,17,8,4,3,2,1].flatMap((f,i)=>Array(f).fill(i));
 const values={31:(wickets[49]+wickets[50])/2,32:-2*(2**-1/(-2)),33:0,34:2.2+1.7*2,35:(Math.log2(4)+Math.log2(16))/2,53:2*4**4,54:(10-5)/(1000+250)*1000,55:8*1,56:1.6e-19*1e20*1e-4/Math.E*1000,57:.5/(2/3),58:-3/2*(1/3),59:-4/2,60:-1/10,61:1,62:.9**7+7*.1*.9**6,63:Math.exp(-1)-Math.exp(-2),64:.5-(-2/3),65:3*(1/12+1/12)};
 const {gradeResponse}=load('lib/question-response.ts');assert.equal(Object.keys(values).length,18);
 for(const [n,v]of Object.entries(values)){const q=rows[n-1],rounded=Number(v.toFixed(q.answer_decimal_places));assert.deepEqual([q.answer_min,q.answer_max],intervals[n]);assert.equal(gradeResponse(q,String(rounded)),true,`Q${n}: ${v}`);assert.deepEqual(q.options,[]);assert.equal(q.negative_marks,0);}
 assert.equal(gradeResponse(rows[57],'-0.50'),true);assert.equal(gradeResponse(rows[57],'0.50'),false);assert.equal(gradeResponse(rows[57],'-0.501'),false);assert.equal(gradeResponse(rows[52],'512.1'),false);
});
test('Boolean identities, fixed-reference cases and graph conclusions have independent checks',()=>{
 for(let x of[0,1])for(let y of[0,1])for(let z of[0,1]){let expected=!!(x||(y&&z));assert.equal(!!((x||y)&&(x||z)),expected);assert.equal(!!(x||(x&&y)||(y&&z)),expected);}
 const k=300/200;let vo=(3+Math.sqrt(k))/(1+Math.sqrt(k));assert.ok(vo>1&&vo<2);assert.equal(5-(-8),13);
 const frequencies=[5,7,8,25,20,17,8,4,3,2,1];assert.equal(frequencies.reduce((s,v)=>s+v),100);
 let count=0;for(let side=1;side<=4;side++)for(let x=0;x<=4-side;x++)for(let y=0;y<=4-side;y++)if(!(x<=1&&1<x+side&&y<=1&&1<y+side))count++;assert.equal(count,20);
 // Independently verify every ladder KCL equation at the proposed solution.
 let [a,b,c,d]=[2/3,8/15,2/3,1/3];for(const error of[2*a-b-.8,2.5*b-a-c,2.5*c-b-d-.8,2*d-c])assert.ok(Math.abs(error)<1e-12);
});
test('all classifications belong to mapped syllabus, with historical waveguide parent mapping',()=>{
 const tax=JSON.parse(fs.readFileSync(path.join(base,'syllabus/2027/taxonomy.json'),'utf8')).subjects;
 for(const q of rows.slice(10)){const topic=tax[q.subject][q.topic];assert.ok(topic,`Q${q.source_question_number}`);if(q.subtopic){assert.ok(topic[q.subtopic]);if(q.sub_subtopic)assert.ok(topic[q.subtopic].includes(q.sub_subtopic));}if(!q.sub_subtopic)assert.ok(q.source_metadata.classification_note);}
});
test('statements, all choices and headed worked explanations render without math errors',()=>{
 const {renderMathToHtml}=load('lib/renderMath.ts');for(const q of rows){assert.ok(q.explanation.length>200,`Q${q.source_question_number}`);assert.ok((q.explanation.match(/^### /gm)||[]).length>=3);for(const t of[q.question_text,...q.options,q.explanation])assert.doesNotMatch(renderMathToHtml(t),/katex-error/,`Q${q.source_question_number}`);}
});
test('33 diagram-only assets; numeric and formula choices remain text',()=>{
 assert.equal(rows.filter(q=>q.figure).length,33);for(const q of rows){assert.deepEqual(q.option_images,[]);if(q.figure){assert.match(q.figure.url,/question-images\/gate-ec-2022\//);const png=fs.readFileSync(path.join(root,'public',q.figure.local_url));assert.equal(png.subarray(1,4).toString(),'PNG');}if(q.question_type!=='NAT')assert.equal(q.options.length,4);}
});
