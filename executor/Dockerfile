# Playwright-Image und npm-Paket muessen dieselbe Version haben (1.56.0).
FROM mcr.microsoft.com/playwright:v1.56.0-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY executor.js ./
# Nicht als root laufen (Chromium-Sandbox bleibt dann moeglich). pwuser bringt das Image mit.
USER pwuser
ENV NODE_ENV=production LEAN=1 PORT=10000
# Geheimnisse (RELAY_URL, RELAY_KEY, TARGETS) werden NUR im Hosting-Dienst als Umgebungsvariablen gesetzt, nie ins Bild geschrieben.
CMD ["node", "executor.js"]
