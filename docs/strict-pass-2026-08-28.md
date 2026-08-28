# Strict pass — 2026-08-28

## Criterio

Se ha revisado la web como una entrega comercial final, no como un prototipo. La prioridad ha sido eliminar cualquier rastro de lenguaje interno, recursos de demo, inconsistencias visuales y fricción en la conversión.

## Problemas encontrados y corregidos

1. La home explicaba demasiado cómo se había verificado la información. Ese lenguaje se ha eliminado de la experiencia pública.
2. Faltaba una prueba visual fuerte después del hero. Se ha incorporado el vídeo público del tren turístico operando en Écija.
3. La prueba social estaba presentada como una auditoría. Ahora se presenta como operación real y ámbitos de uso.
4. La página de Vehículos mostraba mensajes de prototipo como “sin fotografía verificada”. Se ha sustituido por contenido comercial útil.
5. Contacto hablaba del panel interno. Se ha reescrito alrededor de los datos que necesita el cliente para iniciar una propuesta.
6. Las páginas internas principales seguían cargando tipografía y lenguaje visual anteriores antes de que `app.js` inyectara la capa industrial. Vehículos, Soluciones, Contacto, Écija y Empresa cargan ahora `industrial-shared.css` directamente en el head.
7. Las plantillas SEO futuras cargaban Fraunces y dependían de corrección posterior. Ambas plantillas cargan ahora Manrope/Source Sans e `industrial-shared.css` desde el primer render.
8. Se han añadido dimensiones intrínsecas a las imágenes principales del tren para reducir cambios de layout.
9. Se ha añadido el Facebook oficial verificado al schema `sameAs` y al footer de la home.
10. Se ha reforzado la página de Écija como caso real, eliminando formulaciones que sonaban a nota de investigación.

## QA ejecutado

- Vercel preview READY para el último commit.
- GitHub Actions `Static quality report` SUCCESS para el último commit.
- Captura completa de home en 1440 px.
- Captura completa de home en 390 px.
- Captura completa de Vehículos en 1440 px.
- Captura completa de Contacto en 390 px.
- Captura completa de Écija en 1440 px.

## Riesgo pendiente

El mayor límite visual ya no es el layout: es la falta de una biblioteca propia de fotografías originales en alta resolución de cada unidad, taller, fabricación, detalles y proyectos reales. Cuando exista ese material, debe sustituir progresivamente miniaturas remotas y permitirá construir fichas de vehículo y casos de proyecto mucho más potentes.
