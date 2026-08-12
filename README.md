# Trenes y Tranvías Ciudad del Sol — web concept

Concepto web estático, responsive y sin dependencias para **Trenes y Tranvías Ciudad del Sol (Écija)**.

## Dirección

No se ha tratado como una marca de lujo. La interfaz busca una mezcla de **industria, turismo, cercanía y fiabilidad**, con un nivel visual alto y una conversión B2B clara para ayuntamientos, organizadores de eventos, recintos y negocios turísticos.

## Contenido público utilizado

- Facebook: la empresa se presenta como dedicada a la **fabricación y alquiler** de trenes y tranvías turísticos.
- Publicaciones sociales: oferta de **alquiler y venta**, vehículos de última generación, asientos individuales, espacio adaptado y megafonía.
- Publicaciones sociales: comunicación orientada a proyectos y alquileres en España.
- Turismo de la Comarca de Écija: disponibilidad para eventos y servicio de recogida turística entre la estación de autobuses y Plaza de España.
- Vídeo público de Rafael Cortés sobre el tren turístico de Écija, que agradece a José Luis de Trenes y Tranvías Ciudad del Sol. Se utiliza únicamente su thumbnail remoto como material real de contexto.

## Decisiones para no inventar datos

- No se ha incluido teléfono, email comercial, dirección de taller, CIF, antigüedad, capacidades exactas, homologaciones ni precios: no se pudieron verificar públicamente.
- El formulario funciona como UX completa y guarda un borrador local, pero no envía datos a ningún backend hasta tener un canal comercial confirmado.
- No se atribuye ningún logotipo nuevo a la empresa; el símbolo del header es un recurso de interfaz del concepto.
- No se crean fotos falsas de los vehículos. El único material fotográfico usado en la demo procede del vídeo público real localizado durante la investigación.

## Ejecutar

Abrir `index.html` directamente o servir la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 4173
```

Después visitar `http://localhost:4173`.

## Pendientes antes de producción

1. Conseguir del propietario el logo/wordmark oficial en vectorial.
2. Pedir una carpeta de fotos originales en alta resolución de todos los vehículos y proyectos.
3. Verificar teléfono, email comercial, razón social y dirección.
4. Conectar formulario a Resend/Supabase o al canal que decida la empresa.
5. Añadir Aviso legal, Privacidad y Cookies con los datos societarios correctos.
6. Crear dominio definitivo, sitemap y Search Console.
