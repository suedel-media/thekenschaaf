// Holt fehlende Koordinaten per Nominatim (OpenStreetMap), 1 Anfrage pro Sekunde.
// Läuft lokal mit "npm run geocode" und automatisch vor jedem Build im Deployment.
import fs from 'node:fs';
const f = new URL('../src/data/brauhaeuser.json', import.meta.url);
const d = JSON.parse(fs.readFileSync(f, 'utf8'));
const UA = 'thekenschaaf-build/0.2 (hallo@suedel.media)';
const VB = '6.80,51.08,7.15,50.80'; // Köln, damit keine Treffer aus anderen Städten kommen
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function find(q) {
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1&viewbox=' + VB + '&q=' + encodeURIComponent(q), { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  await sleep(1100);
  return j[0];
}
let ok = 0, miss = 0;
for (const h of d) {
  // vorhandene Koordinaten außerhalb von Köln werden neu geholt
  if (h.lat != null && h.lat > 50.8 && h.lat < 51.1 && h.lng > 6.8 && h.lng < 7.15) continue;
  h.lat = null; h.lng = null;
  let hit = null;
  try {
    hit = await find(h.adresse + ', Köln');
    if (!hit) hit = await find(h.adresse.replace(/(\d+)\s*[-–]\s*\d+/, '$1') + ', Köln');
    if (!hit) hit = await find(h.name + ', Köln');
  } catch (e) { console.log('FEHLER', h.name, e.message); }
  if (hit) { h.lat = +hit.lat; h.lng = +hit.lon; ok++; console.log('ok', h.name); }
  else { miss++; console.log('NICHT GEFUNDEN', h.name); }
}
fs.writeFileSync(f, JSON.stringify(d, null, 1));
console.log('Fertig:', ok, 'neu, ', miss, 'nicht gefunden');
