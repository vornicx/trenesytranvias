import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://www.trenesytranvias.com';

const [pages, provinces, productTemplate, provinceTemplate] = await Promise.all([
  readJson('data/seo-pages.json'),
  readJson('data/provincias.json'),
  readFile(path.join(root, 'seo/templates/product.html'), 'utf8'),
  readFile(path.join(root, 'seo/templates/province.html'), 'utf8'),
]);

validateData(pages, provinces);

const urls = [];
for (const page of pages) {
  const pathname = `/${page.slug}/`;
  const canonical = `${origin}${pathname}`;
  const html = render(productTemplate, {
    ...page,
    canonical,
    keywords: page.keywords.join(', '),
    breadcrumbs: breadcrumbs([
      ['Inicio', '/'],
      [page.h1, pathname],
    ]),
    content: productContent(page),
    faqs: faqMarkup(page.faqs),
    schema: schemaMarkup(page, canonical, [
      ['Inicio', `${origin}/`],
      [page.h1, canonical],
    ]),
  });

  await writePage(path.join(root, page.slug, 'index.html'), html);
  urls.push(canonical);
}

for (const [index, province] of provinces.entries()) {
  const pathname = `/trenes-turisticos/${province.slug}/`;
  const canonical = `${origin}${pathname}`;
  const page = provincePage(province, index);
  const html = render(provinceTemplate, {
    ...page,
    canonical,
    breadcrumbs: breadcrumbs([
      ['Inicio', '/'],
      ['Trenes turísticos', '/trenes-turisticos/'],
      [province.name, pathname],
    ]),
    content: provinceContent(province, index),
    faqs: faqMarkup(page.faqs),
    schema: schemaMarkup(page, canonical, [
      ['Inicio', `${origin}/`],
      ['Trenes turísticos', `${origin}/trenes-turisticos/`],
      [province.name, canonical],
    ]),
  });

  await writePage(path.join(root, 'trenes-turisticos', province.slug, 'index.html'), html);
  urls.push(canonical);
}

await writeFile(path.join(root, 'sitemap.xml'), sitemap(urls), 'utf8');
console.log(`SEO generado: ${pages.length} hubs, ${provinces.length} provincias, ${urls.length} URLs.`);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function validateData(seoPages, provinceList) {
  if (seoPages.length !== 13) throw new Error(`Se esperaban 13 hubs y hay ${seoPages.length}.`);
  if (provinceList.length !== 50) throw new Error(`Se esperaban 50 provincias y hay ${provinceList.length}.`);

  const allSlugs = [...seoPages, ...provinceList].map(({ slug }) => slug);
  if (new Set(allSlugs).size !== allSlugs.length) throw new Error('Hay slugs SEO duplicados.');
  if (provinceList.some(({ slug }) => !/^[a-z0-9-]+$/.test(slug))) {
    throw new Error('Los slugs de provincia deben ser ASCII.');
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function render(template, values) {
  const html = template.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => {
    if (!(key in values)) throw new Error(`Falta el valor de plantilla ${placeholder}.`);
    return ['content', 'faqs', 'breadcrumbs', 'schema'].includes(key)
      ? String(values[key])
      : escapeHtml(values[key]);
  });
  if (/\{\{[^}]+\}\}/.test(html)) throw new Error('Han quedado placeholders sin sustituir.');
  return html;
}

function breadcrumbs(items) {
  return `<nav class="eyebrow" aria-label="Migas de pan"><span>${items
    .map(([label, href], index) => index === items.length - 1
      ? `<span aria-current="page">${escapeHtml(label)}</span>`
      : `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
    .join(' <span aria-hidden="true">·</span> ')}</span><span>Ciudad del Sol</span></nav>`;
}

function faqMarkup(faqs) {
  return `<div class="facts-list">${faqs.map(({ q, a }, index) =>
    `<article class="fact-row"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(q)}</strong><p>${escapeHtml(a)}</p></article>`
  ).join('')}</div>`;
}

function productContent(page) {
  const [primary, secondary = 'proyectos en España'] = page.keywords;
  return `<section class="content-section"><div class="page-shell section-grid">
    <div class="section-label"><p class="overline">Una solución con recorrido</p><h2>El proyecto marca la configuración.</h2></div>
    <div class="section-body"><p class="lead">${escapeHtml(page.description)}</p>
      <p>Antes de proponer una modalidad revisamos ubicación, calendario, trayecto, afluencia y objetivo. Así, la búsqueda de ${escapeHtml(primary)} se convierte en una solución concreta y no en un vehículo aislado.</p>
      <div class="facts-list">
        <div class="fact-row"><span>01</span><strong>Uso</strong><p>Recorridos turísticos, celebraciones, movilidad interna o programación temporal.</p></div>
        <div class="fact-row"><span>02</span><strong>Modalidad</strong><p>Alquiler, venta o proyecto especial según duración y necesidades reales.</p></div>
        <div class="fact-row"><span>03</span><strong>Contexto</strong><p>Valoración individual para ${escapeHtml(secondary)} con atención directa desde Écija.</p></div>
      </div>
    </div>
  </div></section>
  <section class="content-section dark-panel"><div class="page-shell section-grid">
    <div class="section-label"><p class="overline">Del plano a la calle</p><h2>Datos que ayudan a orientar la propuesta.</h2></div>
    <div class="section-body"><p class="lead">Lugar, fechas y recorrido son el punto de partida.</p><p>También resulta útil conocer horarios, capacidad aproximada, público, accesos y cualquier condicionante operativo. Con esa base podemos valorar el siguiente paso con mayor precisión.</p><a class="text-action light-action" href="/contacto.html">Enviar datos del proyecto <span>→</span></a></div>
  </div></section>`;
}

function provincePage(province, index) {
  const descriptions = [
    `Alquiler y venta de trenes turísticos en ${province.name} para municipios, eventos y recintos de ${province.ccaa}. Estudiamos recorrido, fechas y uso.`,
    `Trenes turísticos en ${province.name} para rutas locales, celebraciones y proyectos permanentes. Opciones de alquiler y venta en ${province.ccaa}.`,
    `Soluciones de tren turístico para proyectos en ${province.name}: alquiler temporal o compra según recorrido, calendario y operación prevista.`,
    `Consulta trenes turísticos para ciudades, empresas y eventos de ${province.name}. Valoramos cada propuesta dentro de ${province.ccaa}.`,
  ];
  return {
    title: `Trenes turísticos en ${province.name} | Alquiler y venta`,
    h1: `Trenes turísticos en ${province.name}`,
    description: descriptions[index % descriptions.length],
    keywords: `trenes turísticos ${province.name}, alquiler tren turístico ${province.name}, venta tren turístico ${province.name}`,
    cta: `Hablemos de tu proyecto de tren turístico en ${province.name}`,
    faqs: [
      {
        q: `¿Ofrecéis alquiler de tren turístico en ${province.name}?`,
        a: `Estudiamos solicitudes de alquiler en ${province.name} según fechas, recorrido, logística y disponibilidad.`,
      },
      {
        q: `¿Se puede comprar un tren turístico para un proyecto de ${province.ccaa}?`,
        a: 'Sí. La venta se plantea para operaciones estables después de revisar uso, capacidad y configuración.',
      },
      {
        q: '¿Qué información necesitáis para valorar el servicio?',
        a: 'Localidad, fechas, horarios, recorrido aproximado, finalidad y afluencia prevista.',
      },
    ],
  };
}

function provinceContent(province, index) {
  const intros = [
    `Una ruta urbana, una feria o un recinto turístico requieren ritmos distintos. En ${province.name}, la propuesta parte del lugar concreto y de cómo se moverán las personas.`,
    `${province.name} reúne municipios y espacios con necesidades muy diferentes. Por eso estudiamos el trayecto y el calendario antes de orientar alquiler, venta o configuración.`,
    `Llevar un tren turístico a ${province.name} exige encajar vehículo, accesos y operación. El objetivo es que el recorrido sea práctico y también reconocible para el visitante.`,
    `Los proyectos de ${province.name} pueden ser puntuales, estacionales o permanentes. Esa duración, junto con la ruta prevista, determina la modalidad más razonable.`,
    `Desde una celebración local hasta una ruta estable, cada uso en ${province.name} tiene condicionantes propios. La primera valoración sirve para identificarlos con claridad.`,
  ];
  return `<section class="content-section"><div class="page-shell section-grid">
    <div class="section-label"><p class="overline">${escapeHtml(province.ccaa)}</p><h2>Una solución ajustada al lugar.</h2></div>
    <div class="section-body"><p class="lead">${escapeHtml(intros[index % intros.length])}</p>
      <p>Trabajamos proyectos de alquiler y venta de trenes turísticos en ${escapeHtml(province.name)} para ayuntamientos, empresas, organizadores y recintos. No publicamos una tarifa genérica porque transporte, duración, horarios y condiciones del trazado cambian el alcance.</p>
      <div class="facts-list">
        <div class="fact-row"><span>01</span><strong>Recorrido</strong><p>Localidad, distancias, firme, giros, pendientes y puntos de parada.</p></div>
        <div class="fact-row"><span>02</span><strong>Calendario</strong><p>Fechas, horarios y duración puntual, estacional o permanente.</p></div>
        <div class="fact-row"><span>03</span><strong>Uso</strong><p>Turismo, evento, feria, recinto o servicio promovido por un ayuntamiento.</p></div>
      </div>
    </div>
  </div></section>
  <section class="content-section dark-panel"><div class="page-shell section-grid">
    <div class="section-label"><p class="overline">Modalidades relacionadas</p><h2>Alquiler, venta y proyectos municipales.</h2></div>
    <div class="section-body"><p class="lead">El tiempo de uso ayuda a elegir el camino.</p><p>Consulta las opciones de <a class="light-action" href="/alquiler-tren-turistico/">alquiler de tren turístico</a>, <a class="light-action" href="/venta-trenes-turisticos/">venta de trenes turísticos</a> y soluciones para <a class="light-action" href="/trenes-para-ayuntamientos/">ayuntamientos</a>.</p><a class="text-action light-action" href="/contacto.html">Valorar un proyecto en ${escapeHtml(province.name)} <span>→</span></a></div>
  </div></section>`;
}

function schemaMarkup(page, canonical, breadcrumbItems) {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: page.h1,
        description: page.description,
        url: canonical,
        provider: {
          '@type': 'Organization',
          name: 'Trenes y Tranvías Ciudad del Sol',
          url: origin,
        },
        areaServed: { '@type': 'Country', name: 'España' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map(([name, item], index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name,
          item,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faqs.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };
  return JSON.stringify(schema).replaceAll('<', '\\u003c');
}

async function writePage(filename, html) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, `${html.trim()}\n`, 'utf8');
}

function sitemap(canonicalUrls) {
  const body = canonicalUrls
    .map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
