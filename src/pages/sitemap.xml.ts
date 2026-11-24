export function GET() {
  const base = 'https://thekenschaaf.de';
  const pages = ['', 'ueber', 'fuer-wen', 'impressum', 'datenschutz'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p => `<url><loc>${base}/${p}${p ? '/' : ''}</loc></url>`).join('')}</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
