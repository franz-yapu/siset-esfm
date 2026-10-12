# Log de decisiones

Append-only. Una entrada por respuesta de stakeholder, resolución de
discrepancia, o decisión de alcance que no queda cubierta por un ADR. Nunca se
edita una entrada pasada — se reemplaza con una nueva que referencia el ID
viejo.

Formato:

```
## DEC-001 — <título corto>
**Fecha:** YYYY-MM-DD · **Fuente:** <quién/dónde> · **Estado:** activa | reemplazada por DEC-XXX

<qué se decidió, en lenguaje llano>

## DEC-001 — Interpretaciones del prototipo de pantallas (a validar en Sprint 0)
**Fecha:** 2026-10-12 · **Fuente:** construcción del prototipo (`apps/web`) · **Estado:** activa (provisional)

Donde la spec y el PRD no coincidían o no decían nada, el prototipo hace esto:
1. "Enviado a dictamen" no es un estado nuevo: es una marca dentro de *En revisión* (spec P-31). Mientras la tiene, Kardex ya no puede observar el trámite.
2. Un dictamen **Observado** devuelve el trámite al estado *Observado* (lo subsana Kardex). PRD §3 solo describe el camino Aprobado (D-11).
3. *Emitir documento* (P-44) pasa de *Dictaminado* a *En impresión* y registra el valorado; luego *Enviar a La Paz* pasa a *En tránsito a La Paz*.
4. Cuando SEC_DIR confirma la recepción del retorno, el trámite pasa directo a *En firma*.
5. Bloqueo: más de 2 UF reprobadas en un mismo año (límite configurable, D-07). La spec mostraba un ejemplo con 2; se tomó "supera el límite".
6. El selector de tipo de documento en la vista previa permite emitir Historial, Certificación TCLO o Constancia TACFI para cualquier trámite (D-21 pendiente).
