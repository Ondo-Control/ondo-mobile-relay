# ONDO Browser-Ausfuehrer (Prototyp)

Spricht dasselbe Protokoll wie ONDO Mobile am Relay (`/phone/poll`, `/phone/result`) und bedient Websites mit Playwright/Chromium. Kein Telefon in der Kette.

Start (Umgebungsvariablen, nie ins Repo): `RELAY_URL`, `RELAY_KEY`, `TARGETS` (JSON `{"name":"https://..."}`), optional `JOURNAL`, `LEAN=1`, `ALLOW_LOCAL=1` (nur Tests).

Messungen 17.10.2026 (Sandbox des Entwicklers, Ende-zu-Ende ueber das echte Relay mit Wegwerf-Schluessel):
- start, observe, fill, click, read, navigate funktionieren; eine Aktion = ein Seiteneffekt.
- Absturz-Tests (Journal lokal): Absturz vor Aktion, nach Aktion, nach Speichern des Ergebnisses: keine Doppelaktion (Ergebnis `outcome_unclear` bzw. gespeichertes Ergebnis).
- Speicher (Node + Chromium, Summe RSS, Seite github.com): ca. 633 MB normal, ca. 607 MB mit LEAN=1. Das uebersteigt 512 MB (Render Free).
- Offen: Journal liegt lokal; auf Hosts mit fluechtigem Dateisystem muss es im Relay liegen. Login/Bot-Erkennung ungeprueft.
