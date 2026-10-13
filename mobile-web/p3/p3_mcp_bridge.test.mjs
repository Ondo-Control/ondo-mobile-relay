import test from 'node:test';
import assert from 'node:assert/strict';
import {P3_MCP_TOOLS,dispatchP3MCP} from './p3_mcp_bridge.mjs';
const env={P3_IDENTITY_PUBLIC_JWK:'public-test',P3_SESSIONS:{}};
const req=new Request('https://p3.example/mcp',{method:'POST',headers:{authorization:'Bearer signed-test'}});
const valid=()=>({verifyAttestation:async()=>({role:'model',session_id:'s1'}),p3HttpGateway:async r=>new Response(JSON.stringify({ok:true,events:[],echo:await r.json()}))});
test('exactly three model tools; no device claim, ack or native action',()=>{
 assert.deepEqual(P3_MCP_TOOLS.map(x=>x.name),['ondo_p3_state','ondo_p3_offer','ondo_p3_status']);
 assert.equal(P3_MCP_TOOLS[0].annotations.readOnlyHint,true);
 assert.equal(P3_MCP_TOOLS[1].annotations.readOnlyHint,false);
});
test('unauthenticated/unprovisioned/wrong-role model calls are fail-closed',async()=>{
 assert.equal((await dispatchP3MCP('ondo_p3_state',{},req,{},valid())).structuredContent.reason,'p3_not_provisioned');
 assert.equal((await dispatchP3MCP('ondo_p3_offer',{command:{}},req,env,{...valid(),verifyAttestation:async()=>null})).structuredContent.reason,'attestation_required');
 assert.equal((await dispatchP3MCP('ondo_p3_state',{},req,env,{...valid(),verifyAttestation:async()=>({role:'device',session_id:'s1'})})).structuredContent.reason,'attestation_required');
 assert.equal(await dispatchP3MCP('ondo_p3_claim',{},req,env,valid()),null);
});
test('signed model tool is forwarded to the existing gateway with only authorized bearer, no tool-supplied identity',async()=>{
 let seen;
 const x=await dispatchP3MCP('ondo_p3_state',{after:3},req,env,{...valid(),p3HttpGateway:async (r)=>{seen=r;return new Response(JSON.stringify({ok:true,events:[]}))}});
 assert.equal(x.isError,false);assert.equal(new URL(seen.url).pathname,'/p3/model');
 assert.equal(seen.headers.get('authorization'),'Bearer signed-test');
 assert.deepEqual(await seen.json(),{tool:'state',args:{after:3}});
});
test('native gateway denials and malformed replies never turn into success',async()=>{
 assert.equal((await dispatchP3MCP('ondo_p3_status',{request_id:'x'},req,env,{...valid(),p3HttpGateway:async()=>new Response(JSON.stringify({ok:false,reason:'binding_mismatch'}))})).isError,true);
 assert.equal((await dispatchP3MCP('ondo_p3_status',{request_id:'x'},req,env,{...valid(),p3HttpGateway:async()=>new Response('not-json')})).structuredContent.reason,'invalid_gateway_reply');
 assert.equal((await dispatchP3MCP('ondo_p3_state',{},req,env,{...valid(),p3HttpGateway:async()=>new Response('offline',{status:503})})).structuredContent.reason,'transport_unavailable');
});
