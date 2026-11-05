const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EE-electrical-engineering'),paper=path.join(base,'papers/2021/EE');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('2021 EE has 65 questions, official type counts and all three batches',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[34,0,31]);
 for(const [a,b,total] of [[1,10,15],[11,30,20],[31,65,65]]){const q=JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`)));assert.deepEqual(q,rows.slice(a-1,b));assert.equal(q.reduce((s,r)=>s+r.marks,0),total);}
 for(const q of rows){let n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);assert.equal(q.organising_institute,'IIT Bombay');assert.equal(q.source_metadata.session,3);assert.equal(q.source_metadata.original_question_number,n<=10?n:n-10);assert.equal(q.source_metadata.key_page,n<=20?1:n<=43?2:3);assert.equal(q.marks_to_all,false);}
});
test('all MCQ letters match independently read official key pages',()=>{
 for(const [start,letters] of [[1,'CCDDCDCDDA'],[11,'BDCBADCBABCB'],[36,'BCCCABABACDC']])for(let i=0;i<letters.length;i++)assert.equal(rows[start+i-1].correct_option,letters.charCodeAt(i)-64,`Q${start+i}`);
});
const ranges={23:[1,1],24:[20,20],25:[300,300],26:[-3.3,-3.2],27:[8.9,9.1],28:[89.5,90.5],29:[59,61],30:[.09,.11],31:[2.3,2.5],32:[2,2.1],33:[16.7,17.7],34:[389,391],35:[29,31],48:[1,1],49:[1,1],50:[1.4,1.42],51:[100,100],52:[5,5],53:[1,1],54:[273,277],55:[.5,.54],56:[10.8,11],57:[9.5,9.6],58:[1.2,1.23],59:[1,1],60:[50,52],61:[12.3,12.6],62:[3150,3170],63:[1.55,1.65],64:[24,24],65:[50,52]};
test('all NAT intervals and exact singleton values are preserved',()=>{
 for(const [n,r] of Object.entries(ranges)){const q=rows[n-1];assert.equal(q.question_type,'NAT');assert.deepEqual([q.answer_min,q.answer_max],r);assert.equal(q.answer_decimal_places,2);assert.deepEqual(q.options,[]);assert.equal(q.answer_ranges,null);}
});
test('independent calculations check all 31 NAT solutions',()=>{
 const p=Math.PI,ic=5/3300,ib=ic/100,ve=12-ic*1.01*1200,vb=ve-.7;
 const values={23:1,24:1/(5000*10)*1e6,25:600*900/(600+900)/(0.7+0.5),26:-6/(24/7)-1.5,27:9e9*1e-6*10e-6*(1/5-1/10)*1e3,28:((40-1)*.975-2.025)/40*100,29:Math.asin(.866)*180/p,30:2/10**(26/20),31:Math.sqrt((10/8)**2-1)/(2*p*1000*50)*1e6,32:3*2**14/.024/1e6,33:vb/((12-vb)/4700+ib)/1000,34:230*1.2*Math.SQRT2,35:5/((6-5)/6),48:1,49:Math.sqrt(2+2*Math.cos(120*p/180)),50:Math.SQRT2,51:1*10*10,52:5,53:2*(1-1/2),54:300*(200-46*.025-2)/(200+504*.025+2),55:.08/((750-650)/750)-.08,56:Math.sqrt(144-25),57:(2.2/.1-1)/2.2,58:Math.sqrt(p/(p-1)),59:2-1,60:7.3/(2*p*100000*(5/22))*1e6,61:-.005/(820*Math.log(5/3.1-1))*1e6,62:1/(10000*47e-9*(Math.log(3.4/2.6)+Math.log(2.4/1.6))),63:10*(1-.6)**2,64:(20*.75/(1-.75)/10)/(1-.75),65:Math.acos(.8*p/4)*180/p};
 assert.equal(Object.keys(values).length,31);for(const [n,v] of Object.entries(values))assert.ok(v>=ranges[n][0]-1e-9&&v<=ranges[n][1]+1e-9,`Q${n}: ${v}`);
});
test('actual grader preserves signed answers, inclusive limits and decimal precision',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const [n,r] of Object.entries(ranges))for(const v of r)assert.equal(gradeResponse(rows[n-1],String(v)),true,`Q${n}`);
 assert.equal(gradeResponse(rows[25],'-3.25'),true);assert.equal(gradeResponse(rows[25],'3.25'),false);assert.equal(gradeResponse(rows[25],'-3.251'),false);
 assert.equal(gradeResponse(rows[23],'20'),true);assert.equal(gradeResponse(rows[23],'20.01'),false);assert.equal(gradeResponse(rows[49],'1.399'),false);
});
test('diagram-only assets and graphical option policy are consistent',()=>{
 assert.equal(rows.filter(q=>q.figure).length,26);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),4);
 for(const q of rows){assert.equal(q.option_images.length,q.source_question_number===2?4:0);if(q.question_type==='MCQ')for(let i=0;i<4;i++)assert.ok(q.options[i]||q.option_images[i]);for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){const b=fs.readFileSync(path.join(root,'public',f.local_url));assert.equal(b.subarray(1,4).toString(),'PNG');assert.ok(f.width>0&&f.height>0);}}
});
test('GA parking logic distinguishes impossibility from possibility without inventing a forced position',()=>{
 function permutations(a){if(!a.length)return [[]];return a.flatMap((x,i)=>permutations(a.filter((_,j)=>j!==i)).map(p=>[x,...p]));}
 const valid=permutations(['QSVR','TU','P']).map(a=>a.join('')).filter(s=>!s.includes('PQ')&&!s.includes('QP'));
 assert.ok(valid.every(s=>Math.abs(s.indexOf('Q')-s.indexOf('V'))===2));assert.ok(valid.some(s=>s.startsWith('P')||s.endsWith('P')));assert.ok(valid.some(s=>!s.startsWith('P')&&!s.endsWith('P')));
 assert.match(rows[9].explanation,/possible rather than logically compulsory/);
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


