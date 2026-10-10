// ONDO P3 host-facing channel core. Does not supply its own trusted identities,
// public endpoint, persistence, iOS execution, or model event subscription.
// All such adapters are mandatory, separately qualified security boundaries.
'use strict';
const OPS = Object.freeze({click:true,fill:true,scroll:true,press:true,navigate:true,send:true});
const ID = /^[a-zA-Z0-9_.:-]{1,96}$/;
const EPOCH = /^[a-zA-Z0-9_.:-]{1,96}$/;
const MAX_EVENTS = 64;
// Durable safety ledger. Overflow rejects, NEVER discards an old replay claim.
const MAX_SEEN_EVENTS = 20000, MAX_RETIRED_EPOCHS = 256;
const RESERVED = new Set(['__proto__','constructor','prototype']);
const own = (o,k) => !!o && Object.prototype.hasOwnProperty.call(o,k);
function fail(reason){return {ok:false,reason};}
function record(x){return !!x&&typeof x==='object'&&!Array.isArray(x);}
function canonicalOrigin(s){try{const u=new URL(s);return (u.protocol==='https:'&&u.username===''&&u.password===''&&u.origin===s)?u.origin:null;}catch{return null;}}
function validRoute(r){return typeof r==='string'&&r.startsWith('/')&&!r.startsWith('//')&&r.length<=1024&&!/[\r\n#]/.test(r);}
function validId(s){return typeof s==='string'&&ID.test(s)&&!RESERVED.has(s);}
function safeGrant(g){
 if(!record(g)||!validId(g.session_id)||!validId(g.device_id)||!validId(g.controller_id)||!validId(g.chat_id)||
    !canonicalOrigin(g.controller_origin)||!Number.isSafeInteger(g.expires_at)||!Array.isArray(g.targets)||!g.targets.length||g.targets.length>12)return false;
 const seen=new Set();
 return g.targets.every(t=>{
   if(!record(t)||!validId(t.id)||seen.has(t.id)||!canonicalOrigin(t.origin)||!validRoute(t.route)||
      !['browser','chat'].includes(t.kind)||!Array.isArray(t.caps)||!t.caps.includes('observe')||!t.caps.every(c=>c==='observe'||(typeof c==='string'&&own(OPS,c)))||
      (t.kind==='chat'&&!validId(t.conversation_id)))return false;
   seen.add(t.id);return true;
 });
}
function makeChannel(adapters){
 if(!record(adapters)||!['verifyGrant','verifyController','verifyDevice','authorizeAction','dispatch','load','createIfAbsent','atomic','filterFacts','clock'].every(k=>typeof adapters[k]==='function'))
   throw new Error('trusted_adapters_required');
 const now=adapters.clock;
 const storageKey=id=>'p3:'+id;
 const load=async id=>validId(id)?await adapters.load(storageKey(id)):null;
 // createIfAbsent and atomic are host-provided persistent, linearizable transactions.
 const atomic=(id,fn)=>adapters.atomic(storageKey(id),fn);
 const principal=async (ctx,s)=>{
   const p=await adapters.verifyController(ctx);
   return record(p)&&p.authenticated===true&&p.controller_id===s.controller_id&&p.chat_id===s.chat_id&&
          p.origin===s.controller_origin;
 };
 const phone=async (ctx,s)=>{
   const p=await adapters.verifyDevice(ctx);
   return record(p)&&p.authenticated===true&&p.device_id===s.device_id;
 };
 const scope=(s,t)=>s.targets.find(x=>x.id===t);
 async function begin(grantEvidence){
   // Untrusted caller cannot select the grant: only the trusted verification adapter returns it.
   const g=await adapters.verifyGrant(grantEvidence);
   if(!safeGrant(g)||g.expires_at<=now())return fail('grant_invalid');
   const s={id:g.session_id,device_id:g.device_id,controller_id:g.controller_id,chat_id:g.chat_id,
     controller_origin:g.controller_origin,expires_at:g.expires_at,targets:g.targets.map(t=>({...t,caps:[...new Set(t.caps)]})),
     revoked:false,event_seq:0,events:[],heads:{},actions:{},seen_event_ids:{},seen_event_count:0,retired_epochs:{}};
   if(await adapters.createIfAbsent(storageKey(s.id),s)!==true)return fail('session_exists');
   return {ok:true,session_id:s.id};
 }
 async function checked(session_id,ctx,kind){
   const s=await load(session_id);
   if(!s)return {error:fail('session_unavailable')};
   if(s.revoked||now()>=s.expires_at)return {error:fail('session_inactive')};
   if(!(await (kind==='device'?phone(ctx,s):principal(ctx,s))))return {error:fail('binding_mismatch')};
   return {s};
 }
 async function publish(session_id,ctx,packet){
   const b=await checked(session_id,ctx,'device');if(b.error)return b.error;
   if(!record(packet)||!validId(packet.target_id)||!validId(packet.event_id)||!validRoute(packet.route)||
      !canonicalOrigin(packet.origin)||!EPOCH.test(packet.page_epoch||'')||!Number.isSafeInteger(packet.state_seq)||packet.state_seq<1||
      !record(packet.facts)||JSON.stringify(packet.facts).length>16000)return fail('event_invalid');
   const target=scope(b.s,packet.target_id);if(!target||target.origin!==packet.origin||target.route!==packet.route||
      (target.kind==='chat'&&target.conversation_id!==packet.conversation_id))return fail('resource_mismatch');
   // Mandatory trusted device-side field sanitizer; this core cannot infer secrets in user pages.
   const facts=await adapters.filterFacts(target,packet.facts);
   if(!record(facts)||JSON.stringify(facts).length>16000)return fail('facts_rejected');
   const outcome=await atomic(session_id,s=>{
     if(!s||s.revoked||now()>=s.expires_at)return {commit:false,result:fail('session_inactive')};
     const exact=scope(s,packet.target_id);
     if(!exact||exact.origin!==packet.origin||exact.route!==packet.route||
       (exact.kind==='chat'&&exact.conversation_id!==packet.conversation_id))return {commit:false,result:fail('resource_mismatch')};
     // Persistent event-ID and epoch replay checks must be in this atomic transaction.
     // The bounded delivery queue cannot be used as the replay journal.
     if(!record(s.seen_event_ids)||!Number.isSafeInteger(s.seen_event_count)||!record(s.retired_epochs))
       return {commit:false,result:fail('state_invalid')};
     if(own(s.seen_event_ids,packet.event_id))return {commit:false,result:fail('event_replay')};
     if(s.seen_event_count>=MAX_SEEN_EVENTS)return {commit:false,result:fail('event_history_full')};
     const prev=own(s.heads,exact.id)?s.heads[exact.id]:null;
     const retired=own(s.retired_epochs,exact.id)?s.retired_epochs[exact.id]:[];
     if(!Array.isArray(retired))return {commit:false,result:fail('state_invalid')};
     if(retired.includes(packet.page_epoch))return {commit:false,result:fail('epoch_replay')};
     if(prev&&prev.epoch===packet.page_epoch&&packet.state_seq<=prev.seq)return {commit:false,result:fail('event_replay')};
     if(prev&&prev.epoch!==packet.page_epoch&&retired.length>=MAX_RETIRED_EPOCHS)
       return {commit:false,result:fail('epoch_history_full')};
     const sameEpoch=prev&&prev.epoch===packet.page_epoch;
     const sourceGap=!!((sameEpoch&&packet.state_seq!==prev.seq+1)||(!prev&&packet.state_seq!==1));
     const epochChanged=!!(prev&&!sameEpoch);
     const env={cursor:++s.event_seq,event_id:packet.event_id,target_id:exact.id,page_epoch:packet.page_epoch,
       state_seq:packet.state_seq,source_gap:sourceGap,epoch_changed:epochChanged,facts};
     s.seen_event_ids[packet.event_id]=true;
     s.seen_event_count++;
     if(epochChanged){retired.push(prev.epoch);s.retired_epochs[exact.id]=retired;}
     s.events.push(env);const bufferOverflow=s.events.length>MAX_EVENTS;if(bufferOverflow)s.events.shift();
     s.heads[exact.id]={epoch:packet.page_epoch,seq:packet.state_seq,route:packet.route,origin:packet.origin,
       needs_sync:sourceGap||epochChanged||bufferOverflow||!!(prev&&prev.needs_sync)};
     if(packet.full_snapshot===true&&facts.type==='snapshot')s.heads[exact.id].needs_sync=false;
     return {commit:true,state:s,result:{ok:true,cursor:env.cursor,source_gap:sourceGap,event:env}};
   });
   if(!outcome.ok)return outcome;
   if(typeof adapters.publishToModel==='function'){
     try{await adapters.publishToModel(session_id,outcome.event);}catch{/* durable queue retains it */}
   }
   const {event,...visible}=outcome;return visible;
 }
 async function events(session_id,ctx,after=0,target_id=null){
   const b=await checked(session_id,ctx,'controller');if(b.error)return b.error;const s=b.s;
   if(!Number.isSafeInteger(after)||after<0||after>s.event_seq)return fail('cursor_invalid');
   if(target_id!==null&&!scope(s,target_id))return fail('resource_not_granted');
   const gap=s.events.length>0&&after<s.events[0].cursor-1;
   const out=s.events.filter(e=>e.cursor>after&&(target_id===null||e.target_id===target_id));
   return {ok:true,gap,latest_cursor:s.event_seq,events:out,requires_resync:gap||out.some(e=>e.source_gap)};
 }
 async function act(session_id,ctx,command){
   const b=await checked(session_id,ctx,'controller');if(b.error)return b.error;const s=b.s;
   if(!record(command)||!validId(command.request_id)||!validId(command.target_id)||
      typeof command.op!=='string'||!own(OPS,command.op)||
      !record(command.args)||JSON.stringify(command.args).length>8000||
      !EPOCH.test(command.page_epoch||'')||!Number.isSafeInteger(command.state_seq)||command.state_seq<1)return fail('action_invalid');
   const target=scope(s,command.target_id);
   if(!target||!target.caps.includes(command.op))return fail('capability_denied');
   if(own(s.actions,command.request_id))return {ok:false,reason:'no_replay',state:s.actions[command.request_id].state};
   const h=s.heads[target.id];
   if(!h||h.needs_sync||h.epoch!==command.page_epoch||h.seq!==command.state_seq)return fail('stale_or_unsynced');
   // Approval must be granted by the real device for this exact immutable action.
   if(await adapters.authorizeAction(s.id,target,command)!==true)return fail('approval_required');
   const claim=await atomic(session_id,cur=>{
     if(!cur||cur.revoked||now()>=cur.expires_at)return {commit:false,result:fail('session_inactive')};
     const t=scope(cur,command.target_id),head=cur.heads[command.target_id];
     if(!t||!t.caps.includes(command.op))return {commit:false,result:fail('capability_denied')};
     if(own(cur.actions,command.request_id))return {commit:false,result:{ok:false,reason:'no_replay',state:cur.actions[command.request_id].state}};
     if(!head||head.needs_sync||head.epoch!==command.page_epoch||head.seq!==command.state_seq)return {commit:false,result:fail('stale_or_unsynced')};
     cur.actions[command.request_id]={target_id:t.id,op:command.op,state:'UNCERTAIN'};
     return {commit:true,state:cur,result:{ok:true}};
   });
   if(!claim.ok)return claim;
   try{
     // Device must revalidate grant + approval + target binding at execution time.
     const res=await adapters.dispatch(s.id,target,command);
     if(!record(res)||res.ok!==true||res.request_id!==command.request_id||
        !['completed','rejected','uncertain'].includes(res.status))return {ok:false,reason:'dispatch_uncertain',state:'UNCERTAIN'};
     const state=res.status==='completed'?'COMPLETED':res.status==='rejected'?'REJECTED':'UNCERTAIN';
     return await atomic(session_id,cur=>{
       if(!cur||cur.revoked||now()>=cur.expires_at)return {commit:false,result:fail('session_inactive')};
       if(!cur.actions[command.request_id]||cur.actions[command.request_id].state!=='UNCERTAIN')return {commit:false,result:fail('action_state_changed')};
       cur.actions[command.request_id].state=state;
       return {commit:true,state:cur,result:{ok:state==='COMPLETED',state,reason:state==='COMPLETED'?null:'device_result'}};
     });
   }catch{return {ok:false,reason:'dispatch_uncertain',state:'UNCERTAIN'};}
 }
 // Stage-B dormant persistent phone mailbox. It never replays a claimed mutation.
 // This is a data contract, NOT a deployed network/device identity adapter.
 const QUEUED_MAX_AGE_MS=60000, QUEUE_LIMIT=24, ACTION_LEDGER_LIMIT=512;
 const ARG_KEYS=Object.freeze({
   click:['ref'],fill:['ref','text'],scroll:['dy'],press:['key'],navigate:['to'],send:['text']
 });
 const queuedState=a=>a.state==='QUEUED' && now()-a.queued_at>QUEUED_MAX_AGE_MS?'EXPIRED':a.state;
 function commandValid(c){
   if(!record(c)||!validId(c.request_id)||!validId(c.target_id)||
      typeof c.op!=='string'||!own(OPS,c.op)||!record(c.args)||
      !EPOCH.test(c.page_epoch||'')||!Number.isSafeInteger(c.state_seq)||c.state_seq<1)return false;
   const allowed=ARG_KEYS[c.op],keys=Object.keys(c.args);
   if(!Array.isArray(allowed)||keys.length!==allowed.length||!allowed.every(k=>own(c.args,k))||
      !keys.every(k=>allowed.includes(k)&&!RESERVED.has(k)))return false;
   try{if(JSON.stringify(c.args).length>8000)return false;}catch{return false;}
   if(c.op==='click')return typeof c.args.ref==='string'&&/^e\d{1,4}@[a-f0-9]{8}$/.test(c.args.ref);
   if(c.op==='fill')return typeof c.args.ref==='string'&&/^e\d{1,4}@[a-f0-9]{8}$/.test(c.args.ref)&&typeof c.args.text==='string'&&c.args.text.length<=6000;
   if(c.op==='scroll')return Number.isSafeInteger(c.args.dy)&&Math.abs(c.args.dy)<=4000&&c.args.dy!==0;
   if(c.op==='press')return typeof c.args.key==='string'&&['Escape','Tab','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(c.args.key);
   if(c.op==='navigate')return typeof c.args.to==='string'&&c.args.to.length<=2000&&
       (c.args.to==='back'||c.args.to==='bound'||/^https:\/\/[^\s<>"']+$/.test(c.args.to));
   if(c.op==='send')return typeof c.args.text==='string'&&c.args.text.length>0&&c.args.text.length<=6000;
   return false;
 }
 async function offer(session_id,ctx,command){
   const b=await checked(session_id,ctx,'controller');if(b.error)return b.error;
   if(!commandValid(command))return fail('action_invalid');
   const t=scope(b.s,command.target_id);
   if(!t||!t.caps.includes(command.op))return fail('capability_denied');
   if(own(b.s.actions,command.request_id))return {ok:false,reason:'no_replay',state:queuedState(b.s.actions[command.request_id])};
   const h=b.s.heads[t.id];
   if(!h||h.needs_sync||h.epoch!==command.page_epoch||h.seq!==command.state_seq)return fail('stale_or_unsynced');
   // Queuing is an inert durable intent, allowed while the phone is suspended.
   // No approval is inferred here: the device must approve at pickup.
   return await atomic(session_id,s=>{
     if(!s||s.revoked||now()>=s.expires_at)return {commit:false,result:fail('session_inactive')};
     if(own(s.actions,command.request_id))return {commit:false,result:{ok:false,reason:'no_replay',state:queuedState(s.actions[command.request_id])}};
     const target=scope(s,command.target_id),head=s.heads[command.target_id];
     if(!target||!target.caps.includes(command.op))return {commit:false,result:fail('capability_denied')};
     if(!head||head.needs_sync||head.epoch!==command.page_epoch||head.seq!==command.state_seq)return {commit:false,result:fail('stale_or_unsynced')};
     if(Object.keys(s.actions).length>=ACTION_LEDGER_LIMIT ||
        Object.values(s.actions).filter(a=>a.state==='QUEUED'&&queuedState(a)==='QUEUED').length>=QUEUE_LIMIT)
       return {commit:false,result:fail('queue_full')};
     // Atomic durable claim of the model's request before phone dispatch.
     s.actions[command.request_id]={
       target_id:target.id,op:command.op,state:'QUEUED',delivery:'mailbox_v1',
       page_epoch:command.page_epoch,state_seq:command.state_seq,queued_at:now(),
       args:JSON.parse(JSON.stringify(command.args))
     };
     return {commit:true,state:s,result:{ok:true,request_id:command.request_id,state:'QUEUED'}};
   });
 }
 async function devicePending(session_id,ctx){
   const b=await checked(session_id,ctx,'device');if(b.error)return b.error;
   const out=Object.entries(b.s.actions).filter(([,a])=>a.delivery==='mailbox_v1'&&queuedState(a)==='QUEUED')
     .slice(0,QUEUE_LIMIT).map(([request_id,a])=>({
       request_id,target_id:a.target_id,op:a.op,args:a.args,
       page_epoch:a.page_epoch,state_seq:a.state_seq,expires_at:Math.min(b.s.expires_at,a.queued_at+QUEUED_MAX_AGE_MS)
     }));
   return {ok:true,items:out};
 }
 async function deviceClaim(session_id,ctx,request_id,observed){
   const b=await checked(session_id,ctx,'device');if(b.error)return b.error;
   if(!validId(request_id)||!record(observed)||!validId(observed.target_id)||
      !canonicalOrigin(observed.origin)||!validRoute(observed.route)||
      !EPOCH.test(observed.page_epoch||'')||
      !Number.isSafeInteger(observed.state_seq)||observed.state_seq<1)return fail('claim_invalid');
   // The connected device must prove approval of this EXACT immutable command.
   // Failure or a suspended phone never turns a queued request into an action.
   const claimTarget=scope(b.s,observed.target_id);
   const pending=own(b.s.actions,request_id)?b.s.actions[request_id]:null;
   if(!pending||pending.delivery!=='mailbox_v1')return fail('action_unknown');
   if(pending.state!=='QUEUED')return {ok:false,reason:'no_replay',state:pending.state};
   if(queuedState(pending)==='EXPIRED')return fail('queue_expired');
   const currentHead=b.s.heads[pending.target_id];
   if(!claimTarget||claimTarget.id!==pending.target_id||
      claimTarget.origin!==observed.origin||claimTarget.route!==observed.route||
      (claimTarget.kind==='chat'&&claimTarget.conversation_id!==observed.conversation_id)||
      pending.page_epoch!==observed.page_epoch||pending.state_seq!==observed.state_seq||
      !currentHead||currentHead.needs_sync||currentHead.epoch!==pending.page_epoch||currentHead.seq!==pending.state_seq)
      return fail('stale_or_binding_changed');
   const fullCommand={request_id,target_id:pending.target_id,op:pending.op,args:pending.args,
     page_epoch:pending.page_epoch,state_seq:pending.state_seq};
   if(await adapters.authorizeAction(b.s.id,claimTarget,fullCommand)!==true)return fail('approval_required');
   return await atomic(session_id,s=>{
     if(!s||s.revoked||now()>=s.expires_at)return {commit:false,result:fail('session_inactive')};
     const a=own(s.actions,request_id)?s.actions[request_id]:null;
     if(!a)return {commit:false,result:fail('action_unknown')};
     if(a.delivery!=='mailbox_v1'||a.state!=='QUEUED')return {commit:false,result:{ok:false,reason:'no_replay',state:a.state}};
     if(queuedState(a)==='EXPIRED')return {commit:false,result:fail('queue_expired')};
     const t=scope(s,a.target_id),h=s.heads[a.target_id];
     if(!t||t.origin!==observed.origin||t.route!==observed.route||
       t.id!==observed.target_id||
       (t.kind==='chat'&&t.conversation_id!==observed.conversation_id)||
       !h||h.needs_sync||h.epoch!==a.page_epoch||h.seq!==a.state_seq||
       observed.page_epoch!==a.page_epoch||observed.state_seq!==a.state_seq)
       return {commit:false,result:fail('stale_or_binding_changed')};
     // Pessimistic claim BEFORE the phone touches DOM. Crash afterwards is
     // UNCERTAIN, never a retryable queue item.
     a.state='UNCERTAIN';a.claimed_at=now();
     return {commit:true,state:s,result:{ok:true,state:'UNCERTAIN',request_id}};
   });
 }
 async function deviceAck(session_id,ctx,request_id,outcome){
   const b=await checked(session_id,ctx,'device');if(b.error)return b.error;
   if(!validId(request_id)||!['completed','rejected','uncertain'].includes(outcome))return fail('ack_invalid');
   return await atomic(session_id,s=>{
     if(!s||s.revoked||now()>=s.expires_at)return {commit:false,result:fail('session_inactive')};
     const a=own(s.actions,request_id)?s.actions[request_id]:null;
     if(!a)return {commit:false,result:fail('action_unknown')};
     if(a.delivery!=='mailbox_v1'||a.state!=='UNCERTAIN')return {commit:false,result:fail('ack_state_invalid')};
     if(outcome==='uncertain')return {commit:false,result:{ok:true,state:'UNCERTAIN'}};
     a.state=outcome==='completed'?'COMPLETED':'REJECTED';
     a.acked_at=now();
     return {commit:true,state:s,result:{ok:true,state:a.state,request_id}};
   });
 }
 async function deviceStatus(session_id,ctx,request_id){
   const b=await checked(session_id,ctx,'device');if(b.error)return b.error;
   if(!validId(request_id))return fail('action_invalid');
   const a=own(b.s.actions,request_id)?b.s.actions[request_id]:null;
   return {ok:true,state:a?queuedState(a):'NOT_FOUND'};
 }
 async function revoke(session_id,ctx){
   const b=await checked(session_id,ctx,'device');if(b.error)return b.error;
   return await atomic(session_id,s=>{
     if(!s||s.revoked||now()>=s.expires_at)return {commit:false,result:fail('session_inactive')};
     s.revoked=true;return {commit:true,state:s,result:{ok:true,revoked:true}};
   });
 }
 async function status(session_id,ctx,request_id){
   const b=await checked(session_id,ctx,'controller');if(b.error)return b.error;
   if(!validId(request_id))return fail('action_invalid');
   const a=own(b.s.actions,request_id)?b.s.actions[request_id]:null;return {ok:true,state:a?queuedState(a):'NOT_FOUND'};
 }
 return Object.freeze({begin,publish,events,act,offer,devicePending,deviceClaim,deviceAck,deviceStatus,revoke,status});
}
export {makeChannel};
