const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,console,URL,require:n=>n in deps?deps[n]:require(n)});return exports;}
const types=load('types/notifications.ts');
function serviceModule(){return load('lib/notifications/notification-service.ts',{
 '@/lib/supabase/cron':{createCronClient:()=>{throw new Error('No service-role key configured');}},
 '@/types/notifications':types,'./constants':{NOTIFICATION_PAGE_SIZE:20},'./event-emitter':{},'./queue':{},'./utils':{isNotificationExpired:()=>false},
});}
function client(userId='user-a',role='user'){
 const calls=[];const row={id:'notification-1',user_id:userId,title:'Test notification',is_read:false,status:'delivered'};
 return {calls,auth:{getUser:async()=>({data:{user:userId?{id:userId}:null}})},from(table){
  const filters=[];const query={
   select(...args){calls.push(['select',table,...args]);return query;},eq(k,v){filters.push([k,v]);calls.push(['eq',table,k,v]);return query;},order(){return query;},
   update(value){calls.push(['update',table,value]);return query;},
   async range(){return {data:[row],error:null,count:1};},async single(){return {data:{role},error:null};},
   then(resolve,reject){return Promise.resolve({data:[{type:'info',id:row.id}],count:1,error:null}).then(resolve,reject);},
  };return query;
 }};
}
function route(file,c,s){return load(file,{
 'next/server':{NextResponse:{json:(data,init={})=>({status:init.status||200,data})}},
 '@/lib/supabase/server':{createClient:async()=>c},'@/lib/notifications':s,'@/types/notifications':types,'@/lib/notifications/constants':{NOTIFICATION_PAGE_SIZE:20},
});}
test('inbox and count routes work without a service-role key using the authenticated client',async()=>{
 const s=serviceModule(),c=client();
 const list=await route('app/api/notifications/route.ts',c,s).GET({url:'http://localhost/api/notifications?page=1&limit=20'});
 assert.equal(list.status,200);assert.equal(list.data.notifications[0].title,'Test notification');assert.equal(list.data.unread_count,1);
 const counts=await route('app/api/notifications/unread-count/route.ts',c,s).GET();assert.equal(counts.status,200);assert.equal(counts.data.unread,1);
 assert.ok(c.calls.filter(x=>x[0]==='eq'&&x[2]==='user_id').every(x=>x[3]==='user-a'));
 assert.ok(c.calls.filter(x=>x[0]==='eq'&&x[2]==='user_id').length>=5);
});
test('request clients never share a cached inbox client and privileged callers remain explicit',async()=>{
 const s=serviceModule(),a=client('user-a'),b=client('user-b');const sa=s.getNotificationService(a),sb=s.getNotificationService(b);assert.notEqual(sa,sb);
 assert.equal((await sa.getUserNotifications('user-a')).notifications[0].user_id,'user-a');assert.equal((await sb.getUserNotifications('user-b')).notifications[0].user_id,'user-b');
 assert.throws(()=>s.getNotificationService(),/No service-role key/);
});
test('signed-out requests and non-admin access to another inbox remain rejected',async()=>{
 const s=serviceModule(),guest=client(null);
 for(const file of ['app/api/notifications/route.ts','app/api/notifications/unread-count/route.ts']){
  const response=await route(file,guest,s).GET({url:'http://localhost/api/notifications'});assert.equal(response.status,401);
 }
 assert.equal(guest.calls.length,0);
 const c=client();const r=await route('app/api/notifications/route.ts',c,s).GET({url:'http://localhost/api/notifications?userId=other-user'});assert.equal(r.status,403);assert.ok(!c.calls.some(x=>x[1]==='notifications'));
});
test('inbox updates use the request client and constrain changes to the authenticated owner',async()=>{
 const s=serviceModule(),c=client();const item=route('app/api/notifications/[id]/route.ts',c,s);
 assert.equal((await item.PATCH({json:async()=>({is_read:true})},{params:Promise.resolve({id:'notification-1'})})).status,200);
 assert.equal((await item.DELETE({}, {params:Promise.resolve({id:'notification-1'})})).status,200);
 assert.equal((await route('app/api/notifications/read-all/route.ts',c,s).PATCH()).status,200);
 assert.equal(c.calls.filter(x=>x[0]==='update').length,3);assert.equal(c.calls.filter(x=>x[0]==='eq'&&x[2]==='user_id'&&x[3]==='user-a').length,3);
});
