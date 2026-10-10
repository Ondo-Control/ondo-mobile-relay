import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoundP3DeviceClient} from './device_binding_adapter.mjs';
const base=()=>({id:'p3lab',target_id:'p3lab',origin:'https://p3.example',route:'/lab',page_epoch:'epoch1',state_seq:3});
function fixture(){
 let current=base(),reads=0,opened=0,mutations=0,rpcCalls=0;
 const adapters={clock:Date.now,readNativeBinding:async()=>{reads++;return {...base()};},
  observeNative:async()=>{reads++;return {...current};},
  approveNative:async()=>{mutations++;throw Error('not allowed')},
  performAtomic:async()=>{mutations++;throw Error('not allowed')},
  rpc:async()=>{rpcCalls++;throw Error('not allowed')}};
 return {adapters,change:x=>current=x,get stats(){return {reads,opened,mutations,rpcCalls}}};
}
test('inspect current target through existing read-only native adapters without RPC, loader, or hands',async()=>{
 const f=fixture();const client=createBoundP3DeviceClient(f.adapters);
 assert.deepEqual(await client.inspectCurrent('p3lab'),{ok:true,target_id:'p3lab',origin:'https://p3.example',route:'/lab',conversation_id:null,page_epoch:'epoch1',state_seq:3});
 assert.deepEqual(f.stats,{reads:2,opened:0,mutations:0,rpcCalls:0});
});
test('wrong target or changed Origin is denied without retries or navigation',async()=>{
 const f=fixture();const client=createBoundP3DeviceClient(f.adapters);
 assert.equal((await client.inspectCurrent('another')).reason,'binding_unavailable');
 f.change({...base(),origin:'https://evil.example'});
 assert.equal((await client.inspectCurrent('p3lab')).reason,'binding_or_page_changed');
 assert.deepEqual(f.stats,{reads:3,opened:0,mutations:0,rpcCalls:0});
});
test('stopped session cannot be observed even if native WebView still exists',async()=>{
 const f=fixture();const client=createBoundP3DeviceClient(f.adapters);
 client.stop();assert.equal((await client.inspectCurrent('p3lab')).reason,'session_ended');
 assert.deepEqual(f.stats,{reads:0,opened:0,mutations:0,rpcCalls:0});
});
