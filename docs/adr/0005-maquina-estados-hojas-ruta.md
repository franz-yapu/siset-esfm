# 0005 — Máquina de estados de la hoja de ruta: dos flujos según el valorado

**Estado:** Aceptada (2026-10-14, con el SDD de S3.1-S3.3)
**Fecha:** 2026-10-14

## Contexto

La máquina de estados de la hoja de ruta está en `docs/do-not-touch.md`: tocarla exige un ADR, actualizar
`business-rules.md` y la tabla completa de pruebas de transiciones. El prototipo y el PRD suponían un solo flujo de
11 estados, con pases entre sedes, revisión de Kardex y dictamen del Coordinador. La escuela respondió otra cosa
(D-05, D-11, D-21): dos flujos según si el trámite lleva valorado; Kardex lleva el papel en persona; el Coordinador
solo firma. El brief del módulo (2026-10-14) y DEC-033 lo aprobaron.

## Decisión

1. **Dos flujos** (con y sin valorado), 9 estados y 9 acciones. La tabla de transiciones (desde, hacia, flujo, rol,
   sede y si el file bloqueado lo impide) es **dato tipado** en `apps/api/src/modulos/hojas-ruta/maquina.ts`, con
   funciones puras para validar y para listar las acciones posibles.
2. **La autorización fina es de la máquina**: Casbin solo exige `hojas-ruta`/`leer` para entrar a la ruta
   (ADR-0002); quién hace cada paso y desde qué sede lo decide la tabla. Errores: 409 (paso que el estado o el flujo
   no admiten), 403 (otro rol u otra sede), 422 (file bloqueado antes de imprimir).
3. **El estado vive en los movimientos**: cada paso inserta un `movimiento_hoja_ruta` (solo inserción, como la
   bitácora, ADR-0003) y un trigger copia el estado y la sede a `hoja_ruta`. La transacción toma la fila con
   `SELECT … FOR UPDATE` y registra `CAMBIAR_ESTADO` en la bitácora.
4. Los pasos que ocurren en Calahumana sin una cuenta propia (firmas de Dirección Académica y General) los anota
   SEC_DIR (D-33, propuesta).

## Consecuencias

- Cambiar el flujo es cambiar una tabla y su prueba; la API y el esquema no cambian salvo un estado nuevo en el enum.
- Si D-34 confirma la observación o D-35 los envíos entre sedes, se agregan estados y filas, con otro ADR.
- No existen las tablas `pase` ni `dictamen`.
- La tabla de pruebas recorre 5 832 combinaciones (estado × acción × flujo × rol × sede × bloqueo) contra una lista
  de transiciones válidas escrita a mano, no derivada del código.
