const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/gate-2027/streams/EE-electrical-engineering'),paper=path.join(base,'papers/2023/EE');
const rows=JSON.parse(fs.readFileSync(path.join(paper,'questions-1-65.json'),'utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}


test('2023 EE contains the complete single paper and three import batches',()=>{
 assert.deepEqual(rows.map(q=>q.source_question_number),Array.from({length:65},(_,i)=>i+1));assert.equal(rows.reduce((s,q)=>s+q.marks,0),100);assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>rows.filter(q=>q.question_type===t).length),[31,6,28]);
 for(const [a,b] of [[1,10],[11,30],[31,65]])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(paper,`questions-${a}-${b}.json`))),rows.slice(a-1,b));
 for(const q of rows){const n=q.source_question_number;assert.equal(q.marks,n<=5||(n>=11&&n<=35)?1:2);assert.equal(q.negative_marks,q.question_type==='MCQ'?q.marks/3:0);assert.equal(q.organising_institute,'IIT Kanpur');assert.equal(q.source_metadata.session,3);assert.equal(q.source_metadata.original_question_number,n);assert.equal(q.source_metadata.key_page,n<=45?1:2);}
});
test('all MCQs match the independently transcribed official key',()=>{
 for(const [n,letters] of [[1,'DBABCD B DAB'.replace(/ /g,'')],[11,'DBCDABCABAADB AC'.replace(/ /g,'')],[36,'DDBCCD']])for(let i=0;i<letters.length;i++)assert.equal(rows[n+i-1].correct_option,letters.charCodeAt(i)-64,`Q${n+i}`);
});
test('MSQ exact sets include the user-supplied Q43 replacement',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const [n,set] of [[26,[1,4]],[27,[2]],[28,[1,3]],[42,[1,2,4]],[43,[1,2,3]],[44,[2,3]]]){assert.deepEqual(rows[n-1].correct_options,set);assert.equal(gradeResponse(rows[n-1],set),true);assert.equal(gradeResponse(rows[n-1],[1,2,3,4]),false);if(set.length>1)assert.equal(gradeResponse(rows[n-1],set.slice(1)),false);}
 assert.equal(rows[42].marks_to_all,false);assert.equal(gradeResponse(rows[42],null),null);for(let mask=1;mask<16;mask++){const selected=[1,2,3,4].filter(n=>mask&(1<<(n-1)));assert.equal(gradeResponse(rows[42],selected),mask===7);}assert.equal(rows[42].negative_marks,0);
});
const ranges={29:[7.9,8.1],30:[1340,1345],31:[4,4],32:[5.9,6.1],33:[83,84],34:[.48,.52],35:[.9,1.1],45:[.187,.188],46:[2,2],47:[1.58,1.59],48:[760,760],49:[48,48],50:[.037,.039],51:[-12.1,-11.9],52:[237,239],53:[2150,2250],54:[1.56,1.58],55:[7.1,7.5],56:[8,8],57:[2,2],58:[39,40.5],59:[245,255],60:[7.1,7.3],61:[2.49,2.51],62:[9,10],63:[80,80],64:[414,416],65:[10,10]};
const integer=new Set([30,31,46,48,49,56,57,63,64,65]),one=new Set([29,32,53]),three=new Set([45,50]);
test('all 28 NAT intervals, signed answers and explicit source precision are preserved',()=>{
 const {gradeResponse}=load('lib/question-response.ts');
 for(const [n,r] of Object.entries(ranges)){const q=rows[n-1];assert.deepEqual([q.answer_min,q.answer_max],r);assert.equal(q.answer_decimal_places,integer.has(+n)?0:one.has(+n)?1:three.has(+n)?3:2);assert.deepEqual(q.options,[]);}
 for(const [n,good,bad] of [[45,['.187','.188'],['.19','.1869','.1875']],[50,['.038'],['.04','.0382']],[51,['-11.99'],['11.99','-11.999']],[31,['4','4.00'],['4.1']],[29,['8.0'],['8.01']]]){for(const a of good)assert.equal(gradeResponse(rows[n-1],a),true);for(const a of bad)assert.equal(gradeResponse(rows[n-1],a),false);}
});
test('independent worked calculations for every NAT agree with the official key',()=>{
 const p=Math.PI,f=t=>Math.exp(-.01*t)/(2+.01*t),L=4e-6,C=1e-6;
 const vals={29:12+(10-6)*2-6*2,30:1500*(360-15*1.2)/(400-15*1.2),31:4,32:8*1.5/2,33:Math.atan2(400*2*p*50*.001,400*.035)*180/p,34:(f(0)+4*f(.5)+f(1))/6,35:(-.8+2.8)/2,45:(1-1/4)/4,46:Math.sqrt(4),47:Math.sqrt(10)/2,48:120*40/6-(1000-960),49:48,50:(1+Math.cos(6*p/5))/5,51:12.5*Math.sin(5),52:(340/9)**2/6,53:(4*p*1e-7*5000*.005/.5*(200/(4.44*50*.005))**2+.16)*1000,54:p/(2*1000)*1000,55:7*p/6*Math.sqrt(L*C)*1e6,56:8,57:2,58:100*2.5/(2*p),59:25/(70+30)*1000,60:Math.sqrt(3)/(.12+.12),61:5/2,62:3*p,63:200-120,64:415*Math.hypot(5,-1/(2*p*50*212.21e-6)/3)/Math.hypot(5,2*p*50*.03183-1/(2*p*50*212.21e-6)/3),65:Math.hypot(6,8)};
 assert.equal(Object.keys(vals).length,28);const {gradeResponse}=load('lib/question-response.ts');for(const [n,v] of Object.entries(vals)){const q=rows[n-1];assert.equal(gradeResponse(q,String(Number(v.toFixed(q.answer_decimal_places)))),true,`Q${n}: ${v}`);}
});
test('32 original diagrams and 4 true graphical choices are present, other choices stay text',()=>{
 assert.equal(rows.filter(q=>q.figure).length,32);assert.equal(rows.reduce((s,q)=>s+q.option_images.length,0),4);
 for(const q of rows){assert.equal(q.option_images.length,q.source_question_number===26?4:0);if(q.question_type!=='NAT')for(let i=0;i<4;i++)assert.ok(q.options[i]||q.option_images[i]);for(const f of [...(q.figure?[q.figure]:[]),...q.option_images]){assert.equal(fs.readFileSync(path.join(root,'public',f.local_url)).subarray(1,4).toString(),'PNG');assert.ok(f.width>0&&f.height>0);}}
});
test('source discrepancies are explicit without inventing a revised official key',()=>{
 assert.equal(rows[26].source_metadata.source_issue.official_key,'B');assert.match(rows[26].explanation,/also mathematically true/);assert.equal(rows[42].source_metadata.official_answer_key,'MTA');assert.deepEqual(rows[42].source_metadata.content_revision.applied_answer,[1,2,3]);assert.equal(rows[42].source_metadata.content_revision.original_diagram_retained,true);assert.match(rows[51].explanation,/not positive semidefinite/);
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




test('user Q43 cycloid, maximum speed, height and top acceleration independently satisfy Lorentz motion',()=>{
 const q=2,m=3,E=5,B=7,w=q*B/m,u=E/B;
 for(const theta of [0,.3,Math.PI/2,Math.PI,2*Math.PI,7]){
  const vy=u*(1-Math.cos(theta)),vz=u*Math.sin(theta),ay=u*w*Math.sin(theta),az=u*w*Math.cos(theta),speed=Math.hypot(vy,vz),z=u/w*(1-Math.cos(theta));
  assert.ok(Math.abs(m*ay-q*B*vz)<1e-10);assert.ok(Math.abs(m*az-q*(E-B*vy))<1e-10);
  assert.ok(speed<=2*E/B+1e-10);assert.ok(z<=2*m*E/(q*B*B)+1e-10);
 }
 const vyTop=2*u,azTop=w*(u-vyTop);assert.ok(Math.abs(azTop+q*E/m)<1e-10);assert.notEqual(azTop,0);
 assert.ok(Math.abs(Math.hypot(vyTop,0)-2*E/B)<1e-10);assert.ok(Math.abs(2*u/w-2*m*E/(q*B*B))<1e-10);
 assert.deepEqual(rows[42].correct_options,[1,2,3]);assert.equal(rows[42].figure.url,'https://kygptxzyiyucpigzasat.supabase.co/storage/v1/object/public/question-images/gate-ee-2023/q43-figure.png');
});
