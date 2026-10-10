import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createP3Issuer} from './identity_issuer.mjs';
import {verifyAttestation} from './transport.mjs';
if (!globalThis.crypto) globalThis.crypto=webcrypto;
const approvedGrant={session_id:'s1',device_id:'iphone-1',controller_id:'chatgpt',chat_id:'chat-1',controller_origin:'https://chatgpt.com',
 expires_at:Date.now()+600000,targets:[{id:'lab',kind:'browser',origin:'https://p3.example',route:'/lab',caps:['observe','click']}]};
async function fixture(){
 const key=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const pub=await crypto.subtle.exportKey('jwk',key.publicKey);let model=null,device=null,approval=null;
 const issuer=createP3Issuer({signingKey:key.privateKey,now:()=>Math.floor(Date.now()/1000),nonce:()=>crypto.randomUUID(),
  attestModel:async()=>model,attestDevice:async()=>device,attestActionApproval:async()=>approval});
 const check=async token=>verifyAttestation(new Request('https://worker.invalid',{headers:{authorization:'Bearer '+token}}),{P3_IDENTITY_PUBLIC_JWK:JSON.stringify(pub)});
 return {issuer,check,setModel:x=>model=x,setDevice:x=>device=x,setApproval:x=>approval=x};
}
const model={verified:true,source:'authenticated-mcp-host',owner_id:'owner1',session_id:'s1',controller_id:'chatgpt',chat_id:'chat-1',origin:'https://chatgpt.com'};
const device={verified:true,source:'paired-native-device',owner_id:'owner1',session_id:'s1',device_id:'iphone-1',chat_id:'chat-1',controller_id:'chatgpt',owner_approved:true,grant:approvedGrant};
test('no trusted host or device attester -> no issued token',async()=>{const f=await fixture();await assert.rejects(f.issuer.model({session_id:'s1'}),/trusted_evidence_required/);await assert.rejects(f.issuer.device({device_id:'iphone-1'}),/trusted_evidence_required/);});
test('trusted server-side model attester produces worker-verifiable short-lived JWT',async()=>{const f=await fixture();f.setModel(model);const p=await f.check(await f.issuer.model({host:'opaque'}));assert.equal(p.role,'model');assert.equal(p.chat_id,'chat-1');assert.equal(p.exp-p.iat,60);assert.equal(p.owner_id,'owner1');});
test('even trusted flag lacking provenance is rejected',async()=>{const f=await fixture();f.setModel({...model,source:'browser-message'});await assert.rejects(f.issuer.model({}),/trusted_evidence_required/);});
test('no grant, wrong chat or unexpected target origin cannot mint device identity',async()=>{const f=await fixture();for(const val of [{...device,grant:{...approvedGrant,chat_id:'foreign'}},{...device,grant:{...approvedGrant,targets:[{...approvedGrant.targets[0],origin:'http://evil'}]}},{...device,owner_approved:false}]){f.setDevice(val);await assert.rejects(f.issuer.device({}),/device_grant_incomplete|device_targets_invalid/);}});
test('trusted paired device with valid owner grant produces bound device assertion',async()=>{const f=await fixture();f.setDevice(device);const p=await f.check(await f.issuer.device({opaque:1}));assert.equal(p.role,'device');assert.equal(p.device_id,'iphone-1');assert.equal(p.owner_grant.grant.chat_id,'chat-1');});
test('no native approval, wrong request, wrong device or wrong digest cannot mint action permission',async()=>{const f=await fixture();f.setDevice(device);const cmd={request_id:'action1'};await assert.rejects(f.issuer.action({},cmd),/native_approval_required/);for(const bad of [{verified:true,source:'native-owner-approval',session_id:'s1',device_id:'foreign',request_id:'action1',digest:'a'.repeat(64)},{verified:true,source:'native-owner-approval',session_id:'s1',device_id:'iphone-1',request_id:'other',digest:'a'.repeat(64)},{verified:true,source:'native-owner-approval',session_id:'s1',device_id:'iphone-1',request_id:'action1',digest:'not-a-digest'}]){f.setApproval(bad);await assert.rejects(f.issuer.action({},cmd),/native_approval_required/);}});
test('approved exact native digest is checked and attached to device-role token',async()=>{const f=await fixture();f.setDevice(device);f.setApproval({verified:true,source:'native-owner-approval',session_id:'s1',device_id:'iphone-1',request_id:'action1',digest:'a'.repeat(64)});const p=await f.check(await f.issuer.action({}, {request_id:'action1'}));assert.equal(p.approved_action.request_id,'action1');assert.equal(p.approved_action.digest,'a'.repeat(64));});
