// ONDO JARVIS isolated Cloudflare Worker. This is NOT ONDO P3 device access.
// Importantly this worker does not import the existing ondo-mobile-relay worker.
// No token, device, chat, private page, browser or outside network is read.
const BUILD='0.1.0-isolated';
const STATE=Object.freeze({schema:'ONDO_JARVIS_CHANNEL_V1',ok:true,build:BUILD,service:'ondo-jarvis-independent',
  stage:'isolated',device_access:false,relay_connected:false,live_events:false,actions_enabled:false,
  source:'Ondo-Control/ondo-mobile-relay'});
const TOOL=Object.freeze({name:'ondo_jarvis_transport_info',
 title:'Status des isolierten JARVIS-Transports',
 description:'Liefert nur öffentliche technische Capabilities. Kein Gerätezugang, keine Webseiten und keine Liveereignisse.',
 inputSchema:{type:'object',properties:{},additionalProperties:false},
 annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}});
const HEADER=Object.freeze({'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADER});
const fail=(id,code,message)=>({jsonrpc:'2.0',id,error:{code,message}});
const validObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const empty=x=>x===undefined||(validObject(x)&&Object.keys(x).length===0);
const noStore={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const PAGE="<!doctype html>\n<html lang=\"de\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>ONDO JARVIS · Unabhängiger Kanal</title>\n<style>\n:root{color-scheme:dark;font:16px system-ui,sans-serif;background:#081624;color:#ecf4fa}\nbody{max-width:820px;margin:0 auto;padding:clamp(24px,6vw,70px)}\nh1{font-size:clamp(28px,5vw,46px);letter-spacing:-.035em}\np{line-height:1.65;color:#afc5d3}main{background:#102638;border:1px solid #315066;padding:24px;border-radius:18px}\nh2{font-size:19px}.status{display:inline-block;border:1px solid #5f86a2;color:#d5e8f5;border-radius:20px;padding:5px 10px;font-size:13px}\ntable{width:100%;border-collapse:collapse;margin-top:14px}td{padding:12px 6px;border-bottom:1px solid #315066}\ntd:last-child{text-align:right}button{padding:12px 18px;color:#081624;background:#b1eff6;border:0;border-radius:9px;font-weight:700;cursor:pointer}\nbutton:focus-visible{outline:3px solid white}small{display:block;color:#9eb5c4;margin-top:20px}\n</style></head><body><header><span class=\"status\">ONDO JARVIS · Isoliert</span><h1>Eigenständiger ONDO-Kanal</h1>\n<p>Separater Cloudflare-Eingang für das ONDO-/JARVIS-Projekt. Der bestehende ONDO-Mobile-Relay, das persönliche ONDO-P3-Plugin und Alexa bleiben unverändert.</p></header>\n<main><h2>Technischer Status</h2><table>\n<tr><td>Cloudflare-Seite</td><td id=\"site\">Prüfung läuft …</td></tr>\n<tr><td>Geräte- und Relayzugriff</td><td>Gesperrt</td></tr>\n<tr><td>Modell-Liveereignisse</td><td>Nicht nachgewiesen</td></tr>\n<tr><td>Aktionen</td><td>Deaktiviert</td></tr></table>\n<p id=\"message\" role=\"status\" aria-live=\"polite\">Die Verbindung dieser Seite wird überprüft.</p>\n<button type=\"button\" id=\"check\">Status erneut prüfen</button>\n</main><small>Keine Zugangsdaten eingeben. Diese Seite liest keine Gerätedaten, Webseiten, Chats oder Cloudflare-Secrets.</small>\n<script src=\"/app.js\" defer></script></body></html>";
const JS="'use strict';\nasync function check(){\n const site=document.getElementById('site'), msg=document.getElementById('message');\n site.textContent='Prüfung läuft …';\n try{\n  const r=await fetch('/health',{cache:'no-store',credentials:'omit'});\n  if(!r.ok)throw Error('Status nicht erreichbar');\n  const d=await r.json();\n  if(d.schema!=='ONDO_JARVIS_CHANNEL_V1'||d.device_access!==false||d.live_events!==false||d.actions_enabled!==false)\n   throw Error('Unerwarteter Status – keine Freigabe');\n  site.textContent='Erreichbar';\n  msg.textContent='Der eigenständige Web-Eingang antwortet. Der Geräte- und Modell-Livekanal ist noch nicht freigegeben.';\n }catch{\n  site.textContent='Nicht bestätigt';\n  msg.textContent='Der Status ist nicht sicher bestätigt. Es werden keine weiteren Aktionen ausgelöst.';\n }\n}\ndocument.getElementById('check').addEventListener('click',check);\ncheck();\n";
async function mcp(request){
 if(request.method!=='POST')return new Response(null,{status:405,headers:{allow:'POST',...noStore}});
 if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
  return response({error:'json_required'},415);
 const len=Number(request.headers.get('content-length')||0);
 if(len>8192)return response({error:'request_too_large'},413);
 let payload;
 try{
  const reader=request.body?.getReader();if(!reader)return response(fail(null,-32700,'Parse error'),400);
  let chunks=[],total=0;
  for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;
   if(total>8192){await reader.cancel();return response({error:'request_too_large'},413);}chunks.push(value);}
  const data=new Uint8Array(total);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
 }catch{return response(fail(null,-32700,'Parse error'),400);}
 if(!validObject(payload)||payload.jsonrpc!=='2.0'||typeof payload.method!=='string')
  return response(fail(null,-32600,'Invalid Request'));
 const id=Object.hasOwn(payload,'id')?payload.id:null;
 if(id!==null&&typeof id!=='string'&&!(typeof id==='number'&&Number.isSafeInteger(id)))
  return response(fail(null,-32600,'Invalid id'));
 if(!Object.hasOwn(payload,'id'))return new Response(null,{status:202,headers:noStore});
 const {method,params}=payload;
 if(params!==undefined&&!validObject(params))return response(fail(id,-32602,'Invalid parameters'));
 let result;
 switch(method){
  case 'initialize':
   if(typeof params?.protocolVersion!=='string')return response(fail(id,-32602,'Protocol version required'));
   result={protocolVersion:['2025-03-26','2025-06-18','2025-11-25'].includes(params.protocolVersion)?params.protocolVersion:'2025-03-26',
    capabilities:{tools:{}},serverInfo:{name:'ondo-jarvis-independent',version:BUILD}};
   break;
  case 'ping':
   if(!empty(params))return response(fail(id,-32602,'No arguments allowed'));
   result={};break;
  case 'tools/list':
   if(!empty(params))return response(fail(id,-32602,'No arguments allowed'));
   result={tools:[TOOL]};break;
  case 'tools/call':
   if(!validObject(params)||params.name!=='ondo_jarvis_transport_info'||!empty(params.arguments)||
    Object.keys(params).some(k=>!['name','arguments','_meta'].includes(k)))
    return response(fail(id,-32602,'Tool unavailable'));
   result={isError:false,content:[{type:'text',text:JSON.stringify(STATE)}],structuredContent:STATE};
   break;
  case 'resources/list':result={resources:[]};break;
  case 'prompts/list':result={prompts:[]};break;
  default:return response(fail(id,-32601,'Method unavailable'));
 }
 return response({jsonrpc:'2.0',id,result});
}
export default {
 async fetch(request){
  const url=new URL(request.url);
  if(url.search||url.hash)return response({error:'not_found'},404);
  if(request.method==='GET'&&url.pathname==='/')
   return new Response(PAGE,{headers:{'content-type':'text/html; charset=utf-8',
    'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    ...noStore}});
  if(request.method==='GET'&&url.pathname==='/app.js')
   return new Response(JS,{headers:{'content-type':'text/javascript; charset=utf-8',...noStore}});
  if(request.method==='GET'&&url.pathname==='/health')return response(STATE);
  if(url.pathname==='/mcp')return mcp(request);
  // Explicit deny of live device data and actions even if caller supplies arbitrary tokens.
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/phone/')||url.pathname.startsWith('/device/'))
   return response({error:'capability_disabled'},403);
  return response({error:'not_found'},404);
 }
};
