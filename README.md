# Trenes y Tranvías Ciudad del Sol

Sitio web público y sistema de captación para **Trenes y Tranvías Ciudad del Sol**, con base en Écija (Sevilla).

## Archic Design System v2

Este repositorio aplica el estándar Archic v2 de forma ejecutable, no solo como referencia visual.

Antes de cualquier cambio de interfaz, copy, responsive o motion:

1. leer `AGENTS.md`;
2. leer `PROJECT-DESIGN.md`;
3. cargar los módulos necesarios de `design-system/`;
4. respetar Design Thesis, Business-Native Primitive y Reskin Test;
5. terminar con Delivery Gate y QA renderizado.

El primitivo de diseño específico de este proyecto es:

`ORIGEN → RECORRIDO → VEHÍCULO → MODALIDAD → PROPUESTA`

La web debe parecer una operación de transporte turístico bien planteada, no una landing genérica que pueda vender cualquier negocio.

## Dirección

- Industrial, sobria, comercial y específica al producto.
- Negro/grafito técnico, blanco y amarillo señal.
- Manrope + Source Sans 3.
- Producto y operación reales por delante de decoración.
- Sin lenguaje de lujo genérico, pseudoingeniería, renders ficticios ni stock usado como prueba.
- Mobile se trata como modo de diseño propio.
- Motion preciso y mecánico, siempre subordinado a jerarquía, estado u orientación.

## Fuente de verdad

Material público actualmente verificado y utilizado:

- presencia pública de Trenes y Tranvías Ciudad del Sol en Facebook;
- oferta pública de fabricación, alquiler y venta;
- configuraciones publicadas con asientos individuales, espacio adaptado y megafonía en determinadas unidades;
- operación pública del tren turístico en Écija;
- recorrido de referencia Estación de autobuses → Plaza de España;
- vídeo público de la operación de Écija, usado como fuente del material visual actual.

No se publican como hechos capacidades exactas, homologaciones, autonomía, años de experiencia, certificaciones, métricas, precios, clientes o disponibilidad en tiempo real sin documentación verificable.

## Páginas principales

- `/` — oferta, producto real, lógica de recorrido y conversión.
- `/vehiculos.html` — catálogo operativo de tren/tranvía sin especificaciones inventadas.
- `/soluciones.html` — ciudad, eventos y recintos organizados por lógica de uso.
- `/ecija.html` — caso real del recorrido en Écija.
- `/empresa.html` — empresa explicada desde lo que hace y cómo plantea proyectos.
- `/contacto.html` — toma de requisitos: localidad, fechas, recorrido/uso y contacto.

Además existen 13 hubs SEO y 50 páginas provinciales generadas desde `seo/templates/`.

## SEO determinista

Generar las 63 landings y sitemap:

```bash
npm run seo:generate
```

Los cambios en plantillas, datasets o generador disparan `.github/workflows/seo-regenerate.yml`, que regenera y valida el output antes de hacer commit.

## Formulario

El formulario público está conectado al backend Supabase configurado en `supabase-config.js` y registra solicitudes en `tyt_inquiries`.

Los campos de fechas y recorrido se incorporan al contexto de la solicitud sin requerir una migración adicional de esquema. No se presenta la disponibilidad como dato en tiempo real.

## QA

Ejecutar el control completo del repositorio:

```bash
npm run check
```

Incluye:

- sintaxis de JavaScript;
- generador SEO;
- informe de calidad estática;
- suite `node:test`.

La web no debe declararse finalizada mientras exista un Hard Gate v2 fallido.

## Pendientes reales antes de producción definitiva

1. Conseguir logo/wordmark oficial en vectorial si existe.
2. Recibir una biblioteca de fotos originales en alta resolución de todos los vehículos, detalles, operaciones y proyectos.
3. Verificar y publicar los datos comerciales/societarios que el propietario autorice.
4. Incorporar Aviso legal, Privacidad y Cookies con datos societarios correctos.
5. Ampliar fichas de vehículos únicamente cuando existan fotografías y especificaciones verificadas.
