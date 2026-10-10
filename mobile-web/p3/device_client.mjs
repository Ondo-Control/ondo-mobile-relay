// ONDO P3 Stage-B on-device driver. No background audio / uncontrolled retries.
// Scriptable: supply a Request-based HTTPS post adapter; the driver itself
// does not read or store logins, cookies, private keys, or bearer credentials.
// The trusted issuer and native owner-approval UI are external mandatory gates.
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const ID=/^[A-Za-z0-9_.:-]{1,96}$/;
const EPOCH=/^[A-Za-z0-9_.:-]{1,96}$/;
const OPERATIONS=Object.freeze(new Set(['click','fill','scroll','press','navigate','send']));
const freeze=result=>Object.freeze(result);
const error=reason=>freeze({ok:false,reason});
const valid=x=>typeof x==='string'&&ID.test(x)&&!['constructor','__proto__','prototype'].includes(x);
function exact(observed,job){
 return obj(observed)&&valid(observed.target_id)&&obj(job)&&
   job.target_id===observed.target_id&&
   job.page_epoch===observed.page_epoch&&
   job.state_seq===observed.state_seq&&
   typeof observed.origin==='string'&&/^https:\/\//.test(observed.origin)&&
   typeof observed.route==='string'&&observed.route.startsWith('/')&&
   !observed.route.startsWith('//')&&
   (observed.conversation_id===undefined||valid(observed.conversation_id));
}
function checkJob(job,clock){
 return obj(job)&&valid(job.request_id)&&valid(job.target_id)&&
   OPERATIONS.has(job.op)&&obj(job.args)&&EPOCH.test(job.page_epoch||'')&&
   Number.isSafeInteger(job.state_seq)&&job.state_seq>0&&
   Number.isFinite(job.expires_at)&&job.expires_at>clock()&&
   JSON.stringify(job.args).length<=8000;
}
export function createP3DeviceClient(adapters){
 const names=['rpc','observe','approve','perform','clock'];
 if(!obj(adapters)||!names.every(n=>typeof adapters[n]==='function'))throw Error('p3_trusted_device_adapters_required');
 // Concurrency within one WebView/device is serialized. Server's atomic claim
 // also protects process restarts, delayed polls and a second device instance.
 let busy=false;
 async function step(){
  if(busy)return error('busy');busy=true;
  try {
   let pending;
   try{pending=await adapters.rpc('pending',{},'device');}catch{return error('pending_unavailable');}
   if(!pending?.ok||!Array.isArray(pending.items))return error('pending_rejected');
   const item=pending.items.find(x=>checkJob(x,adapters.clock));
   if(!item)return freeze({ok:true,state:'IDLE',pending_count:pending.items.length});
   const handoff=JSON.parse(JSON.stringify(item));
   Object.freeze(handoff.args);Object.freeze(handoff);
   let observed;
   try{observed=await adapters.observe(handoff.target_id);}catch{return error('observation_unavailable');}
   if(!exact(observed,handoff))return error('binding_or_page_changed');
   // Native owner approval for the exact immutable command. Webpage/model
   // text must never be interpreted as an approval or a device credential.
   let token;
   try{token=await adapters.approve(handoff,Object.freeze({...observed}));}catch{return error('approval_unavailable');}
   if(typeof token!=='string'||token.length<20)return error('approval_required');
   let claim;
   try{claim=await adapters.rpc('claim',{request_id:handoff.request_id,observed},'device',token);}
   catch{return error('claim_uncertain_no_action');}
   if(claim?.ok!==true||claim.state!=='UNCERTAIN'||claim.request_id!==handoff.request_id)
      return error('claim_denied_no_action');
   // The claim becomes durably UNCERTAIN before any DOM hand acts.
   let result;
   try{result=await adapters.perform(handoff,observed);}
   catch{return freeze({ok:false,state:'UNCERTAIN',request_id:handoff.request_id,reason:'device_outcome_uncertain'});}
   if(!obj(result)||!['completed','rejected'].includes(result.outcome))
      return freeze({ok:false,state:'UNCERTAIN',request_id:handoff.request_id,reason:'device_outcome_uncertain'});
   let ack;
   try{ack=await adapters.rpc('ack',{request_id:handoff.request_id,outcome:result.outcome},'device');}
   catch{return freeze({ok:false,state:'UNCERTAIN',request_id:handoff.request_id,reason:'ack_unconfirmed'});}
   if(ack?.ok!==true||ack.request_id!==handoff.request_id||
      ack.state!==(result.outcome==='completed'?'COMPLETED':'REJECTED'))
      return freeze({ok:false,state:'UNCERTAIN',request_id:handoff.request_id,reason:'ack_unconfirmed'});
   return freeze({ok:true,state:ack.state,request_id:handoff.request_id});
  }finally{busy=false;}
 }
 return Object.freeze({step});
}
