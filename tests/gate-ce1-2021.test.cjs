const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const katex = require('katex');
const base = path.join(__dirname, '../data/gate-2027/streams/CE-civil-engineering/papers/2021/CE1');
const rows = JSON.parse(fs.readFileSync(path.join(base, 'questions-1-10.json'), 'utf8'));

test('2021 CE1 GA preserves all ten final-key answers and 15 marks', () => {
  assert.deepEqual(rows.map(q => q.source_question_number), Array.from({length:10}, (_,i)=>i+1));
  assert.deepEqual(rows.map(q => q.correct_option), [4,2,3,2,3,2,1,1,2,3]);
  assert.equal(rows.reduce((sum,q)=>sum+q.marks,0),15);
  for (const q of rows) {
    assert.equal(q.question_type,'MCQ');
    assert.equal(q.marks, q.source_question_number<=5 ? 1:2);
    assert.equal(q.negative_marks,q.marks/3);
    assert.equal(q.options.length,4);
    assert.equal(q.marks_to_all,false);
  }
});

test('2021 CE1 GA retains source hashes, taxonomy and visual solutions', () => {
  for (const q of rows) {
    assert.equal(q.organising_institute,'IIT Bombay');
    assert.equal(q.subject,'General Aptitude');
    assert.ok(q.topic && q.subtopic && ['easy','medium','hard'].includes(q.difficulty));
    assert.ok(q.explanation.startsWith('### Solution\n'));
    assert.ok(q.explanation.includes('\n\n### Answer\n'));
    assert.equal(q.source_metadata.section,'GA');
    assert.equal(q.source_metadata.session,1);
    for (const field of ['question_source','key_source']) {
      const source=q.source_metadata[field];
      assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(base,'sources',source.filename))).digest('hex'),source.sha256);
    }
  }
});

test('2021 CE1 GA independently checks counting, folding and signed evaluation', () => {
  function permute(a) {return a.length ? a.flatMap((x,i)=>permute(a.filter((_,j)=>i!==j)).map(rest=>[x,...rest])) : [[]];}
  assert.equal(permute(['P','Q','R','S']).filter(p=>Math.abs(p.indexOf('P')-p.indexOf('R'))!==1 && p.indexOf('S')>p.indexOf('Q')).length,6);
  function folded(halveLonger) {
    let a=6,b=4;
    for(let i=0;i<3;i++) {
      if((a>=b)===halveLonger) a/=2; else b/=2;
    }
    return 2*(a+b);
  }
  assert.equal(folded(true),7); assert.equal(folded(false),13);
  const lambda=(p,q)=>p>=q?(p-q)**2:p+q;
  assert.equal(lambda(-(-3+2),(-2+3))/-(-2+1),0);
  assert.equal(100-(35+40-10),35);
  assert.equal((360/5)/2,36);
});

test('2021 CE1 GA formulas render and six graphical assets retain proportional mirrors', () => {
  const assets=[];
  for(const q of rows) {
    for (const text of [q.question_text,...q.options,q.explanation]) {
      assert.doesNotMatch(text,/\(cid:|[\uE000-\uF8FF]/);
      for(const match of text.matchAll(/\$\$([\s\S]*?)\$\$|(?<!\$)\$([^$\n]+)\$(?!\$)/g))
        assert.doesNotThrow(()=>katex.renderToString(match[1]??match[2],{throwOnError:true}));
    }
    if(q.figure)assets.push(q.figure);
    assets.push(...q.option_images);
  }
  assert.equal(assets.length,6);
  assert.equal(rows[1].option_images.length,4);
  for(const asset of assets) {
    const image=fs.readFileSync(path.join(base,'images',path.basename(asset.url)));
    assert.ok(image.equals(fs.readFileSync(path.join(__dirname,'../public',asset.local_url))));
    const [x0,y0,x1,y1]=asset.source_crop;
    assert.equal(asset.width,Math.round((x1-x0)*96/72));
    assert.equal(asset.height,Math.round((y1-y0)*96/72));
    assert.ok(image.readUInt32BE(16)>asset.width);
  }
});
