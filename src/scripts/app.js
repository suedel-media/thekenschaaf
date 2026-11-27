import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { STYLE, CENTER } from '../config.js';

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

// Einblenden beim Scrollen
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.2 })
  : null;
$$('.reveal').forEach(el => (io ? io.observe(el) : el.classList.add('in')));

// Karte
const map = new maplibregl.Map({ container: 'map', style: STYLE, center: CENTER, zoom: 13.5, attributionControl: { compact: true } });
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
map.on('error', e => {
  const m = (e && e.error && e.error.message) || String(e);
  console.warn('Kartenfehler:', m);
  if (/Expected value to be of type number/.test(m)) return;
  const el = $('#maperr');
  el.hidden = false;
  el.textContent = 'Kartenhinweis: ' + m.slice(0, 160);
});

const GLASS = '<svg viewBox="-12 -30 24 42" width="28" height="48"><path class="beer" d="M-8-22h16l-1.5 30q0 3-3 3h-7q-3 0-3-3z"/><rect class="foam" x="-9" y="-27" width="18" height="8" rx="4"/></svg>';
const popup = new maplibregl.Popup({ offset: [0, -52], closeButton: false, maxWidth: '240px' });
const bounds = new maplibregl.LngLatBounds();
let placed = 0;

data.forEach(h => {
  if (h.lat == null || h.lat < 50.8 || h.lat > 51.1 || h.lng < 6.8 || h.lng > 7.15) { if (h.lat != null) console.warn('Koordinaten außerhalb von Köln, übersprungen:', h.name); return; }
  const el = document.createElement('div');
  el.className = 'glass';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', h.name);
  el.innerHTML = '<span class="gi">' + GLASS + '</span><span class="bd"></span>';
  const open = () => popup.setLngLat([h.lng, h.lat]).setHTML(
    '<b>' + h.name + '</b>' + (h.marke ? '<br>' + h.marke : '') + '<br><button class="pri" data-add="' + h.id + '"></button>'
  ).addTo(map);
  el.addEventListener('click', e => { e.stopPropagation(); open(); render(); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter') { open(); render(); } });
  h.el = el; h.gi = el.querySelector('.gi'); h.bd = el.querySelector('.bd');
  new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([h.lng, h.lat]).addTo(map);
  bounds.extend([h.lng, h.lat]); placed++;
});
if (placed) {
  const pad = Math.min(80, Math.round($('#map').clientHeight * 0.2));
  map.fitBounds(bounds, { padding: { top: pad, bottom: pad, left: 60, right: 60 }, maxZoom: 15, duration: 0 });
}
else console.warn('Keine Koordinaten vorhanden. Bitte "npm run geocode" ausführen.');

map.on('load', () => {
  map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
  map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#ff3b53', 'line-width': 4, 'line-dasharray': [2, 1.5] } });
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
  if (!A.el || !B.el) return;
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

// Strichliste auf dem Deckel: ein Strich pro Stopp, der fünfte liegt quer
const tallies = $$('.tally');
let lastN = 0;
function drawTally(n) {
  const grew = n > lastN;
  lastN = n;
  const NS = 'http://www.w3.org/2000/svg';
  tallies.forEach(g => {
    g.innerHTML = '';
    for (let i = 0; i < n && i < 30; i++) {
      const b = Math.floor(i / 5), k = i % 5, row = Math.floor(b / 3), col = b % 3;
      const x0 = 45 + col * 38, y0 = 122 + row * 28;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', k < 4 ? `M${x0 + k * 7} ${y0 + (k % 2)} l${k % 2 ? -1 : 1} 22` : `M${x0 - 5} ${y0 + 18} L${x0 + 27} ${y0 + 4}`);
      p.setAttribute('class', 'strich' + (grew && i === n - 1 ? ' neu' : ''));
      g.appendChild(p);
    }
  });
  $('#deckel').setAttribute('aria-label', 'Bierdeckel mit ' + n + (n === 1 ? ' Strich' : ' Strichen'));
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
  $$('[data-add]').forEach(b => {
    const on = tour.includes(b.dataset.add);
    if (b.classList.contains('plus')) {
      b.classList.toggle('on', on);
      b.textContent = on ? '✓' : '+';
      b.setAttribute('aria-label', (on ? 'Aus der Tour entfernen: ' : 'Zur Tour hinzufügen: ') + by[b.dataset.add].name);
    } else b.textContent = on ? 'Aus der Tour entfernen' : 'Zur Tour hinzufügen';
  });
  $('#empty').hidden = tour.length > 0;
  $('#tl').innerHTML = tour.map((id, i) =>
    '<li><span class="n">' + (i + 1) + '</span><b>' + by[id].name + '</b>' +
    '<button class="ic" data-m="' + i + '" data-d="-1" aria-label="Nach oben">▲</button>' +
    '<button class="ic" data-m="' + i + '" data-d="1" aria-label="Nach unten">▼</button>' +
    '<button class="ic" data-r="' + id + '" aria-label="Entfernen">✕</button></li>').join('');
  let src = null;
  try { src = map.getSource('route'); } catch {}
  if (src) src.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: tour.map(id => by[id]).filter(h => h.el).map(h => [h.lng, h.lat]) } });
  $('#cnt').textContent = tour.length + (tour.length === 1 ? ' Stopp' : ' Stopps');
  $('#bar').hidden = tour.length === 0;
  drawTally(tour.length);
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

$$('.expand').forEach(b => b.addEventListener('click', () => {
  const open = b.getAttribute('aria-expanded') === 'true';
  b.setAttribute('aria-expanded', String(!open));
  b.closest('.item').querySelector('.det').hidden = open;
}));

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
