import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TILES, CENTER } from '../config.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const data = JSON.parse($('#data').textContent);
const by = Object.fromEntries(data.map(h => [h.id, h]));
let tour = [];
let filter = 'all';
try { tour = JSON.parse(localStorage.getItem('tour') || '[]').filter(id => by[id]); } catch {}

// Altersabfrage
const gate = $('#gate');
let ok = false;
try { ok = sessionStorage.getItem('ok18') === '1'; } catch {}
if (ok) gate.hidden = true;
$('#yes').onclick = () => { try { sessionStorage.setItem('ok18', '1'); } catch {} gate.hidden = true; };
$('#no').onclick = () => {
  $('#gt').textContent = 'Dann bis später.';
  $('#gp').textContent = 'Diese Seite ist erst ab 18 Jahren gedacht. Komm gern wieder, wenn es so weit ist.';
  $('#gb').hidden = true;
};

// Karte
const map = new maplibregl.Map({
  container: 'map',
  style: { version: 8, sources: { b: { type: 'raster', tiles: [TILES.url], tileSize: 256, attribution: TILES.attribution } }, layers: [{ id: 'b', type: 'raster', source: 'b' }] },
  center: CENTER, zoom: 14, attributionControl: { compact: true }
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

const GLASS = '<svg viewBox="-12 -30 24 42" width="28" height="48"><path class="beer" d="M-8-22h16l-1.5 30q0 3-3 3h-7q-3 0-3-3z"/><rect class="foam" x="-9" y="-27" width="18" height="8" rx="4"/></svg>';
const popup = new maplibregl.Popup({ offset: [0, -52], closeButton: false, maxWidth: '240px' });
const bounds = new maplibregl.LngLatBounds();
let placed = 0;

data.forEach(h => {
  if (h.lat == null) return;
  const el = document.createElement('div');
  el.className = 'glass';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', h.name);
  el.innerHTML = '<span class="gi">' + GLASS + '</span><span class="bd"></span>';
  const open = () => popup.setLngLat([h.lng, h.lat]).setHTML(
    '<b>' + h.name + '</b><br>' + (h.marke ? h.marke + '<br>' : '') +
    '<button class="add pri" data-add="' + h.id + '">' + (tour.includes(h.id) ? 'Aus der Tour entfernen' : 'Zur Tour hinzufügen') + '</button>'
  ).addTo(map);
  el.addEventListener('click', e => { e.stopPropagation(); open(); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  h.el = el; h.gi = el.querySelector('.gi'); h.bd = el.querySelector('.bd');
  new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([h.lng, h.lat]).addTo(map);
  bounds.extend([h.lng, h.lat]); placed++;
});
if (placed) map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 0 });
else console.warn('Keine Koordinaten vorhanden. Bitte "npm run geocode" ausführen.');

map.on('load', () => {
  map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
  map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#ff4d6d', 'line-width': 4, 'line-dasharray': [2, 1.5] } });
  render();
});

// Tour
function toggle(id) {
  const k = tour.indexOf(id);
  if (k > -1) { tour.splice(k, 1); render(); return; }
  tour.push(id); render();
  if (tour.length > 1) clink(tour[tour.length - 2], id);
}
function mv(i, d) {
  const j = i + d;
  if (j < 0 || j >= tour.length) return;
  [tour[i], tour[j]] = [tour[j], tour[i]]; render();
  if (tour.length > 1) clink(tour[j], tour[j > 0 ? j - 1 : j + 1]);
}
function clink(a, b) {
  const A = by[a], B = by[b];
  if (A.lat == null || B.lat == null) return;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const d = B.lng >= A.lng ? 1 : -1;
    A.gi.style.transform = `rotate(${18 * d}deg)`;
    B.gi.style.transform = `rotate(${-18 * d}deg)`;
    setTimeout(() => { A.gi.style.transform = ''; B.gi.style.transform = ''; }, 700);
  }
  const e = document.createElement('div');
  e.className = 'prost';
  e.innerHTML = '<span>Prost!</span>';
  const m = new maplibregl.Marker({ element: e, anchor: 'bottom', offset: [0, -40] })
    .setLngLat([(A.lng + B.lng) / 2, (A.lat + B.lat) / 2]).addTo(map);
  setTimeout(() => m.remove(), 1300);
}

const enc = encodeURIComponent;
const q = id => by[id].name + ', ' + by[id].adresse + ', Köln';

function render() {
  data.forEach(h => {
    if (!h.el) return;
    const k = tour.indexOf(h.id);
    h.el.classList.toggle('on', k > -1);
    h.bd.textContent = k + 1;
  });
  $$('.item [data-add]').forEach(b => { b.textContent = tour.includes(b.dataset.add) ? 'Aus der Tour entfernen' : 'Zur Tour hinzufügen'; });
  $('#empty').hidden = tour.length > 0;
  $('#tl').innerHTML = tour.map((id, i) =>
    '<li><span class="n">' + (i + 1) + '</span><b>' + by[id].name + '</b>' +
    '<button class="ic" data-m="' + i + '" data-d="-1" aria-label="Nach oben">▲</button>' +
    '<button class="ic" data-m="' + i + '" data-d="1" aria-label="Nach unten">▼</button>' +
    '<button class="ic" data-r="' + id + '" aria-label="Entfernen">✕</button></li>').join('');
  let src = null;
  try { src = map.getSource('route'); } catch {}
  if (src) src.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: tour.map(id => by[id]).filter(h => h.lat != null).map(h => [h.lng, h.lat]) } });
  $('#cnt').textContent = tour.length + (tour.length === 1 ? ' Stopp' : ' Stopps');
  const links = [$('#go'), $('#go2')];
  if (tour.length > 1) {
    const s = tour.map(q);
    const href = 'https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=' + enc(s[0]) + '&destination=' + enc(s[s.length - 1]) +
      (s.length > 2 ? '&waypoints=' + s.slice(1, -1).map(enc).join('%7C') : '');
    links.forEach(a => { a.href = href; a.removeAttribute('aria-disabled'); });
  } else {
    links.forEach(a => { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); });
  }
  try { localStorage.setItem('tour', JSON.stringify(tour)); } catch {}
}

function applyFilter() {
  $$('.item').forEach(i => { i.hidden = !(filter === 'all' || i.dataset.kat === filter); });
  data.forEach(h => { if (h.el) h.el.style.display = (filter === 'all' || h.kat === filter) ? '' : 'none'; });
}

document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.add) { popup.remove(); toggle(b.dataset.add); }
  else if (b.dataset.r) toggle(b.dataset.r);
  else if (b.dataset.m) mv(+b.dataset.m, +b.dataset.d);
  else if (b.dataset.f) { filter = b.dataset.f; $$('[data-f]').forEach(x => x.classList.toggle('on', x === b)); applyFilter(); }
});
$('#clear').onclick = () => { tour = []; render(); };
$('#cheers').onclick = () => { tour.slice(1).forEach((id, i) => setTimeout(() => clink(tour[i], id), i * 900)); };
render();
