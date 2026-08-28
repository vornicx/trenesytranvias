import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://www.trenesytranvias.com';
const corePaths = ['/', '/contacto', '/soluciones', '/vehiculos', '/empresa', '/ecija'];

const [pages, provinces, productTemplate, provinceTemplate] = await Promise.all([
  readJson('data/seo-pages.json'),
  readJson('data/provincias.json'),
  readFile(path.join(root, 'seo/templates/product.html'), 'utf8'),
  readFile(path.join(root, 'seo/templates/province.html'), 'utf8'),
]);

validateData(pages, provinces);

const urls = corePaths.map((pathname) => `${origin}${pathname}`);

for (const page of pages) {
  const pathname = `/${page.slug}`;
  const canonical = `${origin}${pathname}`;
  const html = render(productTemplate, {
    ...page,
    canonical,
    keywords: page.keywords.join(', '),
    breadcrumbs: breadcrumbs([['Inicio', '/'], [page.h1, pathname]]),
    content: productContent(page),
    faqs: faqMarkup(page.faqs),
    schema: schemaMarkup(page, canonical, [['Inicio', `${origin}/`], [page.h1, canonical]]),
  });
  await writePage(path.join(root, page.slug, 'index.html'), html);
  urls.push(canonical);
}

for (const [index, province] of provinces.entries()) {
  const pathname = `/trenes-turisticos/${province.slug}`;
  const canonical = `${origin}${pathname}`;
  const page = provincePage(province, index);
  const html = render(provinceTemplate, {
    ...page,
    canonical,
    breadcrumbs: breadcrumbs([
      ['Inicio', '/'],
      ['Trenes turísticos', '/trenes-turisticos'],
      [province.name, pathname],
    ]),
    content: provinceContent(province, index),
    faqs: faqMarkup(page.faqs),
    schema: schemaMarkup(page, canonical, [
      ['Inicio', `${origin}/`],
      ['Trenes turísticos', `${origin}/trenes-turisticos`],
      [province.name, canonical],
    ]),
  });
  await writePage(path.join(root, 'trenes-turisticos', province.slug, 'index.html'), html);
  urls.push(canonical);
}

await writeFile(path.join(root, 'sitemap.xml'), sitemap(urls), 'utf8');
console.log(`SEO generado: ${pages.length} hubs, ${provinces.length} provincias, ${urls.length} URLs totales.`);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function validateData(seoPages, provinceList) {
  if (seoPages.length !== 13) throw new Error(`Se esperaban 13 hubs y hay ${seoPages.length}.`);
  if (provinceList.length !== 50) throw new Error(`Se esperaban 50 provincias y hay ${provinceList.length}.`);
  if (new Set(seoPages.map(({ slug }) => slug)).size !== seoPages.length) throw new Error('Hay hubs SEO duplicados.');
  if (new Set(provinceList.map(({ slug }) => slug)).size !== provinceList.length) throw new Error('Hay provincias SEO duplicadas.');
  if (provinceList.some(({ slug }) => !/^[a-z0-9-]+$/.test(slug))) throw new Error('Los slugs de provincia deben ser ASCII.');
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
    return ['content', 'faqs', 'breadcrumbs', 'schema'].includes(key) ? String(values[key]) : escapeHtml(values[key]);
  });
  if (/\{\{[^}]+\}\}/.test(html)) throw new Error('Han quedado placeholders sin sustituir.');
  return html;
}

function breadcrumbs(items) {
  const content = items.map(([label, href], index) => index === items.length - 1
    ? `<span aria-current="page">${escapeHtml(label)}</span>`
    : `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`
  ).join(' <span aria-hidden="true">·</span> ');
  return `<nav class="eyebrow" aria-label="Migas de pan"><span>${content}</span><span>Ciudad del Sol</span></nav>`;
}

function faqMarkup(faqs) {
  return `<div class="facts-list">${faqs.map(({ q, a }, index) =>
    `<article class="fact-row"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(q)}</strong><p>${escapeHtml(a)}</p></article>`
  ).join('')}</div>`;
}

function profileFor(page) {
  const slug = page.slug;
  if (slug.includes('alquiler')) return {
    overline: 'Uso temporal',
    heading: 'El calendario y el recorrido definen el alquiler.',
    intro: 'Para una necesidad temporal, lo primero es concretar dónde funcionará, en qué fechas y qué trayecto debe cubrir.',
    steps: [
      ['Fechas', 'Periodo aproximado, jornadas y horarios previstos.'],
      ['Recorrido', 'Origen, destino, paradas o zona en la que debe operar.'],
      ['Uso', 'Turismo, evento, celebración, recinto u otra necesidad temporal.'],
      ['Propuesta', 'La unidad, configuración y disponibilidad se confirman después de revisar el contexto.'],
    ],
  };
  if (slug.includes('venta')) return {
    overline: 'Operación recurrente',
    heading: 'La compra tiene sentido cuando el uso deja de ser puntual.',
    intro: 'En una operación recurrente importa entender el servicio que tendrá que prestar el vehículo antes de hablar de una unidad concreta.',
    steps: [
      ['Frecuencia', 'Cómo y con qué regularidad se prevé utilizar el vehículo.'],
      ['Recorrido', 'Entorno, trayecto y puntos que habrá que conectar.'],
      ['Uso', 'Turismo, recinto, operación municipal o actividad privada.'],
      ['Configuración', 'La propuesta concreta vehículo y equipamiento con información verificable.'],
    ],
  };
  if (slug.includes('ayuntamiento') || slug === 'trenes-turisticos') return {
    overline: 'Ciudad y turismo',
    heading: 'Un proyecto municipal empieza por el mapa real de la localidad.',
    intro: 'La conversación útil empieza identificando llegada, puntos de interés, recorrido y calendario, no escogiendo un vehículo por apariencia.',
    steps: [
      ['Origen', 'Estación, aparcamiento, acceso o punto donde se concentra la llegada.'],
      ['Destino', 'Centro, zona de interés, recinto o puntos que conviene conectar.'],
      ['Calendario', 'Servicio puntual, campaña, temporada u operación recurrente.'],
      ['Modalidad', 'Alquiler, compra o proyecto según duración y necesidad.'],
    ],
  };
  if (slug.includes('tranvia')) return {
    overline: 'Tranvía turístico',
    heading: 'La estética del vehículo no sustituye al planteamiento operativo.',
    intro: 'Antes de proponer una unidad se revisan contexto, recorrido, uso y modalidad. La configuración concreta se confirma con el proyecto.',
    steps: [
      ['Contexto', 'Ciudad, evento o recinto en el que se integrará.'],
      ['Recorrido', 'Zona de trabajo y trayecto aproximado.'],
      ['Uso', 'Necesidad temporal o recurrente.'],
      ['Disponibilidad', 'Unidad y configuración se confirman en la propuesta.'],
    ],
  };
  if (/(evento|boda|naviden|desfile|carroza)/.test(slug)) return {
    overline: 'Evento y celebración',
    heading: 'En un evento, el flujo de personas manda.',
    intro: 'Fechas, accesos y recorridos repetidos ayudan a entender dónde puede aportar valor un tren, tranvía o carroza dentro de la operación.',
    steps: [
      ['Accesos', 'Entradas, aparcamientos y puntos de recogida previstos.'],
      ['Trayecto', 'Qué zonas conviene conectar durante la celebración.'],
      ['Público', 'Tipo de uso y contexto general del evento.'],
      ['Operación', 'Fechas y recorrido orientan la modalidad y el vehículo.'],
    ],
  };
  return {
    overline: 'Proyecto operativo',
    heading: 'El contexto decide antes que el catálogo.',
    intro: 'Localidad, fechas, recorrido y uso son la base para orientar una solución concreta sin convertir la web en un catálogo genérico.',
    steps: [
      ['Lugar', 'Dónde debe funcionar el vehículo.'],
      ['Recorrido', 'Qué puntos, zonas o trayectos tiene que cubrir.'],
      ['Duración', 'Necesidad puntual, estacional o recurrente.'],
      ['Siguiente paso', 'Vehículo y modalidad se concretan con ese contexto.'],
    ],
  };
}

function logicRows(steps) {
  return `<div class="solution-logic">${steps.map(([label, text], index) =>
    `<div class="solution-logic-row"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(label)}</strong><p>${escapeHtml(text)}</p></div>`
  ).join('')}</div>`;
}

function productContent(page) {
  const profile = profileFor(page);
  return `<section class="solution-route"><div class="page-shell solution-route-grid">
    <aside class="solution-route-title"><p class="overline">${escapeHtml(profile.overline)}</p><h2>${escapeHtml(profile.heading)}</h2><p>${escapeHtml(profile.intro)}</p></aside>
    <div class="solution-route-body"><p class="lead">${escapeHtml(page.description)}</p>${logicRows(profile.steps)}
      <div class="solution-next"><span>La información concreta de unidad y disponibilidad se confirma al estudiar el proyecto.</span><a href="/contacto.html">Enviar contexto →</a></div>
    </div>
  </div></section>
  <section class="content-section dark-panel"><div class="page-shell section-grid">
    <div class="section-label"><p class="overline">De la necesidad a la propuesta</p><h2>No hace falta definir el vehículo por adelantado.</h2></div>
    <div class="section-body"><p class="lead">Con lugar, fechas aproximadas y uso ya se puede empezar.</p><p>Si existe un recorrido previsto, una zona concreta o condicionantes relevantes, se añaden a la solicitud. La propuesta posterior concreta modalidad y alcance sin presentar disponibilidad como un dato en tiempo real.</p><a class="text-action light-action" href="/contacto.html">Plantear el proyecto <span>→</span></a></div>
  </div></section>`;
}

function provincePage(province, index) {
  const descriptions = [
    `Alquiler y venta de trenes turísticos en ${province.name} para municipios, eventos y recintos de ${province.ccaa}. Estudiamos recorrido, fechas y uso.`,
    `Trenes turísticos en ${province.name} para rutas locales, celebraciones y proyectos recurrentes. Opciones de alquiler y venta según el proyecto.`,
    `Soluciones de tren turístico para proyectos en ${province.name}: alquiler temporal o compra según recorrido, calendario y operación prevista.`,
    `Consulta trenes turísticos para ciudades, empresas y eventos de ${province.name}. Cada propuesta se valora según el contexto del servicio.`,
  ];
  return {
    title: `Trenes turísticos en ${province.name} | Alquiler y venta`,
    h1: `Trenes turísticos en ${province.name}`,
    description: descriptions[index % descriptions.length],
    keywords: `trenes turísticos ${province.name}, alquiler tren turístico ${province.name}, venta tren turístico ${province.name}`,
    cta: `Plantea tu proyecto de tren turístico en ${province.name}`,
    faqs: [
      { q: `¿Estudiáis alquiler de tren turístico en ${province.name}?`, a: `Se valoran proyectos en ${province.name} según fechas, recorrido, logística y disponibilidad para el servicio planteado.` },
      { q: `¿Se puede plantear la compra de un tren turístico para un proyecto en ${province.ccaa}?`, a: 'La venta forma parte de las modalidades disponibles para operaciones recurrentes y se concreta después de revisar el uso previsto.' },
      { q: '¿Qué información ayuda a preparar una primera valoración?', a: 'Localidad, fechas aproximadas, recorrido o zona de trabajo y tipo de uso.' },
    ],
  };
}

function provinceContent(province, index) {
  const intros = [
    `Una ruta urbana, una feria o un recinto requieren planteamientos distintos. En ${province.name}, la propuesta parte del lugar concreto y del trayecto que se quiere resolver.`,
    `${province.name} reúne municipios y espacios con necesidades diferentes. Por eso el recorrido y el calendario se revisan antes de orientar alquiler, venta o configuración.`,
    `Un proyecto de tren turístico en ${province.name} necesita encajar lugar, accesos, recorrido y duración. Esos datos permiten orientar la siguiente conversación.`,
    `Los proyectos en ${province.name} pueden ser puntuales, estacionales o recurrentes. Esa duración, junto con el recorrido previsto, ayuda a decidir la modalidad.`,
    `Desde una celebración hasta una ruta estable, cada uso en ${province.name} tiene un contexto propio. La primera valoración sirve para concretarlo.`,
  ];
  const steps = [
    ['Localidad', `Municipio o recinto concreto dentro de ${province.name}.`],
    ['Recorrido', 'Origen, destino aproximado, accesos y puntos de parada si ya están definidos.'],
    ['Calendario', 'Fechas y duración aproximada del servicio.'],
    ['Uso', 'Turismo, evento, recinto, operación municipal u otra necesidad.'],
  ];
  return `<section class="solution-route"><div class="page-shell solution-route-grid">
    <aside class="solution-route-title"><p class="overline">${escapeHtml(province.ccaa)}</p><h2>La provincia no define el proyecto. El recorrido sí.</h2><p>La ubicación sirve para situar la solicitud; la propuesta necesita además entender trayecto, fechas y uso.</p></aside>
    <div class="solution-route-body"><p class="lead">${escapeHtml(intros[index % intros.length])}</p>${logicRows(steps)}
      <div class="solution-next"><span>Base operativa de Ciudad del Sol: Écija · Sevilla.</span><a href="/contacto.html">Plantear proyecto en ${escapeHtml(province.name)} →</a></div>
    </div>
  </div></section>
  <section class="content-section dark-panel"><div class="page-shell section-grid">
    <div class="section-label"><p class="overline">Modalidad</p><h2>Temporal o recurrente.</h2></div>
    <div class="section-body"><p class="lead">La duración del uso ayuda a orientar alquiler o compra.</p><p>Consulta el <a class="light-action" href="/alquiler-tren-turistico/">alquiler de tren turístico</a>, la <a class="light-action" href="/venta-trenes-turisticos/">venta de trenes turísticos</a> o las soluciones para <a class="light-action" href="/trenes-para-ayuntamientos/">ayuntamientos</a>. La configuración concreta se valida después con el contexto real.</p><a class="text-action light-action" href="/contacto.html">Enviar datos del recorrido <span>→</span></a></div>
  </div></section>`;
}

function schemaMarkup(page, canonical, breadcrumbItems) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Service', name: page.h1, description: page.description, url: canonical, provider: { '@type': 'Organization', name: 'Trenes y Tranvías Ciudad del Sol', url: origin }, areaServed: { '@type': 'Country', name: 'España' } },
      { '@type': 'BreadcrumbList', itemListElement: breadcrumbItems.map(([name, item], index) => ({ '@type': 'ListItem', position: index + 1, name, item })) },
      { '@type': 'FAQPage', mainEntity: page.faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  }).replaceAll('<', '\\u003c');
}

async function writePage(filename, html) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, `${html.trim()}\n`, 'utf8');
}

function sitemap(canonicalUrls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${canonicalUrls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}
