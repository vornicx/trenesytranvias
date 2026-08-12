# SEO + CRM + Ayuntamientos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar web SEO de producto+geo (España) y Studio CRM completo (solicitudes → ventas → clientes → ayuntamientos → export Excel/PDF) sólido y usable al 100%.

**Architecture:** Híbrido: generador estático Node para hubs de producto y 50 provincias; Studio HTML/JS modular sobre Supabase existente (`tyt_inquiries` + allowlist), ampliado con clients/sales/settings/campaigns/activity_log.

**Tech Stack:** HTML/CSS/JS vanilla, Supabase Auth+REST+RLS, Vercel, Node script SEO, SheetJS + jsPDF (CDN) para export.

## Global Constraints

- UI Studio en español (“Solicitud”, no “inquiry” en copy visible).
- Pipeline UI: Nueva → Contactado → Presupuestado → Vendido (`new`/`contacted`/`quoted`/`won`); `lost`/`archived` siguen existiendo.
- Umbral ficha cliente default **3**, editable en Ajustes.
- Detección ayuntamiento: substring normalizado `"ayuntamiento"` en name/company/message.
- No inventar teléfono/CIF/logo oficiales.
- Studio `noindex`; no romper auth allowlist existente.
- Commits frecuentes y pequeños tras cada task verificable.
- Spec de referencia: `docs/superpowers/specs/2026-08-12-seo-crm-ayuntamientos-design.md`

---

## File map

| Path | Responsibility |
|---|---|
| `supabase/migrations/20260812_crm_clients_sales.sql` | Schema + RLS nuevas tablas |
| `studio/lib/api.js` | Auth session + `apiFetch` compartido |
| `studio/lib/municipality.js` | `detectMunicipality(text)` + normalización |
| `studio/lib/clients.js` | Match/create client, umbral ficha |
| `studio/lib/sales.js` | Crear venta al marcar won |
| `studio/lib/export.js` | Excel + PDF de ventas |
| `studio/views/*.js` | Vistas: solicitudes, clientes, ayuntamientos, ventas, ajustes |
| `studio.js` | Bootstrap: login, nav, router de vistas (adelgazar monolito) |
| `studio.html` / `studio.css` / `studio-v2.css` | Shell UI + módulos |
| `app.js` | Formulario público: `status: 'new'` explícito |
| `data/seo-pages.json` | Hubs producto + keywords/FAQ |
| `data/provincias.json` | 50 provincias |
| `scripts/generate-seo-pages.mjs` | Genera HTML + sitemap |
| `seo/templates/product.html` / `province.html` | Plantillas de generación |
| `trenes-turisticos/...` etc. | HTML SEO generados |
| `sitemap.xml` | Sitemap actualizado |
| `tests/municipality.test.mjs` | Tests unitarios Node |
| `tests/clients.test.mjs` | Matching / umbral |

---

### Task 1: Migración Supabase (CRM)

**Files:**
- Create: `supabase/migrations/20260812_crm_clients_sales.sql`
- Create: `supabase/APPLY.md` (cómo aplicar en dashboard SQL si no hay CLI linkeado)

**Interfaces:**
- Produces: tablas `tyt_clients`, `tyt_sales`, `tyt_activity_log`, `tyt_settings`, `tyt_recontact_campaigns`, `tyt_recontact_items` con RLS solo allowlist (mismo patrón que inquiries)

- [ ] **Step 1: Escribir migración SQL completa**

```sql
-- supabase/migrations/20260812_crm_clients_sales.sql
create extension if not exists pgcrypto;

create table if not exists public.tyt_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.tyt_settings (key, value) values
  ('client_fiche_threshold', '3'::jsonb),
  ('default_municipal_election_year', '2027'::jsonb)
on conflict (key) do nothing;

create table if not exists public.tyt_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  location text,
  notes text,
  is_municipality boolean not null default false,
  election_year int,
  next_recontact_at date,
  last_recontact_at timestamptz,
  sales_count int not null default 0,
  sales_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tyt_clients_email_idx on public.tyt_clients (lower(email));
create index if not exists tyt_clients_municipality_idx on public.tyt_clients (is_municipality);

create table if not exists public.tyt_sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.tyt_clients(id) on delete set null,
  inquiry_id uuid references public.tyt_inquiries(id) on delete set null,
  amount_eur numeric(12,2),
  sold_at date not null default (timezone('utc', now()))::date,
  concept text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists tyt_sales_sold_at_idx on public.tyt_sales (sold_at desc);

create table if not exists public.tyt_activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  actor_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.tyt_recontact_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  election_year int not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.tyt_recontact_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.tyt_recontact_campaigns(id) on delete cascade,
  client_id uuid not null references public.tyt_clients(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','contacted','continues','stopped')),
  notes text,
  updated_at timestamptz not null default now(),
  unique (campaign_id, client_id)
);

-- RLS: solo usuarios en tyt_admin_allowlist (mismo criterio que studio)
alter table public.tyt_settings enable row level security;
alter table public.tyt_clients enable row level security;
alter table public.tyt_sales enable row level security;
alter table public.tyt_activity_log enable row level security;
alter table public.tyt_recontact_campaigns enable row level security;
alter table public.tyt_recontact_items enable row level security;

create or replace function public.tyt_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tyt_admin_allowlist a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create policy tyt_settings_admin on public.tyt_settings for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_clients_admin on public.tyt_clients for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_sales_admin on public.tyt_sales for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_activity_admin on public.tyt_activity_log for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_campaigns_admin on public.tyt_recontact_campaigns for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());
create policy tyt_campaign_items_admin on public.tyt_recontact_items for all using (public.tyt_is_admin()) with check (public.tyt_is_admin());

-- inquiries: asegurar default status new si aún no
alter table public.tyt_inquiries alter column status set default 'new';
```

- [ ] **Step 2: Documentar aplicación**

Crear `supabase/APPLY.md` con: abrir SQL Editor del proyecto `oclgrnwkovkaiscpmxri` → pegar migración → Run. Verificar tablas en Table Editor.

- [ ] **Step 3: Aplicar migración** (CLI `supabase db push` si el proyecto está linkeado; si no, SQL Editor). Confirmar que las 6 tablas existen.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "Add Supabase CRM schema for clients, sales, and campaigns"
```

---

### Task 2: Utilidades puras + tests (municipality, threshold)

**Files:**
- Create: `studio/lib/municipality.js`
- Create: `studio/lib/clients-logic.js` (puro: match key, shouldCreateFiche)
- Create: `tests/municipality.test.mjs`
- Create: `tests/clients-logic.test.mjs`
- Create: `package.json` con `"type":"module"` y script `"test":"node --test"`

**Interfaces:**
- Produces:
  - `detectMunicipality(...parts: string[]): boolean`
  - `normalizeContactKey({email, phone, name, company}): string`
  - `shouldCreateClientFiche(salesCount, threshold): boolean`

- [ ] **Step 1: Tests que fallan**

```js
// tests/municipality.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMunicipality } from '../studio/lib/municipality.js';

test('detects ayuntamiento in company', () => {
  assert.equal(detectMunicipality('Juan', 'Ayuntamiento de Écija', ''), true);
});
test('ignores unrelated', () => {
  assert.equal(detectMunicipality('Ana', 'Turismo Sur', 'alquiler tren'), false);
});
```

```js
// tests/clients-logic.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldCreateClientFiche, normalizeContactKey } from '../studio/lib/clients-logic.js';

test('threshold default 3', () => {
  assert.equal(shouldCreateClientFiche(2, 3), false);
  assert.equal(shouldCreateClientFiche(3, 3), true);
});
test('email key preferred', () => {
  assert.equal(normalizeContactKey({ email: 'A@B.com', phone: '600', name: 'x', company: 'y' }), 'email:a@b.com');
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `node --test tests/municipality.test.mjs tests/clients-logic.test.mjs`  
Expected: FAIL module not found

- [ ] **Step 3: Implement**

```js
// studio/lib/municipality.js
export function detectMunicipality(...parts) {
  const blob = parts.filter(Boolean).join(' ').toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '');
  return blob.includes('ayuntamiento');
}
```

```js
// studio/lib/clients-logic.js
export function shouldCreateClientFiche(salesCount, threshold = 3) {
  return Number(salesCount) >= Number(threshold);
}
export function normalizeContactKey({ email, phone, name, company }) {
  if (email) return `email:${String(email).trim().toLowerCase()}`;
  if (phone) return `phone:${String(phone).replace(/\D/g, '')}`;
  return `name:${String(name || '').trim().toLowerCase()}|${String(company || '').trim().toLowerCase()}`;
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add package.json studio/lib/municipality.js studio/lib/clients-logic.js tests/
git commit -m "Add municipality detection and client threshold helpers with tests"
```

---

### Task 3: Shell Studio multi-módulo + copy español

**Files:**
- Modify: `studio.html` (sidebar: Solicitudes, Clientes, Ayuntamientos, Ventas, Ajustes; paneles `data-view`)
- Modify: `studio.js` (router de vistas; labels ES; mantener auth)
- Modify: `studio.css` / `studio-v2.css` según haga falta

**Interfaces:**
- Produces: `showView(name: 'solicitudes'|'clientes'|'ayuntamientos'|'ventas'|'ajustes')`
- Consumes: auth/`apiFetch` existentes

- [ ] **Step 1: Actualizar sidebar y contenedores de vista en `studio.html`**

Nav:

```html
<nav class="sidebar-nav">
  <a class="is-active" href="#solicitudes" data-nav="solicitudes">Solicitudes <b data-new-count>0</b></a>
  <a href="#clientes" data-nav="clientes">Clientes</a>
  <a href="#ayuntamientos" data-nav="ayuntamientos">Ayuntamientos</a>
  <a href="#ventas" data-nav="ventas">Ventas</a>
  <a href="#ajustes" data-nav="ajustes">Ajustes</a>
</nav>
```

Envolver lista/pipeline actual en `<section data-view="solicitudes">`. Añadir secciones vacías `data-view` para el resto (hidden).

- [ ] **Step 2: Router en `studio.js`**

```js
function showView(name) {
  $$('[data-view]').forEach(el => { el.hidden = el.dataset.view !== name; });
  $$('[data-nav]').forEach(a => a.classList.toggle('is-active', a.dataset.nav === name));
  location.hash = name;
  // dispatch custom event for view modules
  document.dispatchEvent(new CustomEvent('tyt:view', { detail: { name } }));
}
```

Labels: `Nueva`, `Contactado`, `Presupuestado`, `Vendido` (map `quoted`→Presupuestado, `won`→Vendido). Título login: “Gestión comercial”.

- [ ] **Step 3: Verificar manualmente** login → cambiar hash → solo una vista visible.

- [ ] **Step 4: Commit**

```bash
git commit -m "Add multi-module Studio navigation with Spanish labels"
```

---

### Task 4: Vendido → venta + log + cliente

**Files:**
- Create: `studio/lib/api.js` (extraer `apiFetch` si aún no)
- Create: `studio/lib/sales.js`
- Create: `studio/lib/clients.js`
- Modify: `studio.js` / vista solicitudes (modal importe)
- Modify: `studio.html` (modal vendido)
- Modify: `app.js` — añadir `status: 'new'` en payload público

**Interfaces:**
- Consumes: `detectMunicipality`, `shouldCreateClientFiche`, `normalizeContactKey`, settings threshold
- Produces: `markInquiryWon(inquiry, { amountEur?: number, concept?: string })`

- [ ] **Step 1: Asegurar lead público `new`**

En `app.js` `persistInquiry` payload:

```js
status: 'new'
```

- [ ] **Step 2: Implementar `markInquiryWon`**

Flujo:
1. PATCH inquiry `status: 'won'`
2. Buscar/crear `tyt_clients` (match key; set `is_municipality` via detect)
3. INSERT `tyt_sales` (amount nullable)
4. UPDATE client `sales_count` / `sales_total`
5. Si `shouldCreateClientFiche` → cliente ya existe (crear si no)
6. INSERT `tyt_activity_log`

- [ ] **Step 3: Modal UI** al elegir Vendido o botón “Marcar vendido”: campo € opcional + Guardar.

- [ ] **Step 4: Probar** crear inquiry manual → Contactado → Presupuestado → Vendido con 1500€ → fila en `tyt_sales` y log.

- [ ] **Step 5: Commit**

```bash
git commit -m "Create sale and client linkage when marking inquiry as sold"
```

---

### Task 5: Módulo Ajustes (umbral)

**Files:**
- Create: `studio/views/ajustes.js`
- Modify: `studio.html` sección ajustes

**Interfaces:**
- Produces: `loadSettings()`, `saveThreshold(n: number)` → PATCH/UPSERT `tyt_settings`

- [ ] **Step 1: UI** input número umbral + guardar + mensaje estado.

- [ ] **Step 2: Cargar default 3; persistir cambio a 4; recargar página; verificar 4.

- [ ] **Step 3: Commit**

```bash
git commit -m "Add Studio settings for client fiche threshold"
```

---

### Task 6: Módulo Clientes

**Files:**
- Create: `studio/views/clientes.js`
- Modify: `studio.html`

**Interfaces:**
- Consumes: `tyt_clients`, sales/inquiries por email/id
- Produces: listado + ficha + toggle `is_municipality` + notas

- [ ] **Step 1: Listado** con búsqueda y filtro (todos / empresas / ayuntamientos).

- [ ] **Step 2: Drawer ficha** con historial ventas + solicitudes vinculadas + marcar ayuntamiento + fechas ciclo (`election_year`, `next_recontact_at`).

- [ ] **Step 3: Verificar** que tras 3 ventas el cliente aparece; toggle ayuntamiento lo mueve al filtro.

- [ ] **Step 4: Commit**

```bash
git commit -m "Add clients module with municipality flag and history"
```

---

### Task 7: Módulo Ayuntamientos + campañas

**Files:**
- Create: `studio/views/ayuntamientos.js`
- Modify: `studio.html`

**Interfaces:**
- Produces: `createCampaign({ name, electionYear })` crea campaña + items para todos `is_municipality`; actualizar item status en lote

- [ ] **Step 1: Vista** lista ayuntamientos + columna próximo recontacto.

- [ ] **Step 2: “Nueva campaña municipales”** → insert campaign + items pending.

- [ ] **Step 3: UI campaña** checkboxes/select: pending|contacted|continues|stopped; al contacted actualizar `last_recontact_at` del cliente.

- [ ] **Step 4: Auto-detect** al crear inquiry/cliente si texto tiene ayuntamiento.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add municipalities view and electoral recontact campaigns"
```

---

### Task 8: Módulo Ventas + export Excel/PDF

**Files:**
- Create: `studio/lib/export.js`
- Create: `studio/views/ventas.js`
- Modify: `studio.html` (CDN SheetJS + jsPDF en el footer del studio)

**Interfaces:**
- Produces: `exportSalesXlsx(rows)`, `exportSalesPdf(rows)`

- [ ] **Step 1: Tabla ventas** con filtros fecha; total €.

- [ ] **Step 2: Export helpers**

```js
// studio/lib/export.js
export function exportSalesXlsx(rows) {
  const aoa = [['Fecha','Cliente','Concepto','Importe €','Inquiry']].concat(
    rows.map(r => [r.sold_at, r.client_name || '', r.concept || '', r.amount_eur ?? '', r.inquiry_id || ''])
  );
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Ventas');
  XLSX.writeFile(book, `ventas-${new Date().toISOString().slice(0,10)}.xlsx`);
}

export function exportSalesPdf(rows) {
  const doc = new jspdf.jsPDF();
  doc.setFontSize(14);
  doc.text('Ventas — Trenes y Tranvías', 14, 16);
  let y = 28;
  rows.forEach(r => {
    const line = `${r.sold_at} | ${r.client_name || '—'} | ${r.amount_eur ?? '—'} € | ${r.concept || ''}`;
    doc.setFontSize(10);
    doc.text(line.slice(0, 95), 14, y);
    y += 7;
    if (y > 280) { doc.addPage(); y = 20; }
  });
  doc.save(`ventas-${new Date().toISOString().slice(0,10)}.pdf`);
}
```

- [ ] **Step 3: Botones** Exportar Excel / Exportar PDF sobre filas filtradas.

- [ ] **Step 4: Verificar** descarga con ≥1 venta.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add sales list with Excel and PDF export"
```

---

### Task 9: Datos SEO + generador

**Files:**
- Create: `data/seo-pages.json` (todos los hubs del spec + navideñas + desfiles)
- Create: `data/provincias.json` (50 provincias ES con slug y ccaa)
- Create: `seo/templates/product.html`
- Create: `seo/templates/province.html`
- Create: `scripts/generate-seo-pages.mjs`
- Modify: `package.json` script `"seo:generate": "node scripts/generate-seo-pages.mjs"`

**Interfaces:**
- Produces: HTML en rutas del spec + `sitemap.xml`

- [ ] **Step 1: Escribir JSON hubs** con slug, title, h1, description, keywords[], faqs[{q,a}], cta.

Hubs mínimos (slugs):  
`trenes-turisticos`, `tranvias-turisticos`, `trenes-para-eventos`, `carrozas-para-eventos`, `trenes-de-boda`, `carrozas-de-boda`, `carrozas-navidenas`, `desfiles`, `alquiler-tren-turistico`, `alquiler-carrozas`, `alquiler-tranvia-turistico`, `venta-trenes-turisticos`, `trenes-para-ayuntamientos`.

- [ ] **Step 2: Escribir 50 provincias** (nombre oficial, slug ASCII, ccaa).

- [ ] **Step 3: Generador** lee templates, sustituye `{{title}}` etc., escribe:
  - `/{slug}/index.html` para productos
  - `/trenes-turisticos/{provincia}/index.html` para geo
  - regenera `sitemap.xml` con todas las URLs

- [ ] **Step 4: Run** `npm run seo:generate` — verificar conteo archivos ≈ 13 hubs + 50 provincias.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add SEO page generator for product hubs and provinces"
```

---

### Task 10: Integración web pública + CTAs

**Files:**
- Modify: `index.html`, `soluciones.html`, `contacto.html`, `vehiculos.html`, `empresa.html`, `ecija.html` (meta, enlaces a hubs, schema Organization básico)
- Modify: `vercel.json` (rewrites clean para carpetas SEO si hace falta)
- Modify: `robots.txt`
- Modify: nav compartida para incluir “Soluciones SEO” o enlaces a hubs clave

- [ ] **Step 1: Enlazar** desde home y soluciones a hubs producto principales.

- [ ] **Step 2: CTA** “Solicitar presupuesto” → `contacto.html` en todas las landings generadas.

- [ ] **Step 3: `robots.txt`** Allow `/` + Sitemap URL relativa/absoluta placeholder configurable.

- [ ] **Step 4: Smoke** servir estático `python3 -m http.server 4173` y abrir 3 hubs + 2 provincias + contacto.

- [ ] **Step 5: Commit**

```bash
git commit -m "Wire public SEO hubs into site navigation and CTAs"
```

---

### Task 11: Verificación end-to-end “100% sólido”

**Files:**
- Create: `docs/superpowers/plans/2026-08-12-qa-checklist.md` (resultado de pruebas)

Checklist ejecutable:

- [ ] Lead formulario → aparece Nueva en Studio
- [ ] Contactado / Presupuestado / Vendido (con y sin €) persisten
- [ ] Venta visible + export Excel + PDF
- [ ] Con umbral 3, tercera venta crea/muestra ficha
- [ ] Cambiar umbral a 4 en Ajustes funciona
- [ ] Texto “Ayuntamiento de X” → módulo Ayuntamientos
- [ ] Campaña municipal crea items; marcar contacted actualiza ficha
- [ ] 13 hubs + 50 provincias cargan; sitemap lista URLs
- [ ] Studio noindex; móvil: nav y drawers usables
- [ ] `node --test` pasa

- [ ] **Step final: Commit checklist + fixes** de cualquier bug encontrado hasta checklist en verde.

```bash
git commit -m "Verify CRM and SEO flows end-to-end"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Pipeline new→contacted→quoted→won + historial | 3, 4 |
| Importe opcional + BD | 1, 4 |
| Ficha auto umbral 3 editable | 2, 5, 6 |
| Ayuntamientos auto + manual | 2, 6, 7 |
| Ciclo + campaña global | 7 |
| Export Excel/PDF | 8 |
| SEO hubs producto incl. navideñas/desfiles | 9, 10 |
| 50 provincias + plantilla | 9 |
| Form → leads | 4, 10, 11 |
| UI intuitiva ES | 3–8 |

Sin placeholders pendientes en tareas. Tipos/nombres alineados (`tyt_*`, `detectMunicipality`, `markInquiryWon`, `shouldCreateClientFiche`).
