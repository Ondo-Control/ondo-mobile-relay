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
var KEY_RE = /^[A-Za-z0-9_-]{24,128}$/;
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
    const m = /^\/k\/([^/]+)\/(mcp|phone\/poll|phone\/result|phone\/revoke)\/?$/.exec(url.pathname);
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
    state.blockConcurrencyWhile(async () => {
      try {
        const m = await state.storage.get(["q", "revoked"]);
        this.revoked = m.get("revoked") === true;
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
  }
  async fetch(request) {
    const path = new URL(request.url).pathname.replace(/^\/k\/[^/]+/, "").replace(/\/$/, "");
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
    if (!this.phoneConnected()) {
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, reason: "phone_not_connected", hint: "ONDO ist auf dem iPhone gerade nicht verbunden. Der Nutzer muss ONDO oeffnen und eine Sitzung mit 'KI per Connector' starten. Sag ihm das und versuche es danach noch einmal." }) }] };
    }
    if (this.jobs.length + this.inflight.size >= MAX_QUEUE) return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, reason: "too_many_open_calls", hint: "Es sind schon viele Aufrufe offen. Warte mit ondo_wait auf Ergebnisse, bevor du weitere sendest." }) }] };
    const job = { id: "j" + ++this.seq + "-" + Math.random().toString(36).slice(2, 8), tool: tool.name, op: tool.op, args: p.arguments && typeof p.arguments === "object" ? p.arguments : {} };
    const result = new Promise((resolve) => {
      this.waiters.set(job.id, resolve);
    });
    job.born = Date.now();
    this.jobs.push(job);
    this.persist();
    this.wakePoll();
    const r = await Promise.race([result, sleep(CALL_MAX_MS).then(() => null)]);
    this.waiters.delete(job.id);
    let out;
    if (r === null) out = { ok: true, pending: true, hint: "Das iPhone antwortet noch (ist ONDO auf dem iPhone im Vordergrund und der Bildschirm an?). Sag das dem Nutzer und rufe ondo_wait auf, um das Ergebnis zu holen." };
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
  async phonePoll(request) {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
    }
    this.lastPhone = Date.now();
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
      this.pollOpen = false;
      jobs = this.takeJobs();
    }
    this.lastPhone = Date.now();
    return json({ jobs, now: Date.now() });
  }
  // new jobs plus jobs handed out earlier but never confirmed; expired ones are dropped
  takeJobs() {
    const now = Date.now(), out = [];
    this.jobs = this.jobs.filter((j) => now - j.born < JOB_TTL_MS);
    for (const [id, e] of this.inflight) if (now - e.job.born >= JOB_TTL_MS) this.inflight.delete(id);
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
    this.lastPhone = Date.now();
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