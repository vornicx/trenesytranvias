# QA end-to-end — CRM Studio y SEO

Fecha de ejecución: 2026-08-13  
Rama: `feat/seo-crm-ayuntamientos`  
Base verificada: `3a2234d`

## Resultado del checklist

| # | Comprobación | Estado | Evidencia |
|---|---|---|---|
| 1 | Lead formulario → aparece Nueva en Studio | **BLOCKED** | `tests/studio-shell.test.mjs` confirma que el payload público envía `source: website` y `status: new`. No se puede comprobar la aparición real en Studio sin un email en `tyt_admin_allowlist`. |
| 2 | Contactado / Presupuestado / Vendido (con y sin €) persisten | **BLOCKED** | Los estados españoles y el modal de importe opcional pasan en `studio-shell.test.mjs`; `sales.test.mjs` cubre venta con importe y con `amount_eur: null`. Falta confirmar persistencia real mediante sesión Studio autenticada. |
| 3 | Venta visible + export Excel + PDF | **PASS** | `ventas-view.test.mjs` verifica carga de ventas, forma de filas y exportadores XLSX/PDF con nombres de archivo y datos esperados. Los módulos cargan correctamente mediante import ESM. |
| 4 | Con umbral 3, tercera venta crea/muestra ficha | **PASS** | `clients-logic.test.mjs` verifica `2 → false` y `3 → true`; `sales.test.mjs` verifica cliente, venta, agregados y umbral por defecto 3. La visualización autenticada queda cubierta solo a nivel de código. |
| 5 | Cambiar umbral a 4 en Ajustes funciona | **PASS** | `ajustes.test.mjs` verifica carga, validación, `PATCH` y alta por `POST`, incluida la persistencia del valor 4. |
| 6 | Texto “Ayuntamiento de X” → módulo Ayuntamientos | **PASS** | `municipality.test.mjs`, `sales.test.mjs` y `ayuntamientos-view.test.mjs` verifican detección, creación/actualización de cliente municipal y cableado del módulo. |
| 7 | Campaña municipal crea items; marcar contacted actualiza ficha | **PASS** | `ayuntamientos-view.test.mjs` verifica creación de items `pending` para todos los municipios y actualización de `last_recontact_at` al marcar `contacted`. |
| 8 | Studio noindex; móvil: nav y drawers usables | **BLOCKED** | `studio.html` contiene `noindex,nofollow`, controles de navegación y drawers; `studio.css` incluye reglas móviles a 760 px. La interacción móvil autenticada no puede ejecutarse sin allowlist. |
| 9 | `node --test` pasa | **PASS** | `npm test` (`node --test`): 43 tests, 43 PASS, 0 FAIL. |

Resumen del checklist principal: **6 PASS · 0 FAIL · 3 BLOCKED**.

## Verificaciones adicionales

- **PASS — generación SEO:** `npm run seo:generate` informa 13 hubs, 50 provincias y 69 URLs.
- **PASS — cobertura estática:** existen los 13 `index.html` de hubs y los 50 `index.html` provinciales; no falta ninguno.
- **PASS — sitemap/robots:** `sitemap.xml` contiene 69 entradas y `robots.txt` declara `https://www.trenesytranvias.com/sitemap.xml`.
- **PASS — smoke HTTP:** servidor estático local devolvió HTTP 200 para `/`, las cinco páginas públicas clave, dos rutas de trenes turísticos, carrozas navideñas, desfiles, sitemap y robots.
- **PASS — CTAs:** las dos plantillas y las 63 páginas regeneradas usan “Solicitar presupuesto”.
- **PASS — JSON-LD:** contacto, soluciones, vehículos, empresa y Écija incluyen `Organization`; la prueba automatizada lo exige.
- **PASS — rutas críticas Studio:** imports ESM confirmaron funciones para `markInquiryWon`, `initClientesView`, `createCampaign`, `exportSalesXlsx` y `loadSettings`.
- **PASS — integridad del diff:** `git diff --check` sin errores.

## Bloqueo externo

La prueba E2E real de login y mutaciones en Studio requiere sembrar un email administrativo en `tyt_admin_allowlist`. Hasta entonces no se deben declarar verificadas la aparición del lead, la persistencia en Supabase ni la interacción móvil autenticada.
