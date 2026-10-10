import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {P3Session,p3HttpGateway,approvalDigest} from './transport.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const seconds=()=>Math.floor(Date.now()/1000);
const targets=[{id:'lab',kind:'browser',origin:'https://p3.example',route:'/lab',caps:['observe','click']},
 {id:'google',kind:'browser',origin:'https://www.google.com',route:'/',caps:['observe','click']}];
const grant=()=>({session_id:'session-a',controller_id:'chatgpt',chat_id:'chat-123',controller_origin:'https://chatgpt.com',
 device_id:'iphone-1',expires_at:Date.now()+180000,targets});
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function store(){const map=new Map();let tail=Promise.resolve();
 return {get:async k=>map.has(k)?structuredClone(map.get(k)):undefined,
 transaction:async cb=>{const prev=tail;let release;tail=new Promise(r=>release=r);await prev;
  try{return await cb({get:async k=>map.has(k)?structuredClone(map.get(k)):undefined,
   put:async(k,v)=>map.set(k,structuredClone(v))});}finally{release();}}};}
async function setup(){
 const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',kp.publicKey),storage=store();
 const env={P3_IDENTITY_PUBLIC_JWK:JSON.stringify(jwk)};
 env.P3_SESSIONS={idFromName:n=>n,get:n=>({fetch:r=>new P3Session({storage},env).fetch(r)})};
 async function call(role,tool,args={},extra={}){
  const now=seconds(),payload={iss:'ondo-p3-issuer',aud:'ondo-mobile-web',role,session_id:'session-a',iat:now-1,exp:now+100,
   ...(role==='model'?{controller_id:'chatgpt',chat_id:'chat-123',origin:'https://chatgpt.com'}:
    {device_id:'iphone-1',owner_grant:{owner_approved:true,grant:grant()}}),...extra};
  const unsigned=b64({typ:'JWT',alg:'ES256'})+'.'+b64(payload);
  const sig=Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,new TextEncoder().encode(unsigned))).toString('base64url');
  const req=new Request('https://p3.test/p3/'+(role==='model'?'model':'phone'),{method:'POST',
    headers:{'content-type':'application/json',authorization:'Bearer '+unsigned+'.'+sig},body:JSON.stringify({tool,args})});
  const res=await p3HttpGateway(req,env);return {status:res.status,...await res.json()};
 }
 return {call};
}
const packet=t=>({target_id:t,event_id:'e-'+t,origin:t==='lab'?'https://p3.example':'https://www.google.com',
 route:t==='lab'?'/lab':'/',page_epoch:'epoch1',state_seq:1,full_snapshot:true,
 facts:{type:'snapshot',page_ready:true,control_count:2,secret:'never-disclose'}});
const cmd={request_id:'r1',target_id:'lab',op:'click',args:{ref:'e1@12345678'},page_epoch:'epoch1',state_seq:1};
const observed={target_id:'lab',origin:'https://p3.example',route:'/lab',page_epoch:'epoch1',state_seq:1};
test('without configured owner attester and DO binding, P3 is closed',async()=>{
 const r=await p3HttpGateway(new Request('https://p3.test/p3/model',{method:'POST'}),{});
 assert.equal(r.status,503);assert.equal((await r.json()).reason,'p3_not_provisioned');
});
test('signed two-site device grant publishes sanitized snapshots to exact model chat',async()=>{
 const x=await setup();assert.equal((await x.call('device','begin')).ok,true);
 for(const t of ['lab','google'])assert.equal((await x.call('device','publish',{packet:packet(t)})).ok,true);
 const x1=await x.call('model','state',{after:0});
 assert.deepEqual(x1.events.map(e=>e.target_id),['lab','google']);
 assert.equal(JSON.stringify(x1).includes('never-disclose'),false);
 assert.equal((await x.call('model','state',{}, {chat_id:'wrong'})).reason,'binding_mismatch');
});
test('offline queue + exact signed approval + claim-before-action + no-replay',async()=>{
 const x=await setup();await x.call('device','begin');await x.call('device','publish',{packet:packet('lab')});
 assert.equal((await x.call('model','offer',{command:cmd})).state,'QUEUED');
 assert.equal((await x.call('device','claim',{request_id:'r1',observed})).reason,'approval_required');
 const digest=await approvalDigest('session-a',targets[0],cmd);
 const proof={approved_action:{request_id:'r1',digest}};
 const [a,b]=await Promise.all([x.call('device','claim',{request_id:'r1',observed},proof),
  x.call('device','claim',{request_id:'r1',observed},proof)]);
 assert.equal([a,b].filter(v=>v.ok===true).length,1);
 assert.equal((await x.call('model','status',{request_id:'r1'})).state,'UNCERTAIN');
 assert.equal((await x.call('device','pending')).items.length,0);
 assert.equal((await x.call('model','offer',{command:cmd})).reason,'no_replay');
 assert.equal((await x.call('device','ack',{request_id:'r1',outcome:'completed'})).state,'COMPLETED');
});
test('model cannot claim/ack; foreign origin cannot read; wrong proof cannot mutate',async()=>{
 const x=await setup();await x.call('device','begin');await x.call('device','publish',{packet:packet('lab')});
 await x.call('model','offer',{command:cmd});
 assert.equal((await x.call('model','claim',{request_id:'r1',observed})).reason,'tool_denied');
 assert.equal((await x.call('model','state',{}, {origin:'https://evil.invalid'})).status,403);
 assert.equal((await x.call('device','claim',{request_id:'r1',observed},
    {approved_action:{request_id:'r1',digest:'0'.repeat(64)}})).reason,'approval_required');
 assert.equal((await x.call('device','pending')).items.length,1);
});
