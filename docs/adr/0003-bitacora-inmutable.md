# 0003 — Bitácora de solo inserción desde su creación

**Estado:** Propuesta (se acepta junto con el SDD de S0.11)
**Fecha:** 2026-10-13

## Contexto

La bitácora (`log_auditoria`, RF-14) está en `docs/do-not-touch.md`: tocarla exige un ADR. RF-14 CA2
pide que la tabla no admita UPDATE ni DELETE desde la app, y business-rules dice que eso se garantiza con
permisos de BD. D-17 fija que la API registra el evento en la misma transacción que la operación.

El modelo v1 (DEC-006) cambia dos cosas respecto de lo que creó S0.6:

- `usuario_id` pasa a ser nullable.
- La inmutabilidad se garantiza con triggers.

El análisis del modelo tentativo (`docs/bd-tentaiva/ANALISIS.md`, E2) mostró que un trigger
`BEFORE UPDATE OR DELETE` no impide `TRUNCATE`: la tabla se vació entera en la prueba.

## Decisión

1. **Solo inserción por triggers, desde la migración que crea la tabla** (S0.11):
   - `BEFORE UPDATE OR DELETE … FOR EACH ROW` y `BEFORE TRUNCATE … FOR EACH STATEMENT`.
   - Ambos usan `fn_solo_insercion()`, que lanza una excepción.
   - La función es genérica: `movimiento_hoja_ruta` (S3.x) usa la misma.
2. **Además, permisos de BD** en S6.4 (business-rules): `REVOKE UPDATE, DELETE, TRUNCATE` al rol con el
   que se conecta la app, que debe ser distinto del dueño de las tablas (se define en S0.4/S0.9). Así hay
   dos barreras independientes: el trigger cubre errores de código y el permiso cubre a alguien con acceso
   a la conexión de la app.
3. **`usuario_id` nullable**: permite registrar eventos sin usuario autenticado, como un login con un CI
   inexistente. Eso no responde D-26: si el cliente dice que no se registran, la app simplemente no los
   escribe, sin cambiar el esquema.
4. **`ip INET`** y **`user_agent`**: la IP sale de la API (D-17), no de un trigger, porque PostgreSQL no
   conoce la IP del cliente web.

## Consecuencias

- **Facilita:** auditoría confiable desde el primer registro, y que un bug o un script descuidado no pueda borrar ni reescribir eventos.
- **Dificulta:** corregir un evento mal registrado. Es intencional: la corrección es un **evento nuevo** que referencia al anterior. Para limpiar la base de desarrollo o de test, se recrea la base; no se hace `TRUNCATE`.
- **Mantenimiento** (por ejemplo, purgar eventos después de N años si alguna vez lo pide una norma): exige un ADR nuevo y una operación manual del DBA que deshabilite el trigger dentro de una transacción. Nunca desde la app.
