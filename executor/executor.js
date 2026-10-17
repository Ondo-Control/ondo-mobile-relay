// ONDO Browser-Ausfuehrer (Prototyp 0.1): spricht dasselbe Telefon-Protokoll wie ONDO Mobile (/phone/poll, /phone/result)
// und bedient eine Website mit Playwright/Chromium. Kein Telefon in der Kette.
// Konfiguration nur ueber Umgebungsvariablen (nie ins Repo): RELAY_URL, RELAY_KEY, TARGETS (JSON {"name":"https://..."}), JOURNAL (Pfad).
"use strict";
const fs = require("fs");
const crypto = require("crypto");
const { chromium } = require("playwright");

const RELAY = (process.env.RELAY_URL || "").replace(/\/$/, "");
const KEY = process.env.RELAY_KEY || "";
const TARGETS = JSON.parse(process.env.TARGETS || '{"testseite":"about:blank"}');
const JOURNAL = process.env.JOURNAL || "/tmp/ondo-executor-journal.json";
const ALLOW_LOCAL = process.env.ALLOW_LOCAL === "1";
const WAIT_MS = 25000;
// Health-Endpunkt: Render Free schlaeft nach 15 Min ohne EINGEHENDEN Verkehr; das Relay kann darueber wecken.
if (process.env.PORT) require("http").createServer((q, s) => { s.writeHead(200, { "content-type": "text/plain" }); s.end("ok\n"); }).listen(+process.env.PORT);
if (!RELAY || !KEY) { console.error("RELAY_URL und RELAY_KEY fehlen"); process.exit(2); }

// ---- Journal: gespeicherte Auftraege (Ergebnis) und Absichten (vor einer ausloesenden Aktion) ----
let J = { done: {}, intent: {} };
try { J = JSON.parse(fs.readFileSync(JOURNAL, "utf8")); } catch (e) {}
function saveJ() { const ids = Object.keys(J.done); if (ids.length > 200) for (const id of ids.slice(0, ids.length - 200)) delete J.done[id]; fs.writeFileSync(JOURNAL + ".tmp", JSON.stringify(J)); fs.renameSync(JOURNAL + ".tmp", JOURNAL); }

// ---- Browser ----
let browser = null, pages = {}, gen = {};
async function getPage(name) {
  if (!TARGETS[name]) return null;
  if (!browser) {
    const lean = process.env.LEAN === "1";
    browser = await chromium.launch({ args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-zygote", "--js-flags=--max-old-space-size=192"].concat(lean ? ["--in-process-gpu", "--disable-software-rasterizer", "--renderer-process-limit=1", "--disable-extensions", "--disable-background-networking", "--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter"] : []) });
  }
  if (!pages[name]) {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 900 } });
    if (process.env.LEAN === "1") await ctx.route("**/*", (r) => { const t = r.request().resourceType(); return (t === "image" || t === "media" || t === "font") ? r.abort() : r.continue(); });
    const p = await ctx.newPage();
    await p.goto(TARGETS[name], { timeout: 30000 }).catch(() => {});
    pages[name] = p; gen[name] = 0;
  }
  return pages[name];
}
function okUrl(u) {
  try { const x = new URL(u); if (x.protocol === "https:") return true; if (ALLOW_LOCAL && x.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(x.hostname)) return true; } catch (e) {}
  return false;
}
async function snapshot(p, name) {
  gen[name] = (gen[name] || 0) + 1;
  const tag = crypto.createHash("sha1").update(p.url() + ":" + gen[name]).digest("hex").slice(0, 8);
  const els = await p.evaluate(() => {
    const out = [], q = document.querySelectorAll("a[href],button,input,textarea,select,[role=button]");
    q.forEach((e, i) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; e.setAttribute("data-ondo", String(i)); out.push({ i, role: e.tagName.toLowerCase() + (e.type ? ":" + e.type : ""), name: (e.getAttribute("aria-label") || e.innerText || e.value || e.placeholder || e.name || "").trim().slice(0, 80) }); });
    return out.slice(0, 80);
  });
  return { tag, els };
}
const lastTag = {};
function parseRef(ref) { const m = /^e(\d+)@([0-9a-f]{8})$/.exec(String(ref || "")); return m ? { i: +m[1], tag: m[2] } : null; }
async function target(p, name, ref) {
  const r = parseRef(ref);
  if (!r) return { err: { ok: false, reason: "bad_ref", hint: "ref aus dem letzten ondo_observe verwenden" } };
  if (lastTag[name] !== r.tag) return { err: { ok: false, reason: "stale_ref", hint: "Seite hat sich geaendert, ondo_observe erneut aufrufen" } };
  return { loc: p.locator('[data-ondo="' + r.i + '"]') };
}

// ---- Handler ----
const TRIGGER = { click: 1, fill: 1, type: 1, press: 1, submit: 1, navigate: 1, send: 1, clear: 1 };
async function handle(job) {
  const a = job.args || {}, op = job.op, name = a.target;
  if (job.tool === "ondo_start") return { ok: true, name: "web", targets: Object.keys(TARGETS).map((n) => ({ name: n, kind: "website", provider: "Browser (Cloud)" })), hint: "Websites: ondo_navigate, ondo_observe, ondo_read, ondo_fill, ondo_click. Kein iPhone noetig." };
  if (op === "wait") { await new Promise((r) => setTimeout(r, 15000)); return { ok: true, pending: true, events: [], hint: "Noch nichts Neues." }; }
  if (op === "end") { if (browser) { await browser.close().catch(() => {}); browser = null; pages = {}; } return { ok: true, ended: true }; }
  const p = await getPage(name);
  if (!p) return { ok: false, reason: "unknown_target", hint: "Ziele: " + Object.keys(TARGETS).join(", ") };
  try {
    if (op === "navigate") { if (!okUrl(a.to)) return { ok: false, reason: "url_not_allowed" }; await p.goto(a.to, { timeout: 30000 }); return { ok: true, url: p.url() }; }
    if (op === "read") { const t = await p.evaluate(() => document.body.innerText); const off = +a.offset || 0; return { ok: true, url: p.url(), title: await p.title(), text: t.slice(off, off + 8000), total: t.length }; }
    if (op === "observe") { const s = await snapshot(p, name); lastTag[name] = s.tag; return { ok: true, url: p.url(), title: await p.title(), elements: s.els.map((e) => ({ ref: "e" + e.i + "@" + s.tag, role: e.role, name: e.name })) }; }
    if (op === "click") { const t = await target(p, name, a.ref); if (t.err) return t.err; await t.loc.click({ timeout: 8000 }); return { ok: true, url: p.url() }; }
    if (op === "fill") { const t = await target(p, name, a.ref); if (t.err) return t.err; await t.loc.fill(String(a.text || ""), { timeout: 8000 }); return { ok: true }; }
    if (op === "type") { await p.keyboard.type(String(a.text || "")); return { ok: true }; }
    if (op === "press") { await p.keyboard.press(String(a.key)); return { ok: true }; }
    if (op === "scroll") { await p.mouse.wheel(0, +a.dy || 0); return { ok: true }; }
    if (op === "stop_generation" || op === "watch") return { ok: true };
    return { ok: false, reason: "op_not_supported", op };
  } catch (e) { return { ok: false, reason: "action_failed", detail: String(e.message || e).slice(0, 200) }; }
}
// Wiederzustellung: nie eine ausloesende Aktion blind wiederholen
async function processJob(job) {
  if (J.done[job.id]) return J.done[job.id];
  if (TRIGGER[job.op] && J.intent[job.id]) { const r = { ok: false, reason: "outcome_unclear", hint: "Aktion war schon begonnen, Ausgang unklar. Seite mit ondo_observe pruefen, nicht blind wiederholen." }; J.done[job.id] = r; delete J.intent[job.id]; saveJ(); return r; }
  if (TRIGGER[job.op]) { J.intent[job.id] = { op: job.op, at: Date.now() }; saveJ(); }
  if (process.env.TEST_CRASH === 'after_intent' && TRIGGER[job.op]) process.kill(process.pid, 'SIGKILL');
  const r = await handle(job);
  if (process.env.TEST_CRASH === 'after_action' && TRIGGER[job.op]) process.kill(process.pid, 'SIGKILL');
  J.done[job.id] = r; delete J.intent[job.id]; saveJ();
  if (process.env.TEST_CRASH === 'after_done' && TRIGGER[job.op]) process.kill(process.pid, 'SIGKILL');
  return r;
}

// ---- Poll-Schleife ----
const base = RELAY + "/k/" + KEY;
async function post(path, body, ms) { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms || 40000); try { const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: c.signal }); return await r.json(); } finally { clearTimeout(t); } }
let acks = [], stopping = false;
async function loop() {
  console.log("Ausfuehrer laeuft, Relay:", RELAY);
  while (!stopping) {
    try {
      const r = await post("/phone/poll", { wait_ms: WAIT_MS, ack: acks.splice(0) });
      for (const job of r.jobs || []) {
        acks.push(job.id);
        const res = await processJob(job);
        await post("/phone/result", { id: job.id, result: res }, 20000).catch(() => {});
      }
    } catch (e) { console.error("poll:", String(e.message || e).slice(0, 120)); await new Promise((r) => setTimeout(r, 2000)); }
  }
}
for (const sg of ["SIGTERM", "SIGINT"]) process.on(sg, async () => { stopping = true; if (browser) await browser.close().catch(() => {}); process.exit(0); });
loop();
