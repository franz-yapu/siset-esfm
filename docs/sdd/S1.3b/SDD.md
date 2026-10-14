# SDD — S1.3b · Registrar los intentos de login con un CI inexistente

- **Ticket:** ClickUp **S1.3b** (`868mh2z11`, https://app.clickup.com/t/868mh2z11).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-13)
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/dudas.md` D-26 (respondida en la hoja el 2026-10-13: **sí**, por auditoría)
  2. `docs/decisions/LOG.md` — DEC-018 #2, DEC-012 #1 (el mismo 401 y el mismo tiempo para todo rechazo), DEC-011 #4 (eventos de acceso cerrados), DEC-013 #4 (rate limit)
  3. `docs/adr/0003-*.md` #3 (`usuario_id` nullable, previsto para esto)
  4. `docs/sdd/S1.3/SDD.md` §2.2, `docs/sdd/S1.2-S1.7/SDD.md` §2.4

---

## 1 · Alcance

### Entra

- Al recibir un login con un CI que no existe, se registra `LOGIN_FALLIDO` con `usuario_id` nulo.
- Una función nueva en `seguridad/eventos-acceso.ts`; el resto no cambia.

### No entra (a propósito)

- Contar intentos por CI inexistente o bloquear algo: no hay cuenta que bloquear. El rate limit por IP (DEC-013) ya frena a quien prueba CI al azar.
- Una tabla aparte: la escuela pidió "una tabla para este cometido", y la bitácora (`log_auditoria`) es esa tabla. Ya admite `usuario_id` nulo desde S0.11 (ADR-0003 #3), justamente para esto.

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                                     | Qué hay de verdad en el repo                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| La bitácora acepta eventos sin usuario                 | ✅ `log_auditoria.usuario_id` es nullable; `esquema.test.ts` lo prueba.                                                               |
| Las funciones de eventos exigen un usuario             | ✅ A propósito (DEC-011 #4, D-26 provisional). Se agrega una función específica para este caso, sin abrir las demás a `null`.         |
| La consulta de la bitácora muestra eventos sin usuario | ✅ S6.4 (#22) devuelve `usuario: null`.                                                                                               |
| No debe cambiar la respuesta ni el tiempo              | ✅ El flujo sigue comparando contra el hash ficticio (S1.3 §2.2); solo se agrega una inserción, igual que en los rechazos con cuenta. |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo      | Rol en este ticket | API pública       | Tablas propias que toca   |
| ----------- | ------------------ | ----------------- | ------------------------- |
| `seguridad` | dueño              | sin cambios       | —                         |
| `auditoria` | consumido          | `registrarEvento` | `log_auditoria` (inserta) |

### 2.1 El evento

```ts
// seguridad/eventos-acceso.ts
export type MotivoLoginFallido = 'PASSWORD_INCORRECTA' | 'CUENTA_BLOQUEADA' | 'CUENTA_INACTIVA' | 'CI_INEXISTENTE';

/** Intento con un CI que no existe (D-26): sin usuario; el CI intentado va en entidad_id. Nunca la contraseña. */
export const registrarLoginCiInexistente = (cliente: Cliente, ciIntentado: string) =>
  registrarEvento(cliente, {
    accion: 'LOGIN_FALLIDO',
    modulo: 'SEGURIDAD',
    entidad: 'usuario',
    entidadId: ciIntentado,
    usuarioId: null,
    despues: { motivo: 'CI_INEXISTENTE' },
  });
```

- **`usuarioId: null` explícito**: si no, `registrarEvento` tomaría el usuario del contexto (S0.7 §2.10).
- **El CI va en `entidad_id`**, ya normalizado por el esquema del login (sin espacios, en mayúsculas, máximo 40 caracteres). Así Kardex puede filtrar en la bitácora por `entidad=usuario` y ese CI (S6.4) y ver si alguien prueba su carnet antes de que exista la cuenta.
- **Sin transacción:** no hay ninguna operación que acompañar (S0.7 §2.10).

### 2.2 En el servicio del login

En `auth.servicio.ts`, en la rama `!u`, después de comparar contra el hash ficticio y antes de lanzar el 401: `await registrarLoginCiInexistente(bd, usuario)`.

**El volumen está acotado:** a lo sumo 10 eventos por minuto por IP, por el rate limit del login (DEC-013 #4). Un ataque desde muchas IP llenaría la bitácora más rápido, pero es exactamente lo que la escuela quiere ver. Las filas son chicas y los índices por fecha y módulo las cubren.

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                     | Cambio                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modulos/seguridad/eventos-acceso.ts` | + `CI_INEXISTENTE` en `MotivoLoginFallido` y `registrarLoginCiInexistente` (§2.1).                         |
| `apps/api/src/modulos/seguridad/auth.servicio.ts`  | La rama del CI inexistente registra el evento (§2.2).                                                      |
| `apps/api/test/bd/auth-login.test.ts`              | El caso "CI inexistente" pasa de "ningún evento" a "un evento sin usuario, con el CI y sin la contraseña". |
| `apps/api/test/bd/eventos-acceso.test.ts`          | + caso de `registrarLoginCiInexistente`, también dentro de un contexto con usuario (no lo toma).           |
| `docs/decisions/LOG.md`                            | Nota en DEC-018 #2: implementado en S1.3b.                                                                 |

---

## 4 · Plan de tests

| Caso                                                                                                                                                                                                             | Nivel          | Cubre     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------- |
| Login con un CI inexistente: el mismo 401 genérico, y un `LOGIN_FALLIDO` con `usuario_id` nulo, `entidad_id` = CI normalizado (`" 9999999-1a "` → `9999999-1A`) y `datos_despues = { motivo: 'CI_INEXISTENTE' }` | BD + Supertest | D-26      |
| Ninguna columna del evento contiene la contraseña enviada                                                                                                                                                        | BD + Supertest | RNF-01    |
| `registrarLoginCiInexistente` dentro de un contexto con usuario igual guarda `usuario_id` nulo                                                                                                                   | BD             | §2.1      |
| Los demás motivos y eventos no cambian (tests existentes en verde)                                                                                                                                               | BD             | Regresión |

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S1.3b/SDD.md`, Estado = Aprobado.
- [ ] Test: el login con un CI inexistente deja `LOGIN_FALLIDO` sin usuario, con el CI y sin la contraseña.
- [ ] Quality gate en verde.
- [ ] Commit `S1.3b …` en la rama `feat/S1.3b-intentos-ci-inexistente`.

---

## 6 · Riesgos

| Riesgo                                                                            | Gravedad | Mitigación                                                                                                                                                                                             |
| --------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alguien escribe la contraseña en el campo del CI por error y queda en la bitácora | Baja     | El campo del CI tiene como máximo 40 caracteres y se guarda solo lo escrito ahí. Si pasa, el usuario cambia su contraseña. Es el mismo riesgo que tienen los registros de acceso de cualquier sistema. |
| La bitácora crece con ataques de CI al azar                                       | Baja     | Rate limit de 10 por minuto por IP; es el registro que la escuela pidió.                                                                                                                               |

---

## 7 · Preguntas abiertas

Ninguna. Implementa la respuesta de D-26 (DEC-018 #2).
