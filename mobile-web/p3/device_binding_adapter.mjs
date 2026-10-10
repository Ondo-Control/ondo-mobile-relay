// P3 Scriptable binding adapter. Exact bound origin, route, conversation and
// page epoch must hold at pickup AND again after claim, just before any hand.
// The injected performAtomic MUST check location/epoch again IN THE SAME
// WebView JS task that would click/type/send; otherwise no mutation is allowed.
import {createP3DeviceClient} from './device_client.mjs';
const rec = o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const same = (o,p)=>rec(o)&&rec(p)&&o.target_id===p.target_id&&o.origin===p.origin&&
  o.route===p.route&&o.page_epoch===p.page_epoch&&o.state_seq===p.state_seq&&
  (o.conversation_id||null)===(p.conversation_id||null);
const safeTarget=(t,id)=>rec(t)&&t.id===id&&typeof t.origin==='string'&&t.origin.startsWith('https://')&&
  typeof t.route==='string'&&t.route.startsWith('/')&&!t.route.startsWith('//')&&
  (t.conversation_id===undefined||typeof t.conversation_id==='string');
export function createBoundP3DeviceClient({rpc,readNativeBinding,observeNative,approveNative,performAtomic,clock}){
 if (![rpc,readNativeBinding,observeNative,approveNative,performAtomic,clock].every(x=>typeof x==='function'))
   throw Error('trusted_native_adapters_required');
 // Guard against drift between approval and actual execution. This is in
 // addition to the server's exact epoch/route/sequence/device checks.
 let last=null;
 return createP3DeviceClient({rpc,clock,
  async observe(id){
   const bound=await readNativeBinding(id);
   if(!safeTarget(bound,id))throw Error('untrusted_binding');
   const view=await observeNative(id);
   if(!same(view,{target_id:id,origin:bound.origin,route:bound.route,
        conversation_id:bound.conversation_id,page_epoch:view?.page_epoch,state_seq:view?.state_seq}))
      throw Error('binding_changed');
   last={bound:Object.freeze({...bound}),view:Object.freeze({...view})};
   return view;
  },
  async approve(command,view){
   if(!last||!same(view,last.view))throw Error('stale_approval');
   return approveNative(Object.freeze({...command}),Object.freeze({...view}),last.bound);
  },
  async perform(command,view){
   const initial=last;
   last=null;
   if(!initial || !same(view,initial.view))throw Error('stale_action');
   const freshBinding=await readNativeBinding(command.target_id);
   const freshView=await observeNative(command.target_id);
   if(!safeTarget(freshBinding,command.target_id) || !same(freshBinding,initial.bound) ||
      !same(freshView,initial.view))throw Error('post_claim_binding_changed');
   // Contract: performAtomic verifies page origin, route, conversation,
   // epoch, seq and the immutable command in its single WebView callback.
   // A DOM operation must never be delegated to an unverified callback.
   return performAtomic(Object.freeze({...command}),Object.freeze({...freshView}),initial.bound);
  }
 });
}
