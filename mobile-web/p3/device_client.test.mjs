import test from 'node:test';
import assert from 'node:assert/strict';
import {createP3DeviceClient} from './device_client.mjs';
const item=()=>({request_id:'r1',target_id:'p3lab',op:'click',args:{ref:'e1@12345678'},page_epoch:'epoch1',state_seq:1,expires_at:Date.now()+60000});
const observed=()=>({target_id:'p3lab',origin:'https://p3.example',route:'/lab',page_epoch:'epoch1',state_seq:1});
function fixture(){
 const queue=[item()],counters={claimed:0,performed:0,approved:0,ack:0};let fail='';
 const adapters={clock:Date.now,observe:async()=>observed(),approve:async()=>{counters.approved++;return 'signed-approved-action-jwt'},
  perform:async()=>{counters.performed++;if(fail==='perform')throw Error('lost hand');return {outcome:'completed'}},
  rpc:async(tool,args,role,token)=>{assert.equal(role,'device');if(tool==='pending')return {ok:true,items:queue.slice()};
   if(tool==='claim'){assert.equal(token,'signed-approved-action-jwt');if(fail==='claim')throw Error('claim transport');queue.shift();counters.claimed++;return {ok:true,state:'UNCERTAIN',request_id:args.request_id};}
   if(tool==='ack'){counters.ack++;if(fail==='ack')throw Error('ack transport');return {ok:true,state:'COMPLETED',request_id:args.request_id};}
   throw Error('unwanted op') }};
 return {queue,counters,adapters,fail:x=>fail=x};
}
test('no queued item: device performs nothing',async()=>{
 const f=fixture();f.queue.splice(0);assert.equal((await createP3DeviceClient(f.adapters).step()).state,'IDLE');
 assert.equal(f.counters.performed,0);
});
test('owner approval, atomic claim, exactly one device action, then ACK',async()=>{
 const f=fixture();assert.equal((await createP3DeviceClient(f.adapters).step()).state,'COMPLETED');
 assert.deepEqual(f.counters,{claimed:1,performed:1,approved:1,ack:1});
});
test('missing approval forbids claim and device action',async()=>{
 const f=fixture();f.adapters.approve=async()=>null;
 assert.equal((await createP3DeviceClient(f.adapters).step()).reason,'approval_required');
 assert.equal(f.counters.performed,0);
});
test('stale page epoch forbids claim and device action',async()=>{
 const f=fixture();f.adapters.observe=async()=>({...observed(),page_epoch:'epoch2'});
 assert.equal((await createP3DeviceClient(f.adapters).step()).reason,'binding_or_page_changed');
 assert.equal(f.counters.performed,0);
});
test('lost claim response forbids any device mutation',async()=>{
 const f=fixture();f.fail('claim');assert.equal((await createP3DeviceClient(f.adapters).step()).reason,'claim_uncertain_no_action');
 assert.equal(f.counters.performed,0);
});
test('lost ACK after real action cannot trigger restart replay',async()=>{
 const f=fixture();f.fail('ack');assert.equal((await createP3DeviceClient(f.adapters).step()).state,'UNCERTAIN');
 assert.equal((await createP3DeviceClient(f.adapters).step()).state,'IDLE');assert.equal(f.counters.performed,1);
});
test('failed hand is UNCERTAIN and never automatically retried',async()=>{
 const f=fixture();f.fail('perform');assert.equal((await createP3DeviceClient(f.adapters).step()).state,'UNCERTAIN');
 assert.equal((await createP3DeviceClient(f.adapters).step()).state,'IDLE');assert.equal(f.counters.performed,1);
});
test('concurrent device instances: server claim chooses at most one',async()=>{
 const f=fixture();
 f.adapters.rpc=async(tool,args)=>{
  if(tool==='pending')return {ok:true,items:[item()]};
  if(tool==='claim'){f.counters.claimed++;return f.counters.claimed===1?{ok:true,state:'UNCERTAIN',request_id:'r1'}:{ok:false,reason:'no_replay'};}
  if(tool==='ack')return {ok:true,state:'COMPLETED',request_id:'r1'};
 };
 const a=createP3DeviceClient(f.adapters),b=createP3DeviceClient(f.adapters);
 const all=await Promise.all([a.step(),b.step()]);
 assert.equal(all.filter(r=>r.state==='COMPLETED').length,1);
 assert.equal(f.counters.performed,1);
});

// Regression from independent iPhone DirectLink evidence: no stale client
// may perform a late mutation after stop. Never infer a second send from timeout.
test('stopped client rejects new steps; late pending response creates no hand',async()=>{
 const f=fixture();let release,reached;
 const arrived=new Promise(resolve=>reached=resolve);
 f.adapters.rpc=async(tool)=>{assert.equal(tool,'pending');reached();return new Promise(resolve=>release=resolve);};
 const client=createP3DeviceClient(f.adapters),running=client.step();
 await arrived;assert.equal(client.stop(),true);assert.equal(client.stop(),false);
 release({ok:true,items:[item()]});
 assert.equal((await running).reason,'session_ended');
 assert.equal((await client.step()).reason,'session_ended');
 assert.deepEqual(f.counters,{claimed:0,performed:0,approved:0,ack:0});
});
test('owner stop during approval forbids subsequent claim and action',async()=>{
 const f=fixture();let release,reached;
 const arrived=new Promise(resolve=>reached=resolve);
 f.adapters.approve=async()=>{reached();return new Promise(resolve=>release=resolve);};
 const client=createP3DeviceClient(f.adapters),running=client.step();
 await arrived;client.stop();release('signed-approved-action-jwt');
 assert.equal((await running).reason,'session_ended');
 assert.equal(f.counters.claimed,0);assert.equal(f.counters.performed,0);
});
test('stop during in-flight claim is UNCERTAIN and performs no action',async()=>{
 const f=fixture();let release,reached;
 const arrived=new Promise(resolve=>reached=resolve),original=f.adapters.rpc;
 f.adapters.rpc=async(tool,...args)=>{
  if(tool==='claim'){reached();return new Promise(resolve=>release=resolve);}
  return original(tool,...args);
 };
 const client=createP3DeviceClient(f.adapters),running=client.step();
 await arrived;client.stop();release({ok:true,state:'UNCERTAIN',request_id:'r1'});
 const result=await running;
 assert.equal(result.state,'UNCERTAIN');assert.equal(result.reason,'session_ended_after_claim');
 assert.equal(result.request_id,'r1');assert.equal(f.counters.performed,0);
 assert.equal(f.counters.ack,0);
});
