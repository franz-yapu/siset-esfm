# Modo demo (temporal: 15 y 16 de octubre de 2026)

Pedido el 15-oct: avanzar lo más rápido posible para la **presentación del viernes 16-oct**. Después de la
presentación se vuelve al [modo normal](modo-normal.md).

## Qué cambia

| Modo normal                               | Modo demo                                                     |
| ----------------------------------------- | ------------------------------------------------------------- |
| Un ticket por vez, en orden de olas       | **Por rol y módulo**: se termina el flujo completo de un rol  |
| Rama `feat/Sx.y-...` + PR + merge         | **Todo directo en `main`**, sin ramas ni PR                   |
| task-brief + SDD aprobado antes de codear | Sin SDD previo; se anota lo hecho en una nota corta por flujo |
| ClickUp tarea por tarea                   | ClickUp se pone al día al final                               |

## Qué no cambia

- `auditoria.registrarEvento()` en toda escritura de negocio (DEC-007): la bitácora es parte de lo que se muestra.
- Permisos por rol con Casbin y "propio"/sede en el servicio.
- **Dudas con la escuela, igual que siempre:** la hoja de Google
  [SISET — Preguntas para la escuela](https://docs.google.com/spreadsheets/d/1VvGHzB_VmHTSW9Zi2nNd407qpnATUjiQSE24IyGjAj8/edit?gid=1896603085#gid=1896603085).
  Antes de cada flujo se lee la hoja por respuestas nuevas (columna J "respondido") y se pasan a `dudas.md` y a
  una DEC; cada duda nueva que salga se anota al final de la hoja y en `dudas.md`. Mientras no haya respuesta se
  usa la propuesta provisional; no se inventan reglas.
- TypeScript estricto, sin `any`. Commits `Sx.y <qué hace>` en español.
- Antes de cada push: `npm run typecheck`, `npm test` y `npm run build` en local (el CI sigue corriendo en `main`).
- **Despliegue en el VPS solo una vez, al final del día** (prueba en `siset.vertexall.com`, ver
  [despliegue/prueba-coolify.md](../despliegue/prueba-coolify.md)). Producción con datos reales sigue esperando.

## Orden

Un rol a la vez, de punta a punta, en el orden del trámite:

1. **Kardex** — ya completo en main (files, requisitos, bloqueo).
2. **Secretaría** (SEC_DIR / SEC_COORD) — hojas de ruta: ingesta, lista y detalle conectados (S3.8 + S3.9),
   derivar.
3. **Coordinador** — bandeja, descargo y derivación.
4. Lo que alcance: seguimiento público (S4.x), emisión (S5.x).

## Después del viernes

1. Escribir los SDD que faltan como `Implementado` a partir de lo que quedó en main.
2. Poner ClickUp al día.
3. Volver al modo normal (ramas, PR, un ticket a la vez).

## Protección de `main`

El ruleset "Proteger main (S0.5)" (id `25016346`, exige PR y los 4 checks) quedó **desactivado** el 15-oct para
poder hacer push directo. Se reactiva después de la presentación:
`gh api -X PUT repos/franz-yapu/siset-esfm/rulesets/25016346 -f enforcement=active`.
