// ONDO P3 Stage-B MCP/phone dispatch seam. Intentionally NOT deployed.
// Authenticated host/plugin must supply identities independently of tool args.
// A model-supplied session_id, conversation, origin, device or bearer string is
// never an identity. The existing P3 native core checks identity again.
'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const ID=/^[A-Za-z0-9_.:-]{1,96}$/;
const NO=(reason)=>({ok:false,reason});
const MODEL=Object.freeze(['state','offer','status']);
const PHONE=Object.freeze(['begin','publish','pending','claim','ack','revoke']);
const MODEL_ARGS=Object.freeze({state:['after','target_id'],offer:['command'],status:['request_id']});
const PHONE_ARGS=Object.freeze({begin:[],publish:['packet'],pending:[],claim:['request_id','observed'],ack:['request_id','outcome'],revoke:[]});
function only(args,allowed) {
 return obj(args)&&Object.keys(args).every(k=>allowed.includes(k) &&
    !['__proto__','constructor','prototype','session_id','controller_id','chat_id','origin','device_id','token'].includes(k));
}
function attested(x) {
 return obj(x)&&x.verified===true&&typeof x.session_id==='string'&&ID.test(x.session_id) &&
    obj(x.context)&&x.context.authenticated===true;
}
function makeP3EndpointBridge(channel,identity) {
 if(!obj(channel)||!obj(identity)||
    !['events','offer','status','begin','publish','devicePending','deviceClaim','deviceAck','revoke'].every(k=>typeof channel[k]==='function')||
    typeof identity.model!=='function'||typeof identity.device!=='function'||
    typeof identity.deviceGrant!=='function')throw Error('trusted_p3_host_required');
 // hostContext must be injected from verified MCP OAuth + host session metadata,
 // not constructed from JSON-RPC params. OpenAI _meta session is correlation
 // evidence and is NOT independently an authorization credential.
 async function model(tool,args,hostContext){
   if(!MODEL.includes(tool)||!only(args,MODEL_ARGS[tool]))return NO('tool_denied');
   let who;try{who=await identity.model(hostContext);}catch{return NO('identity_unavailable');}
   if(!attested(who))return NO('binding_unavailable');
   if(tool==='state'){
     const after=own(args,'after')?args.after:0,target=own(args,'target_id')?args.target_id:null;
     if(!Number.isSafeInteger(after)||after<0||(target!==null&&(typeof target!=='string'||!ID.test(target))))return NO('invalid_arguments');
     return channel.events(who.session_id,who.context,after,target);
   }
   if(tool==='offer'){
     if(!obj(args.command))return NO('invalid_arguments');
     return channel.offer(who.session_id,who.context,args.command);
   }
   if(typeof args.request_id!=='string'||!ID.test(args.request_id))return NO('invalid_arguments');
   return channel.status(who.session_id,who.context,args.request_id);
 }
 async function phone(tool,args,hostContext){
   if(!PHONE.includes(tool)||!only(args,PHONE_ARGS[tool]))return NO('tool_denied');
   let who;try{who=await identity.device(hostContext);}catch{return NO('identity_unavailable');}
   if(!attested(who))return NO('binding_unavailable');
   if(tool==='begin'){
     let evidence;try{evidence=await identity.deviceGrant(hostContext,who);}catch{return NO('grant_unavailable');}
     if(!obj(evidence)||evidence.owner_approved!==true)return NO('grant_unavailable');
     // The channel's own trusted verifyGrant adapter independently checks
     // grant authenticity and exact device/controller/target permission.
     return channel.begin(evidence);
   }
   if(tool==='publish'){if(!obj(args.packet))return NO('invalid_arguments');return channel.publish(who.session_id,who.context,args.packet);}
   if(tool==='pending')return channel.devicePending(who.session_id,who.context);
   if(tool==='claim'){
     if(typeof args.request_id!=='string'||!ID.test(args.request_id)||!obj(args.observed))return NO('invalid_arguments');
     return channel.deviceClaim(who.session_id,who.context,args.request_id,args.observed);
   }
   if(tool==='ack'){
     if(typeof args.request_id!=='string'||!ID.test(args.request_id)||!['completed','rejected','uncertain'].includes(args.outcome))return NO('invalid_arguments');
     return channel.deviceAck(who.session_id,who.context,args.request_id,args.outcome);
   }
   return channel.revoke(who.session_id,who.context);
 }
 return Object.freeze({model,phone});
}
export {makeP3EndpointBridge};
