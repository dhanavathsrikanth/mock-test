const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),katex=require('katex');
const base='data/gate-2027/streams/CE-civil-engineering/papers/2023/CE1/';const data=JSON.parse(fs.readFileSync(base+'questions-11-30.json','utf8'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const {gradeResponse}=load('lib/question-response.ts'),{calculateMarks}=load('lib/marking.ts');const q=n=>data[n-11];
test('CE1 2023 Q11-30 keys, types, source order, taxonomy and marking match the official paper',()=>{
 assert.deepEqual(data.map(q=>q.source_question_number),Array.from({length:20},(_,i)=>i+11));assert.deepEqual(data.map(q=>q.answer_key),['D','B','A','A','A','B','MTA','A','C','D','A','D','C','B, C','B, C','A, B, C','A, C','B','0.9 to 0.9','0.445 to 0.447']);
 assert.deepEqual(['MCQ','MSQ','NAT'].map(t=>data.filter(q=>q.question_type===t).length),[13,5,2]);assert.equal(data.reduce((s,q)=>s+q.marks,0),20);
 const tax=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/syllabus/2026/syllabus.json','utf8'));
 for(const x of data){assert.equal(x.organising_institute,'IIT Kanpur');assert.equal(x.source_metadata.session,7);assert.equal(x.source_metadata.exam_year,2023);assert.ok(tax.subjects.find(s=>s.name===x.subject)?.topics.find(t=>t.name===x.topic)?.subtopics.some(t=>t.name===x.subtopic),`Q${x.source_question_number}`);assert.ok(x.explanation.startsWith('### Solution\n'));assert.equal(x.options.length,x.question_type==='NAT'?0:4);assert.equal(x.negative_marks,x.question_type==='MCQ'&&!x.marks_to_all?1/3:0);}
 const all=[...JSON.parse(fs.readFileSync(base+'questions-1-10.json','utf8')),...data].map(x=>({...x,id:String(x.source_question_number)}));assert.equal(calculateMarks(all,[]).net,1);assert.equal(calculateMarks(all,all.map(x=>({question_id:x.id,is_correct:true}))).net,35);
});
test('MCQ, MTA, exact MSQ sets and precision-specific NAT values grade correctly',()=>{
 for(const x of data){if(x.marks_to_all){assert.equal(gradeResponse(x,undefined),true);continue;}if(x.question_type==='MCQ')assert.equal(gradeResponse(x,x.correct_option),true);if(x.question_type==='MSQ'){assert.equal(gradeResponse(x,x.correct_options),true);assert.equal(gradeResponse(x,[1,2,3,4]),false);}}
 assert.equal(gradeResponse(q(28),[2]),true);assert.equal(gradeResponse(q(28),[2,3]),false);
 assert.equal(gradeResponse(q(29),'0.9'),true);assert.equal(gradeResponse(q(29),'0.91'),false);
 for(const v of ['0.445','0.446','0.447'])assert.equal(gradeResponse(q(30),v),true);for(const v of ['0.444','0.448','0.4462'])assert.equal(gradeResponse(q(30),v),false);
 assert.equal(q(30).answer_decimal_places,3);assert.ok(!q(25).question_text.includes('Source note:'));assert.equal((q(25).question_text.match(/\\frac\{n\\pi x\}/g)||[]).length,2);assert.ok(q(25).source_metadata.source_correction);assert.ok(!q(25).explanation.includes('omit'));assert.ok(q(25).explanation.includes('Odd integrands cancel'));
});
test('all formula fields render and three original diagrams preserve dimensions and local mirrors',()=>{
 for(const x of data){for(const text of [x.question_text,...x.options,x.explanation]){assert.ok(!/[\x00-\x09\x0b-\x1f\ufffd]/.test(text),`Q${x.source_question_number}`);for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${x.source_question_number}`);}if(x.figure){const f=x.figure,b=fs.readFileSync(base+'images/'+f.url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));assert.ok(Math.abs(b.readUInt32BE(16)/b.readUInt32BE(20)-f.width/f.height)<.025);}}
 assert.deepEqual(data.filter(q=>q.figure).map(q=>q.source_question_number),[12,18,26]);
});
test('independent calculations verify stresses, strains, soil ratio, raster pixels and NAT solutions',()=>{
 assert.equal(Math.max(250000/100**2,50000/50**2),25);assert.equal(Number((.002+.87*415/200000).toFixed(4)),.0038);assert.equal(.15*2.6/.5,.78);assert.equal((360-56-303)/2,.5);assert.equal((1-(300/600)**2)*100,75);assert.equal(gradeResponse(q(29),String(.5+.8-.5*.8)),true);assert.equal(gradeResponse(q(30),(-2*Math.log(.8)).toFixed(3)),true);
 for(const eps of [.1,.01,.001])assert.ok(2*(1/eps-1)>0);
 // A real rotation matrix has M^2=-I, so matrix squares need not be positive semidefinite.
 const M=[[0,-1],[1,0]];assert.deepEqual(M.map(row=>M[0].map((_,j)=>row.reduce((s,a,k)=>s+a*M[k][j],0))),[[-1,0],[0,-1]]);
});
function rank(rows){const a=rows.map(r=>[...r]);let r=0;for(let c=0;c<a[0].length&&r<a.length;c++){const p=a.findIndex((row,i)=>i>=r&&Math.abs(row[c])>1e-9);if(p<0)continue;[a[r],a[p]]=[a[p],a[r]];const d=a[r][c];a[r]=a[r].map(v=>v/d);for(let i=r+1;i<a.length;i++){const f=a[i][c];a[i]=a[i].map((v,j)=>v-f*a[r][j]);}r++;}return r;}
function trussRank(nodes,bars,supports){const rows=bars.map(([i,j])=>{const row=Array(nodes.length*2).fill(0),dx=nodes[j][0]-nodes[i][0],dy=nodes[j][1]-nodes[i][1];row[2*i]=-dx;row[2*i+1]=-dy;row[2*j]=dx;row[2*j+1]=dy;return row;});for(const [node,axis]of supports){const r=Array(nodes.length*2).fill(0);r[2*node+axis]=1;rows.push(r);}return rank(rows);}
test('rigidity matrices independently detect the two pin-jointed truss mechanisms in Q26',()=>{
 assert.equal(trussRank([[0,1],[0,0],[1,0],[1,1]],[[0,1],[1,2],[2,3],[3,0],[0,2],[1,3]],[[0,0],[0,1],[1,1],[3,0]]),7);
 assert.equal(trussRank([[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],[[0,3],[3,4],[4,5],[0,1],[1,2],[1,4],[2,5],[4,2],[1,5]],[[0,0],[0,1],[2,1]]),11);
});
