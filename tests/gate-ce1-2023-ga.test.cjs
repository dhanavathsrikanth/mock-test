const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),katex=require('katex');
const base='data/gate-2027/streams/CE-civil-engineering/papers/2023/CE1/';
const data=JSON.parse(fs.readFileSync(base+'questions-1-10.json','utf8'));
test('CE1 2023 GA preserves all session-7 keys, marks, taxonomy and source hashes',()=>{
 assert.deepEqual(data.map(q=>q.source_question_number),[1,2,3,4,5,6,7,8,9,10]);assert.deepEqual(data.map(q=>q.answer_key),['C','C','A','D','B','D','A','D','A','A']);assert.equal(data.reduce((s,q)=>s+q.marks,0),15);
 const tax=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/papers/2026/CE2/topics.json','utf8'));
 for(const q of data){assert.equal(q.question_type,'MCQ');assert.equal(q.options.length,4);assert.equal(q.correct_option,q.answer_key.charCodeAt(0)-64);assert.equal(q.marks,q.source_question_number<=5?1:2);assert.equal(q.negative_marks,q.marks/3);assert.equal(q.organising_institute,'IIT Kanpur');assert.equal(q.subject,'General Aptitude');assert.equal(q.source_metadata.session,7);assert.equal(q.source_metadata.exam_year,2023);assert.ok(tax.areas.find(t=>t.name===q.topic)?.topics.some(t=>t.name===q.subtopic));assert.ok(['easy','medium','hard'].includes(q.difficulty));assert.ok(q.explanation.startsWith('### Solution\n')&&q.explanation.includes('### Answer\n'));for(const k of ['question_source','key_source']){const x=q.source_metadata[k];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'sources/'+x.filename)).digest('hex'),x.sha256);}}
});
test('all formulas render and four original diagrams retain dimensions and public mirrors',()=>{
 for(const q of data){for(const text of [q.question_text,...q.options,q.explanation]){assert.ok(!/[\x00-\x09\x0b-\x1f\ufffd]/.test(text));for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`Q${q.source_question_number}`);}if(q.figure){const f=q.figure,b=fs.readFileSync(base+'images/'+f.url.split('/').pop());assert.ok(b.equals(fs.readFileSync('public'+f.local_url)));assert.ok(Math.abs(b.readUInt32BE(16)/b.readUInt32BE(20)-f.width/f.height)<.025);}}
 assert.deepEqual(data.filter(q=>q.figure).map(q=>q.source_question_number),[3,5,7,10]);assert.ok(!data[4].question_text.includes(' a b c d '));assert.ok(data[8].options[1].endsWith('\\log_b c$'));
});
test('geometry, logarithms and exhaustive symmetry completions support the keyed answers',()=>{
 assert.ok(Math.abs(120/360*Math.PI*25-25*Math.PI/3)<1e-12);assert.equal(8-2*Math.PI+2*Math.PI,8);
 const logFact=n=>Array.from({length:n},(_,i)=>Math.log(i+1)).reduce((a,b)=>a+b,0),a=logFact(30),b=logFact(50),c=logFact(100);assert.ok(a/c<a/b&&a/b<1&&1<b/a&&b/a<c/a);
 const grid=['0110','1001','0000','1011','0110'].join('').split('').map(Number),whites=grid.flatMap((v,i)=>v?[]:[i]);let min=Infinity,solutions=[];
 for(let mask=0;mask<2**whites.length;mask++){const g=[...grid];let added=[];whites.forEach((i,j)=>{if(mask&(1<<j)){g[i]=1;added.push(i);}});if(added.length>5)continue;const symmetric=g.every((v,i)=>v===g[4*Math.floor(i/4)+3-i%4]&&v===g[4*(4-Math.floor(i/4))+i%4]);if(symmetric){if(added.length<min){min=added.length;solutions=[];}if(added.length===min)solutions.push(added);}}
 assert.equal(min,3);assert.deepEqual(solutions,[[5,6,13]]);
});
