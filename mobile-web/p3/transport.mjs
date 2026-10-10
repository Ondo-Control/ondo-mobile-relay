// P3 Stage-B transport for ChatGPT's ondo-mobile-web ONLY.
// No dependency on Claude's ondo-relay. Do not deploy without real host attestations.
import {makeChannel} from './native_core.mjs';
import {makeP3EndpointBridge} from './endpoint_bridge.mjs';

const MAX=16_384;
const VALID_ID=/^[A-Za-z0-9_.:-]{1,96}$/;
const NO_STORE={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:NO_STORE});
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function b64u(s){if(typeof s!=='string'||!/^[A-Za-z0-9_-]+$/.test(s)||s.length>12000)throw Error('invalid_jws');
 const a=s.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(a),x=>x.charCodeAt(0));}
function jsonPart(s){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b64u(s)));}
function validPrincipal(p,now){
 if(!record(p)||p.iss!=='ondo-p3-issuer'||p.aud!=='ondo-mobile-web' ||
    !['model','device'].includes(p.role)||!VALID_ID.test(p.session_id||'')||
    !Number.isSafeInteger(p.iat)||!Number.isSafeInteger(p.exp)||p.exp<=now||p.iat>now+30||
    p.exp-p.iat>300||p.exp-p.iat<1)return false;
 if(p.role==='model')return VALID_ID.test(p.controller_id||'')&&VALID_ID.test(p.chat_id||'')&&
   typeof p.origin==='string'&&p.origin==='https://chatgpt.com'&&
   Object.keys(p).every(k=>!['approved_action','device_id','owner_grant'].includes(k));
 if(!VALID_ID.test(p.device_id||''))return false;
 if(p.owner_grant!==undefined){const g=p.owner_grant;
   if(!record(g)||g.owner_approved!==true||!record(g.grant)||g.grant.session_id!==p.session_id||g.grant.device_id!==p.device_id) return false;
 }
 if(p.approved_action!==undefined){const a=p.approved_action;
   if(!record(a)||!VALID_ID.test(a.request_id||'')||typeof a.digest!=='string'|| !/^[a-f0-9]{64}$/.test(a.digest))return false;
 }
 return true;
}
export async function verifyAttestation(request,env){
 const value=request.headers.get('authorization');
 if(typeof value!=='string'||!value.startsWith('Bearer ')||value.length>18000||
    !env.P3_IDENTITY_PUBLIC_JWK)return null;
 try {
  const parts=value.slice(7).split('.');if(parts.length!==3)return null;
  const head=jsonPart(parts[0]),payload=jsonPart(parts[1]);
  if(!record(head)||head.alg!=='ES256'||head.typ!=='JWT'||own(head,'jku')||own(head,'jwk')||own(head,'crit'))return null;
  const jwk=typeof env.P3_IDENTITY_PUBLIC_JWK==='string'?JSON.parse(env.P3_IDENTITY_PUBLIC_JWK):env.P3_IDENTITY_PUBLIC_JWK;
  if(!record(jwk)||jwk.kty!=='EC'||jwk.crv!=='P-256'||jwk.d!==undefined||jwk.key_ops?.includes('sign'))return null;
  const pub=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const ok=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},pub,b64u(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
  if(!ok||!validPrincipal(payload,Math.floor(Date.now()/1000)))return null;
  return payload;
 }catch{return null;}
}
async function readBody(request){
 if(request.method!=='POST'||!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))return null;
 const len=Number(request.headers.get('content-length')||0);if(!Number.isFinite(len)||len>MAX)return null;
 const bytes=new Uint8Array(await request.arrayBuffer());if(bytes.length>MAX)return null;
 try{const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  return record(body)&&typeof body.tool==='string'&&record(body.args)?body:null;
 }catch{return null;}
}
export async function p3HttpGateway(request,env){
 const u=new URL(request.url);
 if(!['/p3/model','/p3/phone'].includes(u.pathname))return null;
 if(u.search||u.hash)return reply({ok:false,reason:'invalid_route'},404);
 if(request.method!=='POST')return reply({ok:false,reason:'method_denied'},405);
 // Explicitly disabled unless trusted issuer & durable store have been provisioned.
 if(!env?.P3_SESSIONS||!env?.P3_IDENTITY_PUBLIC_JWK)return reply({ok:false,reason:'p3_not_provisioned'},503);
 const identity=await verifyAttestation(request,env);
 if(!identity || (u.pathname==='/p3/model' && identity.role!=='model') ||
    (u.pathname==='/p3/phone'&&identity.role!=='device'))return reply({ok:false,reason:'attestation_required'},403);
 const data=await readBody(request);if(!data)return reply({ok:false,reason:'invalid_payload'},400);
 try{
  const objId=env.P3_SESSIONS.idFromName(identity.session_id);
  // The Durable Object checks the signed attestation AGAIN before acting.
  return await env.P3_SESSIONS.get(objId).fetch(new Request('https://p3-internal.invalid/'+identity.role,{method:'POST',
    headers:{'content-type':'application/json','authorization':request.headers.get('authorization')},
    body:JSON.stringify(data)}));
 }catch{return reply({ok:false,reason:'transport_unavailable'},503);}
}
async function sha256(s){const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
 return Array.from(new Uint8Array(raw),b=>b.toString(16).padStart(2,'0')).join('');}
export async function approvalDigest(session,target,command){
 return sha256(JSON.stringify([session,target.id,target.origin,target.route,
   target.conversation_id||null,command.request_id,command.op,command.args,command.page_epoch,command.state_seq]));
}
export class P3Session {
 constructor(state,env){this.state=state;this.env=env;}
 async fetch(request){
  const att=await verifyAttestation(request,this.env);if(!att)return reply({ok:false,reason:'attestation_required'},403);
  const data=await readBody(request);if(!data)return reply({ok:false,reason:'invalid_payload'},400);
  const role=new URL(request.url).pathname.slice(1);
  if(role!==att.role)return reply({ok:false,reason:'role_mismatch'},403);
  const storage=this.state.storage;
  const store={
   load:async key=>await storage.get(key)||null,
   createIfAbsent:async(key,value)=>storage.transaction(async tx=>{
     if(await tx.get(key)!==undefined)return false;
     await tx.put(key,value);return true;
   }),
   atomic:async(key,fn)=>storage.transaction(async tx=>{
     const prev=await tx.get(key);const step=fn(prev??null);
     if(step.commit===true)await tx.put(key,step.state);
     return step.result;
   })
  };
  const origin=att.role==='model'?att.origin:null;
  const context=att.role==='model'?{authenticated:true,controller_id:att.controller_id,chat_id:att.chat_id,origin}:
    {authenticated:true,device_id:att.device_id};
  const channel=makeChannel({
   verifyGrant:async e=>record(e)&&e.owner_approved===true?e.grant:null,
   verifyController:async c=>c,verifyDevice:async c=>c,
   authorizeAction:async (session,target,command)=>{
     if(att.role!=='device'||!record(att.approved_action)||att.approved_action.request_id!==command.request_id)return false;
     const expected=await approvalDigest(session,target,command);
     return expected===att.approved_action.digest;
   },
   dispatch:async()=>{throw Error('direct_dispatch_forbidden');},
   filterFacts:async(_target,facts)=>{
     // The production phone sanitizer is still mandatory. Strip arbitrary text,
     // passwords and page data until a dedicated field-by-field policy exists.
     if(!record(facts)||!['snapshot','delta'].includes(facts.type))return null;
     const safe={type:facts.type};
     if(typeof facts.page_ready==='boolean')safe.page_ready=facts.page_ready;
     if(Number.isSafeInteger(facts.control_count)&&facts.control_count>=0&&facts.control_count<=200)safe.control_count=facts.control_count;
     return safe;
   },
   clock:()=>Date.now(),...store
  });
  const bridge=makeP3EndpointBridge(channel,{
   model:async()=>att.role==='model'?{verified:true,session_id:att.session_id,context}:null,
   device:async()=>att.role==='device'?{verified:true,session_id:att.session_id,context}:null,
   deviceGrant:async()=>att.role==='device'?att.owner_grant||null:null
  });
  try{
   const result=att.role==='model'?await bridge.model(data.tool,data.args,att):await bridge.phone(data.tool,data.args,att);
   return reply(result);
  }catch{return reply({ok:false,reason:'p3_runtime_unavailable'},503);}
 }
}
