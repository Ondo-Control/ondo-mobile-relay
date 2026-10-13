import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from '../worker.mjs';
import {P3Session} from './transport.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const URL='https://p3.example';
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function store(){
 const map=new Map();let tail=Promise.resolve();
 return {get:async k=>map.has(k)?structuredClone(map.get(k)):undefined,
  transaction:async f=>{const prev=tail;let release;tail=new Promise(r=>release=r);await prev;
   try{return await f({get:async k=>map.has(k)?structuredClone(map.get(k)):undefined,
    put:async(k,v)=>{map.set(k,structuredClone(v));}});}finally{release();}}};
}
test('authenticated native model gateway is reachable through existing MCP, with exact-chat and role isolation',async()=>{
 const key=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',key.publicKey),storage=store();
 const env={P3_IDENTITY_PUBLIC_JWK:JSON.stringify(jwk)};
 env.P3_SESSIONS={idFromName:n=>n,get:()=>({fetch:r=>new P3Session({storage},env).fetch(r)})};
 const target={id:'lab',kind:'browser',origin:'https://p3.example',route:'/lab',caps:['observe','click']};
 const grant={session_id:'s1',controller_id:'chatgpt',chat_id:'chat-1',controller_origin:'https://chatgpt.com',device_id:'iphone-1',expires_at:Date.now()+120000,targets:[target]};
 const issue=async (role,extra={})=>{
  const now=Math.floor(Date.now()/1000),payload={iss:'ondo-p3-issuer',aud:'ondo-mobile-web',role,session_id:'s1',iat:now,exp:now+60,
   ...(role==='model'?{controller_id:'chatgpt',chat_id:'chat-1',origin:'https://chatgpt.com'}:{device_id:'iphone-1',owner_grant:{owner_approved:true,grant}}),...extra};
  const data=b64({typ:'JWT',alg:'ES256'})+'.'+b64(payload);
  const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key.privateKey,new TextEncoder().encode(data));
  return 'Bearer '+data+'.'+Buffer.from(sig).toString('base64url');
 };
 const api=async (role,tool,args={},token)=>{
  const response=await worker.fetch(new Request(URL+'/p3/'+role,{method:'POST',headers:{'content-type':'application/json',authorization:token},body:JSON.stringify({tool,args})}),env);
  return response.json();
 };
 const mcp=async(method,params,token)=>{
  const headers={'content-type':'application/json'};if(token)headers.authorization=token;
  const response=await worker.fetch(new Request(URL+'/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:3,method,params})}),env);
  return response.json();
 };
 const model=await issue('model'),device=await issue('device');
 const anonymous=await mcp('tools/list',{});
 assert.deepEqual(anonymous.result.tools.map(t=>t.name),['ondo_mobile_transport_info','ondo_p3_state','ondo_p3_offer','ondo_p3_status']);
 const deviceList=await mcp('tools/list',{},device);
 assert.deepEqual(deviceList.result.tools.map(t=>t.name),['ondo_mobile_transport_info','ondo_p3_state','ondo_p3_offer','ondo_p3_status']);
 const modelList=await mcp('tools/list',{},model);
 assert.deepEqual(modelList.result.tools.map(t=>t.name),['ondo_mobile_transport_info','ondo_p3_state','ondo_p3_offer','ondo_p3_status']);
 assert.equal((await api('phone','begin',{},device)).ok,true);
 assert.equal((await api('phone','publish',{packet:{target_id:'lab',event_id:'ev1',origin:target.origin,route:target.route,page_epoch:'ep1',state_seq:1,full_snapshot:true,facts:{type:'snapshot',page_ready:true,control_count:2,secret:'do-not-leak'}}},device)).ok,true);
 const events=(await mcp('tools/call',{name:'ondo_p3_state',arguments:{after:0}},model)).result;
 assert.equal(events.isError,false);
 assert.equal(events.structuredContent.events.length,1);
 assert.equal(JSON.stringify(events).includes('do-not-leak'),false);
 const foreign=await issue('model',{chat_id:'other-chat'});
 const denied=(await mcp('tools/call',{name:'ondo_p3_state',arguments:{after:0}},foreign)).result;
 assert.equal(denied.isError,true);
 assert.equal(denied.structuredContent.reason,'binding_mismatch');
 const deviceDenied=(await mcp('tools/call',{name:'ondo_p3_state',arguments:{}},device)).result;
 assert.equal(deviceDenied.structuredContent.reason,'attestation_required');
});
