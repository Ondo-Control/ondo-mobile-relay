'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {createP3DeviceClient,createP3ScriptableRPC}=require('./device_client_scriptable.js');
test('Scriptable generator exports driver and bound RPC',()=>{
 assert.equal(typeof createP3DeviceClient,'function');assert.equal(typeof createP3ScriptableRPC,'function');
 assert.throws(()=>createP3ScriptableRPC('https://evil.invalid',async()=>''),/invalid_p3_host/);
});
test('missing trusted device auth prevents all HTTP traffic',async()=>{
 const old=global.Request;let requests=0;global.Request=class {constructor(){requests++;}};
 try{
  const rpc=createP3ScriptableRPC('https://ondo-mobile-web.n4rtvfvj96.workers.dev',async()=>null);
  await assert.rejects(rpc('pending',{},'device'),/identity_unavailable/);
  assert.equal(requests,0);
 }finally{global.Request=old;}
});
