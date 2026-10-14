# SDD — S1.12 · Inicio de Kardex con datos reales y sin cuentas de egresado

- **Ticket:** S1.12 (backlog 2026-10-12: "Paneles de inicio por rol"). Se crea en ClickUp al aprobar este SDD.
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-14
- **Fuentes de verdad citadas:**
  1. `docs/product/prototipo-pantallas.md` P-10..P-15 (inicios por rol)
  2. `docs/product/dudas.md` **D-08** (los egresados no tienen cuenta; su trámite es externo y el seguimiento es público)
  3. `docs/decisions/LOG.md` — DEC-015 #2 (EGRESADO sin permisos), DEC-022 (P2: el egresado de la demo se quita en S1.12), DEC-027, DEC-028 #2, DEC-029, DEC-031

---

## 1 · Alcance

### Entra

- **P-15 Inicio Kardex:** los indicadores y la lista "Requieren atención" de **files** salen de `filesService` (API o mock): total de files, bloqueados, en rojo; y en la lista, los files bloqueados y los que tienen un requisito observado.
- Con la API, los indicadores de trámites, pases e impresiones (S3.x–S5.x) **se ocultan**, igual que las secciones no conectadas de P-41 (DEC-028); los accesos rápidos muestran solo lo conectado (files, usuarios, bitácora). En la demo todo sigue como hoy.
- **Sin cuentas de egresado** (D-08): se quitan las 5 cuentas EGRESADO de la demo, la ruta `/egresado`, su inicio (P-11) y la opción de "Ver como". El rol sigue existiendo en la base y en la política, sin permisos (DEC-015 #2). El seguimiento público (`/seguimiento`) no cambia.

### No entra (a propósito)

- Los inicios de SEC_DIR, SEC_COORD y COORDINADOR: dependen de las hojas de ruta (S3.x).
- El inicio del estudiante: depende de "mi file" (S2.7).
- Los files de egresados (condición EGRESADO) siguen existiendo: lo que se quita es la **cuenta**.

### Premisas verificadas (de `task-brief`)

| Premisa                                           | Qué hay de verdad                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| "Inicios con KPI reales; conectar en cada sprint" | ⚠️ Los 6 leen mocks. Solo el de Kardex tiene datos conectables hoy (files); el resto espera S3.x y S2.7.                        |
| "Quitar el egresado de la demo" (DEC-022 P2)      | ✅ 5 cuentas EGRESADO en `mocks/usuarios.ts`, ruta `/egresado`, `InicioEgresado.tsx` y "Ver como". Los e2e de permisos lo usan. |

---

## 2 · Diseño técnico

### 2.1 Indicadores de files

Con `filesService.listar` y `porPagina: 1`, se lee solo el `total` de cada consulta (DEC-017): todos, `bloqueado=true` y `semaforo=ROJO`. Son 3 pedidos chicos en paralelo; no hace falta un endpoint de resumen para 152 files.

"Requieren atención": `listar({ semaforo: 'ROJO', porPagina: 20 })`. Cada fila dice "File bloqueado" (con su motivo) o "Requisito observado", según `bloqueado` (como la cabecera, S2.5). Con la demo se agregan, como hoy, los trámites observados hace más de 5 días.

### 2.2 Sin egresados

- `mocks/usuarios.ts`: se borran las 5 cuentas EGRESADO (sus files siguen).
- `App.tsx`: se quita `/egresado`. `config/permisos.ts`: el inicio del rol EGRESADO pasa a `/seguimiento` (por si alguna cuenta vieja entrara, no queda en una pantalla vacía).
- `pages/inicio/InicioEgresado.tsx` se borra. Los e2e que usaban al egresado (`USUARIOS_POR_ROL.EGRESADO`, el de S1.11 "el egresado solo ve Inicio y Mi perfil") se quitan o se cambian a "no hay cuenta de egresado".

---

## 3 · Cambios por archivo/módulo

| Archivo                                                                                              | Cambio                                          |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `apps/web/src/pages/inicio/InicioKardex.tsx`, `hooks/useFiles.ts`                                    | Indicadores y lista de files conectados (§2.1). |
| `apps/web/src/mocks/usuarios.ts`, `App.tsx`, `config/permisos.ts`, `pages/inicio/InicioEgresado.tsx` | Sin cuentas de egresado (§2.2).                 |
| `apps/web/e2e/{utilidades,permisos,recorrido}.spec.ts` y afines                                      | Sin el egresado; e2e del inicio de Kardex.      |
| `docs/decisions/LOG.md`                                                                              | DEC-032.                                        |

---

## 4 · Plan de tests

| Caso                                                                                                                     | Nivel |
| ------------------------------------------------------------------------------------------------------------------------ | ----- |
| Demo: el inicio de Kardex muestra el total de files, bloqueados y en rojo, y la lista de atención                        | E2E   |
| Modo API (`page.route`): los indicadores salen de `GET /files` con `bloqueado` y `semaforo`; no aparecen los de trámites | E2E   |
| No hay cuenta de egresado para entrar; "Ver como" no ofrece Egresado; `/egresado` no existe                              | E2E   |
| El recorrido de todos los roles sigue funcionando                                                                        | E2E   |

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S1.12/SDD.md`, Estado = Aprobado; ticket S1.12 en ClickUp.
- [ ] Inicio de Kardex con files de la API; demo intacta.
- [ ] Sin cuentas de egresado en la demo.
- [ ] DEC-032; tests del §4 y quality gate en verde.
- [ ] Commit `S1.12 …` en `feat/S1.12-inicio-kardex`.

---

## 6 · Riesgos

| Riesgo                                                                  | Gravedad | Mitigación                                                                   |
| ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| La escuela quería ver el inicio del egresado en la demo                 | Baja     | D-08 lo descarta; el seguimiento público muestra lo mismo sin cuenta.        |
| Casi todos los files salen amarillos y la lista de atención queda corta | Baja     | Es la regla provisional (D-31); la lista muestra solo rojos, que es lo útil. |

---

## 7 · Preguntas abiertas

- **Para la escuela:** ninguna nueva.
- **DEC-032 (va a `LOG.md`):**
  1. El inicio de Kardex lee los files de `filesService` (total, bloqueados, en rojo; lista de rojos). Con la API oculta los indicadores de trámites, pases e impresiones hasta S3.x–S5.x.
  2. La demo ya no tiene cuentas de egresado ni la ruta `/egresado` (D-08); el rol queda sin permisos y su inicio apunta a `/seguimiento`.
