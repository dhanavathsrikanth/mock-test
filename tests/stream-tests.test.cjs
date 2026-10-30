const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>{if(n in imports)return imports[n];throw Error(n);}});return exports;}
const scope=load('lib/stream-scope.ts');
const helpers=load('lib/test-pool.ts',{'./stream-scope':scope});
const topics=[{id:'root',parent_id:null,subject_id:'soil',name:'Foundation'},{id:'pile',parent_id:'root',subject_id:'soil',name:'Piles'},{id:'bearing',parent_id:'root',subject_id:'soil',name:'Bearing'},{id:'other',parent_id:null,subject_id:'water',name:'Hydrology'}];
const pool=['CE1','CE2'].flatMap(paper=>Array.from({length:65},(_,i)=>({id:`${paper}-${i+1}`,subject_id:i<30?'soil':'water',topic_id:i<15?'pile':i<30?'bearing':'other',year:2026,paper,source_question_number:i+1,marks:i<30?1:2}))).reverse();
const request={examId:'gate',streamId:'civil',mode:'full_paper',year:2026,paper:'CE1',subjectId:null,topicId:null,count:10,timed:true};
function grader({stream='civil'}={}){
  let inserted;
  const client={from(table){const builder={select(){return this},in(){return this},insert(row){inserted=row;return this},single:async()=>({data:{id:'session'},error:null}),upsert:async()=>({error:null}),then(resolve){resolve({data:table==='topics'?topics:[],error:null})}};return builder;}};
  const actions=load('app/(dashboard)/test/select/actions.ts',{'@/lib/exam-context':{requireExamContext:async()=>({user:{id:'student'},exam:{id:'gate',requires_stream:true},stream:{id:stream}})},'@/lib/supabase/server':{createClient:async()=>client},'@/lib/test-catalog':{getTestPool:async(_exam,s)=>s.id==='civil'?pool:[]},'@/lib/test-pool':helpers});
  return {create:actions.createTest,inserted:()=>inserted};
}
test('full paper snapshots exactly one shift in source order and keeps the 180-minute timer',async()=>{
 const action=grader();assert.equal((await action.create(request)).sessionId,'session');
 const row=action.inserted();assert.equal(row.stream_id,'civil');assert.equal(row.paper,'CE1');assert.equal(row.year,2026);assert.equal(row.total_questions,65);assert.equal(row.duration_minutes,180);
 assert.deepEqual(Array.from(row.question_ids),Array.from({length:65},(_,i)=>`CE1-${i+1}`));
});
test('subject and topic practice stay inside the chosen paper and include child topics',async()=>{
 const subject=grader();await subject.create({...request,mode:'subject_wise',subjectId:'soil',count:50,timed:false});
 assert.equal(subject.inserted().question_ids.length,30);assert.equal(subject.inserted().duration_minutes,0);
 assert.ok(subject.inserted().question_ids.every(id=>id.startsWith('CE1-')&&Number(id.split('-')[1])<=30));
 const topic=grader();await topic.create({...request,mode:'topic_wise',subjectId:'soil',topicId:'root',count:50});
 assert.equal(topic.inserted().question_ids.length,30);
 const subtopic=grader();await subtopic.create({...request,paper:'CE2',mode:'topic_wise',subjectId:'soil',topicId:'pile',count:50});
 assert.equal(subtopic.inserted().question_ids.length,15);assert.ok(subtopic.inserted().question_ids.every(id=>id.startsWith('CE2-')));
});
test('stale streams, foreign topics, missing source selections and empty banks never create sessions',async()=>{
 for(const selection of [{...request,streamId:'mechanical'},{...request,year:null},{...request,paper:null},{...request,year:2025},{...request,paper:'ME'},{...request,mode:'topic_wise',subjectId:'water',topicId:'pile'},{...request,mode:'subject_wise',subjectId:'foreign'}]){
   const action=grader();assert.ok((await action.create(selection)).error);assert.equal(action.inserted(),undefined);
 }
 const empty=grader({stream:'mechanical'});assert.ok((await empty.create({...request,streamId:'mechanical'})).error);assert.equal(empty.inserted(),undefined);
});
test('missing stream filters select only unstreamed content rather than every branch',()=>{
 assert.equal(scope.streamCondition(null),'stream_id.is.null');assert.equal(scope.streamCondition({id:'civil'}),'stream_id.eq.civil');
 assert.ok(helpers.validateTestSelection({...request,mode:'topic_wise',topicId:null},true));
 assert.equal(helpers.validateTestSelection({...request,mode:'full_mock',streamId:null,year:null,paper:null},false),null);
});

test('catalog queries keep the exam and stream filters while paging past 1000 questions',async()=>{
 const calls=[];
 const all=[...Array.from({length:1005},(_,i)=>({id:`civil-${i}`,exam:'gate',stream:'civil'})),{id:'me',exam:'gate',stream:'mechanical'},{id:'other-exam',exam:'other',stream:'civil'}];
 const client={from(){let exam,stream;return {select(){return this},eq(_key,value){exam=value;return this},or(value){stream=value;return this},order(){return this},async range(start,end){calls.push([start,end,exam,stream]);return {data:all.filter(q=>q.exam===exam&&stream===`stream_id.eq.${q.stream}`).slice(start,end+1),error:null};}};}};
 const catalog=load('lib/test-catalog.ts',{'@/lib/supabase/server':{createClient:async()=>client},'@/lib/stream-scope':scope});
 const rows=await catalog.getTestPool('gate',{id:'civil'});
 assert.equal(rows.length,1005);assert.ok(rows.every(q=>q.stream==='civil'&&q.exam==='gate'));
 assert.deepEqual(calls.map(c=>c[0]),[0,1000]);
});
