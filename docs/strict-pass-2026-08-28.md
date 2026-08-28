# Strict pass — 2026-08-28

## Criterio

Revisión como entrega comercial final, no como prototipo. Se han penalizado especialmente lenguaje interno, recursos de demo, inconsistencias visuales, falta de prueba real y fricción en conversión.

## Problemas encontrados y corregidos

1. La home explicaba demasiado cómo se había verificado la información. Eliminado de la experiencia pública.
2. Faltaba una prueba visual fuerte después del hero. Se incorpora el vídeo público del tren turístico operando en Écija.
3. La prueba social parecía una auditoría. Ahora se presenta como operación real y ámbitos de uso.
4. Vehículos mostraba mensajes de prototipo como “sin fotografía verificada”. Sustituidos por contenido comercial útil.
5. Contacto hablaba del panel interno. Reescrito alrededor de los datos que necesita el cliente para iniciar una propuesta.
6. Las páginas internas principales cargaban el lenguaje visual anterior antes de la capa industrial. Vehículos, Soluciones, Contacto, Écija y Empresa cargan ahora `industrial-shared.css` directamente en el `head`.
7. Las plantillas SEO futuras cargaban Fraunces y dependían de corrección posterior. Ahora cargan Manrope/Source Sans e `industrial-shared.css` desde el primer render.
8. Se añaden dimensiones intrínsecas a imágenes principales del tren para reducir cambios de layout.
9. Se añade el Facebook oficial verificado al schema `sameAs` y al footer de la home.
10. Écija pasa a funcionar como caso real, no como nota de investigación.

## QA ejecutado

- Vercel preview READY.
- GitHub Actions `Static quality report` SUCCESS.
- Home completa: 1440 px y 390 px.
- Vehículos completa: 1440 px.
- Contacto completa: 390 px.
- Écija completa: 1440 px.

## Riesgo pendiente

El principal límite visual ya no es el layout: es la falta de una biblioteca propia de fotografías originales en alta resolución de cada unidad, taller/fabricación, detalles y proyectos reales. Ese material es el siguiente salto de calidad.
