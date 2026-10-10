// ONDO P3 identity issuer seam -- *not* a public HTTP endpoint.
// Only the trusted MCP host and paired iPhone may call these methods.
// Caller-supplied tool arguments and OpenAI session _meta are never evidence.
const ID = /^[A-Za-z0-9_.:-]{1,96}$/;
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const record = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const valid = s => typeof s === 'string' && ID.test(s) && !['__proto__','constructor','prototype'].includes(s);
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const encode = o => b64url(new TextEncoder().encode(JSON.stringify(o)));
function requireEvidence(e, kind) {
  if (!record(e) || e.verified !== true || e.source !== kind || !valid(e.owner_id) || !valid(e.session_id))
    throw new Error('trusted_evidence_required');
  // A verifier must be a PRIVATE server-side provider. Returning "verified:true"
  // based solely on a request body or MCP tool _meta is a verifier bug.
  return e;
}
function checkModel(e) {
  requireEvidence(e,'authenticated-mcp-host');
  if (!valid(e.controller_id) || !valid(e.chat_id) || e.origin !== 'https://chatgpt.com')
    throw new Error('model_binding_incomplete');
  return e;
}
function checkDevice(e) {
  requireEvidence(e,'paired-native-device');
  if (!valid(e.device_id) || e.owner_approved !== true || !valid(e.chat_id) ||
      !valid(e.controller_id) || !record(e.grant) || !Array.isArray(e.grant.targets) ||
      e.grant.targets.length < 1 || e.grant.targets.length > 12 ||
      e.grant.session_id !== e.session_id || e.grant.device_id !== e.device_id ||
      e.grant.controller_id !== e.controller_id || e.grant.chat_id !== e.chat_id ||
      e.grant.controller_origin !== 'https://chatgpt.com')
    throw new Error('device_grant_incomplete');
  if (!e.grant.targets.every(t => record(t) && valid(t.id) &&
        typeof t.origin === 'string' && /^https:\/\/[^\s/]+$/.test(t.origin) &&
        typeof t.route === 'string' && t.route.startsWith('/') && !t.route.startsWith('//') &&
        Array.isArray(t.caps) && t.caps.length > 0))
    throw new Error('device_targets_invalid');
  return e;
}
export function createP3Issuer(adapters) {
  const required = ['attestModel','attestDevice','attestActionApproval','signingKey','now','nonce'];
  if (!record(adapters) || required.some(k=>!own(adapters,k)) ||
      !['attestModel','attestDevice','attestActionApproval','now','nonce'].every(k=>typeof adapters[k]==='function') ||
      !adapters.signingKey || adapters.signingKey.type !== 'private') throw Error('trusted_issuer_adapter_required');
  async function sign(p) {
    const t = adapters.now();
    if (!Number.isSafeInteger(t) || t < 1) throw Error('invalid_time');
    const jti = adapters.nonce();
    if (!valid(jti)) throw Error('invalid_nonce');
    const payload = {iss:'ondo-p3-issuer',aud:'ondo-mobile-web',iat:t,exp:t+60,jti,...p};
    const msg = encode({typ:'JWT',alg:'ES256'})+'.'+encode(payload);
    const sig = await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},adapters.signingKey,new TextEncoder().encode(msg));
    return msg+'.'+b64url(new Uint8Array(sig));
  }
  return Object.freeze({
    async model(hostOnlyContext) {
      const e = checkModel(await adapters.attestModel(hostOnlyContext));
      return sign({role:'model',session_id:e.session_id,owner_id:e.owner_id,
        controller_id:e.controller_id,chat_id:e.chat_id,origin:e.origin});
    },
    async device(nativeOnlyContext) {
      const e=checkDevice(await adapters.attestDevice(nativeOnlyContext));
      if (!Number.isFinite(e.grant.expires_at) || e.grant.expires_at <= adapters.now()*1000)
        throw Error('device_grant_expired');
      return sign({role:'device',session_id:e.session_id,owner_id:e.owner_id,
        device_id:e.device_id,owner_grant:{owner_approved:true,grant:e.grant}});
    },
    async action(nativeOnlyContext,immutableCommand) {
      if (!record(immutableCommand) || !valid(immutableCommand.request_id)) throw Error('action_invalid');
      const e=checkDevice(await adapters.attestDevice(nativeOnlyContext));
      const a=await adapters.attestActionApproval(nativeOnlyContext,immutableCommand,e);
      if (!record(a) || a.source!=='native-owner-approval' || a.verified!==true ||
          a.session_id!==e.session_id || a.device_id!==e.device_id ||
          a.request_id!==immutableCommand.request_id || !/^[a-f0-9]{64}$/.test(a.digest||''))
        throw Error('native_approval_required');
      return sign({role:'device',session_id:e.session_id,owner_id:e.owner_id,
        device_id:e.device_id,approved_action:{request_id:a.request_id,digest:a.digest}});
    }
  });
}
