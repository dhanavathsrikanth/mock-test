const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/ME-mechanical-engineering'),paper=path.join(base,'papers/2025/ME');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
test('ME 2025 has every numbered question and the three requested batches',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[38,1,26]);assert.equal(rows.filter(q=>q.marks_to_all).length,0);
 for(const [a,b,total] of [[1,10,15],[11,30,20],[31,65,65]]){const batch=JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`)));assert.deepEqual(batch,rows.slice(a-1,b));assert.equal(batch.reduce((s,q)=>s+q.marks,0),total);}
 for(const q of rows){assert.equal(q.marks,q.source_question_number<=5||(q.source_question_number>=11&&q.source_question_number<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);assert.equal(q.organising_institute,'IIT Roorkee');assert.equal(q.source_metadata.session,3);assert.equal(q.source_metadata.key_page,q.source_question_number<=30?1:2);}
});
test('letters and multiple-select match the independently transcribed 2025 key',()=>{
 for(const [start,letters] of [[1,'AACDADDBBB'],[11,'CBDDBBCCBCBAABCAABBC'],[36,'ABABBAAB']])for(let i=0;i<letters.length;i++)assert.equal(rows[start+i-1].correct_option,letters.charCodeAt(i)-64,`Q${start+i}`);
 assert.deepEqual(rows[43].correct_options,[1,3]);
});
const ranges={31:[1.61,1.65],32:[5.5,5.9],33:[9.92,9.98],34:[189.8,190],35:[.70,.72],45:[-.1,.1],46:[.9,1.1],47:[.45,.55],48:[308,310],49:[80,83],50:[2.9,3.1],51:[6.5,6.8],52:[98.5,101.5],53:[1197,1203],54:[99,101],55:[.95,1.10],56:[-.29,-.25],57:[0,0],58:[1,1.1],59:[25,25],60:[61,63],61:[12,14.2],62:[.83,.87],63:[2.65,2.95],64:[26000,26100],65:[2,2]};
test('all numerical limits and both disjoint official answer sets are retained',()=>{
 for(const [n,r] of Object.entries(ranges)){const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],r);assert.equal(q.answer_decimal_places,2);assert.deepEqual(q.options,[]);}
 assert.deepEqual(rows[55].answer_ranges,[{min:-.29,max:-.25},{min:.25,max:.29}]);assert.deepEqual(rows[60].answer_ranges,[{min:12,max:14.2},{min:18,max:28.4},{min:32,max:34.2}]);
});
test('independent calculations check all 26 numerical solutions',()=>{
 const pi=Math.PI,cp=14.56,cv=10.4,h2=341+(6.5-1.1)/(7.6-1.1)*(2645-341);
 const values={31:.25/3*(.9+4*2+2*1.5+4*1.8+.4),32:2**2.5,33:2500*(.85-.65)/(pi*(25-9)),34:200*(.93*.92)**(1/3),35:1/Math.sqrt(2),45:0,46:2*.5,47:.5,48:5.67e-8*pi*25/4*.8*(800**4-500**4)/1000,49:Math.sqrt(2*(13600-1.23)*10*.03/1.23),50:3,51:.01*4181*60/(2000*pi*.06),52:102*.9*(3344-h2)/1000,53:60*(125.66/2)/pi,54:400+cv*400*(1-1.3)/(cp-cv),55:15*(300-280)/300,56:-.27*(350-150)/200,57:0,58:.5*100*.01+(100+120)/2*(.015-.01),59:Math.ceil(2/(5*Math.sin(pi/12)**2)*(2+Math.sqrt(4+5*Math.sin(pi/12)**2))),60:Math.sqrt(80**2-10**2)-Math.sqrt(20**2-10**2),61:5000/(150/3*10/Math.sqrt(2)),62:(pi/4)**(2/3),63:(400/(.2*25000/(pi*60)))/(75/25)**4*3*5,64:3000*8+3000*150/1000+.4*8*1000/2,65:(28-9-3-2)-(4+8)};
 assert.equal(Object.keys(values).length,26);for(const [n,v] of Object.entries(values))assert.ok(v>=ranges[n][0]-1e-9&&v<=ranges[n][1]+1e-9,`Q${n}: ${v}`);
 const actual=[425,415,420,430,427,418,422,416,426,421],forecast=[427,422,416,422,423,420,419,418,430,415],err=actual.map((x,i)=>x-forecast[i]);assert.equal(err.reduce((a,b)=>a+b,0)/10,.8);assert.equal(err.reduce((a,b)=>a+Math.abs(b),0)/10,4.2);
});
test('real grader accepts each official interval while rejecting gaps and excess precision',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const v of ['-.29','-.27','-.25','.25','.27','.29'])assert.equal(gradeResponse(rows[55],v),true);for(const v of ['0','.24','-.24','.271'])assert.equal(gradeResponse(rows[55],v),false);
 for(const v of ['12','14.2','18','28.4','32','34.2'])assert.equal(gradeResponse(rows[60],v),true);for(const v of ['11.99','16','30','34.21'])assert.equal(gradeResponse(rows[60],v),false);
 assert.equal(gradeResponse(rows[43],[1,3]),true);assert.equal(gradeResponse(rows[43],[1]),false);assert.equal(gradeResponse(rows[58],'25'),true);assert.equal(gradeResponse(rows[58],'25.01'),false);assert.equal(gradeResponse(rows[30],'1.625'),false);
});
test('only diagrams and actual graphical choices are PNG images',()=>{
 assert.equal(rows.filter(q=>q.figure).length,16);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),8);
 for(const q of rows){assert.equal(q.option_images.length,[8,28].includes(q.source_question_number)?4:0);if(q.question_type!=='NAT')for(let i=0;i<4;i++)assert.ok(q.options[i]||q.option_images[i]);for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){const b=fs.readFileSync(path.join(root,'public',f.local_url));assert.equal(b.subarray(1,4).toString(),'PNG');assert.ok(f.width>0&&f.height>0);}}
});
test('technical classifications reference actual third-level ME syllabus leaves',()=>{
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
