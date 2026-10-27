# 0013 — El estudiante edita sus datos de contacto y su foto

**Estado:** Aceptada
**Fecha:** 2026-10-26

## Contexto

El tutor observó que la cuenta "debería ser personalizable, subir foto del estudiante" (observación #2, SDD
OBS-T1). El responsable decidió que los datos **no relevantes** los cambian el estudiante y Kardex, y los demás solo
Kardex (DEC-064 #2).

Hasta hoy, el estudiante solo tenía `files:leer_propio` y `requisitos:leer_propio`. La política de Casbin (ADR-0002)
es parte de "Auth y RBAC" en `do-not-touch.md`: sumar una acción exige un ADR y pruebas negativas.

## Decisión

1. **Acción nueva `editar_propio`** en la lista cerrada de acciones (API y web), y la fila
   `ESTUDIANTE · files · editar_propio`. Como `leer_propio`, el servicio toma el file **de la sesión**, nunca de la
   URL. Las rutas no reciben id.
2. **Qué puede cambiar el estudiante:**
   - Correo, celular y dirección: `PATCH /files/mio`, con un `strictObject`, así que cualquier otro campo da 400.
   - Su foto: `PUT` y `DELETE /files/mio/foto`.
   - CI, nombres, apellidos, fecha de nacimiento, código, especialidad, condición, modalidad, género y años quedan
     solo para Kardex (`files:editar`), que además edita la dirección y la foto de cualquier file.
3. **Dirección:** columna `persona.direccion` (`VARCHAR(200)`, opcional). Es un campo editable más del file y entra
   también en la plantilla de importación.
4. **Foto:**
   - Va en la tabla `persona_foto` (`persona_id` PK y FK, `contenido BYTEA` hasta 1 MB con un CHECK, `tipo`,
     `actualizado_en`), dueña: **personas**. No vive en `persona` para que las listas no la carguen.
   - Se acepta JPG, PNG o WebP, verificados por sus primeros bytes y no por lo que declara el navegador.
   - El navegador la recorta a un cuadrado de 400 px antes de subirla.
   - Se lee con `GET /files/mio/foto` (el estudiante) o `GET /files/:id/foto` (quien lee files).
   - `FileDetalle.foto` trae la fecha de la última foto, o null; la web la usa para no mostrar una foto vieja.
5. **Bitácora (DEC-007):** cada cambio es un `EDITAR` del file con antes y después. De la foto se guardan el tipo y el
   tamaño, nunca el contenido. El autor sale de la sesión: la bitácora muestra si lo cambió el estudiante o Kardex.

## Consecuencias

- La matriz de rutas suma 7 operaciones:
  - `PATCH /files/mio`;
  - `GET`, `PUT` y `DELETE /files/mio/foto`;
  - `GET`, `PUT` y `DELETE /files/:id/foto`.
- Las pruebas negativas verifican:
  - el estudiante no edita su nombre ni su CI por `PATCH /files/mio` (400);
  - no edita otro file (`PATCH /files/:id`, 403);
  - el personal que no es Kardex no sube fotos (403).
- La migración agrega `persona.direccion` y la tabla `persona_foto` (18 tablas). Su FK es RESTRICT, como todas (DEC-006): las personas no se borran.
- La web muestra la foto con una URL `blob:` (la imagen se pide con el token), así que la CSP del nginx suma `blob:` a `img-src`.
