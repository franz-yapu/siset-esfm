# Análisis del modelo de BD tentativo (v0.1) y de Casbin para RBAC

**Fecha:** 2026-10-13 · **Analizado:** `siset_schema.sql`, `schema.prisma`, `siset_datos_prueba.sql`
· **Contra:** PRD §3/§5, `business-rules.md`, ADR-0001, DEC-001…005, dudas D-01…D-26, lo implementado en S0.6
y el prototipo (`apps/web`).

**Cómo se probó:** el SQL y los datos de prueba se aplicaron en una base temporal de PostgreSQL 18.6 (el
mismo contenedor del proyecto). Corren sin errores: 21 tablas, 2 vistas y los datos de prueba (5 files, 2
trámites, 14 movimientos), y las vistas devuelven el semáforo y la bandeja esperados. Después se forzaron
casos límite (§3). La base temporal se eliminó al terminar.

---

## 1 · Veredicto

**Sirve como modelo base y es mejor que lo que hoy tiene `main` (S0.6)**: cubre los 7 módulos, normaliza
los datos personales y pone en la base reglas que el PRD exige (inmutabilidad, correlativo sin carreras,
cadena de custodia). **No se puede adoptar tal cual**: tiene 5 errores confirmados (§3), choca con 4
decisiones ya tomadas (§4) y fija como definitivas varias cosas que dependen de dudas abiertas (§5).

Recomendación: **adoptarlo como modelo de datos objetivo**, con las correcciones de §3 y §4, implementado
como migraciones de Prisma (no "SQL primero"), módulo por módulo según ADR-0001.

---

## 2 · Lo que está bien y conviene conservar

| Aporte                                                                                                                          | Por qué es bueno                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Tabla `persona` separada de `usuario` y `file_academico`                                                                        | Un file puede existir sin cuenta (carga masiva, D-13) y los datos personales no se duplican.                                                  |
| `apellido_paterno` / `apellido_materno` + `complemento` del CI                                                                  | Coincide con los documentos oficiales bolivianos y con D-14. Mejor que `nombres`/`apellidos` del PRD.                                         |
| IDs `INTEGER` en lugar de `BIGINT`                                                                                              | Resuelve el problema de `BigInt` + JSON anotado para S0.7. El volumen de SISET (cientos de trámites al año) nunca se acerca a 2.100 millones. |
| `CHECK` de coherencia (`ck_file_motivo`, `ck_pase_recepcion`, `ck_hoja_ruta_cierre`, `ck_documento_motivo`, `ck_dictamen_obs`…) | Reglas de negocio que no se pueden romper ni con un bug de la API.                                                                            |
| `hoja_ruta_correlativo` + `fn_siguiente_nro_hoja_ruta`                                                                          | Correlativo sin carreras (bloqueo de fila con `UPDATE`): cubre un subsistema de `do-not-touch.md`.                                            |
| Triggers de solo inserción en `log_auditoria` y `movimiento_hoja_ruta`                                                          | RF-14 CA2 y la trazabilidad (O1).                                                                                                             |
| Enum `estado_tramite`                                                                                                           | Los 11 valores son **idénticos** a los del prototipo (`EstadoTramite`) y a business-rules.                                                    |
| `tipo_tramite`, `tipo_tramite_requisito`, `requisito_tipo`, `parametro`                                                         | Catálogos parametrizables: es la mitigación de R2 (TACFI/TCLO) y D-07 (límite de UF configurable).                                            |
| `ip INET`, `refresh_token.token_hash` (SHA-256, nunca el token)                                                                 | Más correcto que `VARCHAR`; buena práctica de seguridad (RNF-02).                                                                             |
| Índices parciales (pases por recibir, files bloqueados, usuarios activos)                                                       | Justo las consultas de las bandejas.                                                                                                          |

---

## 3 · Errores confirmados (probados en PostgreSQL 18.6)

| #   | Problema                                                                                                            | Prueba                                                                                                | Corrección                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E1  | **Se puede duplicar un CI sin complemento.** `UNIQUE (ci, complemento)` trata los `NULL` como distintos.            | Se insertó otra persona con CI `4801122` y `complemento NULL`: quedaron **2**.                        | `UNIQUE NULLS NOT DISTINCT (ci, complemento)` (PostgreSQL 15+).                                                                                                                                                                                        |
| E2  | **La bitácora se puede vaciar con `TRUNCATE`.** El trigger solo cubre `UPDATE` y `DELETE`.                          | `TRUNCATE log_auditoria` funcionó: quedaron **0** filas.                                              | Agregar `BEFORE TRUNCATE … FOR EACH STATEMENT` a `log_auditoria` y `movimiento_hoja_ruta`, y además `REVOKE UPDATE, DELETE, TRUNCATE` al rol de la app (business-rules: "permisos de BD").                                                             |
| E3  | **No se puede repetir un año de formación.** `UNIQUE (file_id, anio_formacion)` en `resultado_anual` y `matricula`. | Registrar el 3.er año en otra gestión, después de un REPROBADO, falló por clave duplicada.            | `UNIQUE (file_id, anio_formacion, gestion)`. Depende de D-07: si reprobar implica repetir el año, esto es obligatorio.                                                                                                                                 |
| E4  | **Dos pases pendientes para el mismo trámite.** Nada lo impide.                                                     | Se insertaron 2 pases sin recepción para la hoja 1.                                                   | `CREATE UNIQUE INDEX … ON pase (hoja_ruta_id) WHERE fecha_recepcion IS NULL` (un trámite está físicamente en un solo lugar: cadena de custodia, RF-10).                                                                                                |
| E5  | **`estado_actual` puede divergir del historial.** Es una copia del último movimiento, sin nada que la sincronice.   | `UPDATE hoja_ruta SET estado_actual='LISTO'` dejó LISTO frente a EN_REVISION en el último movimiento. | Trigger `AFTER INSERT ON movimiento_hoja_ruta` que actualice `hoja_ruta.estado_actual` y `sede_actual_id` (y que nadie más los escriba), o regla en el servicio dueño (`hojas-ruta`) con un test. La máquina de estados es `do-not-touch`: va con ADR. |

Menores:

- `v_hoja_ruta_bandeja` usa `JOIN LATERAL` (interno): un trámite sin movimientos desaparece de la bandeja. Usar `LEFT JOIN LATERAL`, o garantizar que la creación inserte el primer movimiento.
- Los datos de prueba usan la contraseña `demo123` (7 caracteres), que **no cumple** la regla de business-rules (mínimo 8, con letras y números).
- `rol.nombre` no coincide con el prototipo (por ejemplo, "Responsable de Archivo Kardex" frente a "Kardex"). Hay que elegir una sola versión; el test de S0.6 exige la del prototipo.

---

## 4 · Choques con decisiones ya tomadas

| Tema                                                              | Modelo tentativo                                    | Decisión vigente                                                                             | Recomendación                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flujo de trabajo                                                  | **SQL primero** + `prisma db pull`                  | S0.6: migraciones de Prisma como fuente de verdad, con esquema partido por módulo (ADR-0001) | Mantener las migraciones de Prisma. Los `CHECK`, índices parciales, triggers, funciones y vistas se escriben como SQL dentro de la migración (`migrate dev --create-only` + editar), igual que la zona horaria en S0.6. `db pull` colapsaría todo en un solo archivo y perdería la división por módulo. |
| Prisma                                                            | 6.x, `prisma-client-js`, `url` en el datasource     | DEC-004: Prisma 7.10, `prisma-client`, `prisma.config.ts`, adapter `pg`                      | Usar la configuración de S0.6.                                                                                                                                                                                                                                                                          |
| PostgreSQL                                                        | 16                                                  | DEC-005: 18 (provisional por D-12)                                                           | Nada en el modelo exige una u otra; `NULLS NOT DISTINCT` (E1) requiere 15+.                                                                                                                                                                                                                             |
| Tipo de id                                                        | `INTEGER`/`SMALLINT` `GENERATED ALWAYS AS IDENTITY` | business-rules y S0.6: `BIGSERIAL`                                                           | **Adoptar `INTEGER` con un DEC nuevo** (enmienda business-rules §Convenciones). Usar `SERIAL`, que es lo que genera Prisma con `Int @default(autoincrement())`, y no `IDENTITY`: si no, cada `migrate dev` detecta drift. `SMALLINT` en catálogos es opcional; Prisma lo trata como `Int` igual.        |
| `ON DELETE CASCADE` en `refresh_token` y `tipo_tramite_requisito` | Excepción a la convención RESTRICT                  | business-rules: FK `ON DELETE RESTRICT`                                                      | Aceptable (los usuarios nunca se borran, D-14 / baja lógica), pero hay que documentarlo como excepción en el DEC.                                                                                                                                                                                       |

**Impacto en lo ya hecho:** S0.6 está en `main` con `BigInt`, `usuario.ci`, `nombres`/`apellidos` y sin
`persona`. Como no hay ninguna base desplegada, lo más limpio es **reemplazar la migración inicial**
(rehacer `…_inicial`) en lugar de apilar una migración de corrección. Las bases locales se recrean con
`docker compose down -v`.

---

## 5 · Lo que el modelo fija pero depende de dudas abiertas

No bloquea adoptar el modelo, pero cada tabla se crea en su ticket, cuando la duda esté cerrada o con su
propuesta provisional explícita:

| Duda                      | En el modelo                                                 | Riesgo si la respuesta es otra                                                                                                         |
| ------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| D-05 Estados              | Enum con 11 valores                                          | Agregar un valor es fácil (`ALTER TYPE … ADD VALUE`); quitarlo o reordenarlo no. Crear la tabla en S3.x, después de la demo.           |
| D-07 Notas                | `resultado_anual` sin notas por UF; límite en `parametro`    | Si se guardan notas por UF, hace falta otra tabla.                                                                                     |
| D-24 Sede del personal    | `usuario.sede_id` (NULL para estudiantes)                    | Coincide con la propuesta provisional.                                                                                                 |
| D-25 Usuario de login     | `usuario.username` + datos de prueba con `kardex`, `secdir`  | La propuesta provisional dice "todos con CI". El campo puede quedar, pero cargado con el CI; los alias, solo en el seed de desarrollo. |
| D-26 Bitácora sin usuario | `log_auditoria.usuario_id` **nullable** (`LOGIN_FALLIDO`)    | La propuesta provisional (S0.6) era NOT NULL. El modelo tentativo elige "sí": si se adopta, D-26 queda cerrada por decisión interna.   |
| D-04 / D-18 / D-21        | Catálogos parametrizables y "todos los trámites exigen todo" | Es justamente lo que permite cambiar sin migrar.                                                                                       |

**Faltantes** frente al prototipo y a DEC-001:

- **"Enviado a dictamen"** (DEC-001 #1; el prototipo tiene `enviadoDictamen` en 20 lugares): falta en `hoja_ruta`. Agregar `enviado_dictamen_en TIMESTAMPTZ NULL`.
- **Datos de la entrega** (el prototipo tiene `Entrega`: titular o apoderado, CI de quien recibe, fecha): faltan. Agregar `entregado_a`, `ci_receptor` y `fecha_entrega` a `hoja_ruta`, o una tabla `entrega`.
- **Una persona, una sola cuenta** (`usuario.persona_id UNIQUE`): un egresado que después trabaja en la ESFM no podría tener una cuenta de personal. Es un caso borde; con el PRD actual (un rol por usuario) es aceptable.

---

## 6 · Propiedad por módulo (ADR-0001)

| Módulo                                    | Tablas / objetos                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `seguridad`                               | `rol`, `usuario`, `refresh_token` (+ política de Casbin, §7)                                                                   |
| **`personas`** (nuevo, enmienda ADR-0001) | `persona`. La usan `seguridad` (cuentas) y `files` (carga masiva) por su API pública; ninguno de los dos debería ser su dueño. |
| `catalogos`                               | `sede`, `especialidad`, `requisito_tipo`, `tipo_tramite`, `tipo_tramite_requisito`, `parametro`                                |
| `files`                                   | `file_academico`, `matricula`, `resultado_anual`, `requisito_file`                                                             |
| `hojas-ruta`                              | `hoja_ruta`, `hoja_ruta_correlativo`, `movimiento_hoja_ruta`, `fn_siguiente_nro_hoja_ruta`                                     |
| `pases`                                   | `pase`                                                                                                                         |
| `dictamenes`                              | `dictamen`                                                                                                                     |
| `documentos`                              | `documento_emitido`                                                                                                            |
| `auditoria`                               | `log_auditoria`                                                                                                                |
| `reportes` (solo lectura)                 | `v_hoja_ruta_bandeja`                                                                                                          |

`v_file_semaforo`: el **motor de semáforo y bloqueo** es `do-not-touch` y RNF-07 pide cobertura ≥ 70 %
en servicios. Conviene que la regla viva **en el servicio de `files`** (como hoy en
`apps/web/src/lib/reglas.ts`), probada con Vitest. La vista quedaría, como mucho, como apoyo de reportes.
Tener la regla en dos lugares (vista y servicio) termina en semáforos distintos.

---

## 7 · Casbin para roles, usuarios y permisos

### ¿El modelo lo soporta?

**Sí, sin tablas nuevas.** Para el RBAC del PRD alcanza con lo que hay:

| Lo que necesita Casbin | Dónde está                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| Sujeto (rol)           | `usuario.rol_id` → `rol.codigo` (un rol por usuario, como el PRD)                                          |
| Objetos y acciones     | En la política (recursos de la API: `files`, `hojas-ruta`, `pases`…; acciones: `leer`, `crear`, `editar`…) |
| Política               | Archivo versionado en el repo (recomendado) **o** tabla `casbin_rule`                                      |

`casbin` 5.51 (Apache-2.0, cumple RNF-09) es la librería vigente. `casbin-prisma-adapter` 1.12 ya declara
compatibilidad con Prisma ^7.2.

### Compatibilidad con el stack (verificada el 2026-10-13)

Proyecto de prueba aparte, con las versiones exactas de SISET (Node 26.11, TypeScript 6.0.3 estricto con
`skipLibCheck: false`, ESM, `moduleResolution: bundler`, tsx 4.23 y tsdown 0.23):

| Prueba                                                | Resultado                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Typecheck con los tipos de Casbin                     | ✅ sin errores                                                                                    |
| `enforce` en ESM con tsx (desarrollo)                 | ✅ 6/6 casos (permitidos y denegados)                                                             |
| Bundle con tsdown y ejecución en Node 26 (producción) | ✅ 6/6 casos                                                                                      |
| `npm audit`                                           | ⚠️ 1 moderada: `csv-parse` 5.x (GHSA-8cw4-87c7-c6xx), dependencia de Casbin para leer la política |
| Con `overrides: { "csv-parse": "^7.0.2" }`            | ✅ 0 vulnerabilidades y los 6/6 casos siguen pasando                                              |

- La vulnerabilidad de `csv-parse` solo es alcanzable con la opción `columns` sobre entrada no confiable.
  Casbin no usa esa opción y la política es un archivo del repo, así que el riesgo real es nulo. Igual se
  fija `csv-parse` 7 con `overrides` para que el audit quede limpio.
- `casbin-prisma-adapter` 1.12 (solo si la política fuera a la base): es CommonJS y acepta una instancia
  de `PrismaClient`. Funciona con el cliente generado de Prisma 7 pasándole `crearClienteBd()`; no se
  probó en vivo porque la recomendación es la política en archivo.

**Conclusión: Casbin 5.51 es compatible con el stack actual** (con el `override` de `csv-parse`).

### Modelo propuesto (RBAC simple, sin jerarquía de roles)

```ini
[request_definition]
r = sub, obj, act          # sub = código de rol, obj = recurso, act = acción

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
```

```csv
p, KARDEX,      files,       editar
p, KARDEX,      files,       leer
p, SEC_DIR,     files,       leer
p, COORDINADOR, dictamenes,  crear
p, ESTUDIANTE,  files,       leer_propio
...
```

El middleware `autorizar(recurso, accion)` (S1.x) llama a `enforce(usuario.rol, recurso, accion)` y
responde 403 si no hay permiso (RF-02 CA2).

### Lo que Casbin no resuelve por sí solo

| Regla                                                                                | Dónde debe ir                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Propio"** (RF-02 CA3: un estudiante solo ve **su** file)                          | Casbin solo dice que ESTUDIANTE puede `leer_propio`. La verificación `file.persona_id = usuario.persona_id` va en el servicio o repositorio (filtro `where`). El modelo lo soporta gracias a `persona`. |
| **Sede** (solo se reciben pases dirigidos a la sede del usuario)                     | Comparar `pase.sede_destino_id = usuario.sede_id` en el servicio de `pases` (depende de D-24). RBAC con dominios por sede sería exagerado para 2 sedes.                                                 |
| Estado del trámite (por ejemplo, Kardex no puede observar si ya se envió a dictamen) | Máquina de estados de `hojas-ruta`, no la autorización.                                                                                                                                                 |

### ¿Política en archivo o en base de datos?

**Recomendado: archivo versionado** (`model.conf` + `politica.csv` en el módulo `seguridad`):

- Los roles y permisos son fijos en v1.0 ("modificar jerarquías" está fuera de alcance, PRD §2).
- Cada cambio de permisos pasa por un PR revisado. Auth/RBAC es `do-not-touch` y exige ADR y pruebas negativas por rol.
- Se puede probar con una **matriz rol × recurso × acción** completa en Vitest.
- La misma fuente puede alimentar el menú del frontend, que hoy son los `PERMISOS_RUTA` de `apps/web/src/config/permisos.ts`, y así no se desincronizan.

Usar la tabla `casbin_rule` (adapter de Prisma) **solo si** Kardex tuviera que editar permisos desde la
interfaz, y eso no está en el PRD.

### Para adoptarlo

- **ADR-0002** "Autorización con Casbin" (Auth/RBAC es `do-not-touch`): modelo, archivo de política, dónde va "propio" y cómo se prueba.
- La matriz de permisos la valida la persona que defina D-16 ("¿quién valida la matriz RBAC?").

---

## 8 · Próximos pasos propuestos

1. **DEC-006**: adoptar este modelo como objetivo, con las correcciones E1–E5 y §4 (ids `INTEGER` con
   `SERIAL`, migraciones de Prisma, módulo `personas`, excepciones CASCADE documentadas). Enmienda
   business-rules §Convenciones y ADR-0001 (módulo nuevo).
2. **Ticket nuevo, antes de S0.7**: rehacer la migración inicial de S0.6 con `persona`, ids `INTEGER`,
   `ip INET` y los campos de usuario del modelo (`sede_id`, bloqueo, `debe_cambiar_password`). Con su SDD.
   Las demás tablas se crean en sus tickets (S1.1 `refresh_token`, S2.1 files y catálogos, S3.x trámites…).
3. **ADR-0002**: Casbin con política en archivo (se implementa en S1.x, junto con `autorizar`).
4. Pasar este modelo a `docs/product/` cuando se apruebe; `docs/bd-tentaiva/` queda como insumo histórico.
