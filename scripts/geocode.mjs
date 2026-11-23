// Holt fehlende Koordinaten per Nominatim (OpenStreetMap). 1 Anfrage pro Sekunde.
// Vor dem Start unten die Kontaktadresse eintragen (Pflicht laut Nutzungsbedingungen).
import fs from 'node:fs';
const f = new URL('../src/data/brauhaeuser.json', import.meta.url);
const d = JSON.parse(fs.readFileSync(f, 'utf8'));
for (const h of d) {
  if (h.lat != null) continue;
  const q = encodeURIComponent(h.adresse + ', Köln, Deutschland');
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
    { headers: { 'User-Agent': 'thekenschaaf-build/0.1 (hallo@suedel.media.de)' } });
  const j = await r.json();
  if (j[0]) { h.lat = +j[0].lat; h.lng = +j[0].lon; console.log('ok', h.name); }
  else console.log('NICHT GEFUNDEN', h.name);
  await new Promise(r => setTimeout(r, 1100));
}
fs.writeFileSync(f, JSON.stringify(d, null, 1));
