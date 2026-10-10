import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoundP3DeviceClient} from './device_binding_adapter.mjs';
const origin='https://p3.example',route='/lab';
const task=()=>({request_id:'r1',target_id:'p3lab',op:'click',args:{ref:'e1@12345678'},page_epoch:'epoch1',state_seq:1,expires_at:Date.now()+60000});
const binding=()=>({id:'p3lab',target_id:'p3lab',origin,route,conversation_id:'conversation1',page_epoch:'epoch1',state_seq:1});
const snapshot=()=>({...binding()});
const rig=()=>{let view=snapshot(), b=binding(), act=0, claimed=0;
 const args={clock:Date.now,readNativeBinding:async()=>b,observeNative:async()=>view,
 approveNative:async()=> 'trusted-owner-approved-jwt',performAtomic:async()=>{act++;return{outcome:'completed'}},
 rpc:async(tool,details)=>{if(tool==='pending')return{ok:true,items:[task()]};if(tool==='claim'){claimed++;return{ok:true,state:'UNCERTAIN',request_id:details.request_id}};if(tool==='ack')return{ok:true,state:'COMPLETED',request_id:details.request_id};throw Error('unexpected');}};
 return{args,get state(){return{act,claimed}},changeView:x=>view=x,changeBinding:x=>b=x};};
test('valid native binding executes after post-claim verification',async()=>{const x=rig();assert.equal((await createBoundP3DeviceClient(x.args).step()).state,'COMPLETED');assert.deepEqual(x.state,{act:1,claimed:1});});
test('wrong pre-claim origin cannot perform, even if server has a queued task',async()=>{const x=rig();x.changeView({...snapshot(),origin:'https://evil.example'});assert.equal((await createBoundP3DeviceClient(x.args).step()).reason,'observation_unavailable');assert.deepEqual(x.state,{act:0,claimed:0});});
test('post-claim route switch stays UNCERTAIN and never executes hand',async()=>{const x=rig();const rpc=x.args.rpc;x.args.rpc=async(tool,args,...more)=>{const result=await rpc(tool,args,...more);if(tool==='claim')x.changeView({...snapshot(),route:'/other'});return result;};const out=await createBoundP3DeviceClient(x.args).step();assert.equal(out.state,'UNCERTAIN');assert.deepEqual(x.state,{act:0,claimed:1});});
test('post-claim conversation swap leaves UNCERTAIN with zero actions',async()=>{const x=rig();const rpc=x.args.rpc;x.args.rpc=async(tool,args,...more)=>{const result=await rpc(tool,args,...more);if(tool==='claim')x.changeView({...snapshot(),conversation_id:'another'});return result;};const out=await createBoundP3DeviceClient(x.args).step();assert.equal(out.state,'UNCERTAIN');assert.deepEqual(x.state,{act:0,claimed:1});});
test('post-claim epoch swap blocks hand without retry',async()=>{const x=rig();const rpc=x.args.rpc;x.args.rpc=async(tool,args,...more)=>{const result=await rpc(tool,args,...more);if(tool==='claim')x.changeView({...snapshot(),page_epoch:'epoch2'});return result;};const out=await createBoundP3DeviceClient(x.args).step();assert.equal(out.state,'UNCERTAIN');assert.deepEqual(x.state,{act:0,claimed:1});});
