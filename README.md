# Thekenschaaf

Astro-Projekt für die Brauhaus-Tour-Karte (thekenschaaf.de).

1. `npm install`
2. In `scripts/geocode.mjs` die eigene Mail-Adresse beim User-Agent eintragen
3. `npm run geocode` (holt Koordinaten für die Adressen, ca. 25 Sekunden)
4. `npm run dev`, dann http://localhost:4321 öffnen
5. `npm run build` erzeugt den Ordner `dist` für den Upload (z. B. all-inkl)

## Offen vor dem Livegang
- Karte: OpenFreeMap (`src/config.js`), in der Datenschutzerklärung nennen (IP-Übertragung)
- Impressum und Datenschutz ausfüllen
- Brauhaus-Daten prüfen (Adresse, offen?, Öffnungszeiten), `src/data/brauhaeuser.json`
- Brauhaus Bielstein ergänzen
