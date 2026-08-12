# Trenes y Tranvías — SEO nacional, CRM de leads y módulo Ayuntamientos

**Fecha:** 2026-08-12  
**Estado:** pendiente de review del usuario antes del plan de implementación  
**Enfoque:** híbrido — web pública (SEO producto + geo) + Inquiry Studio ampliado (HTML/JS + Supabase)

## 1. Objetivo

Construir un sistema sólido y usable al 100% que:

1. Posicione a nivel **España** en las intenciones de búsqueda del catálogo real (trenes, tranvías, carrozas, alquiler, venta, eventos, bodas, navidad, desfiles, ayuntamientos).
2. Capture **leads** con facilidad desde la web.
3. Permita al gestor **operar el pipeline**, guardar historial, registrar ventas (importe opcional), exportar a **Excel y PDF**, y mantener **fichas de cliente**.
4. Resuelva el problema de **ayuntamientos** (detección, listado unificado, recontacto cada ~4 años / cambio de gobierno).

## 2. Arquitectura

```text
[Web pública]                         [Studio /gestion]
 Hub + páginas producto SEO            Auth Supabase (allowlist)
 50 landings provincia                 Módulos:
 Formulario → tyt_inquiries              • Solicitudes (pipeline)
 Sitemap / robots / schema               • Clientes
 Generador desde data/*.json             • Ayuntamientos
                                         • Ventas + export
                                         • Ajustes
                      ↓
               Supabase (Postgres + Auth + RLS)
               inquiries | clients | sales | settings
               activity_log | recontact_campaigns
```

- **Hosting:** Vercel (clean URLs). Studio con `noindex`.
- **No** migrar a Next/Astro en esta fase.
- HTML SEO generado por script Node y versionado (o generado en build) para que Google indexe contenido real, no SPA.

## 3. Modelo de datos

### 3.1 Pipeline de solicitudes (`tyt_inquiries`, existente)

| UI (español) | Clave | Comportamiento |
|---|---|---|
| Nueva | `new` | Automática al crear desde web o alta manual |
| Contactado | `contacted` | Botón rápido; guarda `last_contacted_at` |
| Presupuestado | `quoted` | Estado comercial |
| Vendido | `won` | Modal importe opcional (€) → crea `tyt_sales` + log |
| Perdida | `lost` | Cierre negativo |
| Archivada | `archived` | Fuera de pipeline activo |

`qualified` puede permanecer en BD por compatibilidad; la UI prioriza el flujo corto anterior.

Campos relevantes ya usados: name, company, email, phone, source, priority, project_type, operation, location, message, internal_notes, next_follow_up_at, status, last_contacted_at, assigned_to.

### 3.2 Clientes (`tyt_clients`) — nueva

- Identidad: `name`, `company`, `email`, `phone`, `location`
- Flags: `is_municipality` (boolean)
- Ciclo electoral: `election_year`, `next_recontact_at`, `last_recontact_at`
- Agregados: `sales_count`, `sales_total` (o calculados)
- `notes`, timestamps
- Matching al vincular: email > teléfono > nombre+empresa normalizado

**Ficha automática:** cuando ventas asociadas ≥ umbral (`tyt_settings.client_fiche_threshold`, default **3**, editable en Ajustes). También alta manual.

### 3.3 Ventas (`tyt_sales`) — nueva

- `client_id`, `inquiry_id` (nullable), `amount_eur` (nullable), `sold_at`, `concept`, `notes`
- Fuente principal: transición a `won`
- Export Excel/PDF desde el módulo Ventas (filtros por fechas / ayuntamiento / todos)

### 3.4 Actividad (`tyt_activity_log`) — nueva

Registro append-only: cambio de estado, venta, recontacto, creación de ficha, marca ayuntamiento.

### 3.5 Ajustes (`tyt_settings`) — nueva

- `client_fiche_threshold` (default 3)
- `default_municipal_election_year` / campaña activa por defecto
- Otras claves de configuración del studio

### 3.6 Campañas de recontacto (`tyt_recontact_campaigns` + items) — nuevas

- Campaña global (ej. “Municipales 2027”)
- Por ayuntamiento/cliente: pendiente | contactado | sigue | no_sigue
- Complementa el ciclo por ficha (`next_recontact_at`)

### 3.7 Detección ayuntamiento

Si `name`, `company` o `message` contienen “ayuntamiento” (case-insensitive, normalizado), al crear/actualizar inquiry o cliente → `is_municipality = true`. También marca manual en ficha.

## 4. Studio — UX

Navegación lateral. Lenguaje en español (“Solicitud”, no “inquiry” en UI). Acciones grandes y pocas por pantalla. Móvil usable.

1. **Solicitudes** — lista + kanban; contador nuevas; detalle con avance de estado en 1 clic; modal al Vendido (importe opcional); alta manual.
2. **Clientes** — búsqueda; filtros todos / no-ayuntamiento / ayuntamiento; ficha con historial inquiries+ventas; marcar ayuntamiento.
3. **Ayuntamientos** — vista filtrada; columnas de ciclo/campaña; crear campaña global; acciones en lote.
4. **Ventas** — tabla, totales €, **Exportar Excel** y **Exportar PDF**.
5. **Ajustes** — umbral ficha; año/campaña municipal por defecto. Auth sigue por allowlist existente.

Export: SheetJS (xlsx) + jsPDF (o equivalente ligero CDN), solo ventas filtradas.

## 5. SEO público — producto + geo

### 5.1 Hubs de producto (nacionales)

| URL | Intención principal |
|---|---|
| `/trenes-turisticos/` | tren(es) turístico(s) España |
| `/tranvias-turisticos/` | tranvía turístico |
| `/trenes-para-eventos/` | tren eventos, ferias, fiestas |
| `/carrozas-para-eventos/` | carroza eventos |
| `/trenes-de-boda/` | tren boda / bodas |
| `/carrozas-de-boda/` | carroza boda |
| `/carrozas-navidenas/` | carrozas navideñas / Navidad |
| `/desfiles/` | desfiles, carrozas/trenes para desfile |
| `/alquiler-tren-turistico/` | alquiler tren turístico |
| `/alquiler-carrozas/` | alquiler carrozas |
| `/alquiler-tranvia-turistico/` | alquiler tranvía |
| `/venta-trenes-turisticos/` | venta / fabricación |
| `/trenes-para-ayuntamientos/` | B2B municipal / turismo ciudad |

Cada hub: title, meta description, H1, intro útil, beneficios, casos de uso, FAQ, CTA a formulario, schema (`Service` / `Organization` / breadcrumbs), enlaces a geo y a hubs hermanos.

### 5.2 Geo

- `/trenes-turisticos/{provincia}/` × **50 provincias** (producto ancla)
- Plantilla lista para ciudades y, más adelante, combos producto×provincia de alto rendimiento
- Enlazado: hub provincia ↔ hubs producto ↔ soluciones ↔ contacto

### 5.3 Generación

- `data/seo-pages.json` — productos, keywords, FAQs, copy base
- `data/provincias.json` — 50 provincias (nombre, slug, CCAA)
- `scripts/generate-seo-pages.mjs` — genera HTML únicos + actualiza `sitemap.xml` y `robots.txt`
- Refuerzo SEO de páginas actuales (`index`, empresa, soluciones, vehículos, contacto, écija)
- Formulario → `tyt_inquiries` con `status: new`

### 5.4 Fuera de alcance inmediato (checklist go-live)

- Teléfono, CIF, logo vectorial oficiales (no inventar)
- Search Console / dominio definitivo cuando existan
- No generar cientos de URLs thin tipo `carroza-boda-{ciudad}` en fase 1

## 6. Orden de implementación (alto nivel)

1. Migraciones Supabase + RLS (clients, sales, log, settings, campaigns)
2. Studio modular: Solicitudes endurecidas → Ventas/export → Clientes → Ayuntamientos/campañas → Ajustes
3. Generador SEO + hubs producto + 50 provincias + sitemap
4. Enlaces internos + CTAs + verificación end-to-end (lead → pipeline → venta → ficha → export)
5. Pruebas manuales / checklist “cero errores” antes de dar por cerrado

## 7. Criterios de “sólido al 100%”

- Lead web aparece como **Nueva** sin pasos manuales
- Estados se persisten en BD; historial visible
- Vendido con/sin importe crea venta; export Excel y PDF correctos
- Umbral 3 crea ficha; cambio de umbral en Ajustes se respeta
- “Ayuntamiento” en texto → aparece en módulo Ayuntamientos
- Campaña global + ciclo por ficha operativos
- Hubs producto + 50 provincias indexables, sitemap válido, formularios vivos
- Studio usable en desktop y móvil sin flujos rotos

## 8. Decisiones ya confirmadas

- Arquitectura híbrida C
- Generador estático ligero + studio modular (no Next/Astro ahora)
- Umbral ficha: **3**, editable en Ajustes
- Ayuntamientos: ciclo por ficha **+** campaña global
- SEO geo: hub + **todas las provincias** + plantilla ciudades
- Cobertura máxima de producto incl. navideñas y desfiles
- Export ventas Excel + PDF
- UI intuitiva en español
`)