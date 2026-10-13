// ONDO P3: expose existing signed model gateway through the existing MCP entry.
// No model-controlled arguments may designate its host, device, chat or session.
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const modelTools = Object.freeze([
  {name:'ondo_p3_state',title:'ONDO P3: freigegebene Zustandsereignisse',
   description:'Liest ausschließlich serverseitig autorisierte und gefilterte P3-Ereignisse. Erfordert eine signierte, an diesen Chat gebundene Modellidentität.',
   inputSchema:{type:'object',properties:{after:{type:'integer',minimum:0},target_id:{type:'string',maxLength:96}},additionalProperties:false},
   annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},
  {name:'ondo_p3_offer',title:'ONDO P3: Auftrag zur Gerätefreigabe anbieten',
   description:'Legt einen exakt gebundenen Auftrag nur in die Warteschlange. Die Ausführung benötigt getrennte echte Geräte-/Owner-Freigabe und atomaren Claim.',
   inputSchema:{type:'object',properties:{command:{type:'object'}},required:['command'],additionalProperties:false},
   annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}},
  {name:'ondo_p3_status',title:'ONDO P3: Auftragsstatus',
   description:'Liest den Zustand eines bereits eingereichten Auftrags. UNCERTAIN darf niemals automatisch erneut ausgeführt werden.',
   inputSchema:{type:'object',properties:{request_id:{type:'string',maxLength:96}},required:['request_id'],additionalProperties:false},
   annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}
]);
export const P3_MCP_TOOLS = modelTools;
const map = Object.freeze({ondo_p3_state:'state',ondo_p3_offer:'offer',ondo_p3_status:'status'});
const deny = reason => ({isError:true,content:[{type:'text',text:reason}],structuredContent:{ok:false,reason}});
export async function dispatchP3MCP(name,args,request,env,adapters){
  const op=Object.prototype.hasOwnProperty.call(map,name)?map[name]:null;
  if(!op)return null;
  if(!object(args)||!object(adapters)||typeof adapters.verifyAttestation!=='function'||
     typeof adapters.p3HttpGateway!=='function')return deny('invalid_arguments');
  // Never infer identity from tool parameters, tool _meta, or browser-originated content.
  if(!env?.P3_IDENTITY_PUBLIC_JWK||!env?.P3_SESSIONS)return deny('p3_not_provisioned');
  let identity;
  try{identity=await adapters.verifyAttestation(request,env);}catch{return deny('attestation_required');}
  if(!object(identity)||identity.role!=='model'||typeof identity.session_id!=='string')
    return deny('attestation_required');
  const token=request.headers.get('authorization');
  if(typeof token!=='string'||!token.startsWith('Bearer '))return deny('attestation_required');
  let upstream;
  try {
    // Existing P3 gateway independently rechecks signature, role, context and session.
    const inner=new Request(new URL('/p3/model',request.url),{method:'POST',headers:{
      'content-type':'application/json','authorization':token},body:JSON.stringify({tool:op,args})});
    upstream=await adapters.p3HttpGateway(inner,env);
  }catch{return deny('transport_unavailable');}
  if(!upstream||upstream.status!==200)return deny('transport_unavailable');
  let result;
  try{result=await upstream.json();}catch{return deny('invalid_gateway_reply');}
  if(!object(result)||typeof result.ok!=='boolean')return deny('invalid_gateway_reply');
  return {isError:result.ok!==true,content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result};
}
