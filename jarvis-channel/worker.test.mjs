import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './worker.mjs';
const url='https://isolated.example';
async function rpc(method,params,id=1,headers={}){
 const r=await worker.fetch(new Request(url+'/mcp',{method:'POST',headers:{'content-type':'application/json',...headers},
  body:JSON.stringify({jsonrpc:'2.0',id,method,params})}));return {status:r.status,body:await r.json()};
}
test('standalone web page is real HTML with independent same-origin health route',async()=>{
 const page=await worker.fetch(new Request(url+'/'));
 assert.equal(page.status,200);
 assert.match(await page.text(),/Eigenständiger ONDO-Kanal/);
 assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);
 const script=await worker.fetch(new Request(url+'/app.js'));
 assert.equal(script.status,200);assert.match(await script.text(),/fetch\('\/health'/);
 const health=await worker.fetch(new Request(url+'/health'));
 assert.equal(health.status,200);
 const b=await health.json();assert.equal(b.schema,'ONDO_JARVIS_CHANNEL_V1');
 assert.equal(b.device_access,false);assert.equal(b.actions_enabled,false);assert.equal(b.live_events,false);
});
test('MCP only exposes harmless transport info, no device or action tools',async()=>{
 const init=(await rpc('initialize',{protocolVersion:'2025-06-18'})).body.result;
 assert.equal(init.serverInfo.name,'ondo-jarvis-independent');
 const list=(await rpc('tools/list',{})).body.result.tools;
 assert.deepEqual(list.map(x=>x.name),['ondo_jarvis_transport_info']);
 assert.equal(list[0].annotations.readOnlyHint,true);
 const b=(await rpc('tools/call',{name:'ondo_jarvis_transport_info',arguments:{}})).body.result;
 assert.equal(b.structuredContent.device_access,false);assert.equal(b.structuredContent.relay_connected,false);
});
test('unapproved device/relay/action paths fail closed even with forged authorizations',async()=>{
 for(const route of ['/api/act','/api/events','/phone/poll','/device/connect']){
  for(const method of ['GET','POST']){
   const r=await worker.fetch(new Request(url+route,{method,headers:{authorization:'Bearer forged'}}));
   assert.equal(r.status,403);
  }
 }
 for(const name of ['ondo_start','ondo_send','ondo_click','ondo_wait','ondo_jarvis_device_connect']){
  const r=(await rpc('tools/call',{name,arguments:{}})).body;assert.equal(r.error.code,-32602);
 }
});
test('strict MCP parsing/limits and unknown routes',async()=>{
 for(const args of [{enable:true},{target:'private'},null,[],JSON.parse('{"__proto__":"no"}')]){
  const r=(await rpc('tools/call',{name:'ondo_jarvis_transport_info',arguments:args})).body;
  assert.equal(r.error.code,-32602);
 }
 const huge=await worker.fetch(new Request(url+'/mcp',{method:'POST',headers:{'content-type':'application/json'},
  body:' '.repeat(8193)}));assert.equal(huge.status,413);
 const malformed=await worker.fetch(new Request(url+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:'{'}));
 assert.equal(malformed.status,400);
 assert.equal((await worker.fetch(new Request(url+'/mcp',{method:'GET'}))).status,405);
 assert.equal((await worker.fetch(new Request(url+'/missing'))).status,404);
});
test('site never tries network, and exposure stays disabled',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('unexpected outbound request')};
 try{
  assert.equal((await worker.fetch(new Request(url+'/health'))).status,200);
  assert.equal((await rpc('tools/call',{name:'ondo_jarvis_transport_info',arguments:{}})).body.result.structuredContent.actions_enabled,false);
 }finally{globalThis.fetch=original;}
});
