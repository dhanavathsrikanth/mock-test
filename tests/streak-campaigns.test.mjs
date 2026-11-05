import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
function load(file,imports={},globals={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,Buffer,URL,Date,Request,console,setTimeout,clearTimeout,...globals,require:name=>imports[name]??require(name)});
  return exports;
}
const env={};
const rules=load('lib/engagement/rules.ts');
const security=load('lib/engagement/security.ts',{}, {process:{env}});
const preferences=load('lib/engagement/preferences.ts');
const email=load('lib/engagement/email.ts');
const user='00000000-0000-0000-0000-000000000001';
const other='00000000-0000-0000-0000-000000000002';
const exam='10000000-0000-0000-0000-000000000001';
const stream='20000000-0000-0000-0000-000000000001';
const fixture=`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
grant usage on schema auth to authenticated;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table exams(id uuid primary key);
create table exam_streams(id uuid primary key,exam_id uuid references exams(id),unique(id,exam_id));
create table profiles(id uuid primary key,target_exam_id uuid,target_stream_id uuid,banned boolean default false);
create table notification_preferences(user_id text primary key,daily_reminder boolean default true,streak_alert boolean default true,daily_question_alert boolean default true,exam_date_alert boolean default true,reminder_time text default '08:00',updated_at timestamptz default now());
create table push_subscriptions(user_id uuid primary key,subscription jsonb);
create table streaks(user_id uuid primary key,current_streak integer default 0,last_activity_date date);
insert into exams values('${exam}');
insert into exam_streams values('${stream}','${exam}');
insert into profiles values('${user}','${exam}','${stream}',false),('${other}','${exam}','${stream}',false);
insert into notification_preferences(user_id) values('${user}'),('${other}');
insert into streaks values('${user}',4,(now() at time zone 'Asia/Kolkata')::date);
`;
async function setup() {
  const db=new PGlite(); await db.exec(fixture);
  await db.exec(fs.readFileSync('supabase/migrations/20261105011314_streak_campaigns.sql','utf8'));
  return db;
}
async function campaign(db,enabled=true) {
  return (await db.query('insert into streak_campaigns(name,exam_id,enabled) values($1,$2,$3) returning id',['Test milestone',exam,enabled])).rows[0].id;
}
async function consent(db) {
  await db.query("update notification_preferences set milestone_enabled=true,milestone_consent_at=now(),milestone_consent_version='streak-milestones-v1' where user_id=$1",[user]);
}
async function streak(db,n) { await db.query('update streaks set current_streak=$1 where user_id=$2',[n,user]); }
async function claim(db) { return (await db.query('select * from claim_streak_campaign_jobs(5)')).rows; }

test('milestones require explicit consent, match scope, and never resend the same milestone',async()=>{
  const db=await setup(); try {
    await campaign(db); await streak(db,5);
    assert.equal((await claim(db)).length,0,'legacy users are not opted in');
    await streak(db,4); await consent(db); await streak(db,5);
    assert.equal((await claim(db))[0].milestone,5);
    await streak(db,6); assert.equal((await claim(db)).length,0);
    await streak(db,7); assert.equal((await claim(db))[0].milestone,7);
    await streak(db,0); await streak(db,7);
    assert.equal((await db.query('select count(*)::int n from streak_campaign_jobs')).rows[0].n,2);
    assert.equal((await db.query('select count(*)::int n from streak_campaign_consent')).rows[0].n,1);
    await db.exec('update notification_preferences set milestone_enabled=false');
    assert.equal((await db.query('select count(*)::int n from streak_campaign_consent')).rows[0].n,2);
  } finally {await db.close();}
});
test('campaigns default disabled, reject overlapping enabled scopes, and select only the highest crossed milestone',async()=>{
  const db=await setup(); try {
    const id=await campaign(db,false); await consent(db); await streak(db,7);
    assert.equal((await claim(db)).length,0);
    await db.query('update streak_campaigns set enabled=true where id=$1',[id]);
    await assert.rejects(db.query('insert into streak_campaigns(name,exam_id,stream_id,enabled) values($1,$2,$3,true)',['Overlap',exam,stream]),/already covers/);
    await streak(db,0); await streak(db,7);
    const jobs=await claim(db); assert.equal(jobs.length,1); assert.equal(jobs[0].milestone,7);
    await db.exec('delete from streak_campaign_jobs; update profiles set banned=true');
    await streak(db,0); await streak(db,5); assert.equal((await claim(db)).length,0);
  } finally {await db.close();}
});
test('queue leases fence stale workers, defer without consuming retries, and enforce daily contact spacing',async()=>{
  const db=await setup(); try {
    await campaign(db); await consent(db); await streak(db,5);
    const first=(await claim(db))[0]; assert.equal(first.attempts,1);
    assert.equal((await claim(db)).length,0);
    await db.query("update streak_campaign_jobs set lease_until=now()-interval '1 second' where id=$1",[first.id]);
    const second=(await claim(db))[0]; assert.equal(second.attempts,2);
    assert.notEqual(first.lease_token,second.lease_token);
    const finish=async(job,status)=> (await db.query('select finish_streak_campaign_job($1,$2,$3) ok',[job.id,job.lease_token,status])).rows[0].ok;
    assert.equal(await finish(first,'delivered'),false);
    assert.equal((await db.query('select reserve_streak_campaign_contact($1,$2) next',[second.id,second.lease_token])).rows[0].next,null);
    assert.equal((await db.query('select reserve_streak_campaign_contact($1,$2) next',[second.id,second.lease_token])).rows[0].next,null,'same-job retries are allowed');
    assert.equal(await finish(second,'deferred'),true);
    assert.equal((await db.query('select attempts from streak_campaign_jobs')).rows[0].attempts,1);
    await db.exec("update streak_campaign_jobs set status='delivered'");
    await streak(db,7); const next=(await claim(db))[0];
    assert.ok((await db.query('select reserve_streak_campaign_contact($1,$2) next',[next.id,next.lease_token])).rows[0].next);
    await finish(next,'pending'); await db.exec('update streak_campaign_jobs set attempts=5 where delivered_at is null');
    assert.equal((await claim(db)).length,0);
    assert.equal((await db.query("select status from streak_campaign_jobs where milestone=7")).rows[0].status,'dead');
  } finally {await db.close();}
});
test('queue and RPCs are service-only; preferences are isolated and signed webhook events deduplicate',async()=>{
  const db=await setup(); try {
    await db.query("select record_streak_email_event('evt_1',array['Student@Example.com'],'email.bounced')");
    await db.query("select record_streak_email_event('evt_1',array['other@example.com'],'email.bounced')");
    assert.equal((await db.query('select count(*)::int n from streak_email_suppressions')).rows[0].n,1);
    await db.exec(`select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`);
    assert.equal((await db.query('select user_id from notification_preferences')).rows.length,1);
    await assert.rejects(db.query('update notification_preferences set user_id=$1 where user_id=$2',[other,user]),/row-level security/);
    await assert.rejects(db.query('select * from streak_campaign_jobs'),/permission denied/);
    await assert.rejects(db.query('select * from claim_streak_campaign_jobs()'),/permission denied/);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from streak_campaigns'),/permission denied/);
  } finally {await db.close();}
});
test('IST quiet hours handle midnight and exact boundaries; tokens and preference validation reject tampering',()=>{
  assert.equal(rules.quietUntil(new Date('2026-11-04T15:30:00Z')).toISOString(),'2026-11-05T02:30:00.000Z');
  assert.equal(rules.quietUntil(new Date('2026-11-05T00:00:00Z')).toISOString(),'2026-11-05T02:30:00.000Z');
  assert.equal(rules.quietUntil(new Date('2026-11-05T02:30:00Z')),null);
  assert.equal(rules.quietUntil(new Date(),'08:00','08:00'),null);
  const secret='a'.repeat(32),token=security.unsubscribeToken(user,secret);
  assert.equal(security.verifyUnsubscribe(token,secret),user);
  assert.equal(security.verifyUnsubscribe(token+'x',secret),null);
  assert.equal(security.verifyUnsubscribe(token,'b'.repeat(32)),null);
  assert.equal(security.authorizedCron(new Request('https://example.com')),false);
  env.CRON_SECRET='a'.repeat(32);
  assert.equal(security.authorizedCron(new Request('https://example.com',{headers:{authorization:`Bearer ${env.CRON_SECRET}`}})),true);
  assert.throws(()=>preferences.preferenceUpdates({user_id:other}));
  assert.throws(()=>preferences.preferenceUpdates({milestone_enabled:'true'}));
  assert.throws(()=>preferences.preferenceUpdates({quiet_hours_start:'25:00'}));
  assert.equal(preferences.preferenceUpdates({milestone_enabled:true}).milestone_enabled,true);
  const rendered=email.milestoneEmail('<script>','A & B','https://example.com','https://example.com/unsubscribe','Sender','Address');
  assert.ok(!rendered.html.includes('<script>')); assert.match(rendered.html,/&lt;script&gt;/);
  assert.ok(!rules.milestoneCopy(7).message.includes('%'));
});

function mockDb(job,prefs,overrides={}) {
  const calls=[];
  const data={profiles:{target_exam_id:exam,target_stream_id:stream,banned:false},notification_preferences:prefs,streak_campaigns:{enabled:true,exam_id:exam,stream_id:null},streaks:{current_streak:7,last_activity_date:'2026-11-05'},...overrides};
  const db={calls,from(table){
    const query={select(){return query;},eq(){return query;},async maybeSingle(){return {data:data[table]??null,error:null};},async upsert(value,options){calls.push({table,value,options});return {error:overrides.inboxError??null};}};
    return query;
  },async rpc(name,args){calls.push({name,args});return {data:name==='reserve_streak_campaign_contact' ? null:true,error:null};}};
  return db;
}
const job={id:user,user_id:user,campaign_id:other,milestone:5,exam_id:exam,stream_id:stream,channel:'in_app',attempts:1,lease_token:other,expires_at:'2026-11-07T00:00:00Z',send_started_at:null};
const prefs={milestone_enabled:true,milestone_channel:'in_app',milestone_consent_at:'2026-11-01T00:00:00Z',milestone_consent_version:rules.CONSENT_VERSION,streak:true,email_enabled:true};
const worker=load('lib/engagement/worker.ts',{'./rules':rules,'./security':security,'./email':email},{process:{env}});
test('worker rechecks withdrawn consent and scope, and defers quiet hours before sending',async()=>{
  for (const override of [{notification_preferences:{...prefs,milestone_enabled:false}},{profiles:{target_exam_id:other,target_stream_id:stream}},{streaks:{current_streak:1,last_activity_date:'2026-11-05'}},{streaks:{current_streak:7,last_activity_date:'2026-11-02'}}]) {
    const db=mockDb(job,prefs,override);
    assert.equal(await worker.processCampaignJob(db,job,new Date('2026-11-05T06:00:00Z')),'skipped');
    assert.equal(db.calls.some(c=>c.name==='mark_streak_campaign_send'),false);
  }
  const db=mockDb(job,prefs);
  assert.equal(await worker.processCampaignJob(db,job,new Date('2026-11-05T00:00:00Z')),'deferred');
  assert.equal(db.calls[0].args.p_retry_at,'2026-11-05T02:30:00.000Z');
});
test('in-app delivery uses a stable ID without overwriting read state; failed writes retry and missing email configuration defers',async()=>{
  const db=mockDb(job,prefs);
  assert.equal(await worker.processCampaignJob(db,job,new Date('2026-11-05T06:00:00Z')),'delivered');
  const write=db.calls.find(c=>c.table==='notifications');
  assert.equal(write.value.id,job.id); assert.equal(write.options.ignoreDuplicates,true); assert.equal(write.value.is_read,undefined);
  const failure=mockDb(job,prefs,{inboxError:{message:'unavailable'}});
  assert.equal(await worker.processCampaignJob(failure,job,new Date('2026-11-05T06:00:00Z')),'pending');
  const emailDb=mockDb(job,{...prefs,milestone_channel:'email'});
  assert.equal(await worker.processCampaignJob(emailDb,{...job,channel:'email'},new Date('2026-11-05T06:00:00Z')),'deferred');
  assert.equal(emailDb.calls.some(c=>c.name==='reserve_streak_campaign_contact'),false);
  const uncertain=mockDb(job,{...prefs,milestone_channel:'email'});
  assert.equal(await worker.processCampaignJob(uncertain,{...job,channel:'email',send_started_at:'2026-11-04T05:00:00Z'},new Date('2026-11-05T06:00:00Z')),'dead');
});
test('email retries preserve provider idempotency and unsubscribe headers; permanent rejection stops retries',async()=>{
  const emailEnv={APP_URL:'https://study.example.com',RESEND_API_KEY:'test-only',RESEND_WEBHOOK_SECRET:'test-only',CAMPAIGN_FROM_EMAIL:'Study <noreply@example.com>',CAMPAIGN_POSTAL_ADDRESS:'Test address',CAMPAIGN_UNSUBSCRIBE_SECRET:'z'.repeat(32)};
  const safe=load('lib/engagement/security.ts',{}, {process:{env:emailEnv}});
  const sent=[]; let providerError=null;
  class FakeResend {emails={async send(message,options){sent.push({message,options});return {data:providerError?null:{id:'fake-provider-id'},error:providerError};}};}
  const sender=load('lib/engagement/worker.ts',{'resend':{Resend:FakeResend},'./rules':rules,'./security':safe,'./email':email},{process:{env:emailEnv}});
  const emailJob={...job,channel:'email'};
  function emailDb(){const db=mockDb(job,{...prefs,milestone_channel:'email'});db.auth={admin:{async getUserById(){return {data:{user:{email:'student@example.com',email_confirmed_at:'2026-11-01'}},error:null};}}};return db;}
  assert.equal(await sender.processCampaignJob(emailDb(),emailJob,new Date('2026-11-05T06:00:00Z')),'delivered');
  assert.equal(await sender.processCampaignJob(emailDb(),emailJob,new Date('2026-11-05T06:01:00Z')),'delivered');
  assert.equal(sent[0].options.idempotencyKey,sent[1].options.idempotencyKey);
  assert.equal(sent[0].message.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');
  assert.match(sent[0].message.text,/Unsubscribe/);
  providerError={statusCode:429};
  assert.equal(await sender.processCampaignJob(emailDb(),emailJob,new Date('2026-11-05T06:00:00Z')),'pending');
  providerError={statusCode:422};
  assert.equal(await sender.processCampaignJob(emailDb(),emailJob,new Date('2026-11-05T06:00:00Z')),'dead');
});
test('signed service endpoints bypass browser login but reject missing cron secrets and forged unsubscribe links',async()=>{
  const next={NextResponse:{next:()=>({passed:true}),json:(value,init)=>Response.json(value,init)}};
  const proxy=load('proxy.ts',{'next/server':next,'@/lib/supabase/proxy':{updateSession:()=>({protected:true})}});
  for (const path of ['/unsubscribe','/api/engagement/unsubscribe','/api/engagement/email-webhook','/api/cron/streak-campaigns']) {
    assert.equal((await proxy.proxy({nextUrl:{pathname:path}})).passed,true);
  }
  assert.equal((await proxy.proxy({nextUrl:{pathname:'/api/admin/streak-campaigns'}})).protected,true);
  const noService={createCronClient:()=>{throw new Error('Unauthorized request reached database');}};
  const disabledEnv={};
  const cronSecurity=load('lib/engagement/security.ts',{}, {process:{env:disabledEnv}});
  const cron=load('app/api/cron/streak-campaigns/route.ts',{'next/server':next,'@/lib/supabase/cron':noService,'@/lib/engagement/security':cronSecurity,'@/lib/engagement/worker':{}},{process:{env:disabledEnv}});
  assert.equal((await cron.GET(new Request('https://example.com/api/cron/streak-campaigns'))).status,401);
  disabledEnv.CRON_SECRET='a'.repeat(32);
  const response=await cron.GET(new Request('https://example.com/api/cron/streak-campaigns',{headers:{authorization:`Bearer ${disabledEnv.CRON_SECRET}`}}));
  assert.equal((await response.json()).enabled,false);
  const unsubscribe=load('app/api/engagement/unsubscribe/route.ts',{'@/lib/supabase/cron':noService,'@/lib/engagement/security':security},{Response,process:{env}});
  assert.equal((await unsubscribe.POST(new Request('https://example.com/api/engagement/unsubscribe?token=forged',{method:'POST'}))).status,400);
});
