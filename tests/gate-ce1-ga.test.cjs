const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const katex=require('katex');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require});return exports;}
const {calculateMarks}=load('lib/marking.ts');
const {gradeResponse}=load('lib/question-response.ts');
const {renderMathToHtml}=load('lib/renderMath.ts');
const root='data/gate-2027/streams/CE-civil-engineering/papers/2026/CE1/';
const questions=JSON.parse(fs.readFileSync(root+'questions.json','utf8'));

test('CE1 GA preserves source key, session, marks and syllabus classification',()=>{
  assert.deepEqual(questions.map(q=>q.source_question_number),Array.from({length:10},(_,i)=>i+1));
  assert.deepEqual(questions.map(q=>q.answer_key),['A','A','A','C','B','A','B','A','B','D']);
  const taxonomy=JSON.parse(fs.readFileSync('data/gate-2027/streams/CE-civil-engineering/papers/2026/CE2/topics.json','utf8'));
  questions.forEach((q,i)=>{
    assert.equal(q.question_type,'MCQ');assert.equal(q.options.length,4);
    assert.equal(q.marks,i<5?1:2);assert.equal(q.negative_marks,q.marks/3);
    assert.equal(q.source_metadata.paper,'CE1');assert.equal(q.source_metadata.session,5);
    assert.equal(q.source_metadata.section,'GA');assert.equal(q.organising_institute,'IIT Guwahati');
    assert.ok(taxonomy.areas.find(a=>a.name===q.topic)?.topics.find(t=>t.name===q.subtopic));
    assert.ok(q.explanation.includes('### Solution\n'));assert.ok(q.explanation.includes('### Answer\n'));
  });
  const sql=fs.readFileSync(root+'import.sql','utf8');
  assert.ok(sql.includes("2026,'CE1'"));assert.ok(sql.includes("q.paper='CE1'"));assert.ok(!sql.includes("q.paper='CE2'"));
});

test('CE1 GA formulas and original figure panels preserve readable math and source proportions',()=>{
  for(const q of questions)for(const text of [q.question_text,...q.options,q.explanation]){
    for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g))assert.doesNotThrow(()=>katex.renderToString(m[1]||m[2],{throwOnError:true}),`CE1 Q${q.source_question_number}`);
    assert.ok(!renderMathToHtml(text).includes('katex-error'));
  }
  assert.ok(renderMathToHtml(questions[5].question_text).includes('<table'));
  assert.equal(questions.filter(q=>q.figure).length,5);
  for(const q of questions.filter(q=>q.figure)){
    const image=q.figure,png=fs.readFileSync('public'+image.local_url);
    assert.ok(Math.abs((png.readUInt32BE(16)/png.readUInt32BE(20))/(image.width/image.height)-1)<0.02);
    assert.ok(image.url.includes('/gate-ce1-2026/'));
  }
});

test('Q9 correctly interprets white ON and black OFF and updates all seven bulbs simultaneously',()=>{
  let state=[0,0,0,1,0,0,0];const history=[state.join('')];
  for(let step=1;step<=8;step++){
    state=state.map((on,i)=>{
      const left=state[i-1]||0,right=state[i+1]||0;
      if(!on&&left+right===1)return 1;
      if(on&&i>0&&i<6&&left&&right)return 0;
      return on;
    });history.push(state.join(''));
  }
  assert.deepEqual(history,['0001000','0011100','0110110','1110111','1010101','1010101','1010101','1010101','1010101']);
  assert.equal(state.reduce((a,b)=>a+b),Number(questions[8].options[questions[8].correct_option-1]));
  assert.ok(questions[8].figure.alt.includes('white ON / black OFF'));
});

test('CE1 GA awards 15 marks for the official key and minus 5 for all incorrect responses',()=>{
  const qs=questions.map(q=>({...q,id:String(q.source_question_number)}));
  const answers=wrong=>qs.map(q=>{const choice=wrong?q.correct_option%4+1:q.correct_option;return {question_id:q.id,selected_option:choice,is_correct:gradeResponse(q,choice)};});
  assert.equal(calculateMarks(qs,answers(false)).net,15);
  assert.equal(calculateMarks(qs,answers(true)).net,-5);
  assert.equal(calculateMarks(qs,[]).net,0);
});
