const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
function load({requiresStream=true,validStream=true}={}){
 let saved;const lookups=[];
 const client={auth:{getUser:async()=>({data:{user:{id:'student'}}})},from(table){const filters={};const b={select(){return this},eq(k,v){filters[k]=v;return this},update(row){saved=row;return this},insert(row){saved=row;return this},single:async()=>({data:{id:'student'},error:null}),maybeSingle:async()=>{lookups.push({table,filters});return {data:table==='exams'?{id:'gate',requires_stream:requiresStream}:table==='exam_streams'?(validStream?{id:'civil'}:null):{id:'student'},error:null}}};return b;}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/onboarding/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>n==='@/lib/supabase/server'?{createClient:async()=>client}:n==='next/cache'?{revalidatePath:()=>{}}:{redirect:p=>{throw Error('redirect:'+p)}}});
 return {select:exports.selectExam,saved:()=>saved,lookups};
}
function form(stream){return {get:key=>key==='examId'?'gate':stream};}
test('onboarding requires an active stream belonging to the selected exam',async()=>{
 const missing=load();assert.ok((await missing.select(form(null))).error);assert.equal(missing.saved(),undefined);
 const foreign=load({validStream:false});assert.ok((await foreign.select(form('foreign'))).error);assert.equal(foreign.saved(),undefined);assert.equal(foreign.lookups[1].filters.exam_id,'gate');
 const valid=load();await assert.rejects(valid.select(form('civil')),/redirect:\/dashboard/);assert.equal(valid.saved().target_stream_id,'civil');
});
test('choosing an exam without streams clears a previous stream selection',async()=>{
 const plain=load({requiresStream:false});await assert.rejects(plain.select(form('old-stream')),/redirect:\/dashboard/);assert.equal(plain.saved().target_stream_id,null);
});
