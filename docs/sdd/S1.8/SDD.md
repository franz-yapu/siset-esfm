# SDD — S1.8 · API de usuarios

- **Ticket:** ClickUp **S1.8** (`868mh1kw5`, https://app.clickup.com/t/868mh1kw5).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-14)
- **Versión:** 1.2 · **Fecha:** 2026-10-14
  - 1.1: la decisión pasa a DEC-020 porque DEC-019 registró las repreguntas; D-14b confirmó que Kardex restablece.
  - 1.2 (al implementar): el listado se ordena en memoria (el apellido vive en `personas`); la regla del último
    KARDEX usa `pg_advisory_xact_lock` desde el principio en vez de dejarlo para después; una edición sin cambios
    reales responde 200 sin evento; la sede inexistente se detecta por la FK (P2003).
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` RF-03 (CA1 crea, edita, da de baja y reactiva; CA2 baja lógica; CA3 CI único; CA4 el reseteo obliga a cambiar la contraseña)
  2. `docs/decisions/LOG.md` — DEC-007 (evento con antes y después), DEC-009 (piloto solo con el personal), DEC-011 (política de contraseña, eventos de acceso), DEC-014 (revocar sesiones), DEC-015 (política: `KARDEX, usuarios, crear/leer/editar`), DEC-017 (paginación), DEC-018 (D-08: egresados sin cuenta)
  3. `docs/product/dudas.md` D-14 / D-14b (quién restablece la contraseña: provisional Kardex), D-24 (una sede por persona del personal), D-25 (CI como usuario), D-27 (Kardex administra)
  4. `docs/adr/0001-monolito-modular.md` (transacción entre módulos con `tx`), `docs/adr/0002-autorizacion-casbin.md`
  5. `docs/sdd/S0.11/SDD.md` §2.4 (`username` = CI o CI-complemento), `docs/sdd/S1.6/SDD.md`, `docs/sdd/S6.4/SDD.md` §2.2
  6. `apps/web/src/services/usuarios.service.ts` (lo que hace hoy el prototipo en P-46/P-47)

---

## 1 · Alcance

### Entra

`/api/v1/usuarios`, solo para KARDEX:

- **Crear** persona + usuario en una sola transacción entre `personas` y `seguridad`, con una **contraseña temporal generada** que se devuelve una sola vez.
- **Listar** paginado y filtrado (texto en CI o nombre, rol, sede, estado). **Ver uno.**
- **Editar** los datos personales, el rol y la sede.
- **Dar de baja** (lógica) y **reactivar**.
- **Restablecer la contraseña** (nueva temporal, obliga a cambiarla) y **desbloquear**.
- Un evento en la bitácora por cada escritura, con antes y después (DEC-007).

### No entra (a propósito)

- **Cuentas de estudiantes** → con el file (S2.x) y la doble verificación (S2.15). Esta API crea solo cuentas del **personal**: `SEC_DIR`, `SEC_COORD`, `COORDINADOR` y `KARDEX` (DEC-009: el piloto es con el personal). `EGRESADO` nunca tiene cuenta (D-08).
- La pantalla de usuarios conectada → S1.13.
- Envío de la contraseña por correo → depende de D-14b; hoy Kardex se la entrega a la persona.

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                                                       | Qué hay de verdad en el repo                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Crear persona + usuario en una transacción entre módulos, pasando `tx`" | ✅ ADR-0001 lo prevé. `personas` hoy solo lee nombres: se le agregan `buscarPersonaPorCi`, `crearPersona`, `actualizarPersona` y `buscarIdsPorNombre`, y la raíz de composición se los pasa a `seguridad` (mismo patrón que `nombreDe` en S1.3).                                                              |
| "Resetear contraseña"                                                    | ⚠️ El ticket no dice **quién elige la nueva**. El prototipo usa una contraseña fija de demo. Se decide: **el sistema genera una temporal** que cumple la política, se muestra una sola vez a Kardex y obliga a cambiarla (§2.3). Así nadie tiene que inventar ni dictar contraseñas, y nunca hay dos iguales. |
| "Desbloquear"                                                            | ⚠️ No hay acción de bitácora para eso. Se agrega **`DESBLOQUEAR_CUENTA`** a la lista cerrada (S0.7 prevé ampliarla con un PR, como `REUSO_SESION`).                                                                                                                                                           |
| "Búsqueda paginada por CI, nombre, rol, sede"                            | ⚠️ El nombre está en `persona` (módulo `personas`) y `seguridad` no puede leer esa tabla. `personas.buscarIdsPorNombre(texto)` devuelve los ids de las personas, y `seguridad` filtra con ellos. Paginación de DEC-017.                                                                                       |
| "Solo KARDEX (política Casbin)"                                          | ✅ `autorizar('usuarios', 'leer' / 'crear' / 'editar')` (S1.6).                                                                                                                                                                                                                                               |
| "Nunca se devuelve `password_hash`"                                      | ✅ La respuesta se arma con un `select` explícito; un test revisa que el hash no aparezca en ninguna respuesta.                                                                                                                                                                                               |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo      | Rol en este ticket | API pública que agrega (`index.ts`)                                                                | Tablas propias que toca                           |
| ----------- | ------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `seguridad` | dueño              | `crearModuloUsuarios`                                                                              | `usuario` (crea, edita), `refresh_token` (revoca) |
| `personas`  | consumido          | `buscarPersonaPorCi`, `crearPersona`, `actualizarPersona`, `buscarIdsPorNombre`, `obtenerPersonas` | `persona` (crea, edita)                           |
| `auditoria` | consumido          | `registrarEvento`; + `DESBLOQUEAR_CUENTA`                                                          | `log_auditoria`                                   |

### 2.1 Rutas

Todas con `autenticar` + `autorizar(...)` (S1.6). `:id` es el id del usuario.

| Método y ruta                             | Permiso             | Qué hace                                                                                             | Evento                 |
| ----------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------- |
| `GET /usuarios`                           | `usuarios`/`leer`   | Lista paginada con filtros                                                                           | —                      |
| `GET /usuarios/:id`                       | `usuarios`/`leer`   | Uno                                                                                                  | —                      |
| `POST /usuarios`                          | `usuarios`/`crear`  | Crea persona + usuario; responde 201 con el usuario y `passwordTemporal`                             | `CREAR`                |
| `PATCH /usuarios/:id`                     | `usuarios`/`editar` | Edita datos personales, rol o sede                                                                   | `EDITAR`               |
| `POST /usuarios/:id/baja`                 | `usuarios`/`editar` | `activo = false` y revoca sus sesiones                                                               | `DAR_DE_BAJA`          |
| `POST /usuarios/:id/reactivar`            | `usuarios`/`editar` | `activo = true`                                                                                      | `REACTIVAR`            |
| `POST /usuarios/:id/restablecer-password` | `usuarios`/`editar` | Temporal nueva, obliga a cambiarla, limpia el bloqueo y revoca sesiones; responde `passwordTemporal` | `RESTABLECER_PASSWORD` |
| `POST /usuarios/:id/desbloquear`          | `usuarios`/`editar` | `bloqueado_hasta = null`, `intentos_fallidos = 0`                                                    | `DESBLOQUEAR_CUENTA`   |

Las acciones de estado son `POST` con un verbo y no un `PATCH { activo }`: cada una tiene su evento, sus reglas y su respuesta, y así quedan explícitas en OpenAPI.

### 2.2 Contratos

**Usuario en las respuestas** (`UsuarioDetalle`, nunca con `password_hash`):

```jsonc
{
  "id": 4,
  "usuario": "4567890-1B",
  "ci": "4567890",
  "complemento": "1B",
  "nombres": "Rosa",
  "apellidoPaterno": "Quispe",
  "apellidoMaterno": null,
  "nombre": "Rosa Quispe",
  "email": null,
  "celular": "71234567",
  "rol": "SEC_COORD",
  "sedeId": 2,
  "activo": true,
  "estado": "ACTIVO", // ACTIVO | INACTIVO | BLOQUEADO (como el prototipo)
  "bloqueadoHasta": null,
  "debeCambiarPassword": true,
  "ultimoAcceso": null,
}
```

**Crear** (`POST /usuarios`):

```jsonc
{
  "ci": "4567890",
  "complemento": "1b",
  "nombres": "Rosa",
  "apellidoPaterno": "Quispe",
  "apellidoMaterno": null,
  "email": null,
  "celular": "71234567",
  "rol": "SEC_COORD",
  "sedeId": 2,
}
// 201 → { "usuario": UsuarioDetalle, "passwordTemporal": "k7#Qm2…" }
```

Validación (Zod), con los largos de la tabla:

- `ci`: 4 a 15 dígitos.
- `complemento`: hasta 5 letras o dígitos, en mayúsculas; vacío si no tiene.
- `nombres`: obligatorio, hasta 80 caracteres. Apellidos: hasta 60 cada uno, y al menos uno (como el `CHECK` de la tabla).
- `email`: con formato válido, hasta 120. `celular`: hasta 20.
- `rol`: uno de los 4 del personal. `sedeId`: entero, **obligatorio** para el personal (D-24).

**Editar** (`PATCH /usuarios/:id`): los mismos campos salvo `ci` y `complemento`, todos opcionales, y al menos uno presente. **El CI no se edita**, porque es el nombre de usuario (D-25) y la clave de la persona. Si Kardex se equivoca al escribirlo, da de baja la cuenta y crea otra. Así un error no cambia en silencio la identidad de alguien que ya tiene historial en la bitácora.

**Listar** (`GET /usuarios`): `texto` (busca en el CI y en el nombre, sin distinguir mayúsculas), `rol`, `sedeId`, `estado`, más `pagina`/`porPagina` (DEC-017). Orden: apellido paterno y nombres.

**Errores:**

| Caso                                                                                       | Respuesta                                                                                                               |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Ya existe un usuario con ese CI y complemento                                              | 409 `USUARIO_EXISTENTE`                                                                                                 |
| El CI ya es de una persona sin cuenta (por ejemplo, alguien con file)                      | Se reutiliza esa persona **sin cambiar sus datos**, y la respuesta trae los datos guardados. Así no se duplica a nadie. |
| `rol` `ESTUDIANTE` o `EGRESADO`                                                            | 400 `VALIDACION` (§1, "No entra")                                                                                       |
| `sedeId` que no existe                                                                     | 422 `SEDE_INEXISTENTE`                                                                                                  |
| Usuario `:id` que no existe                                                                | 404 `NO_ENCONTRADO`                                                                                                     |
| Darse de baja a sí mismo o quitarse el rol KARDEX                                          | 422 `OPERACION_SOBRE_SI_MISMO`                                                                                          |
| Dejar al sistema sin ningún KARDEX activo (baja o cambio de rol del último)                | 422 `ULTIMO_KARDEX`                                                                                                     |
| Baja de alguien ya inactivo, reactivar a alguien activo, desbloquear a alguien sin bloqueo | 422 `ESTADO_SIN_CAMBIO`                                                                                                 |

Las dos reglas sobre Kardex existen para que nadie deje el sistema sin administrador (D-27). El prototipo ya impedía darse de baja a sí mismo.

### 2.3 Contraseña temporal

- La genera `generarPasswordTemporal()`: 12 caracteres con `randomInt` de `node:crypto`, al menos una minúscula, una mayúscula, un dígito y un símbolo de `#$%&*+-=?@`, sin caracteres que se confunden al dictarlos (`0/O`, `1/l/I`). Siempre cumple `esquemaPassword` (DEC-011), y un test lo verifica sobre 200 generadas.
- Se guarda solo su hash (bcrypt, S1.2), con `debe_cambiar_password = true`. El usuario la cambia en su primer ingreso: S1.5 lo permite y S1.6 bloquea todo lo demás.
- **Se devuelve una sola vez**, en la respuesta del `POST`. No se guarda en claro en ningún lado, ni en la bitácora ni en el log: el campo se llama `password…`, y la redacción de S0.7 lo tapa.
- Restablecer: genera otra, `debe_cambiar_password = true`, limpia el bloqueo, **revoca todas las sesiones** (si alguien se la había robado, pierde el acceso) y registra `RESTABLECER_PASSWORD` con `registrarRestablecimientoPassword` (S1.7): el autor es Kardex y el afectado va en `entidad_id`.

### 2.4 Transacción entre módulos

```ts
// app.ts (raíz de composición)
crearModuloUsuarios({
  bd,
  autenticar,
  autorizar,
  personas: { buscarPersonaPorCi, crearPersona, actualizarPersona, buscarIdsPorNombre, obtenerPersonas },
});
```

Crear, todo dentro de `bd.$transaction(async (tx) => …)`:

1. `personas.buscarPersonaPorCi(tx, ci, complemento)` → si tiene usuario, 409; si no existe, `personas.crearPersona(tx, datos)`.
2. `usuario.create` con `username = usernameDe(ci, complemento)` (la misma función del seed), el hash de la temporal y `debe_cambiar_password = true`.
3. `registrarEvento(tx, { accion: 'CREAR', modulo: 'SEGURIDAD', entidad: 'usuario', entidadId, despues })` con los datos creados, sin contraseña.

Si cualquier paso falla, no queda ni la persona, ni el usuario, ni el evento.

**Bitácora con antes y después** (DEC-007): `EDITAR` guarda solo los campos que cambiaron (`antes: { rol: 'SEC_COORD' }`, `despues: { rol: 'SEC_DIR' }`). `DAR_DE_BAJA`, `REACTIVAR` y `DESBLOQUEAR_CUENTA` guardan el campo que cambia (`activo`, o `bloqueadoHasta` + `intentosFallidos`). El autor siempre es el Kardex de la sesión (contexto, S1.5).

### 2.5 Estado

`estado` se calcula en la respuesta: `INACTIVO` si `!activo`; si no, `BLOQUEADO` si `bloqueado_hasta > ahora`; si no, `ACTIVO`. El filtro `estado` usa la misma regla en el `where`.

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                                                            | Cambio                                                                                                                  |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modulos/personas/persona.repositorio.ts`, `index.ts`                        | + `buscarPersonaPorCi`, `crearPersona`, `actualizarPersona`, `buscarIdsPorNombre`, `obtenerPersonas`.                   |
| `apps/api/src/modulos/seguridad/usuarios.{esquemas,rutas,controlador,servicio,modulo}.ts` | **Nuevos** (§2).                                                                                                        |
| `apps/api/src/modulos/seguridad/usuario.repositorio.ts`                                   | + crear, actualizar, listar paginado, contar KARDEX activos, desbloquear.                                               |
| `apps/api/src/modulos/seguridad/password-temporal.ts`                                     | **Nuevo** (§2.3).                                                                                                       |
| `apps/api/src/modulos/seguridad/eventos-acceso.ts`                                        | + `registrarDesbloqueo`.                                                                                                |
| `apps/api/src/modulos/auditoria/auditoria.esquemas.ts`                                    | + `DESBLOQUEAR_CUENTA`.                                                                                                 |
| `apps/api/src/modulos/seguridad/index.ts`                                                 | + `crearModuloUsuarios`, `usernameDe` (lo usa el seed; se mueve de `prisma/semilla.ts` al módulo y el seed lo importa). |
| `apps/api/src/app.ts`                                                                     | Monta el módulo con las funciones de `personas`.                                                                        |
| `apps/api/test/bd/usuarios-*.test.ts`                                                     | **Nuevos** (§4).                                                                                                        |
| `apps/api/test/seguridad-password-temporal.test.ts`                                       | **Nuevo**.                                                                                                              |
| `docs/decisions/LOG.md`                                                                   | DEC-020 (§7).                                                                                                           |

---

## 4 · Plan de tests

| Caso                                                                                                                                                                                                         | Nivel          | Cubre           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | --------------- |
| Crear: 201 con el usuario y `passwordTemporal`; persona y usuario en la base; `username` = `CI-COMPLEMENTO` en mayúsculas; `debe_cambiar_password`; la temporal entra por login y obliga a cambiarla (`cpw`) | BD + Supertest | RF-03 CA1, §2.3 |
| Crear deja `CREAR` en la bitácora con el autor Kardex y sin ninguna contraseña ni hash                                                                                                                       | BD + Supertest | DEC-007         |
| CI duplicado → 409; CI de una persona sin cuenta → se reutiliza la persona sin tocar sus datos                                                                                                               | BD + Supertest | RF-03 CA3, §2.2 |
| Si falla la creación del usuario, no queda la persona ni el evento (transacción entre módulos)                                                                                                               | BD             | ADR-0001        |
| Validaciones: rol `ESTUDIANTE`/`EGRESADO`, sin sede, sede inexistente, sin apellidos, CI con letras → 400/422                                                                                                | BD + Supertest | §2.2            |
| Listar: paginación, `texto` por CI y por nombre (sin distinguir mayúsculas), `rol`, `sedeId`, `estado` (ACTIVO/INACTIVO/BLOQUEADO)                                                                           | BD + Supertest | §2.2            |
| Ver uno; id inexistente → 404                                                                                                                                                                                | BD + Supertest |                 |
| Editar: solo cambia lo enviado; `EDITAR` con antes y después de esos campos; cuerpo vacío o con `ci` → 400                                                                                                   | BD + Supertest | DEC-007         |
| Baja: `activo = false`, sesiones revocadas (el refresh da 401), `DAR_DE_BAJA`; reactivar: `REACTIVAR`; repetir → 422 `ESTADO_SIN_CAMBIO`                                                                     | BD + Supertest | RF-03 CA2       |
| Kardex no puede darse de baja ni quitarse el rol; no se puede dar de baja al último KARDEX activo → 422                                                                                                      | BD + Supertest | D-27            |
| Restablecer: temporal nueva que entra, la vieja ya no; `cpw`; bloqueo limpio; sesiones revocadas; `RESTABLECER_PASSWORD` con Kardex como autor y el afectado en `entidad_id`                                 | BD + Supertest | RF-03 CA4       |
| Desbloquear: limpia `bloqueado_hasta` e intentos; `DESBLOQUEAR_CUENTA`; sin bloqueo → 422                                                                                                                    | BD + Supertest | S1.4            |
| Ninguna respuesta de `/usuarios` contiene `passwordHash` ni `password_hash`                                                                                                                                  | BD + Supertest | DoD             |
| SEC_DIR en cada ruta → 403; sin token → 401; KARDEX con `cpw` → 403                                                                                                                                          | BD + Supertest | S1.6            |
| `generarPasswordTemporal`: 200 contraseñas cumplen `esquemaPassword`, tienen 12 caracteres, sin ambiguos, y no se repiten                                                                                    | Unit           | §2.3            |
| OpenAPI documenta las 8 rutas                                                                                                                                                                                | Supertest      |                 |

---

## 5 · Definition of Done

- [x] SDD en `docs/sdd/S1.8/SDD.md`, Estado = Aprobado.
- [x] Tests de cada operación, permisos y eventos (§4).
- [x] Nunca se devuelve `password_hash`; la temporal solo en la respuesta de crear y de restablecer.
- [x] Cada escritura con su evento en la misma transacción (DEC-007).
- [x] DEC-020 en `LOG.md`.
- [x] Quality gate en verde.
- [ ] Commit `S1.8 …` en la rama `feat/S1.8-api-usuarios`.

---

## 6 · Riesgos

| Riesgo                                                                       | Gravedad          | Mitigación                                                                                                                                                          |
| ---------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kardex pierde la temporal antes de entregarla                                | Baja              | La restablece otra vez: cada restablecimiento genera una nueva.                                                                                                     |
| La temporal queda en algún log (proxy, navegador)                            | Baja              | Solo viaja en la respuesta por HTTPS. El logger de la API no registra cuerpos de respuesta, y la redacción tapa `password*`. Además se cambia en el primer ingreso. |
| Dos Kardex se dan de baja mutuamente a la vez y el sistema queda sin ninguno | Muy baja          | La regla del último KARDEX se verifica dentro de la transacción. Si hiciera falta más, se agrega un bloqueo de fila.                                                |
| Buscar por nombre con muchas personas es lento (ids por `IN`)                | Baja en el piloto | El personal son decenas de personas. Si crece, se pasa a una vista de lectura con un ADR.                                                                           |

---

## 7 · Preguntas abiertas

- **Para la escuela:** nada nuevo. D-14b (quién restablece la contraseña) ya está repreguntada; mientras tanto la restablece Kardex, que es la propuesta provisional.
- **DEC-020 (va a `LOG.md`):**
  1. La API de usuarios crea solo cuentas del personal; las de estudiantes llegan con el file y la doble verificación.
  2. El sistema genera la contraseña temporal (12 caracteres, política DEC-011) y la muestra una sola vez; restablecer revoca las sesiones.
  3. El CI no se edita.
  4. Kardex no puede darse de baja ni quitarse el rol, y no se puede dejar al sistema sin un KARDEX activo.
  5. Acción nueva `DESBLOQUEAR_CUENTA`.
  6. Si el CI ya es de una persona sin cuenta, se reutiliza esa persona.
