# 0009 — Rol Administrador y Secretaría de Dirección sin files

**Estado:** Aceptada
**Fecha:** 2026-10-19

## Contexto

Auth y RBAC están en `do-not-touch.md`. Por D-27 (14-oct), Kardex administraba el sistema: usuarios, roles y
bitácora. El 19-oct la escuela pidió un **rol Administrador aparte** que se encargue de usuarios, roles y la
trazabilidad, y que **Secretaría de Dirección no vea los files**. Pero SEC_DIR usaba `GET /files` para elegir al
egresado al registrar un trámite.

## Decisión

1. Nuevo rol `ADMIN` en la política (`autorizacion.politica.ts`), en el seed y en la web:
   - `usuarios`: crear, leer y editar (antes KARDEX);
   - `auditoria`: leer (antes KARDEX).
     KARDEX ya no tiene ninguno de los dos.
2. SEC_DIR pierde `files`/`leer`. Para la ingesta se agrega `GET /hojas-ruta/titulares?texto=`, protegido por
   `hojas-ruta`/`crear` (solo SEC_DIR). Devuelve hasta 8 egresados con lo justo para elegir: id del file, nombre, CI,
   especialidad, bloqueado y motivo. Sin semáforo ni requisitos. Lo arma la raíz con files, personas y catálogos.
3. "No quedarse sin administrador" (DEC-020 #4) protege al último ADMIN activo (`ULTIMO_ADMIN`, con el mismo lock).
4. El seed crea el ADMIN inicial solo si vienen `SEED_ADMIN_CI` y `SEED_ADMIN_PASSWORD`; la migración
   `20261019120000` inserta el rol en las bases existentes.

## Consecuencias

- La matriz de la política pasa a 7 roles × 9 recursos × 4 acciones (252 combinaciones), escrita a mano en
  `seguridad-politica.test.ts`; la matriz HTTP (`test/matriz-rutas.ts`) y la de la web (`permisos.test.ts`) también.
- La pestaña "Historial" del file sale de la bitácora: Kardex ya no la ve. El Administrador mira ese historial en la
  bitácora filtrada por el file (`/bitacora?entidad=file_academico&entidadId=…`).
- La CI y los E2E contra la API real necesitan `SEED_ADMIN_CI` y `SEED_ADMIN_PASSWORD`: las cuentas E2E las crea el
  Administrador.
