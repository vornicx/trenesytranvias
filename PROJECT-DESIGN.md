# PROJECT-DESIGN.md — Trenes y Tranvías Ciudad del Sol

## Business

**Name:** Trenes y Tranvías Ciudad del Sol  
**Category:** industrial / fabricación y movilidad turística / catálogo B2B  
**Location / market:** Écija · Sevilla · proyectos en España  
**Primary offer:** fabricación, alquiler y venta de trenes y tranvías turísticos  
**Secondary offers:** proyectos para ayuntamientos, turismo, eventos, recintos y operadores privados  
**Primary audience:** responsables municipales, organizadores, recintos, empresas y operadores que necesitan resolver una operación real  
**Primary conversion:** solicitar una valoración/presupuesto aportando localidad, fechas, recorrido y uso

## Source truth

**Official website:** https://www.trenesytranvias.com/  
**Verified public social:** Facebook de Trenes y Tranvías Ciudad del Sol  
**Real assets currently usable:** material público del tren turístico en Écija y fotografía/vídeo ya verificados en el proyecto  
**Real testimonials/reviews allowed:** ninguno sin fuente explícita  
**Real metrics allowed:** ninguna cifra comercial, antigüedad, capacidad, homologación o cobertura concreta sin documentación  
**Constraints:** no hotlink de assets temporales de Facebook; no inventar especificaciones; no usar stock para simular producto o fabricación

## Brand extraction

**Existing visual cues:** vehículo turístico real, carrocería, secuencia locomotora/remolques, recorrido urbano, señalización, accesibilidad y megafonía en unidades publicadas.  
**Digital palette direction:** negro/grafito técnico + blanco/off-white + amarillo señal como acento funcional.  
**Typography direction:** sans serif robusta, directa y legible. Nada de serif editorial por defecto.  
**Photography:** producto real en operación; escala visible; encuadres amplios y detalles funcionales cuando existan assets.  
**Verbal tone:** claro, comercial, técnico sin fingir ingeniería; concreto y sin grandilocuencia.  
**What must be preserved:** sensación de empresa real, local y con oficio; foco en vehículo, operación y contacto directo.

## Anti-reference

This must **not** resemble:

- una web de lujo genérica
- una startup SaaS
- una landing de plantilla premium
- un concesionario de superdeportivos
- una revista editorial
- una web ferroviaria ficticiamente técnica con planos, tolerancias o diagramas inventados
- una colección de cards/iconos que podría vender cualquier servicio

## Public Design Thesis

**DESIGN THESIS:** La web debe comportarse como una operación de transporte turístico bien planteada: el recorrido define la necesidad, el vehículo demuestra presencia real y la propuesta comercial avanza de ubicación y uso a modalidad y contacto, con una estética industrial sobria ligada al producto de Ciudad del Sol.

## Public Business-Native Primitive

**PRIMITIVE:** `ORIGEN → RECORRIDO → VEHÍCULO → MODALIDAD → PROPUESTA`

This primitive comes from how a train/tram project is actually evaluated and must shape the interface rather than appear as decorative railway graphics.

### How it affects the public system

- **Layout:** directional sequences, route/stop logic, operational rows and clear progression instead of generic card grids.
- **Imagery:** real vehicle first; operation/context second; no filler image.
- **Typography:** robust sans hierarchy with compact operational labels only where they carry useful information.
- **Motion:** precise and mechanical; feedback/directional continuity before decorative reveals.
- **Components:** vehicle records, operational facts, project steps, route facts, enquiry stages and comparison rows.
- **Copy:** nouns and verbs from the real business: localidad, recorrido, fechas, vehículo, alquiler, venta, fabricación, evento, ayuntamiento, recinto, propuesta.

## Studio Design Thesis

**STUDIO DESIGN THESIS:** El Studio debe sentirse como una mesa de control comercial de Ciudad del Sol: cada solicitud entra, se cualifica, recibe un próximo paso y avanza hasta propuesta o cierre, con alta legibilidad, estados inequívocos y cero decoración que compita con la decisión operativa.

## Studio Business-Native Primitive

**STUDIO PRIMITIVE:** `SOLICITUD → CUALIFICACIÓN → SEGUIMIENTO → PROPUESTA → CIERRE`

### How it affects Studio

- **Layout:** bandeja y pipeline responden a estados comerciales reales; tablas para comparar; drawer para actuar sobre una oportunidad.
- **Data:** solicitudes, clientes, ayuntamientos, seguimientos, campañas, ventas y facturación reales del sistema.
- **Typography:** misma familia sans del sitio; mayor densidad y numerales legibles; nada de serif editorial.
- **Color:** negro/grafito estructura; amarillo señal para acción, selección o atención; colores secundarios solo codifican estados.
- **Components:** KPI como ledger operativo, filas densas, pipeline de oportunidades, filtros, historial, acciones de seguimiento y cierre.
- **Motion:** estado y continuidad espacial; drawers/modales rápidos; nada flotante o ambiental.
- **Mobile:** prioriza revisión, búsqueda, actualización, seguimiento y cierre; no intenta conservar tablas desktop completas.

## Aesthetic direction

**Keywords:** industrial, directo, sólido, operativo, local, comercial, visible, preciso  
**Anti-keywords:** luxury, lifestyle, futurista, tech-startup, ornamental, pseudo-ingeniería  
**ENERGY:** 2 / balanced  
**RHYTHM:** 2 / varied but controlled  
**MOTION:** 2 / restrained choreography  
**Density:** 2 public / 3 Studio where scanning benefits  
**Surface behavior:** flat, structural, minimal elevation; lines indicate information structure rather than decoration  
**Shape language:** rectilinear; radii only where function requires them  
**Image system:** documentary/product publicly; none by default in Studio  
**Type system:** Manrope for display/control hierarchy + Source Sans 3 for reading  
**Color behavior:** graphite/white are structural; yellow signal marks action, direction and key operational information

## Reskin Test

Three public decisions that should only plausibly come from this business:

1. The core narrative follows `Origen → Recorrido → Vehículo → Modalidad → Propuesta`, not a generic marketing funnel.
2. Vehicle and equipment information is presented like rolling-stock/operational information, using rows and verified configuration notes rather than generic feature cards.
3. The primary enquiry asks where the vehicle must operate, when, and for what use; Écija functions as real operational proof rather than generic social proof.

Three Studio decisions that should only plausibly come from this business/system:

1. Pipeline and detail states follow `Solicitud → Cualificación → Seguimiento → Propuesta → Cierre`.
2. Ayuntamientos have their own recontact/electoral-campaign workspace because that is a real commercial workflow in the product.
3. A closed opportunity can become a registered sale tied to a client and later reporting/export, instead of ending at a decorative “won” badge.

**RESKIN TEST TARGET:** PASS. If these decisions disappear, the interface has become generic and must be reworked.

## Page contracts

### `/`
**Primary job:** explain what the company supplies, show a real vehicle in operation and move the visitor toward a concrete project enquiry.  
**Primary audience:** municipal/event/venue/operator decision-maker.  
**Primary CTA:** Solicitar presupuesto.  
**Trust evidence:** real Écija operation, real vehicle imagery/video, verified offer categories.  
**Required:** offer hierarchy, application contexts, real operation, vehicle/configuration information, project flow, CTA.  
**Visual mode:** industrial-commercial, product first.  
**Mobile priority:** subject remains visible in hero; CTA early; proof before long explanation.  
**Must not become:** luxury editorial landing, icon feature grid, generic company manifesto.

### `/vehiculos.html`
**Primary job:** help the visitor understand available vehicle types/configuration without inventing specs.  
**Primary CTA:** Consultar una configuración / solicitar presupuesto.  
**Trust evidence:** real imagery and explicitly verified equipment only.  
**Visual mode:** compact catalogue / rolling-stock sheet.  
**Mobile priority:** media first, readable facts, no desktop table pasted into phone width.  
**Must not become:** fake automotive configurator or placeholder catalogue.

### `/soluciones.html`
**Primary job:** map real use cases to the right project conversation.  
**Primary CTA:** Plantear el proyecto.  
**Visual mode:** use-case routes, not feature cards.  
**Must not become:** generic B2B services page.

### `/ecija.html`
**Primary job:** prove the product in a recognisable real-world context.  
**Primary CTA:** Plantear un proyecto similar.  
**Trust evidence:** real route/use references and public operation material.  
**Visual mode:** case / operation narrative.  
**Must not become:** tourism editorial about Écija detached from the business.

### `/contacto.html`
**Primary job:** collect the minimum information needed to start a useful proposal.  
**Primary CTA:** Enviar solicitud.  
**Required fields/logic:** contact + locality + dates + use/route context as supported by the current form.  
**Visual mode:** operational intake; reduce uncertainty.  
**Mobile priority:** action-first, one-handed, clear validation and success/error states.  
**Must not become:** generic contact form beside marketing copy.

### `/empresa.html`
**Primary job:** explain who the company is through what it actually does and how it approaches projects.  
**Trust evidence:** place, product, real operation and verifiable activity.  
**Must not become:** vague values/mission page.

### SEO landing pages
**Primary job:** answer a concrete search intent and route qualified visitors to a real service.  
**Visual mode:** concise operational landing.  
**Must not become:** templated SEO doorway with repeated filler.

### `/studio.html`
**Page mode:** dashboard / operations UI.  
**Primary job:** turn incoming enquiries into followed-up, qualified and closed commercial opportunities without losing context.  
**Primary users:** authorised internal commercial/operations users.  
**Primary actions:** review request, update status/priority/owner/follow-up, qualify, quote, mark sold, register sale.  
**Trust evidence:** real persisted system state; no simulated activity.  
**Required views:** Solicitudes, Clientes, Ayuntamientos, Ventas, Ajustes.  
**Visual mode:** dense industrial operations console, not generic SaaS dashboard.  
**Mobile priority:** search/review/update/follow-up; desktop tables recompose to actionable rows.  
**Must not become:** rounded-card SaaS template, luxury backoffice, fake analytics dashboard or status theatre.

## Motion Thesis

**PUBLIC MOTION THESIS:** Precisa y mecánica: el movimiento debe recordar una operación que avanza por etapas, usando feedback rápido, continuidad direccional y cambios de estado claros; nunca animación ambiental para fingir calidad.

**STUDIO MOTION THESIS:** Utilitaria y rápida: estados, drawer, modal, selección y navegación deben responder con claridad sin retrasar escaneo ni acciones.

## Active Archic modules

- [x] core
- [x] copy
- [x] mobile
- [x] qa
- [x] motion
- [x] local-business
- [x] commerce/catalogue
- [x] saas / operations — Studio only
- [ ] luxury
- [ ] automotive
- [ ] real-estate
- [ ] editorial

## Delivery targets

**Target score:** 90–94 flagship; push toward 95 only when the real image library is strong enough.  
**Critical public pages:** `/`, `/vehiculos.html`, `/soluciones.html`, `/ecija.html`, `/contacto.html`  
**Critical private surface:** `/studio.html` login + authenticated workflow when credentials are available  
**Critical mobile widths:** 320, 375, 390/393, 430, 768; desktop 1440  
**Performance priorities:** protect hero/LCP, avoid unnecessary JS, dimensions on prominent images, no unstable embeds.  
**Accessibility priorities:** keyboard navigation, visible focus, readable contrast, comfortable touch targets, 200% zoom/reflow, reduced motion.  
**Hard Gate requirement:** 0 failures before delivery.
