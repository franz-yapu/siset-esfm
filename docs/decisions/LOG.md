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

## DEC-002 — Backend como monolito modular y SDD por ticket
**Fecha:** 2026-10-13 · **Fuente:** pedido del responsable del proyecto · **Estado:** activa

1. `apps/api` se construye como **monolito modular** (ADR-0001): módulos en
   `src/modulos/<modulo>/` con sus capas internas (rutas → controlador →
   servicio → repositorio), código transversal en `src/compartido/`, y
   fronteras forzadas por ESLint. RNF-07 se cumple dentro de cada módulo.
2. Esto **enmienda** el backlog y los tickets de la Ola 1:
   - S0.7: la estructura deja de ser `src/{rutas,controladores,servicios,repositorios,middlewares,lib}`;
     pasa a `src/compartido/` + `src/modulos/` según ADR-0001. S0.7 crea solo
     `compartido/` y un módulo de ejemplo (`salud`, para `GET /api/v1/health`).
   - S0.3: la configuración de ESLint incluye la regla de fronteras entre módulos.
   - S0.6: cada tabla del esquema se asigna al módulo dueño de ADR-0001.
3. **SDD obligatorio por ticket**: ningún ticket se codea sin
   `docs/sdd/<ID>/SDD.md` en Estado `Aprobado (fecha)`, generado con
   `task-brief` → `write-sdd`. Todo SDD de backend declara en §2 qué
   módulo(s) toca y qué API pública agrega o consume.
