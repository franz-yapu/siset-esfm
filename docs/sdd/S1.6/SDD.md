# SDD — S1.6 · Autorización con Casbin, "solo lo propio" y sede

- **Ticket:** ClickUp **S1.6** (`868mh1kw0`, https://app.clickup.com/t/868mh1kw0).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-13)
- **Versión:** 1.1 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` §2 (roles y **matriz RBAC**), RF-02 (CA1 menú por rol, CA2 403 por URL directa, CA3 "propio" en el backend), RF-03
  2. `docs/adr/0002-autorizacion-casbin.md` (Casbin, modelo RBAC simple, política versionada, pruebas obligatorias)
  3. `docs/do-not-touch.md` (auth y RBAC: ADR + pruebas negativas por rol)
  4. `docs/decisions/LOG.md` — DEC-007, DEC-012 (`cpw` en el token), DEC-014 (`autenticar`)
  5. `docs/product/dudas.md` D-16 (quién valida la matriz), D-24 (sede del personal), D-27 (administrador = Kardex, provisional)
  6. `apps/web/src/config/permisos.ts` (`MENU`, `PERMISOS_RUTA` del prototipo)
  7. `docs/sdd/S1.5/SDD.md` §2.4 (`autenticar`, `sesionDe`)

---

## 1 · Alcance

### Entra

- Middleware **`autorizar(recurso, accion)`** con Casbin, que responde 403 en el formato único (RF-02 CA2).
- **Política inicial** tomada de la matriz RBAC del PRD §2, versionada en el repo.
- **Cambio de contraseña obligatorio:** con `cpw: true` en el token, `autorizar` responde 403 `CAMBIO_PASSWORD_REQUERIDO` en todas las rutas protegidas. El cambio de contraseña, el refresh y el logout no pasan por `autorizar`.
- `GET /api/v1/auth/mis-permisos`: los permisos del rol de la sesión, para que la web arme el menú desde la misma política (ADR-0002; la web lo usa en S1.11).
- Ayudas para "propio" y sede en `src/compartido/autorizacion.ts`, que usan los servicios.
- Override `csv-parse ^7.0.2` (ADR-0002) para que `npm audit` siga limpio.

### No entra (a propósito)

- Proteger endpoints de negocio: todavía no existen. Cada ticket que cree uno (S1.8 usuarios, S2.2 files, S6.4 bitácora) agrega `autenticar` + `autorizar` y su prueba de 403.
- Menú y rutas de la web derivados de la política → S1.11.
- Validar la matriz con la escuela → D-16. Se parte de la del PRD, como dice ADR-0002.

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                                   | Qué hay de verdad en el repo                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crear el middleware `autenticar`                     | ✅ **Ya existe** desde S1.5 (DEC-014 #5): verifica el Bearer y llena el contexto. Este ticket agrega solo `autorizar`.                                                                                                                                                                                          |
| Política "a partir de `permisos.ts`"                 | ⚠️ `PERMISOS_RUTA` dice qué **pantallas** ve cada rol, sin acciones. ADR-0002 pide recurso × acción, y eso lo tiene la **matriz RBAC del PRD §2**. Se usa la matriz del PRD (está por encima del prototipo en la precedencia de `docs/README.md`). Las diferencias van en §2.2.                                 |
| Política en `…/autorizacion/politica.csv` (ADR-0002) | ⚠️ La API se empaqueta con tsdown en un solo `dist/servidor.mjs` y el Dockerfile copia solo `dist/`: un `.csv` al lado del código no llega al contenedor. Se propone **`politica.ts`**: el mismo archivo versionado, pero tipado (§2.1). Va como **enmienda de ADR-0002**, porque toca un subsistema protegido. |
| Casbin 5.x + override de `csv-parse`                 | ✅ `casbin` 5.51.1 (publicada el 25-jun-2026), la versión probada en `docs/bd-tentaiva/ANALISIS.md` §7. `csv-parse` 7.0.3.                                                                                                                                                                                      |
| Helpers de "propio" y sede en `src/compartido/`      | ✅ Se crean. No hay recursos con dueño todavía: las ayudas se prueban solas y las usan S2.2 en adelante.                                                                                                                                                                                                        |
| Administrador = Kardex (D-27 provisional)            | ✅ Solo `KARDEX` tiene `usuarios` y `auditoria`.                                                                                                                                                                                                                                                                |
| "Acceso por URL directa a recurso ajeno → 403"       | ⚠️ No hay rutas de negocio para probarlo. Se prueba con un módulo de prueba montado con `modulosExtra` (lo prevé `appDePrueba`), que usa `autenticar`, `autorizar` y la ayuda de "propio".                                                                                                                      |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo       | Rol en este ticket | API pública (`index.ts`)                                   | Tablas propias que toca |
| ------------ | ------------------ | ---------------------------------------------------------- | ----------------------- |
| `seguridad`  | dueño              | **agrega** `crearAutorizar`, `type Recurso`, `type Accion` | ninguna                 |
| `compartido` | transversal        | **agrega** `exigirPropio`, `exigirSede`                    | —                       |

### 2.1 Modelo y política (`seguridad/autorizacion/`)

El modelo es el de ADR-0002 tal cual (`r = sub, obj, act`; `m = r.sub == p.sub && r.obj == p.obj && r.act == p.act`; se niega lo que no está). Se guarda como texto en `modelo.ts`.

La política:

```ts
// politica.ts — ÚNICA fuente de permisos (ADR-0002, enmienda S1.6)
export const RECURSOS = [
  'usuarios',
  'files',
  'requisitos',
  'hojas-ruta',
  'pases',
  'dictamenes',
  'documentos',
  'reportes',
  'auditoria',
] as const;
export const ACCIONES = ['crear', 'leer', 'leer_propio', 'editar'] as const;
export type Recurso = (typeof RECURSOS)[number];
export type Accion = (typeof ACCIONES)[number];

export const POLITICA: readonly (readonly [Rol, Recurso, Accion])[] = [
  ['KARDEX', 'usuarios', 'crear'],
  ['KARDEX', 'usuarios', 'leer'],
  ['KARDEX', 'usuarios', 'editar'],
  // … una línea por permiso, en el orden de la matriz del PRD §2 (ver §2.2)
];
```

**Por qué `.ts` y no `.csv`:**

- **Llega al contenedor:** queda dentro del bundle, sin rutas de archivo que cambian entre `tsx` (desarrollo) y `dist/` (Docker).
- **Tipado:** un rol, recurso o acción mal escrito no compila. Con un CSV, una errata (`KARDX`) sería un permiso que nunca se cumple, sin ningún aviso.
- **Se revisa igual en los PR:** es una línea por permiso, como el CSV. Casbin lo recibe convertido a líneas `p, ROL, recurso, accion`.
- Lo demás de ADR-0002 no cambia: modelo, Casbin, nada de permisos en la base, negar por defecto.

**El enforcer** se crea una sola vez por app, de forma perezosa: una promesa que `autorizar` espera. Así `crearApp` sigue siendo síncrono. La lectura de la política es en memoria; no hay I/O por petición.

### 2.2 Política inicial (matriz del PRD §2)

| Recurso                            | ESTUDIANTE  | EGRESADO    | SEC_DIR     | SEC_COORD   | COORDINADOR | KARDEX              |
| ---------------------------------- | ----------- | ----------- | ----------- | ----------- | ----------- | ------------------- |
| `usuarios`                         | —           | —           | —           | —           | —           | crear, leer, editar |
| `files`                            | leer_propio | leer_propio | leer        | leer        | leer        | crear, leer, editar |
| `requisitos`                       | leer_propio | leer_propio | —           | leer        | leer        | crear, leer, editar |
| `hojas-ruta`                       | —           | leer_propio | crear, leer | leer        | leer        | leer, editar        |
| `pases`                            | —           | leer_propio | crear, leer | crear, leer | leer        | crear, leer         |
| `dictamenes`                       | —           | leer_propio | —           | —           | crear, leer | leer                |
| `documentos` (emisión e impresión) | —           | —           | —           | —           | —           | crear, leer         |
| `reportes`                         | —           | —           | leer        | —           | leer        | leer                |
| `auditoria` (bitácora)             | —           | —           | —           | —           | —           | leer                |

**Diferencias con el prototipo (`PERMISOS_RUTA`) que hay que resolver en S1.11**, y que se anotan para D-16:

1. **SEC_DIR y los requisitos:** el prototipo le muestra el detalle del file (que incluye los requisitos), pero el PRD le niega `requisitos`. Se sigue el PRD: en S2.10, SEC_DIR verá el file sin la sección de requisitos.
2. **COORDINADOR y los pases:** el PRD le da `leer`, pero el menú del prototipo no le muestra la bandeja. Se sigue el PRD (puede leer); la web decide en S1.11 si muestra la entrada.
3. **"Firma y entrega" (SEC_DIR)** no es un recurso del PRD: se modela como `hojas-ruta`/`editar` cuando llegue S3.x. Por ahora no se agrega nada.

`leer_propio` es una acción distinta de `leer` a propósito (ADR-0002): quien tiene `leer_propio` pasa `autorizar`, pero el servicio **tiene que** filtrar por su `persona_id` con `exigirPropio`.

### 2.3 `autorizar` (`seguridad/autorizacion/autorizar.ts`)

```ts
export const crearAutorizar = (): ((recurso: Recurso, ...acciones: Accion[]) => RequestHandler)

// uso en una ruta:
router.get('/files/:id', autenticar, autorizar('files', 'leer', 'leer_propio'), controlador.obtener);
```

1. Toma la sesión con `sesionDe(res)`: si la ruta no pasó por `autenticar`, es un error de programación (500), no un 401.
2. Si `sesion.debeCambiarPassword` → 403 `CAMBIO_PASSWORD_REQUERIDO` ("Debe cambiar su contraseña antes de continuar."). Va antes que Casbin, para que la web sepa redirigir a la pantalla de cambio.
3. Si alguna de las acciones está permitida para `sesion.rol` → `res.locals.permiso = { recurso, accion }` (la primera permitida, en el orden dado) y sigue. Así el servicio sabe si entró por `leer` o por `leer_propio`.
4. Si ninguna → 403 `PROHIBIDO` (el mensaje de `ErrorProhibido`).

**La denegación no se registra en la bitácora:** DEC-007 pide escrituras de negocio y eventos de acceso (login, logout, contraseña). Un 403 queda en el log de pino con el id de la petición. Si la escuela pide auditar intentos de acceso indebido, se agrega una acción con un PR (como `REUSO_SESION`).

### 2.4 "Propio" y sede (`compartido/autorizacion.ts`)

```ts
/** Lanza 403 si el recurso no es del usuario. El servicio decide qué es "propio" (persona_id). */
export function exigirPropio(esPropio: boolean): void;

/** Lanza 403 si el usuario no es de la sede del recurso (D-24: el personal tiene una sola sede). */
export function exigirSede(sedeUsuario: number | null, sedeRecurso: number): void;
```

- Son funciones puras, sin conocer `seguridad` (lo transversal no importa módulos). Reciben datos ya resueltos por el servicio.
- **403 y no 404 para lo ajeno**, como pide el DoD del ticket. El costo (revelar que un id existe) es bajo: los ids no son datos personales, y el contenido nunca se muestra.
- La regla de uso, escrita en el JSDoc: con `leer_propio`, el servicio filtra en el repositorio por `persona_id` de la sesión (`where`), y nunca confía en el id que manda el cliente.

### 2.5 `GET /api/v1/auth/mis-permisos`

`autenticar` (sin `autorizar`: lo puede llamar cualquiera con sesión, incluso con `cpw`). Responde:

```json
{ "rol": "KARDEX", "permisos": [{ "recurso": "usuarios", "accion": "crear" }, …] }
```

Sale de `POLITICA` filtrada por el rol del token. Es lo que hace que la web y la API no se desincronicen (ADR-0002).

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                                                            | Cambio                                                                                   |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `package.json` (raíz)                                                                     | `"overrides": { "csv-parse": "^7.0.2" }`.                                                |
| `apps/api/package.json`, `package-lock.json`                                              | + `casbin` 5.51.1 (versión exacta).                                                      |
| `apps/api/src/modulos/seguridad/autorizacion/{modelo,politica,enforcer,autorizar}.ts`     | **Nuevos** (§2.1–§2.3).                                                                  |
| `apps/api/src/modulos/seguridad/auth.rutas.ts`, `auth.controlador.ts`, `auth.esquemas.ts` | + `GET /auth/mis-permisos` y su OpenAPI.                                                 |
| `apps/api/src/modulos/seguridad/index.ts`                                                 | + `crearAutorizar`, `type Recurso`, `type Accion`, `POLITICA` (de solo lectura).         |
| `apps/api/src/compartido/autorizacion.ts` (+ export en un `index`)                        | **Nuevo** (§2.4).                                                                        |
| `apps/api/src/compartido/errores/errores.ts`                                              | `ErrorProhibido` acepta un `codigo` opcional (para `CAMBIO_PASSWORD_REQUERIDO`).         |
| `apps/api/test/seguridad-politica.test.ts`                                                | **Nuevo**: matriz completa (§4).                                                         |
| `apps/api/test/seguridad-autorizar.test.ts`                                               | **Nuevo**: middleware y ruta de prueba con "propio".                                     |
| `apps/api/test/compartido-autorizacion.test.ts`                                           | **Nuevo**.                                                                               |
| `docs/adr/0002-autorizacion-casbin.md`                                                    | **Enmienda** al pie: política en `politica.ts` tipada en lugar de `politica.csv` (§2.1). |
| `docs/decisions/LOG.md`                                                                   | DEC-015 (§7).                                                                            |

---

## 4 · Plan de tests

| Caso                                                                                                                                                                                                                            | Nivel                             | Cubre                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------- |
| **Matriz completa:** para los 6 roles × 9 recursos × 4 acciones (216 combinaciones), el enforcer permite exactamente lo de la tabla de §2.2, **escrita de nuevo en el test** (no derivada de `POLITICA`), y niega todo lo demás | Unit                              | ADR-0002, DoD "prueba negativa por cada fila" |
| La política no tiene filas repetidas, y cada rol/recurso/acción existe en las listas cerradas                                                                                                                                   | Unit                              | Integridad                                    |
| `autorizar` sin sesión (ruta mal armada) → 500                                                                                                                                                                                  | Unit (Supertest, app mínima)      | §2.3                                          |
| `autorizar` con `cpw: true` → 403 `CAMBIO_PASSWORD_REQUERIDO`, aunque el rol tenga el permiso                                                                                                                                   | Unit                              | §2.3                                          |
| Rol sin permiso → 403 `PROHIBIDO` en el formato único                                                                                                                                                                           | Unit                              | RF-02 CA2                                     |
| Varias acciones: entra con la primera permitida y la deja en `res.locals.permiso` (ESTUDIANTE con `leer`, `leer_propio` → `leer_propio`)                                                                                        | Unit                              | §2.3                                          |
| **URL directa a un recurso ajeno:** ruta de prueba `/prueba/files/:personaId` con `exigirPropio`; un ESTUDIANTE pide la de otra persona → 403; la propia → 200; KARDEX (con `leer`) → 200                                       | Unit (Supertest + `modulosExtra`) | DoD, RF-02 CA3                                |
| `exigirPropio` y `exigirSede`                                                                                                                                                                                                   | Unit                              | §2.4                                          |
| `GET /auth/mis-permisos` con un token de SEC_DIR devuelve sus 6 permisos; sin token → 401; con `cpw: true` también responde                                                                                                     | Unit (Supertest)                  | §2.5                                          |
| `npm audit --audit-level=high` sin hallazgos con casbin instalado                                                                                                                                                               | CI (`calidad`)                    | DoD                                           |

**Deliberadamente sin test:** la protección de endpoints de negocio, que todavía no existen. Cada ticket que los cree agrega su prueba de 403.

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S1.6/SDD.md`, Estado = Aprobado.
- [ ] Prueba negativa de la matriz completa (216 combinaciones).
- [ ] Acceso por URL directa a un recurso ajeno → 403.
- [ ] `npm audit` sin hallazgos altos con casbin.
- [ ] Enmienda de ADR-0002 y DEC-015 en `LOG.md`.
- [ ] Quality gate en verde: `calidad`, `base-de-datos`, `e2e`, `docker`.
- [ ] Commit `S1.6 …` en la rama `feat/S1.6-casbin-autorizacion`.

---

## 6 · Riesgos

| Riesgo                                                                             | Gravedad | Mitigación                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un endpoint nuevo se olvida de `autorizar` y queda abierto a cualquiera con sesión | Alta     | Cada SDD de un endpoint lista su par recurso/acción y su prueba de 403. En S6.7 (OWASP) se agrega una prueba que recorre todas las rutas registradas y exige `autorizar` en las que no son de `/auth` ni `/health`. |
| La matriz del PRD no es la que la escuela quiere (D-16 abierta)                    | Media    | Cambiar un permiso es editar una línea de `politica.ts` y su fila en el test de la matriz.                                                                                                                          |
| El access token sigue con el rol viejo hasta 15 min después de un cambio de rol    | Baja     | Conocido (DEC-014): el refresh lee el rol de la base.                                                                                                                                                               |
| Casbin es más de lo que pide un modelo tan simple                                  | Baja     | Lo decidió ADR-0002 para crecer (dominios, ABAC) sin cambiar el middleware. Su costo es una dependencia auditada.                                                                                                   |

---

## 7 · Preguntas abiertas

- **Para la escuela:** nada nuevo. La validación de la matriz ya es D-16. Las tres diferencias con el prototipo de §2.2 se agregan como nota a D-16 en `dudas.md`, para que quien valide la matriz las vea.
- **DEC-015 (va a `LOG.md`):**
  1. La política inicial es la matriz RBAC del PRD §2, no `PERMISOS_RUTA`.
  2. La política vive en `politica.ts`, tipada (enmienda de ADR-0002).
  3. `cpw: true` → 403 `CAMBIO_PASSWORD_REQUERIDO` en toda ruta con `autorizar`.
  4. Lo ajeno responde 403 (no 404).
  5. Las denegaciones van al log, no a la bitácora.
  6. `GET /auth/mis-permisos` es la fuente del menú de la web.

---

## Changelog

- **1.1 (2026-10-13):** la escuela respondió D-08 (los egresados no tendrán cuenta; sus trámites son externos) y D-16 (validan la matriz Coordinación y Kardex). **EGRESADO queda sin permisos** en la política y en la matriz del test: las filas `leer_propio` de EGRESADO de §2.2 ya no se aplican. Lo demás del diseño no cambia. Además, los archivos de `autorizacion/` quedan planos en `seguridad/` (`autorizacion.modelo.ts`, `autorizacion.politica.ts`, `autorizacion.enforcer.ts`, `autorizar.ts`), porque la regla de fronteras de ADR-0001 no permite rutas `../` dentro de un módulo.
