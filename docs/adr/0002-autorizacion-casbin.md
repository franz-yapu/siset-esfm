# 0002 — Autorización con Casbin y política en archivo versionado

**Estado:** Aceptada
**Fecha:** 2026-10-13

## Contexto

RF-02 pide control de acceso por roles:

- CA1: el menú muestra solo los módulos del rol.
- CA2: una ruta de la API sin permiso responde 403, aunque se llame por URL directa.
- CA3: "propio" se valida en el backend; un estudiante no lee el file de otro cambiando el id.

Auth y RBAC está en `docs/do-not-touch.md`: tocarlo exige un ADR y pruebas negativas por rol (R6).

Hoy los permisos viven solo en el prototipo (`apps/web/src/config/permisos.ts`, `PERMISOS_RUTA`), como
listas de roles por pantalla. Sin una fuente única, cada endpoint terminaría con su propio `if (rol === …)`,
que es justo como aparecen los accesos indebidos.

El modelo de datos adoptado (DEC-006, `docs/product/modelo-datos.md`) tiene un rol por usuario
(`usuario.rol_id`), 6 roles fijos y `persona` / `usuario.sede_id` para las reglas de propiedad y de sede.

Se verificó la compatibilidad de Casbin con el stack (`docs/bd-tentaiva/ANALISIS.md` §7): `casbin`
5.51.1 con Node 26, TypeScript 6.0 estricto, ESM, tsx y tsdown. Pasaron 6/6 casos de prueba y el audit
quedó limpio tras forzar `csv-parse` ^7.0.2.

## Decisión

Se usa **Casbin** (`casbin` 5.51, Apache-2.0, RNF-09) para la autorización de la API, con un **modelo RBAC
simple** y la **política en un archivo versionado** dentro del módulo `seguridad`.

### Modelo (`apps/api/src/modulos/seguridad/autorizacion/modelo.conf`)

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
```

- `sub`: código de rol (`rol.codigo`), tomado del token, nunca del cliente.
- `obj`: recurso de negocio (`files`, `hojas-ruta`, `pases`, `dictamenes`, `documentos`, `usuarios`, `reportes`, `auditoria`…), no la URL. Así renombrar una ruta no cambia permisos.
- `act`: acción (`leer`, `leer_propio`, `crear`, `editar`, `enviar`, `recibir`, `emitir`…).
- Sin jerarquía de roles (`g`): el PRD no la tiene, y cada rol lista sus permisos explícitamente.
- Se deniega todo lo que no está en la política.

### Política (`…/autorizacion/politica.csv`)

Una línea por permiso: `p, KARDEX, files, editar`. Es la **única fuente de permisos**:

- La API la aplica con un middleware `autorizar(recurso, accion)`, que responde 403 con el formato de error único (RF-02 CA2).
- El menú del frontend (RF-02 CA1) se deriva de la misma política, vía un endpoint de "mis permisos" o un archivo generado. `PERMISOS_RUTA` deja de ser una lista mantenida a mano.

### Lo que no decide Casbin

| Regla                                                                       | Dónde va                                                                                                                                                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Propio** (RF-02 CA3)                                                      | La política solo dice `p, ESTUDIANTE, files, leer_propio`. El servicio dueño filtra por `persona_id` del usuario en el repositorio (`where`), nunca confiando en el id que manda el cliente. |
| **Sede** (recibir solo pases dirigidos a la sede propia)                    | Servicio de `pases`: `pase.sede_destino_id = usuario.sede_id` (D-24).                                                                                                                        |
| **Estado del trámite** (por ejemplo, no observar si ya se envió a dictamen) | Máquina de estados de `hojas-ruta` (`do-not-touch`).                                                                                                                                         |

### Dependencias

- `casbin` con versión exacta, más `"overrides": { "csv-parse": "^7.0.2" }` en el `package.json` raíz (GHSA-8cw4-87c7-c6xx en `csv-parse` 5; no explotable aquí, pero el audit debe quedar limpio).
- **Sin** `casbin-prisma-adapter` ni tabla `casbin_rule`.

### Pruebas obligatorias (do-not-touch)

- **Matriz completa** rol × recurso × acción, generada a partir de la política: cada combinación que no está en la política debe dar `false` (pruebas negativas por rol, R6).
- Pruebas de integración por endpoint: 403 sin permiso, aunque la URL sea directa.
- Pruebas de "propio": un ESTUDIANTE que pide el file de otro recibe 404 o 403, sin filtrar datos.

## Consecuencias

- **Facilita:**
  - Un solo lugar para los permisos, revisado en PRs.
  - Probar la matriz completa de forma automática.
  - Que frontend y API no se desincronicen.
  - Agregar un permiso sin tocar código de endpoints.
- **Dificulta:**
  - Cambiar permisos en producción exige un despliegue. Es aceptable: "modificar jerarquías institucionales" está fuera de alcance (PRD §2) y los roles son fijos.
- **Descarta:**
  - Permisos en la base (`casbin_rule`) y edición de permisos desde la interfaz. Si algún día hace falta, se reemplaza el archivo por `casbin-prisma-adapter` (compatible con Prisma ^7.2) con un ADR nuevo; el modelo y el middleware no cambian.
  - Jerarquía de roles y RBAC con dominios por sede, por ser exagerados para 6 roles y 2 sedes.
- **Pendiente:** la matriz inicial de permisos la valida la persona que defina D-16 ("¿quién valida la matriz RBAC?"). Mientras tanto, se parte de `PERMISOS_RUTA` del prototipo.
- **Se implementa en:** S1.x (middleware `autorizar` y política), junto con la autenticación.

## Enmienda (2026-10-13, S1.6)

- **La política vive en `apps/api/src/modulos/seguridad/autorizacion.politica.ts`** y no en `politica.csv`.
  La API se empaqueta con tsdown en un solo `dist/servidor.mjs` y el contenedor solo copia `dist/`: un
  `.csv` al lado del código no llegaría. Además, al ser TypeScript, un rol, recurso o acción mal escrito no
  compila. Sigue siendo una línea por permiso, revisada en los PR; Casbin la recibe como líneas
  `p, ROL, recurso, accion` con `StringAdapter`. El modelo, la negación por defecto y "nada de permisos en
  la base" no cambian. Ver SDD S1.6 §2.1 y DEC-015.
