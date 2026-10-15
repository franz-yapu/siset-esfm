# 0006 — Correlativo de hojas de ruta generado en la base

**Estado:** Aceptada (2026-10-14, con el SDD de S3.2-S3.4)
**Fecha:** 2026-10-14

## Contexto

El generador del correlativo `HR-AAAA-NNNNNN` está en `docs/do-not-touch.md`: debe ser único, sin carreras, y su
número va en documentos impresos (carátula, QR). RF-08 CA2 pide un correlativo único por gestión generado en la
transacción de la ingesta. Una secuencia de PostgreSQL no sirve: no se reinicia por gestión y deja huecos con los
rollbacks.

## Decisión

1. Tabla `hoja_ruta_correlativo (gestion PK, ultimo)` y función `fn_siguiente_nro_hoja_ruta(gestion)`, que hace
   `INSERT … ON CONFLICT (gestion) DO UPDATE SET ultimo = ultimo + 1 RETURNING ultimo` y devuelve
   `HR-<gestión>-<6 dígitos>`. Pasado 999 999, lanza un error.
2. La función se llama **dentro de la transacción de la ingesta**. La fila de la gestión queda bloqueada hasta el
   commit: las ingestas simultáneas se ordenan, y un rollback devuelve el número. No hay huecos ni repetidos.
3. La gestión es el año en La Paz (UTC−4) al registrar. Cada gestión empieza en 000001.

## Consecuencias

- Las ingestas de una misma gestión se serializan en esa fila. Con el volumen de la escuela (unos pocos trámites
  por día) no es un cuello de botella.
- El número no se puede cambiar después: la hoja de ruta no tiene operación para editarlo.
- Probado con 20 ingestas simultáneas (números consecutivos) y con un rollback que libera el número.
