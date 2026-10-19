# 0010 — DEVOLVER solo para el historial académico

**Estado:** Aceptada
**Fecha:** 2026-10-19

## Contexto

ADR-0008 sumó `DEVOLVER` al flujo con valorado (historial y legalización) y dejó dicho que, si D-48b respondía que la
legalización no se contrasta, se limitaría por tipo de trámite con otro ADR. El 19-oct la escuela respondió D-48b: el
contraste con los empastes **solo se hace para imprimir el historial**, no para la legalización.

## Decisión

1. Una transición puede tener `soloTipos` (códigos de tipo de trámite). `DEVOLVER` queda con
   `soloTipos: ['HISTORIAL_ACADEMICO']`.
2. `EstadoParaTransicion` lleva el código del tipo (`tipo`). `evaluarTransicion` y `accionesPosibles` exigen que el
   paso exista para el estado, el flujo **y** el tipo. Para la legalización, `DEVOLVER` da 409 `TRANSICION_INVALIDA`
   y no aparece como botón.
3. La web repite el cambio en `lib/maquina-hojas-ruta.ts` (mock).

## Consecuencias

- La tabla de pruebas suma el tipo: 10 estados × 10 acciones × 2 flujos × 2 tipos × 6 roles × 3 sedes × 2 bloqueos
  (14 400 combinaciones), con la fila de `DEVOLVER` limitada al historial.
- Los trámites de legalización ya devueltos (si hubiera) quedan como están: desde `DEVUELTO` no sale ningún paso.
