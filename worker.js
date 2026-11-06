var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var TOOLS = [
  {
    "name": "ondo_start",
    "op": null,
    "description": "ZUERST aufrufen. Liefert Auftrag, Ziele (Chats/Websites), Regeln, Grenzen und den aktuellen Zustand der laufenden ONDO-Sitzung auf dem iPhone des Nutzers.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_wait",
    "op": "wait",
    "description": "Wartet auf das naechste Ereignis (Antwort eines Chats, Seitenaenderung, Nachricht des Nutzers) und liefert es. Aufrufen, wenn du auf etwas wartest.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_read",
    "op": "read",
    "description": "Liest die letzten Nachrichten eines Chat-Ziels oder den Text einer Website.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        },
        "last_n": {
          "type": "integer",
          "description": "Anzahl letzter Nachrichten (1-5)"
        },
        "offset": {
          "type": "integer",
          "description": "Zeichen-Offset zum Weiterlesen langer Texte"
        }
      },
      "required": [
        "target"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_observe",
    "op": "observe",
    "description": "Zeigt die bedienbaren Elemente der aktuellen Seite (jedes mit ref) und den sichtbaren Text. Danach click/fill mit einem ref daraus.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        },
        "offset": {
          "type": "integer"
        }
      },
      "required": [
        "target"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_send",
    "op": "send",
    "description": "Schreibt eine Nachricht in ein Chat-Ziel und sendet sie. Das Ergebnis enthaelt die Antwort des Ziels, sobald sie fertig ist (sonst pending: dann ondo_wait).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        },
        "text": {
          "type": "string",
          "description": "Dein Text an das Ziel, woertlich"
        }
      },
      "required": [
        "target",
        "text"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_type",
    "op": "type",
    "description": "Schreibt Text in das Eingabefeld eines Chats, ohne zu senden (mode replace oder append).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        },
        "text": {
          "type": "string"
        },
        "mode": {
          "type": "string",
          "enum": [
            "replace",
            "append"
          ]
        }
      },
      "required": [
        "target",
        "text"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_clear",
    "op": "clear",
    "description": "Leert den von ONDO geschriebenen Entwurf im Eingabefeld.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        }
      },
      "required": [
        "target"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_submit",
    "op": "submit",
    "description": "Sendet den zuvor mit ondo_type geschriebenen Entwurf.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        }
      },
      "required": [
        "target"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_click",
    "op": "click",
    "description": "Klickt ein Element (ref aus ondo_observe). Manche Klicks laufen erst nach Freigabe des Nutzers.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        },
        "ref": {
          "type": "string",
          "description": "ref aus dem letzten ondo_observe, z. B. e3@1a2b3c4d"
        }
      },
      "required": [
        "target",
        "ref"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_fill",
    "op": "fill",
    "description": "Fuellt ein Feld einer Website (auch Auswahl und Haekchen) mit text.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        },
        "ref": {
          "type": "string",
          "description": "ref aus dem letzten ondo_observe, z. B. e3@1a2b3c4d"
        },
        "text": {
          "type": "string"
        }
      },
      "required": [
        "target",
        "ref",
        "text"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_press",
    "op": "press",
    "description": "Drueckt eine Taste auf einer Website.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        },
        "key": {
          "type": "string",
          "enum": [
            "Escape",
            "Tab",
            "Enter",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "PageUp",
            "PageDown",
            "Home",
            "End"
          ]
        }
      },
      "required": [
        "target",
        "key"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_scroll",
    "op": "scroll",
    "description": "Scrollt die Seite (dy in Pixel, negativ = nach oben).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        },
        "dy": {
          "type": "integer"
        }
      },
      "required": [
        "target",
        "dy"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_navigate",
    "op": "navigate",
    "description": 'Websites: to = Adresse der freigegebenen Website, "back" oder "bound". Chats: nur "bound".',
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        },
        "to": {
          "type": "string"
        }
      },
      "required": [
        "target",
        "to"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_stop_generation",
    "op": "stop_generation",
    "description": "Stoppt ein Chat-Ziel, das gerade schreibt.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        }
      },
      "required": [
        "target"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_watch",
    "op": "watch",
    "description": "Stellt ein, wie ein Ziel gemeldet wird: final (nur fertige Antworten) oder live (laufend).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "target": {
          "type": "string",
          "description": "Name des Ziels (steht in ondo_start unter targets)"
        },
        "mode": {
          "type": "string",
          "enum": [
            "final",
            "live"
          ]
        }
      },
      "required": [
        "target",
        "mode"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_diag",
    "op": "diag",
    "description": "Liest die Diagnose, die ONDO auf dem iPhone im Relay abgelegt hat (Sitzungsende, Fehler, Knopf). Funktioniert auch, wenn das iPhone schlaeft, und braucht keine Datei vom Nutzer. Ohne id: Liste der letzten Eintraege mit Kurzfassung. Mit id: Zusammenfassung und Teile des Eintrags. Mit id und part: ein Teil im Wortlaut (bis 60000 Zeichen, mit offset weiterlesen).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Eintrag aus der Liste"
        },
        "part": {
          "type": "string",
          "description": "Name eines Teils des Eintrags (steht unter parts)"
        },
        "offset": {
          "type": "number",
          "description": "Startzeichen im Teil, zum Weiterlesen"
        }
      },
      "required": [],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_app",
    "op": "app",
    "description": "Veroeffentlicht eine fertige Web-App (EINE HTML-Datei mit CSS und JavaScript, bis 150000 Zeichen) kostenlos unter einem Link. Der Nutzer oeffnet den Link in Safari und waehlt Teilen > Zum Home-Bildschirm; dann oeffnet sie sich wie eine App. Nur moeglich, wenn der Nutzer in ONDO fuer diesen Auftrag 'Web-Apps veroeffentlichen' erlaubt hat. action=publish (name, html, optional title, icon_png_base64), action=list, action=delete (name). Gleicher name ersetzt die App und behaelt den Link. Wichtig: keine Schluessel oder privaten Daten in die App schreiben, jeder mit dem Link kann sie oeffnen.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "action": { "type": "string", "enum": ["publish", "list", "delete"] },
        "name": { "type": "string", "description": "Kurzname, nur a-z, 0-9 und Bindestrich, bis 40 Zeichen" },
        "html": { "type": "string", "description": "Die ganze App als eine HTML-Datei" },
        "title": { "type": "string", "description": "Name unter dem Symbol auf dem Home-Bildschirm" },
        "icon_png_base64": { "type": "string", "description": "Optional: Symbol als PNG (180x180), Base64, bis 40000 Zeichen" }
      },
      "required": ["action"],
      "additionalProperties": false
    }
  },
  {
    "name": "ondo_end",
    "op": "end",
    "description": "Beendet die Sitzung, wenn der Auftrag erledigt ist. summary = dein Ergebnis fuer den Nutzer.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "summary": {
          "type": "string"
        }
      },
      "required": [],
      "additionalProperties": false
    }
  }
];
var PROTOCOLS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
var PHONE_POLL_MAX_MS = 25e3;
var CALL_MAX_MS = 55e3;
var REDELIVER_MS = 5e3;
var JOB_TTL_MS = 15e4;
var MAX_QUEUE = 40;
var MAX_MCP_BYTES = 2e5;
var MAX_PHONE_BYTES = 2e6;
var IDLE_CLEAN_MS = 24 * 3600 * 1e3;
var PHONE_FRESH_MS = 4e4;
// 0.6.11: a phone that polled within the last 30 minutes is "asleep" (iOS paused the app), not "gone": calls are queued instead of refused
var SLEEP_GRACE_MS = 18e5;
// 0.6.11: on a seat key (the phone says so in its poll) replies and logouts of the AI live 15 minutes instead of 150 s
var SEAT_JOB_TTL_MS = 9e5;
var WAKE_MIN_MS = 6e4;
var JOURNAL_TTL_MS = 36e5;
var SAVE_PHONE_MS = 6e4;
var KEY_RE = /^[A-Za-z0-9_-]{24,128}$/;
// 0.6.75: Diagnose ohne Dateien. The phone (ONDO) files a content-free diagnosis here; the AI reads it with ondo_diag, also while the phone sleeps.
var DIAG_KEEP = 12;
var DIAG_TTL_MS = 7 * 864e5;
var DIAG_PART_MAX = 6e4;
var DIAG_ENTRY_MAX = 4e5;
// 0.6.75 (Punkt 5): Web-Apps. The AI publishes one HTML file (ondo_app); it is served at /a/<pub>/<id>, where <pub> is a one-way hash of the key (the key itself never appears in a link).
// Publishing needs the per-order permission the phone sets (phone/apps); the apps live in a second Durable Object named "pub:<pub>".
var APP_MAX = 20;
var APP_HTML_MAX = 15e4;
var APP_ICON_MAX = 4e4;
var APP_GRANT_MAX_H = 12;
var htmlEsc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function appPage(html, base, title, icon) {
  const t = htmlEsc(title);
  const add = '<link rel="manifest" href="' + base + '/manifest.webmanifest"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="' + t + '">' + (icon ? '<link rel="apple-touch-icon" href="' + base + '/icon.png">' : "");
  const m = /<head[^>]*>/i.exec(html);
  return m ? html.slice(0, m.index + m[0].length) + add + html.slice(m.index + m[0].length) : "<!doctype html><head><meta charset=\"utf-8\">" + add + "</head>" + html;
}
function appHeaders(type) {
  return { "content-type": type, "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff", "content-security-policy": "frame-ancestors 'none'" };
}
var INSTRUCTIONS = "ONDO bedient live das iPhone des Nutzers. Rufe zuerst ondo_start auf: Du bekommst Auftrag, Ziele und Regeln. Danach handelst du selbst mit den ondo_*-Werkzeugen und beendest mit ondo_end.";
function json(body, status, extra) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: Object.assign({ "content-type": "application/json", "cache-control": "no-store" }, extra || {}) });
}
__name(json, "json");
var ok = /* @__PURE__ */ __name((id, result) => ({ jsonrpc: "2.0", id, result }), "ok");
var err = /* @__PURE__ */ __name((id, code, message) => ({ jsonrpc: "2.0", id: id === void 0 ? null : id, error: { code, message } }), "err");
var sleep = /* @__PURE__ */ __name((ms) => new Promise((r) => setTimeout(r, ms)), "sleep");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = /^\/k\/([^/]+)\/(mcp|phone\/poll|phone\/result|phone\/revoke|phone\/diag|phone\/apps|exec\/journal)\/?$/.exec(url.pathname);
    const am = /^\/a\/([a-f0-9]{20})\/([a-z0-9]{10})(\/manifest\.webmanifest|\/icon\.png|\/)?$/.exec(url.pathname);
    if (am) {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("method not allowed", { status: 405 });
      return env.HUB.get(env.HUB.idFromName("pub:" + am[1])).fetch(request);
    }
    if (!m) {
      if (url.pathname === "/" || url.pathname === "/health") return new Response("ONDO Relay laeuft.\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
      return new Response("not found", { status: 404 });
    }
    if (!KEY_RE.test(m[1])) return new Response("not found", { status: 404 });
    const id = env.HUB.idFromName(m[1]);
    return env.HUB.get(id).fetch(request);
  }
};
var Hub = class {
  static {
    __name(this, "Hub");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.jobs = [];
    this.inflight = /* @__PURE__ */ new Map();
    this.waiters = /* @__PURE__ */ new Map();
    this.orphans = [];
    this.poll = null;
    this.pollOpen = false;
    this.lastPhone = 0;
    this.seq = 0;
    this.revoked = false;
    this.lastAlarm = 0;
    this.seatKey = false;
    this.savedPhoneAt = 0;
    this.wakeUrl = "";
    this.lastWake = 0;
    this.pub = "";
    this.appUntil = 0;
    this.origin = "";
    state.blockConcurrencyWhile(async () => {
      try {
        const m = await state.storage.get(["q", "revoked", "lp", "seat", "wk", "pub", "ag"]);
        this.pub = typeof m.get("pub") === "string" ? m.get("pub") : "";
        this.appUntil = Number(m.get("ag")) || 0;
        this.revoked = m.get("revoked") === true;
        this.lastPhone = Number(m.get("lp")) || 0;
        this.savedPhoneAt = this.lastPhone;
        this.seatKey = m.get("seat") === true;
        this.wakeUrl = typeof m.get("wk") === "string" ? m.get("wk") : "";
        const q = m.get("q");
        if (q && typeof q === "object") {
          this.jobs = Array.isArray(q.jobs) ? q.jobs : [];
          for (const j of Array.isArray(q.inflight) ? q.inflight : []) if (j && j.id) this.inflight.set(j.id, { job: j, at: 0 });
          this.orphans = Array.isArray(q.orphans) ? q.orphans : [];
          this.seq = Number(q.seq) || 0;
        }
      } catch (e) {
      }
    });
  }
  persist() {
    try {
      this.state.storage.put("q", { jobs: this.jobs, inflight: [...this.inflight.values()].map((e) => e.job), orphans: this.orphans, seq: this.seq }).catch(() => {
      });
    } catch (e) {
    }
  }
  markPhone() {
    const now = Date.now();
    this.lastPhone = now;
    if (now - this.savedPhoneAt < SAVE_PHONE_MS) return;
    this.savedPhoneAt = now;
    try {
      this.state.storage.put("lp", now).catch(() => {
      });
    } catch (e) {
    }
  }
  touch() {
    const now = Date.now();
    if (now - this.lastAlarm < 6e5) return;
    this.lastAlarm = now;
    try {
      this.state.storage.setAlarm(now + IDLE_CLEAN_MS).catch(() => {
      });
    } catch (e) {
    }
  }
  async alarm() {
    if (this.pollOpen || this.waiters.size) {
      this.lastAlarm = 0;
      this.touch();
      return;
    }
    this.jobs = [];
    this.inflight.clear();
    this.orphans = [];
    try {
      await this.state.storage.delete("q");
    } catch (e) {
    }
    try {
      const all = await this.state.storage.get("dgi"), keep = await this.diagIndex();
      for (const x of Array.isArray(all) ? all : []) if (x && x.id && !keep.some((k) => k.id === x.id)) await this.state.storage.delete("dg:" + x.id);
      await this.state.storage.put("dgi", keep);
    } catch (e) {
    }
  }
  async fetch(request) {
    const rawPath = new URL(request.url).pathname;
    if (rawPath.indexOf("/a/") === 0) return this.appServe(request);
    if (rawPath.indexOf("/_app/") === 0) return this.appInternal(request);
    const km = /^\/k\/([^/]+)/.exec(rawPath);
    if (km && !this.revoked) await this.learnKey(km[1], new URL(request.url).origin);
    const path = rawPath.replace(/^\/k\/[^/]+/, "").replace(/\/$/, "");
    if (path === "/phone/revoke") {
      if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
      this.revoked = true;
      this.jobs = [];
      this.inflight.clear();
      this.orphans = [];
      try {
        await this.state.storage.put("revoked", true);
        await this.state.storage.delete("q");
      } catch (e) {
      }
      if (this.poll) {
        const p = this.poll;
        this.poll = null;
        p.resolve();
      }
      return json({ ok: true });
    }
    if (this.revoked) return new Response("This key was retired. Use the new connector address shown in ONDO.", { status: 410 });
    if (Number(request.headers.get("content-length") || 0) > (path === "/mcp" ? MAX_MCP_BYTES : MAX_PHONE_BYTES)) return new Response("too large", { status: 413 });
    this.touch();
    if (path === "/mcp") return this.mcp(request);
    if (path === "/phone/poll") return this.phonePoll(request);
    if (path === "/phone/result") return this.phoneResult(request);
    if (path === "/exec/journal") return this.journal(request);
    if (path === "/phone/diag") return this.diagPut(request);
    if (path === "/phone/apps") return this.appsPhone(request);
    return new Response("not found", { status: 404 });
  }
  // ---------------- MCP (Streamable HTTP, JSON responses) ----------------
  async mcp(request) {
    if (request.method === "GET") return new Response("Only POST is supported here.", { status: 405, headers: { Allow: "POST" } });
    if (request.method === "DELETE") return new Response(null, { status: 200 });
    if (request.method !== "POST") return new Response("method not allowed", { status: 405, headers: { Allow: "POST" } });
    let msg;
    try {
      msg = await request.json();
    } catch (e) {
      return json(err(null, -32700, "Parse error"), 400);
    }
    const batch = Array.isArray(msg) ? msg : [msg];
    const outs = [];
    for (const m of batch) {
      const r = await this.rpc(m);
      if (r) outs.push(r);
    }
    if (!outs.length) return new Response(null, { status: 202 });
    return json(Array.isArray(msg) ? outs : outs[0]);
  }
  async rpc(m) {
    if (!m || typeof m !== "object" || typeof m.method !== "string") return err(m && m.id, -32600, "Invalid Request");
    const id = m.id, note = id === void 0 || id === null;
    switch (m.method) {
      case "initialize": {
        const want = m.params && m.params.protocolVersion;
        return ok(id, { protocolVersion: PROTOCOLS.indexOf(want) >= 0 ? want : PROTOCOLS[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: "ondo-mobile", version: "1.0.0" }, instructions: INSTRUCTIONS });
      }
      case "ping":
        return ok(id, {});
      case "tools/list":
        return ok(id, { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
      case "tools/call":
        return ok(id, await this.callTool(m.params || {}));
      case "resources/list":
        return ok(id, { resources: [] });
      case "prompts/list":
        return ok(id, { prompts: [] });
      default:
        if (note || m.method.indexOf("notifications/") === 0) return null;
        return err(id, -32601, "Method not found");
    }
  }
  phoneConnected() {
    return this.pollOpen || Date.now() - this.lastPhone < PHONE_FRESH_MS;
  }
  async callTool(p) {
    const tool = TOOLS.filter((t) => t.name === p.name)[0];
    if (!tool) return { isError: true, content: [{ type: "text", text: "Unbekanntes Werkzeug: " + String(p.name).slice(0, 40) }] };
    if (tool.op === "app") return this.appTool(p.arguments && typeof p.arguments === "object" ? p.arguments : {});
    if (tool.op === "diag") return this.diagTool(p.arguments && typeof p.arguments === "object" ? p.arguments : {});
    const asleep = !this.phoneConnected();
    if (asleep && !(this.lastPhone && Date.now() - this.lastPhone < SLEEP_GRACE_MS)) {
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, reason: "phone_not_connected", hint: "ONDO ist auf dem iPhone gerade nicht verbunden. Der Nutzer muss ONDO oeffnen und eine Sitzung mit 'KI per Connector' starten. Sag ihm das und versuche es danach noch einmal." }) }] };
    }
    if (this.jobs.length + this.inflight.size >= MAX_QUEUE) return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, reason: "too_many_open_calls", hint: "Es sind schon viele Aufrufe offen. Warte mit ondo_wait auf Ergebnisse, bevor du weitere sendest." }) }] };
    const job = { id: "j" + ++this.seq + "-" + Math.random().toString(36).slice(2, 8), tool: tool.name, op: tool.op, args: p.arguments && typeof p.arguments === "object" ? p.arguments : {} };
    const result = new Promise((resolve) => {
      this.waiters.set(job.id, resolve);
    });
    job.born = Date.now();
    if (this.seatKey && (tool.op === "send" || tool.op === "end")) job.ttl = SEAT_JOB_TTL_MS;
    if (asleep && (tool.op === "wait" || tool.op === "read" || tool.op === "observe" || tool.op === "watch" || tool.name === "ondo_start")) {
      // the AI asks again and again while the phone sleeps (also ondo_start: two queued starts would take two seats): only the newest identical call stays queued
      const same = JSON.stringify(job.args);
      this.jobs = this.jobs.filter((x) => !(x.tool === job.tool && JSON.stringify(x.args) === same));
    }
    this.jobs.push(job);
    this.persist();
    this.wakePoll();
    if (asleep) this.pingWake();
    const r = await Promise.race([result, sleep(CALL_MAX_MS).then(() => null)]);
    this.waiters.delete(job.id);
    let out;
    if (r === null && !this.phoneConnected()) out = { ok: true, pending: true, reason: "phone_sleeping", hint: "Das iPhone schläft gerade (ONDO ist im Hintergrund oder der Bildschirm ist aus). Die Sitzung besteht fort; dein Aufruf wartet im Relay und wird ausgeführt, sobald ONDO wieder offen ist. Rufe das Werkzeug in Kürze noch einmal auf und beende die Arbeit NICHT. Sag dem Nutzer nur kurz, dass ONDO im Vordergrund sein muss." };
    else if (r === null) out = { ok: true, pending: true, hint: "Das iPhone antwortet noch (ist ONDO auf dem iPhone im Vordergrund und der Bildschirm an?). Sag das dem Nutzer und rufe ondo_wait auf, um das Ergebnis zu holen." };
    else out = r;
    if (this.orphans.length) {
      out = Object.assign({}, out, { earlier: this.orphans.splice(0, 5) });
      this.persist();
    }
    const isErr = out && out.ok === false && !out.events;
    let text;
    if (out && typeof out.brief === "string") {
      const rest = Object.assign({}, out);
      delete rest.brief;
      text = out.brief + "\nZustand: " + JSON.stringify(rest);
    } else text = typeof out === "string" ? out : JSON.stringify(out);
    return { isError: isErr || void 0, content: [{ type: "text", text }] };
  }
  // ---------------- the phone ----------------
  wakePoll() {
    if (this.poll && this.jobs.length) {
      const p = this.poll;
      this.poll = null;
      p.resolve();
    }
  }
  // wake the replaceable executor (e.g. a sleeping free web service) with one plain GET; answer is ignored, at most once per minute
  pingWake() {
    const now = Date.now();
    if (!this.wakeUrl || now - this.lastWake < WAKE_MIN_MS) return;
    this.lastWake = now;
    try {
      fetch(this.wakeUrl, { method: "GET", headers: { "user-agent": "ondo-relay-wake" } }).catch(() => {
      });
    } catch (e) {
    }
  }
  // journal for the executor: "intent" before a risky action, "done" after; survives executor restarts, so nothing runs twice
  async journal(request) {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    let b = null;
    try {
      b = await request.json();
    } catch (e) {
    }
    if (!b || typeof b.id !== "string" || b.id.length > 80 || !/^(get|intent|done)$/.test(String(b.act))) return json({ ok: false }, 400);
    const key = "jr:" + b.id, now = Date.now();
    let cur = null;
    try {
      cur = await this.state.storage.get(key);
    } catch (e) {
    }
    if (cur && now - cur.at > JOURNAL_TTL_MS) cur = null;
    if (b.act === "get") return json({ ok: true, entry: cur || null });
    const val = JSON.stringify(b.val === void 0 ? null : b.val);
    if (val.length > 20000) return json({ ok: false, reason: "too_large" }, 413);
    const next = b.act === "intent" ? { at: cur ? cur.at : now, intent: b.val === void 0 ? true : b.val, done: cur ? cur.done : void 0 } : { at: cur ? cur.at : now, intent: cur ? cur.intent : void 0, done: b.val === void 0 ? true : b.val };
    try {
      await this.state.storage.put(key, next);
      this.state.storage.setAlarm(now + IDLE_CLEAN_MS).catch(() => {
      });
    } catch (e) {
      return json({ ok: false }, 500);
    }
    return json({ ok: true, entry: next });
  }
  // ---------------- web apps (0.6.75, Punkt 5) ----------------
  async learnKey(key, origin) {
    if (origin) this.origin = origin;
    if (this.pub) return;
    try {
      const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ondo-pub:" + key)));
      this.pub = Array.from(d).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 20);
      await this.state.storage.put("pub", this.pub);
    } catch (e) {
    }
  }
  appStub() {
    return this.env.HUB.get(this.env.HUB.idFromName("pub:" + this.pub));
  }
  async appCall(op, body) {
    const r = await this.appStub().fetch(new Request("https://hub/_app/" + op, { method: "POST", body: JSON.stringify(body || {}) }));
    let j = null;
    try {
      j = await r.json();
    } catch (e) {
    }
    return j || { ok: false, reason: "no_answer" };
  }
  appUrl(id) {
    return (this.origin || "") + "/a/" + this.pub + "/" + id + "/";
  }
  async appTool(a) {
    const out = (o, isErr) => ({ isError: isErr || void 0, content: [{ type: "text", text: JSON.stringify(o) }] });
    if (!this.pub) return out({ ok: false, reason: "not_ready", hint: "Der Nutzer muss ONDO einmal mit dem Relay verbinden." }, true);
    const act = String(a.action || "list"), now = Date.now();
    if (act === "list") {
      const r = await this.appCall("list");
      return out({ ok: true, granted: this.appUntil > now, apps: (r.apps || []).map((x) => ({ name: x.name, title: x.title, url: this.appUrl(x.id), chars: x.chars, at: new Date(x.at).toISOString() })) });
    }
    if (act === "delete") {
      const r = await this.appCall("delete", { name: String(a.name || "") });
      return out(r, !r.ok);
    }
    if (act !== "publish") return out({ ok: false, reason: "bad_action" }, true);
    if (!(this.appUntil > now)) return out({ ok: false, reason: "not_granted", hint: "Der Nutzer hat Web-Apps fuer diesen Auftrag nicht erlaubt. Sag ihm: in ONDO beim Start des Entwicklerraums den Haken 'Web-Apps veroeffentlichen' setzen. Du kannst die App bis dahin als Text liefern." }, true);
    const r = await this.appCall("put", { name: a.name, html: a.html, title: a.title, icon: a.icon_png_base64 });
    if (!r.ok) return out(r, true);
    return out({ ok: true, name: r.name, url: this.appUrl(r.id), chars: r.chars, replaced: !!r.replaced, hint: "Sag dem Nutzer: Link in Safari oeffnen, dann Teilen > Zum Home-Bildschirm. Jeder mit dem Link kann die App oeffnen. Der Nutzer kann sie in ONDO unter Einstellungen > Web-Apps wieder loeschen." });
  }
  async appsPhone(request) {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    let b = null;
    try {
      b = await request.json();
    } catch (e) {
    }
    if (!b || typeof b.op !== "string") return json({ ok: false, reason: "bad_request" }, 400);
    if (!this.pub) return json({ ok: false, reason: "not_ready" }, 503);
    if (b.op === "grant") {
      const h = Math.max(0.1, Math.min(Number(b.hours) || 8, APP_GRANT_MAX_H));
      this.appUntil = Date.now() + h * 36e5;
      try {
        await this.state.storage.put("ag", this.appUntil);
      } catch (e) {
      }
      return json({ ok: true, until: this.appUntil });
    }
    if (b.op === "revoke") {
      this.appUntil = 0;
      try {
        await this.state.storage.put("ag", 0);
      } catch (e) {
      }
      return json({ ok: true });
    }
    if (b.op === "list") {
      const r = await this.appCall("list");
      return json({ ok: true, granted: this.appUntil > Date.now(), until: this.appUntil, apps: (r.apps || []).map((x) => ({ name: x.name, title: x.title, url: this.appUrl(x.id), chars: x.chars, at: x.at })) });
    }
    if (b.op === "delete") return json(await this.appCall("delete", { name: String(b.name || "") }));
    if (b.op === "delete_all") return json(await this.appCall("delete_all"));
    return json({ ok: false, reason: "bad_op" }, 400);
  }
  // the second Durable Object ("pub:<pub>"): stores and serves the apps; reachable only through the Worker route /a/... and the stub of the key's own object
  async appIndex() {
    let ix = [];
    try {
      const v = await this.state.storage.get("api");
      if (Array.isArray(v)) ix = v;
    } catch (e) {
    }
    return ix;
  }
  async appInternal(request) {
    const op = new URL(request.url).pathname.replace(/^\/_app\//, "");
    let b = {};
    try {
      b = await request.json();
    } catch (e) {
    }
    let ix = await this.appIndex();
    if (op === "list") return json({ ok: true, apps: ix });
    if (op === "delete") {
      const x = ix.filter((q) => q.name === b.name)[0];
      if (!x) return json({ ok: false, reason: "not_found", names: ix.map((q) => q.name) });
      await this.state.storage.delete("ap:" + x.id);
      await this.state.storage.put("api", ix.filter((q) => q.id !== x.id));
      return json({ ok: true, deleted: x.name });
    }
    if (op === "delete_all") {
      for (const x of ix) await this.state.storage.delete("ap:" + x.id);
      await this.state.storage.put("api", []);
      return json({ ok: true, deleted: ix.length });
    }
    if (op !== "put") return json({ ok: false, reason: "bad_op" }, 400);
    const name = typeof b.name === "string" ? b.name : "", html = typeof b.html === "string" ? b.html : "";
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(name)) return json({ ok: false, reason: "bad_name", hint: "name: a-z, 0-9, Bindestrich, 1 bis 40 Zeichen" });
    if (html.length < 20) return json({ ok: false, reason: "no_html" });
    if (html.length > APP_HTML_MAX) return json({ ok: false, reason: "too_large", max: APP_HTML_MAX });
    let icon = "";
    if (b.icon !== void 0 && b.icon !== null && b.icon !== "") {
      if (typeof b.icon !== "string" || b.icon.length > APP_ICON_MAX || !/^[A-Za-z0-9+\/=]+$/.test(b.icon)) return json({ ok: false, reason: "icon_invalid" });
      icon = b.icon;
    }
    let x = ix.filter((q) => q.name === name)[0];
    const replaced = !!x;
    if (!x) {
      if (ix.length >= APP_MAX) return json({ ok: false, reason: "too_many", max: APP_MAX, names: ix.map((q) => q.name), hint: "Loesche zuerst eine App (action=delete)." });
      const rnd = crypto.getRandomValues(new Uint8Array(10));
      x = { id: Array.from(rnd).map((n) => "abcdefghijklmnopqrstuvwxyz0123456789"[n % 36]).join(""), name };
    }
    x.title = String(b.title || name).slice(0, 40);
    x.at = Date.now();
    x.chars = html.length;
    x.icon = !!icon;
    await this.state.storage.put("ap:" + x.id, { html, icon, title: x.title });
    await this.state.storage.put("api", ix.filter((q) => q.id !== x.id).concat([x]));
    return json({ ok: true, id: x.id, name, chars: x.chars, replaced });
  }
  async appServe(request) {
    const m = /^\/a\/([a-f0-9]{20})\/([a-z0-9]{10})(\/manifest\.webmanifest|\/icon\.png|\/)?$/.exec(new URL(request.url).pathname);
    if (!m) return new Response("not found", { status: 404 });
    let rec = null;
    try {
      rec = await this.state.storage.get("ap:" + m[2]);
    } catch (e) {
    }
    if (!rec || typeof rec.html !== "string") return new Response("not found", { status: 404, headers: appHeaders("text/plain; charset=utf-8") });
    const base = "/a/" + m[1] + "/" + m[2];
    if (m[3] === "/manifest.webmanifest") {
      const mf = { name: rec.title, short_name: rec.title.slice(0, 12), start_url: base + "/", scope: base + "/", display: "standalone", background_color: "#ffffff", theme_color: "#ffffff" };
      if (rec.icon) mf.icons = [{ src: base + "/icon.png", sizes: "180x180", type: "image/png" }];
      return new Response(JSON.stringify(mf), { headers: appHeaders("application/manifest+json") });
    }
    if (m[3] === "/icon.png") {
      if (!rec.icon) return new Response("not found", { status: 404 });
      const bin = Uint8Array.from(atob(rec.icon), (c) => c.charCodeAt(0));
      return new Response(bin, { headers: appHeaders("image/png") });
    }
    return new Response(appPage(rec.html, base, rec.title, !!rec.icon), { headers: appHeaders("text/html; charset=utf-8") });
  }
  // ---------------- diagnosis filed by the phone, read by the AI (0.6.75) ----------------
  async diagIndex() {
    let ix = [];
    try {
      const v = await this.state.storage.get("dgi");
      if (Array.isArray(v)) ix = v;
    } catch (e) {
    }
    const now = Date.now();
    return ix.filter((x) => x && typeof x.id === "string" && now - x.at <= DIAG_TTL_MS);
  }
  async diagPut(request) {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    let b = null;
    try {
      b = await request.json();
    } catch (e) {
    }
    if (!b || typeof b.id !== "string" || !/^[A-Za-z0-9_.-]{1,48}$/.test(b.id) || !b.parts || typeof b.parts !== "object" || Array.isArray(b.parts)) return json({ ok: false, reason: "bad_request" }, 400);
    const parts = {};
    let total = 0, n = 0;
    for (const k of Object.keys(b.parts)) {
      if (!/^[A-Za-z0-9_.-]{1,32}$/.test(k) || ++n > 12) continue;
      const t = typeof b.parts[k] === "string" ? b.parts[k] : JSON.stringify(b.parts[k]);
      if (k.indexOf("img_") === 0 && (typeof b.parts[k] !== "string" || b.parts[k].length > DIAG_PART_MAX * 4 || !/^[A-Za-z0-9+\/=]+$/.test(b.parts[k]))) return json({ ok: false, reason: "image_invalid", part: k }, 413);
      parts[k] = String(t).slice(0, DIAG_PART_MAX * 4);
      total += parts[k].length;
    }
    if (!n) return json({ ok: false, reason: "no_parts" }, 400);
    if (total > DIAG_ENTRY_MAX) return json({ ok: false, reason: "too_large" }, 413);
    const now = Date.now();
    const meta = { id: b.id, at: now, kind: String(b.kind || "report").replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 24) || "report", title: String(b.title || "").slice(0, 160), sum: String(typeof b.sum === "string" ? b.sum : JSON.stringify(b.sum === void 0 ? "" : b.sum)).slice(0, 2000), parts: Object.keys(parts).map((k) => ({ name: k, chars: parts[k].length })) };
    try {
      let ix = (await this.diagIndex()).filter((x) => x.id !== b.id);
      ix.unshift(meta);
      const drop = ix.slice(DIAG_KEEP);
      ix = ix.slice(0, DIAG_KEEP);
      await this.state.storage.put("dg:" + b.id, { meta, parts });
      await this.state.storage.put("dgi", ix);
      for (const d of drop) await this.state.storage.delete("dg:" + d.id);
      this.state.storage.setAlarm(now + IDLE_CLEAN_MS).catch(() => {
      });
    } catch (e) {
      return json({ ok: false, reason: "storage" }, 500);
    }
    return json({ ok: true, id: b.id, parts: meta.parts.length, chars: total });
  }
  async diagTool(a) {
    const out = (o, isErr) => ({ isError: isErr || void 0, content: [{ type: "text", text: JSON.stringify(o) }] });
    const ix = await this.diagIndex();
    if (!a.id) {
      return out({ ok: true, count: ix.length, entries: ix.map((x) => ({ id: x.id, at: new Date(x.at).toISOString(), kind: x.kind, title: x.title, sum: x.sum, parts: x.parts.map((q) => q.name + ":" + q.chars) })), hint: ix.length ? "Mit id (und part) liest du weiter. Neueste zuerst." : "Noch nichts abgelegt. ONDO legt am Sitzungsende, bei Fehlern und auf Knopfdruck eine Diagnose ab; der Nutzer kann sie unter Einstellungen > Diagnose ans Relay senden." });
    }
    const id = String(a.id).slice(0, 48);
    if (!ix.some((x) => x.id === id)) return out({ ok: false, reason: "not_found", ids: ix.map((x) => x.id) }, true);
    let rec = null;
    try {
      rec = await this.state.storage.get("dg:" + id);
    } catch (e) {
    }
    if (!rec || !rec.parts) return out({ ok: false, reason: "not_found" }, true);
    if (!a.part) return out({ ok: true, id, at: new Date(rec.meta.at).toISOString(), kind: rec.meta.kind, title: rec.meta.title, sum: rec.meta.sum, parts: rec.meta.parts });
    const part = String(a.part).slice(0, 32);
    if (typeof rec.parts[part] !== "string") return out({ ok: false, reason: "part_not_found", parts: rec.meta.parts.map((q) => q.name) }, true);
    if (part.indexOf("img_") === 0) {
      return { content: [{ type: "image", data: rec.parts[part], mimeType: "image/jpeg" }, { type: "text", text: JSON.stringify({ ok: true, id, part, chars: rec.parts[part].length, info: rec.parts.info ? rec.parts.info.slice(0, 500) : null }) }] };
    }
    const off = Math.max(0, Math.floor(Number(a.offset) || 0)), t = rec.parts[part], chunk = t.slice(off, off + DIAG_PART_MAX);
    return out({ ok: true, id, part, offset: off, chars: chunk.length, total: t.length, more: off + chunk.length < t.length ? off + chunk.length : null, text: chunk });
  }
  async phonePoll(request) {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
    }
    this.markPhone();
    if (body && body.seat === true && !this.seatKey) {
      this.seatKey = true;
      try {
        this.state.storage.put("seat", true).catch(() => {
        });
      } catch (e) {
      }
    }
    if (body && typeof body.wake === "string" && body.wake !== this.wakeUrl && /^https:\/\/[^\s]{4,300}$/.test(body.wake)) {
      this.wakeUrl = body.wake;
      try {
        this.state.storage.put("wk", body.wake).catch(() => {
        });
      } catch (e) {
      }
    }
    if (body && Array.isArray(body.ack) && body.ack.length) {
      for (const a of body.ack.slice(0, 50)) this.inflight.delete(String(a));
      this.persist();
    }
    if (this.poll) {
      const old = this.poll;
      this.poll = null;
      old.resolve();
    }
    let jobs = this.takeJobs();
    if (!jobs.length) {
      let wait = Math.max(0, Math.min(Number(body.wait_ms) || PHONE_POLL_MAX_MS, PHONE_POLL_MAX_MS));
      if (this.inflight.size) wait = Math.min(wait, REDELIVER_MS + 200);
      this.pollOpen = true;
      await new Promise((resolve) => {
        const me = { resolve };
        this.poll = me;
        setTimeout(() => {
          if (this.poll === me) this.poll = null;
          resolve();
        }, wait);
      });
      this.pollOpen = !!this.poll;
      jobs = this.takeJobs();
    }
    this.markPhone();
    return json({ jobs, now: Date.now() });
  }
  // new jobs plus jobs handed out earlier but never confirmed; expired ones are dropped
  takeJobs() {
    const now = Date.now(), out = [];
    this.jobs = this.jobs.filter((j) => now - j.born < (j.ttl || JOB_TTL_MS));
    for (const [id, e] of this.inflight) if (now - e.job.born >= (e.job.ttl || JOB_TTL_MS)) this.inflight.delete(id);
    for (const j of this.jobs.splice(0, this.jobs.length)) {
      this.inflight.set(j.id, { job: j, at: now });
      out.push(j);
    }
    for (const [id, e] of this.inflight) if (out.indexOf(e.job) < 0 && now - e.at >= REDELIVER_MS) {
      e.at = now;
      out.push(e.job);
    }
    if (out.length) this.persist();
    return out.map((j) => ({ id: j.id, tool: j.tool, op: j.op, args: j.args }));
  }
  async phoneResult(request) {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    let body = null;
    try {
      body = await request.json();
    } catch (e) {
    }
    this.markPhone();
    if (!body || typeof body.id !== "string") return json({ ok: false }, 400);
    this.inflight.delete(body.id);
    this.persist();
    const w = this.waiters.get(body.id);
    if (w) {
      this.waiters.delete(body.id);
      w(body.result);
    } else {
      this.orphans.push({ id: body.id, result: body.result });
      if (this.orphans.length > 20) this.orphans.shift();
      this.persist();
    }
    return json({ ok: true });
  }
};
export {
  Hub,
  worker_default as default
};
//# sourceMappingURL=worker.js.map