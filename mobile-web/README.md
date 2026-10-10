## AKTUELLER P3-QUELLSTAND – 10.10.2026: Identity/Device (verbindlich; ältere Abschnitte historisch)

**Einziger aktueller Code-/Prüfstand:** Repo `Ondo-Control/ondo-mobile-relay`, Branch **`ondo-work/mobile-p3-trusted-gates-20261010`**, unabhängig geprüfter Code-Commit **`f113424c8d582f9f3fad483e39a0d10ec70db877`** (Parent `9e900e21ec2a465fc730239b7ab74901cd5a6012`). Enthält die vorherige `mobile-web`-P3-Integration **vollständig**. **GitHub Actions 32/32 Node-/Fixture-/Syntax-PASS**: <https://github.com/Ondo-Control/ondo-mobile-relay/actions/runs/38070060595>; frühere 9/17/20er Tests in dieser README sind ausschließlich historische Zwischenstände. Stage-B **NICHT** deployed und **kein** Live-iPhone-/Plugin-PASS.

**Was existiert – direkt am bestehenden ChatGPT-Kanal `mobile-web/`:**
- `p3/native_core.mjs`, `p3/endpoint_bridge.mjs`: vorhandener gehärteter P3-Kern + geprüfte Modell-/Geräterollen.
- `p3/transport.mjs`, `worker.mjs`: getrennte, derzeit deaktivierte `POST /p3/model` / `POST /p3/phone`-Routen, JWT-Verifikation, P3-Kern-Dispatcher. Das öffentliche `/mcp` bleibt beim alten Status-Tool, ist **kein** persönliches Stage-B-Plugin.
- `wrangler.jsonc`: **nur im Quellcode** SQLite-Durable-Object-Klasse `P3Session` und Binding `P3_SESSIONS`. Der reale Cloudflare-Worker `ondo-mobile-web` hat derzeit **keine** DO-Bindung.
- `p3/device_client.mjs`, `p3/build_scriptable_device.cjs`: Claim-vor-DOM-Aktion, No-Replay bei UNCERTAIN, generierbarer Scriptable-RPC-Adapter; **noch nicht** in einem realen installierten ONDO-Scriptable-Bundle verbunden.
- `p3/identity_issuer.mjs`: maximal 60 Sekunden gültige ES256-Owner-/Controller-/Chat-/Geräte-/Action-Token-Logik, aber **nur** an noch zu implementierende **vertrauenswürdige** Host-/Device-/Human-Approval-Attester gebunden. Ein `verified:true` aus einem Tool-Argument/HTTP-Body oder `_meta["openai/session"]` allein ist **kein** Identitätsbeweis.
- `p3/device_binding_adapter.mjs`: erneute native Seiten-/Origin-/Route-/Conversation-/Epoch-/State-Prüfung nach Claim; `performAtomic` muss im **selben echten WebView-JavaScript-Task** die exakte Bindung vor dem Handgriff prüfen. Der echte Scriptable-WKWebView-Adapter ist noch OFFEN.
- `p3/*.test.*`: 32/32 Fixture-Tests, kein Realgerät-/Cloudflare-DO-/MCP-Host-End-to-End-Test.

**Genaue Trennung:** Claude besitzt Cloudflare-`ondo-relay` und Root-`worker.js` / Root-`wrangler.jsonc` im `main` dieses gemeinsamen Repos. Sie werden von diesem ChatGPT-Integrationszweig **nicht verändert**. ChatGPT betreibt getrennt den **aktuell noch isolierten Cloudflare-Worker `ondo-mobile-web`** (<https://ondo-mobile-web.n4rtvfvj96.workers.dev/>). Das persönliche **`ONDO P3`-Plugin** unter `ondo-p3.bz5p4cqjdn.chatgpt.site` ist eine dritte, noch **Stage-A-only** Runtime mit ausschließlich `ondo_capability_ping` (`device_access=false`, `relay_connected=false`). Ein Push nach GitHub aktiviert kein Plugin und keine Cloudflare-Änderung.

**Einziger nächste technischer Schwerpunkt:** Den echten vertrauenswürdigen Host-/Owner-/Chat-/Controller-/Origin-Identitätsnachweis **innerhalb des bestehenden persönlichen P3-Plugin-Hosts** und seinen Stage-B-MCP-Tool-Aktivierungsweg belegen. Anschließend gezielt Gerätepaarung/Owner-Approval, echtes `performAtomic`, persistente `P3_SESSIONS`-Speicherung und reale `p3lab` + separat freigegebene `google.com`-Live-End-to-End-Tests durchführen. **Ohne** konkrete Deployment-/Billing-/Installationsfreigabe kein Live-Deploy, kein Secret-Lesen, keine Mutation an Claudes produktivem Relay. Workspace-first, eine qualifizierte Source-Lieferung und vollständige aktuelle Projektkoordination in `Ondo-Control/ondo-hub@main:ONDO_PROJECT_CONTEXT.md`, `START_HERE.md`, `STATUS.md`. Diese README ist die **einzige** produktnahe Entwicklungsnotiz; keine zusätzliche FINAL-/HANDOVER-Datei.

---

## Historische P3-Native-Core-Integration – Stand früher am 10.10.2026

### iPhone-Geräteclient + SQLite-Konfiguration (10.10.2026, Quellkandidat)

Der bestehende Stage-B-Integrationsbranch `ondo-work/mobile-web-p3-integration-20261010` enthält nun zusätzlich:

- `mobile-web/p3/device_client.mjs`: **iPhone-seitiger, einmaliger** Transportdurchlauf `pending → observe → approve → claim → perform → ack`. Die Geräteaktion wird erst nach gültiger, serverseitiger `UNCERTAIN`-Claimantwort ausgeführt. Unklare Claimantwort: keinerlei Aktion. Unklarer Perform-/ACK-Ausgang: keinerlei Replay.
- `mobile-web/p3/build_scriptable_device.cjs`: generiert eine Scriptable-`importModule`-fähige CommonJS-`device_client_scriptable.js` aus derselben Quelle, ohne gespeicherte Tokens. Ihre RPC-Funktion ist fest an die **ChatGPT-eigene** `https://ondo-mobile-web.n4rtvfvj96.workers.dev`-URL gebunden und verweigert Netzaufrufe ohne vom vertrauenswürdigen Host ausgestellte Geräteberechtigung. **Kein fertiges ausführbares ONDO-Gesamtprodukt.**
- `mobile-web/wrangler.jsonc`: nur auf diesem getrennten Arbeitsbranch wurde `P3_SESSIONS` als SQLite-basiertes Durable Object der eigenen Klasse `P3Session` (`new_sqlite_classes`) ergänzt. **KEIN Deployment / keine Datenbankmigration in Cloudflare erfolgt.** Aktive Worker-Fassung bleibt isoliert.
- `device_client.test.mjs` (8 Fälle), `scriptable_smoke.test.cjs` (2 Fälle), `config_contract.test.cjs` (1 Fall) ergänzen die bisherigen 9 Tests. Aktueller unabhängiger GitHub-CI-Nachweis: <https://github.com/Ondo-Control/ondo-mobile-relay/actions/runs/38034493865> **20/20 PASS** (5+4+8+2+1), keine echte iPhone- oder Cloudflare-DO-Abnahme.

**Weiterer echter Aktivierungsblocker:** `P3_IDENTITY_PUBLIC_JWK` ist nicht mit einem vertrauenswürdigen, owner-/chat-/device-gebundenen persönlichen Plugin-/Host-Aussteller verbunden. Der native iPhone-Driver setzt `observe`, `approve`, `perform` und gültige kurzlebige Token vom echten P3-/Geräte-Sicherheitsadapter voraus; diese Quelle kann sie nicht selbst legitim aus Webseiten-/Modelltext erzeugen. Ohne diese Voraussetzungen kein Live-Gerätezugriff. Das persönliche `ONDO P3`-Plugin läuft bislang nur Stage A. Claude-`ondo-relay`, Root-`worker.js`/`wrangler.jsonc` sowie sämtliche Cloudflare-Produkte sind durch diese Source-/CI-Arbeit **unverändert**. Kein unautorisierter Deployment- oder Billing-Wechsel.



**Quell-Branch:** `ondo-work/mobile-web-p3-integration-20261010` (aus `ondo-work/mobile-web-20261009` beim HEAD `f221a9707872f7b13672e2fa72ca256f238ec986`).
**Wichtig: KEIN produktives Deployment, KEIN Live-Gerätezutritt.** Der laufende Cloudflare-Worker `ondo-mobile-web` bleibt in der zuletzt bereitgestellten isolierten Fassung. Diese Änderungen sind ein **neuer getesteter Arbeitsbranch**, nicht mit GitHub-`main` gemergt.

**Getrennte Systeme (Owner-Vorgabe):**
- **Claude:** Cloudflare `ondo-relay`, Root-`worker.js` / Root-`wrangler.jsonc` aus `Ondo-Control/ondo-mobile-relay`, Claudes ONDO-Mobile-Version – **nicht angefasst**.
- **ChatGPT:** Cloudflare `ondo-mobile-web`, Source **`mobile-web/`** auf eigenem Branch. Persönliches `ONDO P3` (private `chatgpt.site`) ist nochmals separat und weiterhin Stage A.
- Gemeinsamer GitHub-Repositoryname ist keine Betriebs-/Schreibfreigabe für Claudes Relay.

**Konkrete neue Stage-B-Module:**
- `p3/native_core.mjs`: Quelle aus dem existierenden, gehärteten `ondo-hub/hosting/ondo-p3/architecture/p3_native_channel.cjs`, Commit `e53c303fbd6c59f2a26090cc5817a8c0ba61fadf`, unveränderte Native-Funktionslogik, nur CommonJS-Export → ESM.
- `p3/endpoint_bridge.mjs`: Quelle aus dem existierenden P3-Endpunktadapter desselben Commits, unveränderte Funktionslogik, nur Export umgestellt.
- `p3/transport.mjs`: Konkrete Worker-Routen `POST /p3/model` und `POST /p3/phone`, getrennte Rollen, signierte ES256-Einmal-Freigabeattestierungen (max. 300 Sekunden Laufzeit) und sessionbezogene Durable-Object-Transaktionslogik. Exakte origin/chat/device/session-Prüfung über den übernommenen P3-Core. Modell: `state/offer/status`; Gerät: `begin/publish/pending/claim/ack/revoke`. Ack/Claim und Mutationen niemals öffentlich oder für Controllerrolle. `offer` stellt nur einen wartenden Auftrag ein; die atomare Übernahme vor einer Geräteaktion ist `UNCERTAIN`, **kein automatischer Replay**.
- `mobile-web/worker.mjs`: Bestehende Web-/MCP-Status-Routen erhalten; P3-Gateway als eigener optionaler Router in genau diesen Worker eingebunden, ohne Claudes Root-`worker.js` zu laden.

**Sicheres Default-Deny:** Solange **beide** vertrauenswürdigen Hostbindungen fehlen (`P3_IDENTITY_PUBLIC_JWK`, `P3_SESSIONS` Durable-Object-Namespace), erhält `POST /p3/model`/`/p3/phone` `503 p3_not_provisioned`. Falsche/unsignierte Rolle erhält `403 attestation_required`. Der öffentliche `/mcp` stellt weiterhin **nur** `ondo_mobile_transport_info` bereit. Die existierende P3-`chatgpt.site`-App ist nicht mit dem Worker verbunden; ein neues Site-Werkzeug wird durch diesen Branch allein NICHT freigeschaltet.

**Sicherheits- und Vertrauensgrenze:** Der Host, der `P3_IDENTITY_PUBLIC_JWK` vertrauenswürdig bereitstellt, MUSS die signierten Session-/Controller-/Chat-/Origin-/Device-/Owner-Grants tatsächlich geprüft haben; `_meta.openai/session`, Modell-Tool-Parameter oder Webseiteninhalte sind **keine** ausreichende Attestierung. Die in Fixture-Tests lokal erzeugten ECDSA-Schlüssel sind ausschließlich ephemere Testdaten, keine produktiven Zugangsdaten und werden nicht committed. Geräteseitige native Freigabe muss vor Ausgabe eines `approved_action.digest` den exakten Auftrag und die aktuell gebundene Seite prüfen. Der Worker verweigert zusätzlich unzulässige Aktionen. Bis ein echter vertrauenswürdiger Attester und native iPhone-Client existieren, Stage B NICHT deployen oder zu Live-PASS erklären.

**Speicher-Grenze:** `P3_SESSIONS` ist ein noch **nicht provisioniertes** Durable-Object-Binding; die Implementierung erwartet die echte Cloudflare-`state.storage.transaction`-API. Es wurden bewusst weder Cloudflare-Objekte angelegt noch eine kostenrelevante Migration ausgelöst. Vor Produktivschaltung Free-Limits, Speicher- und Löschkonzept, unabhängigen Cloudflare-DO-Integrationstest und widerrufbare Owner-Grants prüfen. Live-Scriptable-Lifecycle und gehosteter ChatGPT-Controller ebenfalls offen.

**Testbeweis:** Neues `mobile-web/p3/transport.test.mjs` enthält signierte P3-/Durable-Object-**Mock**-Tests. Die unveränderten 5 Web-/MCP-Tests und 4 neue Stage-B-Rollentests sind zusammen **9/9 GitHub-CI-PASS**: <https://github.com/Ondo-Control/ondo-mobile-relay/actions/runs/38033077859>. 6 zusätzliche ausführliche lokale Mock-Tests wurden vor dem GitHub-Schreiben geprüft. Kein echter iPhone-, Cloudflare-DO- oder Plugin-End-to-End-PASS.

**Nächste Gate:** Vertrauenswürdigen ChatGPT-Site→Cloudflare-Identitätsaussteller plus Owner-/Device-Bindung konzipieren und autorisiert bereitstellen, den echten Durable-Object-Namespace ohne laufende Zusatzkosten freigeben, danach iPhone-Client `pending→claim→ack` anschließen und mit exaktem Controller-Chat + echter freigegebener zweiter Webseite testen. Deployment/Merge/Installationen erst nach konkreter Nutzerentscheidung. Die Root-Dateien und Claudes produktiver Cloudflare-`ondo-relay` bleiben außer Reichweite dieses Arbeitsbranches.

---

# ONDO Mobile – eigenständiger Cloudflare-Kanal (Stage 0)

Dieses isolierte Worker-Projekt liegt bewusst **neben** dem produktiven `worker.js` des
Repositories `Ondo-Control/ondo-mobile-relay`. Es verwendet **keine**
vorhandenen ONDO-Relay-Schlüssel, ONDO-Geräte, Kontodaten, Chat-Inhalte
oder andere Projekt-Memory-Daten. Das veröffentlichte ONDO-P3-Plugin bleibt unverändert.

## Aktuelle Funktion
- `GET /` – eigenständige responsive Status-Webseite
- `GET /health` – öffentlicher, datenfreier Zustand
- `POST /mcp` – **nur** `ondo_mobile_transport_info` (read-only)
- Alle Geräte-, Chat-, Ereignis- und Aktions-Routen verweigert (`403`).
- Kein externes Fetch, keine Datenbank, keine Secrets, keine zusätzlichen Provider-APIs.
- `node --test mobile-web/worker.test.mjs` – lokale/CI-Vertragstests.

Das ist eine **bereitstellbare getrennte Webseite**, ausdrücklich **kein P3 Live-PASS**.
Das alte `worker.js` enthält bereits MCP und iPhone-Long-Poll. Dessen
produktive Endpunkte werden weder überschrieben noch angebunden. Eine statische
Webseite/Cloudflare Worker allein stellt keine nativen ungefragten Modellereignisse
im normalen ChatGPT-iPhone-Chat bereit.

## Sichere Auslieferung (erst nach ausdrücklicher Freigabe)
1. Code und CI abnehmen, gezielt nach `main` übernehmen; nicht automatisch deployen.
2. Im Cloudflare-Konto **Workers Free**, freie Limits und fehlende
   Abrechnungsaktivierung read-only bestätigen. Neue Worker-ID
   `ondo-mobile-web`, keine bestehenden Skripte überschreiben.
3. **Nie ein API-Token in diesen Chat, in Issues oder GitHub-Code einfügen.**
   Für automatisches Deployment einen kurzlebigen, auf das nötige Cloudflare-Konto
   beschränkten Token **nur als GitHub Environment Secret** im Environment
   `ondo-mobile-web` unter `ONDO_MOBILE_CF_DEPLOY_TOKEN` hinterlegen.
   Die nicht geheime Cloudflare Account-ID als Environment-Variable
   `ONDO_MOBILE_CF_ACCOUNT_ID`. Environment auf Deployment-Branch `main`
   beschränken und nach Möglichkeit einen Required Reviewer aktivieren.
   **Kein gewöhnliches Repository-Secret**: andere Workflows dieses
   öffentlichen Repositories sollen das Token nicht lesen können.
   Wegen der **Neuanlage** eines Workers können laut Cloudflare einmalig weitergehende
   Workers-Admin-Rechte erforderlich sein; diese danach sofort entziehen.
4. GitHub Actions-Workflow `Deploy independent ONDO Mobile Worker (manual)`
   **einmal** von `main` starten. Es gibt KEIN automatisches Deploy bei Push.
5. Anschließend die echte URL aus dem Deployment lesen, `/health` und die
   isolierten Schutzgrenzen live prüfen, Token widerrufen.
6. Jeglicher ONDO-Gerätezugang, Live-P3 und echte Controller-/Chat-Bindung
   erfordern weitere getrennte Freigabe und echte Sicherheitsabnahme.

Die neue Worker-URL darf NICHT geraten werden; sie wird erst aus einem erfolgreichen
Cloudflare-Deployment übernommen. Cloudflare Free stoppt bei ausgeschöpftem Kontingent,
ohne aus diesem Projekt automatisch auf einen Paid-Tarif zu wechseln.
