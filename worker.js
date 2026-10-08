// ONDO Relay - a tiny, stateless-looking bridge between an AI (MCP connector) and the ONDO app on the user's iPhone.
//
//   AI  --(MCP over HTTPS, POST /k/<key>/mcp)-->  Relay  <--(long-poll, POST /k/<key>/phone/poll)--  ONDO on the iPhone
//
// The relay decides nothing and stores nothing durable: it hands a tool call to the phone, waits for the phone's answer and hands
// that back. All rules (what the AI may touch, what needs a tap) live in the ONDO app. The <key> is a long random secret chosen by
// ONDO; whoever knows it can only call the tools below, and only while a session is running in the app.
const TOOLS = [
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
    "description": "Websites: to = Adresse der freigegebenen Website, \"back\" oder \"bound\". Chats: nur \"bound\".",
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

const PROTOCOLS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const PHONE_POLL_MAX_MS = 25000;          // one long-poll of the phone
const CALL_MAX_MS = 55000;                // longest wait of ONE tool call (the AI client has its own limit)
const PHONE_FRESH_MS = 40000;             // the phone counts as connected while it polled this recently
const KEY_RE = /^[A-Za-z0-9_-]{24,128}$/;
const INSTRUCTIONS = "ONDO bedient live das iPhone des Nutzers. Rufe zuerst ondo_start auf: Du bekommst Auftrag, Ziele und Regeln. Danach handelst du selbst mit den ondo_*-Werkzeugen und beendest mit ondo_end.";

function json(body, status, extra) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: Object.assign({ "content-type": "application/json", "cache-control": "no-store" }, extra || {}) });
}
const ok = (id, result) => ({ jsonrpc: "2.0", id: id, result: result });
const err = (id, code, message) => ({ jsonrpc: "2.0", id: id === undefined ? null : id, error: { code: code, message: message } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = /^\/k\/([^/]+)\/(mcp|phone\/poll|phone\/result)\/?$/.exec(url.pathname);
    if (!m) {
      if (url.pathname === "/" || url.pathname === "/health") return new Response("ONDO Relay laeuft.\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
      return new Response("not found", { status: 404 });
    }
    if (!KEY_RE.test(m[1])) return new Response("not found", { status: 404 });
    const id = env.HUB.idFromName(m[1]);
    return env.HUB.get(id).fetch(request);
  },
};

export class Hub {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.jobs = [];                 // queued for the phone
    this.waiters = new Map();       // job id -> resolve(result)
    this.orphans = [];              // results that arrived after their tool call gave up: handed over with the next call
    this.poll = null;               // the phone's open long-poll: { resolve }
    this.pollOpen = false; this.lastPhone = 0; this.seq = 0;
  }

  async fetch(request) {
    const path = new URL(request.url).pathname.replace(/^\/k\/[^/]+/, "").replace(/\/$/, "");
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
    try { msg = await request.json(); } catch (e) { return json(err(null, -32700, "Parse error"), 400); }
    const batch = Array.isArray(msg) ? msg : [msg];
    const outs = [];
    for (const m of batch) { const r = await this.rpc(m); if (r) outs.push(r); }
    if (!outs.length) return new Response(null, { status: 202 });
    return json(Array.isArray(msg) ? outs : outs[0]);
  }

  async rpc(m) {
    if (!m || typeof m !== "object" || typeof m.method !== "string") return err(m && m.id, -32600, "Invalid Request");
    const id = m.id, note = id === undefined || id === null;
    switch (m.method) {
      case "initialize": {
        const want = m.params && m.params.protocolVersion;
        return ok(id, { protocolVersion: PROTOCOLS.indexOf(want) >= 0 ? want : PROTOCOLS[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: "ondo-mobile", version: "1.0.0" }, instructions: INSTRUCTIONS });
      }
      case "ping": return ok(id, {});
      case "tools/list": return ok(id, { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
      case "tools/call": return ok(id, await this.callTool(m.params || {}));
      case "resources/list": return ok(id, { resources: [] });
      case "prompts/list": return ok(id, { prompts: [] });
      default:
        if (note || m.method.indexOf("notifications/") === 0) return null;
        return err(id, -32601, "Method not found");
    }
  }

  phoneConnected() { return this.pollOpen || Date.now() - this.lastPhone < PHONE_FRESH_MS; }

  async callTool(p) {
    const tool = TOOLS.filter((t) => t.name === p.name)[0];
    if (!tool) return { isError: true, content: [{ type: "text", text: "Unbekanntes Werkzeug: " + String(p.name).slice(0, 40) }] };
    if (!this.phoneConnected()) {
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, reason: "phone_not_connected", hint: "ONDO ist auf dem iPhone gerade nicht verbunden. Der Nutzer muss ONDO oeffnen und eine Sitzung mit 'KI per Connector' starten. Sag ihm das und versuche es danach noch einmal." }) }] };
    }
    const job = { id: "j" + (++this.seq) + "-" + Math.random().toString(36).slice(2, 8), tool: tool.name, op: tool.op, args: p.arguments && typeof p.arguments === "object" ? p.arguments : {} };
    const result = new Promise((resolve) => { this.waiters.set(job.id, resolve); });
    this.jobs.push(job);
    this.wakePoll();
    const r = await Promise.race([result, sleep(CALL_MAX_MS).then(() => null)]);
    this.waiters.delete(job.id);
    let out;
    if (r === null) out = { ok: true, pending: true, hint: "Das iPhone antwortet noch. Rufe ondo_wait auf, um das Ergebnis zu holen." };
    else out = r;
    if (this.orphans.length) { out = Object.assign({}, out, { earlier: this.orphans.splice(0, 5) }); }
    const isErr = out && out.ok === false && !out.events;
    let text;
    if (out && typeof out.brief === "string") { const rest = Object.assign({}, out); delete rest.brief; text = out.brief + "\nZustand: " + JSON.stringify(rest); }
    else text = typeof out === "string" ? out : JSON.stringify(out);
    return { isError: isErr || undefined, content: [{ type: "text", text: text }] };
  }

  // ---------------- the phone ----------------
  wakePoll() {
    if (this.poll && this.jobs.length) { const p = this.poll; this.poll = null; p.resolve(); }
  }
  async phonePoll(request) {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    let body = {}; try { body = await request.json(); } catch (e) { /* empty */ }
    this.lastPhone = Date.now();
    if (this.poll) { const old = this.poll; this.poll = null; old.resolve(); }      // a newer poll replaces the older one
    if (!this.jobs.length) {
      const wait = Math.max(0, Math.min(Number(body.wait_ms) || PHONE_POLL_MAX_MS, PHONE_POLL_MAX_MS));
      this.pollOpen = true;
      await new Promise((resolve) => { const me = { resolve: resolve }; this.poll = me; setTimeout(() => { if (this.poll === me) this.poll = null; resolve(); }, wait); });
      this.pollOpen = false;
    }
    this.lastPhone = Date.now();
    const jobs = this.jobs.splice(0, this.jobs.length);
    return json({ jobs: jobs, now: Date.now() });
  }
  async phoneResult(request) {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    let body = null; try { body = await request.json(); } catch (e) { /* empty */ }
    this.lastPhone = Date.now();
    if (!body || typeof body.id !== "string") return json({ ok: false }, 400);
    const w = this.waiters.get(body.id);
    if (w) { this.waiters.delete(body.id); w(body.result); }
    else { this.orphans.push({ id: body.id, result: body.result }); if (this.orphans.length > 20) this.orphans.shift(); }
    return json({ ok: true });
  }
}
