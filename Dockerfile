# Dockerfile im Hauptordner fuer Render (Build-Kontext = Repo-Wurzel). Gleicher Inhalt wie executor/Dockerfile, nur mit Pfaden zu executor/.
# Playwright-Image und npm-Paket muessen dieselbe Version haben (1.56.0).
FROM mcr.microsoft.com/playwright:v1.56.0-noble
WORKDIR /app
# Init-Prozess gegen Zombie-Prozesse von Chromium (Render erlaubt kein docker --init)
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*
COPY executor/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --chown=pwuser:pwuser executor/executor.js ./
# Nicht als root laufen (Chromium-Sandbox bleibt dann moeglich). pwuser bringt das Image mit.
USER pwuser
ENV NODE_ENV=production LEAN=1
# Geheimnisse (RELAY_URL, RELAY_KEY, TARGETS) werden NUR im Hosting-Dienst als Umgebungsvariablen gesetzt, nie ins Bild geschrieben.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "executor.js"]
