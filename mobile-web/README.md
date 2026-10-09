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
