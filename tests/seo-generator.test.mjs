import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = new URL('../', import.meta.url);
const requiredHubs = [
  'trenes-turisticos',
  'tranvias-turisticos',
  'trenes-para-eventos',
  'carrozas-para-eventos',
  'trenes-de-boda',
  'carrozas-de-boda',
  'carrozas-navidenas',
  'desfiles',
  'alquiler-tren-turistico',
  'alquiler-carrozas',
  'alquiler-tranvia-turistico',
  'venta-trenes-turisticos',
  'trenes-para-ayuntamientos',
];

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), 'utf8'));
}

test('SEO datasets cover every product hub and all 50 provinces', async () => {
  const hubs = await readJson('data/seo-pages.json');
  const provinces = await readJson('data/provincias.json');

  assert.deepEqual(hubs.map(({ slug }) => slug), requiredHubs);
  assert.equal(provinces.length, 50);
  assert.equal(new Set(provinces.map(({ slug }) => slug)).size, 50);
  assert.ok(provinces.every(({ name, slug, ccaa }) => name && ccaa && /^[a-z0-9-]+$/.test(slug)));
  assert.ok(hubs.every(({ title, h1, description, keywords, faqs, cta }) =>
    title && h1 && description && keywords.length > 0 && faqs.length > 0 && cta
  ));
});

test('generator writes indexable hub and province pages plus sitemap', async () => {
  await execFileAsync(process.execPath, ['scripts/generate-seo-pages.mjs'], {
    cwd: new URL('.', root),
  });

  const hubHtml = await readFile(new URL('trenes-turisticos/index.html', root), 'utf8');
  const provinceHtml = await readFile(new URL('trenes-turisticos/sevilla/index.html', root), 'utf8');
  const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');

  for (const html of [hubHtml, provinceHtml]) {
    assert.doesNotMatch(html, /\{\{[^}]+\}\}/);
    assert.match(html, /contacto\.html/);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /<meta name="description"/);
  }

  assert.match(provinceHtml, /Sevilla/);
  assert.match(provinceHtml, /Andalucía/);
  assert.equal((sitemap.match(/<url>/g) || []).length, 69);
  for (const path of ['/', '/contacto.html', '/soluciones.html', '/vehiculos.html', '/empresa.html', '/ecija.html']) {
    assert.match(sitemap, new RegExp(`<loc>https://www\\.trenesytranvias\\.com${path.replace('.', '\\.')}</loc>`));
  }
  assert.match(sitemap, /https:\/\/www\.trenesytranvias\.com\/trenes-turisticos\/sevilla\//);
});

test('public entry pages expose key SEO hubs and crawl directives', async () => {
  const [home, solutions, robots] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('soluciones.html', root), 'utf8'),
    readFile(new URL('robots.txt', root), 'utf8'),
  ]);
  const keyHubs = [
    '/trenes-turisticos/',
    '/trenes-para-eventos/',
    '/trenes-de-boda/',
    '/alquiler-tren-turistico/',
    '/trenes-para-ayuntamientos/',
    '/carrozas-navidenas/',
    '/desfiles/',
  ];

  for (const href of keyHubs) {
    assert.match(home, new RegExp(`href="${href}"`));
    assert.match(solutions, new RegExp(`href="${href}"`));
  }
  assert.match(home, /"@type":\s*"Organization"/);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/www\.trenesytranvias\.com\/sitemap\.xml$/m);
});
