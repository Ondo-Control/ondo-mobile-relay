'use strict';
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'device_client.mjs'),'utf8');
if(!source.includes('export function createP3DeviceClient(adapters)'))throw Error('unexpected source API');
const code=source.replace('export function createP3DeviceClient(adapters)','function createP3DeviceClient(adapters)');
const tail=`
 // Scriptable HTTPS transport: requires trusted token provider (not in this file).
 // Never accept a JWT, URL, origin, or approval from page content or a model reply.
 function createP3ScriptableRPC(serviceURL,getDeviceToken){
  if(serviceURL!=='https://ondo-mobile-web.n4rtvfvj96.workers.dev' ||
     typeof getDeviceToken!=='function')throw Error('invalid_p3_host_or_missing_device_identity');
  return async function rpc(tool,args,role,approvalToken){
   if(role!=='device')throw Error('device_only');
   const jwt=approvalToken || await getDeviceToken();
   if(typeof jwt!=='string'||jwt.length<20)throw Error('identity_unavailable');
   const req=new Request(serviceURL+'/p3/phone');
   req.method='POST';req.headers={'Content-Type':'application/json','Authorization':'Bearer '+jwt};
   req.body=JSON.stringify({tool,args});
   const result=await req.loadJSON();
   if(req.response.statusCode!==200 || !result || typeof result!=='object')
    throw Error('p3_network_or_auth_failed');
   return result;
  };
 }
 module.exports={createP3DeviceClient,createP3ScriptableRPC};
`;
fs.writeFileSync(path.join(__dirname,'device_client_scriptable.js'),code+tail);
console.log(JSON.stringify({sourceLength:source.length,scriptableLength:(code+tail).length}));
