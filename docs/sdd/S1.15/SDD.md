# SDD — S1.15 · Refresh tolerante a una recarga en vuelo

- **Ticket:** ClickUp **S1.15** (`868mhch6a`, https://app.clickup.com/t/868mhch6a).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-14
- **Fuentes de verdad citadas:**
  1. `docs/decisions/LOG.md` — DEC-014 #3 (reuso → revocar todas las sesiones + `REUSO_SESION`), DEC-021 #4 (la web hace un solo refresh a la vez), DEC-025 #6 (el hallazgo)
  2. `docs/do-not-touch.md` (tokens de auth: ADR + pruebas negativas por rol)
  3. `docs/sdd/S1.5/SDD.md` §2.2 (rotación y reuso), `docs/sdd/S1.14/SDD.md` v1.1 (matriz HTTP y E2E `api-real`)
  4. `apps/api/src/modulos/seguridad/auth.servicio.ts` (`refrescar`, `revocarPorReuso`), `refresh-token.repositorio.ts`

---

## 1 · Alcance

### El problema

Si el navegador recarga o navega mientras un `POST /auth/refresh` está en vuelo, la API puede alcanzar a rotar el
token (revoca el viejo y crea el sucesor) sin que el navegador llegue a guardar la cookie nueva. La siguiente carga
manda la cookie vieja, ya revocada; por DEC-014 #3 eso es reuso: se revocan **todas** las sesiones del usuario y se
registra `REUSO_SESION`. A un usuario le pasa si aprieta F5 dos veces seguidas. En las corridas E2E de S1.14 que
recargaban sin esperar aparecieron 14 `REUSO_SESION`; con las pruebas esperando a que la sesión cargue, 0.

### Entra

- Una **ventana de gracia** de `SEG_GRACIA_REFRESH` segundos (10, en `parametro`) para un token revocado **por
  rotación** cuyo sucesor **todavía no se usó**: no es reuso; se revoca el sucesor sin usar y se emite uno nuevo
  para la misma sesión.
- La columna `refresh_token.reemplazado_por_id` para saber por qué se revocó un token y cuál es su sucesor.
- ADR-0004 (lo exige `do-not-touch.md`) y DEC-026, que reemplaza DEC-014 #3.

### No entra

- Cambios en la web: S1.10 ya hace un solo refresh a la vez; esto cubre lo que la web no puede evitar (que el
  navegador corte la respuesta).
- Un token revocado por logout, cambio de contraseña, baja o reuso sigue siendo reuso, igual que hoy.
- La inactividad controlada por la API (S2.16).

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                                | Qué hay de verdad en el repo                                                                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "La API toma la cookie vieja como reuso"          | ✅ `auth.servicio.ts:171`: todo token revocado va a `revocarPorReuso`. DEC-014 #3 lo decidió así, incluida "la carrera de dos refresh simultáneos": el cambio reemplaza ese punto con una DEC nueva. |
| "Revocado por rotación y con el sucesor sin usar" | ❌ `refresh_token` no guarda el sucesor ni el motivo de la revocación. Migración nueva: `reemplazado_por_id`.                                                                                        |
| "Ventana en `parametro`"                          | ✅ La tabla existe y los parámetros se siembran en la migración (`MAX_INTENTOS_LOGIN`). Se agrega `SEG_GRACIA_REFRESH` y se suma a `ClaveParametro`.                                                 |
| "Basta con tocar el refresh"                      | ⚠️ `do-not-touch.md` protege los tokens de auth: hace falta un **ADR** y la matriz de pruebas negativas por rol, que ya existe desde S1.14 y tiene que seguir en verde.                              |

---

## 2 · Diseño técnico

### 2.1 Datos

```sql
ALTER TABLE "refresh_token" ADD COLUMN "reemplazado_por_id" INTEGER;
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_reemplazado_por_id_fkey"
  FOREIGN KEY ("reemplazado_por_id") REFERENCES "refresh_token"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
INSERT INTO "parametro" ("clave", "valor", "descripcion", "updated_at") VALUES
  ('SEG_GRACIA_REFRESH', '10', 'Segundos en que un refresh recién rotado y sin usar todavía se acepta', now());
```

- `reemplazado_por_id` **no nulo** ⇔ el token se revocó **por rotación**. Logout, cambio de contraseña, baja y
  reuso lo dejan nulo: así un token revocado por cualquier otro motivo nunca entra en la gracia.
- Sin índice: solo se lee por la fila ya encontrada por `token_hash`.

### 2.2 Rotación normal (cambia el orden, no el resultado)

Dentro de la transacción de hoy: (1) revocar el viejo de forma atómica (`revocado_en IS NULL`); (2) emitir el
sucesor; (3) `viejo.reemplazado_por_id = sucesor.id`. `crearRefreshToken` pasa a devolver el `id` (ya lo hace) y
`emitirSesion` lo expone al llamador.

### 2.3 Gracia

Llega un refresh con un token **revocado**. Es gracia si se cumplen las tres:

1. `reemplazado_por_id` no es nulo (se revocó por rotación);
2. `ahora - revocado_en ≤ SEG_GRACIA_REFRESH` segundos;
3. el sucesor sigue **sin revocar** (nadie lo usó).

En la gracia, en una transacción: revocar el sucesor de forma atómica, emitir un token nuevo con el **mismo
`expira_en`** del original (la sesión nunca pasa de 8 h, DEC-014 #2), y apuntar **el viejo y el sucesor** al nuevo
(`reemplazado_por_id = nuevo.id`). Apuntar también el viejo hace que una tercera recarga rápida con la misma cookie
vieja vuelva a encontrar un sucesor sin usar: la ventana se sigue midiendo desde la revocación del viejo, así que la
cadena nunca se estira más allá de 10 s. No se registra evento (el refresh normal tampoco lo registra); se deja una
línea `info` en el log de pino con el usuario.

Si la revocación atómica del sucesor pierde la carrera (otra petición lo revocó en el mismo instante), se vuelve a
leer el token viejo **una sola vez** y se reevalúa: si ahora apunta a un sucesor sin usar dentro de la ventana, es
gracia; si no, reuso.

Fuera de esas condiciones, todo sigue igual: `revocarPorReuso` (DEC-014 #3).

**Usuario dado de baja:** se revisa antes que la gracia, igual que hoy en el camino normal (inactivo → revoca todo,
401).

### 2.4 Por qué así

- **Es la técnica estándar** ("reuse interval" de los proveedores de identidad): la rotación sigue detectando el
  robo, salvo en una ventana de segundos y solo si el sucesor no se usó.
- **Qué se cede:** un atacante con la cookie robada que la use dentro de los 10 s siguientes a una rotación
  legítima, y antes de que el usuario use su sucesor, obtiene una sesión sin disparar el reuso. Pero el usuario
  legítimo, al usar después su sucesor (ya revocado por la gracia, y sin un sucesor sin usar), dispara el reuso y
  corta al atacante. El riesgo queda acotado a 10 s y es detectable.
- **Por qué no en la web:** la web ya hace un solo refresh por pestaña y entre pestañas (DEC-021 #4). Que el
  navegador corte una respuesta al recargar no lo controla la página.

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                                    | Cambio                                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `apps/api/prisma/schema/seguridad.prisma`                         | `RefreshToken.reemplazadoPorId Int?` con la relación propia (`onDelete: SetNull`).                                 |
| `apps/api/prisma/migrations/<fecha>_refresh_gracia/migration.sql` | **Nueva** (§2.1).                                                                                                  |
| `apps/api/src/modulos/catalogos/parametro.repositorio.ts`         | `ClaveParametro` + `'SEG_GRACIA_REFRESH'`.                                                                         |
| `apps/api/src/modulos/seguridad/refresh-token.repositorio.ts`     | `buscarRefreshTokenPorHash` devuelve también `reemplazadoPorId`; + `marcarReemplazo(tx, ids[], nuevoId)`.          |
| `apps/api/src/modulos/seguridad/auth.servicio.ts`                 | `emitirSesion` devuelve el id del refresh nuevo; `refrescar` con la gracia (§2.3); la rotación marca el reemplazo. |
| `apps/api/test/bd/auth-refresh.test.ts`                           | Casos del §4.                                                                                                      |
| `apps/web/e2e/api-real/sesion.spec.ts`                            | E10 (§4).                                                                                                          |
| `docs/adr/0004-refresh-con-gracia.md`                             | **Nuevo** (enmienda la rotación de S1.5 dentro de lo protegido por `do-not-touch.md`).                             |
| `docs/decisions/LOG.md`                                           | DEC-026; DEC-014 #3 queda marcado como reemplazado por DEC-026.                                                    |

---

## 4 · Plan de tests

| Caso                                                                                                                                                 | Nivel          | Cubre        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------ |
| Rotación normal: el viejo queda con `reemplazado_por_id` = sucesor                                                                                   | BD + Supertest | §2.2         |
| Refresh, se "pierde" la respuesta, refresh con el viejo dentro de la ventana → 200, el sucesor queda revocado, sin `REUSO_SESION`, mismo `expira_en` | BD + Supertest | §2.3         |
| Tercera vez con el mismo viejo dentro de la ventana → 200 otra vez                                                                                   | BD + Supertest | §2.3         |
| Viejo fuera de la ventana (revocado hace 11 s) → 401 y reuso: todas las sesiones revocadas + `REUSO_SESION`                                          | BD + Supertest | DEC-014 #3   |
| El sucesor ya se usó y llega el viejo → reuso                                                                                                        | BD + Supertest | §2.4         |
| Token revocado por logout o por cambio de contraseña → reuso, aunque esté dentro de la ventana                                                       | BD + Supertest | §2.1         |
| Dos refresh simultáneos con el mismo token → los dos 200, ningún `REUSO_SESION`                                                                      | BD + Supertest | §2.3         |
| Usuario dado de baja con un viejo dentro de la ventana → 401 y sesiones revocadas                                                                    | BD + Supertest | §2.3         |
| Matriz HTTP de S1.14 y el resto de `auth-*` siguen en verde                                                                                          | Supertest      | do-not-touch |
| E10 (`api-real`): recargar dos veces seguidas sin esperar → sigue con sesión y no aparece `REUSO_SESION` en la bitácora                              | E2E            | el bug       |

No se prueba la ventana con relojes reales de 10 s: el servicio ya recibe `ahora` inyectable; los tests de "fuera de
la ventana" mueven `revocado_en` en la base.

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S1.15/SDD.md`, Estado = Aprobado.
- [ ] ADR-0004 y DEC-026 escritos; DEC-014 #3 marcado como reemplazado.
- [ ] Recargar dos veces seguidas no cierra la sesión ni registra `REUSO_SESION` (E10 en verde).
- [ ] El reuso real se sigue detectando (casos del §4).
- [ ] Matriz HTTP de S1.14 en verde (pruebas negativas por rol, `do-not-touch.md`).
- [ ] Quality gate en verde: `calidad`, `base-de-datos`, `e2e`, `docker`.
- [ ] Commit `S1.15 …` en `feat/S1.15-refresh-tolerante`.

---

## 6 · Riesgos

| Riesgo                                                       | Gravedad | Mitigación                                                                                               |
| ------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------- |
| Un atacante con la cookie robada la usa dentro de la ventana | Baja     | Solo 10 s y solo si el sucesor no se usó; cuando el usuario legítimo use el suyo, salta el reuso (§2.4). |
| Una cadena de gracias estira la sesión                       | Nula     | La ventana se mide desde la revocación del token original y el `expira_en` se hereda: nunca pasa de 8 h. |
| La migración toca una tabla protegida                        | Baja     | Solo agrega una columna nula y una fila de `parametro`; sin reescritura de datos. ADR-0004.              |

---

## 7 · Preguntas abiertas

- **Para la escuela:** ninguna; es técnica.
- **DEC-026 (va a `LOG.md`):**
  1. Reemplaza DEC-014 #3: un refresh con un token revocado **por rotación** hace ≤ `SEG_GRACIA_REFRESH` s (10) y
     cuyo sucesor no se usó **no es reuso**: se revoca el sucesor y se emite uno nuevo con el mismo vencimiento.
  2. Fuera de eso, el reuso sigue igual: todas las sesiones revocadas y `REUSO_SESION`.
  3. `refresh_token.reemplazado_por_id` marca la revocación por rotación.
