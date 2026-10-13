# SDD — S0.8 · Cliente Axios, interruptor mock/API y TanStack Query

- **Ticket:** ClickUp **S0.8** (`868mgh28b`, https://app.clickup.com/t/868mgh28b).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` §5 (stack: Axios, TanStack Query; API `/api/v1`; error único), RNF-02 (refresh en cookie httpOnly), RNF-12 (aviso "sin conexión")
  2. `docs/product/prototipo-pantallas.md` §1 (las pantallas solo hablan con `src/services/`; latencia simulada)
  3. `docs/sdd/S0.7/SDD.md` §2.3 (formato `{ error: { code, message, details } }` y códigos HTTP), §2.7 (CORS con `credentials`)
  4. `docs/sdd/S0.10/SDD.md` §1 (el disable de `useAsync` se difirió aquí)
  5. `docs/decisions/LOG.md` — DEC-004 (versiones)
  6. `docs/planning/2026-10-12-tickets/S0.8-axios-servicios.json`

---

## 1 · Alcance

### Entra

- `src/lib/api.ts`: cliente Axios para `/api/v1`, con cookies y traducción del error único a un `ErrorApi`.
- Interruptor **por servicio** `VITE_USAR_API` (mock o API) y patrón `<servicio>.mock.ts` / `<servicio>.api.ts`.
- `authService` como primer servicio con implementación de API (DoD del ticket).
- TanStack Query: `QueryClientProvider` en `main.tsx`, listo para que cada pantalla migre en su ticket de "conectar".
- Proxy de Vite en desarrollo (`/api` → `http://localhost:3000`).
- "Reiniciar datos de demo" visible solo cuando todo es mock.
- Vitest en `apps/web` (hoy no tiene tests) para lo nuevo.

### No entra (a propósito)

- Migrar las 23 pantallas que usan `useAsync` a TanStack Query → en cada ticket "conectar a la API" (las 22 tareas 🟡). Cambiar la implementación de `useAsync` por `useQuery` en bloque no es posible sin una clave de caché única por pantalla, que el hook no recibe. Así que **el disable de `react-hooks/set-state-in-effect` en `useAsync` se queda** hasta que la última pantalla migre. Esto corrige lo que anticipó el SDD de S0.10 §1 ("TanStack Query reemplaza este hook en S0.8"): el reemplazo es gradual.
- Implementaciones de API de los otros 9 servicios → sus tickets.
- Refresh automático del token ante un 401, sesión por cookie y `AuthContext` contra la API → S1.x (sus endpoints no existen todavía).
- Suite E2E con Playwright en el repo → cuando haya pantallas conectadas (como en S0.10).

### Premisas verificadas (`task-brief`)

| Premisa del ticket               | Qué hay de verdad                                                                                                                                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las pantallas no importan mocks  | ✅ Ninguna en `pages/`, `components/`, `hooks/` ni `context/`. ⚠️ `lib/transiciones.ts` sí importa `@/mocks/db`, y ahí vive `ErrorNegocio`: si `api.ts` lo importara, arrastraría los mocks. Se mueve `ErrorNegocio` a `lib/errores.ts` (§2.2).                            |
| `authService` tiene login/logout | ✅ Además `obtener(id)` (restaura la sesión por id desde `sessionStorage`), `cambiarClave` y `usuariosDemo`. ⚠️ El PRD §5 solo define `/auth/login`, `/auth/refresh` y `/auth/logout`: `obtener` y `cambiarClave` **no tienen endpoint definido** y no se inventan (§2.4). |
| "Correr el guion E2E existente"  | ⚠️ En el repo no hay guion E2E. Se usan los recorridos de Chrome headless de S0.3/S0.10 (6 roles, 43 pantallas, y los flujos interactivos), con los resultados en el PR.                                                                                                   |
| La web no tiene tests            | ✅ Cierto. Se agrega Vitest (entorno `node`, sin DOM: lo nuevo no renderiza).                                                                                                                                                                                              |
| Versiones                        | ✅ Al 2026-10-13: `axios` 1.20.0, `@tanstack/react-query` 5.104.2, `vitest` 5.0.4.                                                                                                                                                                                         |

---

## 2 · Diseño técnico

### 2.1 Cliente (`src/lib/api.ts`)

```ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true, // cookie httpOnly del refresh token (RNF-02, S1.x)
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});
api.interceptors.response.use(
  (r) => r,
  (e) => Promise.reject(aErrorApi(e)),
);
```

`aErrorApi(e: unknown): ErrorApi` (exportada, para probarla sola):

| Situación                                                                   | Resultado                                                                                                               |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Respuesta con `{ error: { code, message, details } }` (formato único, S0.7) | `ErrorApi(message, code, status, details)`: el **mismo mensaje** que mostraba el mock, así que las pantallas no cambian |
| Respuesta sin ese formato (por ejemplo, un 502 de Nginx con HTML)           | `ErrorApi('El servidor respondió con un error inesperado.', 'ERROR_SERVIDOR', status)`                                  |
| Sin respuesta (red caída, servidor apagado)                                 | `ErrorApi('No se pudo conectar con el servidor. Revise su conexión.', 'SIN_CONEXION')` (RNF-12)                         |
| Timeout                                                                     | `ErrorApi('El servidor tardó demasiado en responder.', 'TIEMPO_AGOTADO')`                                               |

**Por qué `baseURL` relativa (`/api/v1`) por defecto:** en desarrollo, el proxy de Vite la manda a la API
(§2.5), y en producción Nginx sirve web y API en el mismo dominio (S0.4). Mismo origen significa que la
cookie del refresh viaja sin configurar CORS en el navegador. `VITE_API_URL` existe para casos
especiales (por ejemplo, la API en otro host en staging).

### 2.2 Errores (`src/lib/errores.ts`, nuevo)

```ts
export class ErrorNegocio extends Error {}                          // movido desde lib/transiciones.ts
export class ErrorApi extends ErrorNegocio {
  constructor(message: string, readonly codigo: string, readonly estado?: number, readonly detalles?: unknown) { … }
}
```

- `lib/transiciones.ts` **reexporta** `ErrorNegocio` desde `lib/errores.ts`, así los 10 servicios que lo importan de ahí no cambian.
- `ErrorApi extends ErrorNegocio`: todo `catch` que hoy trata un `ErrorNegocio` (mensaje en un toast) trata igual un error de la API. Las pantallas no se enteran del cambio, que es el objetivo del ticket.

### 2.3 Interruptor por servicio (`src/services/_modo.ts`, nuevo)

```ts
// VITE_USAR_API: 'false' (default) | 'true' (todos) | lista separada por comas: 'auth,files'
export type NombreServicio = 'auth' | 'files' | 'hojasRuta' | 'pases' | 'dictamenes' | 'documentos' | 'reportes' | 'usuarios' | 'bitacora';
export const usaApi = (servicio: NombreServicio, valor = import.meta.env.VITE_USAR_API): boolean
export const todoMock = (valor = …): boolean      // ningún servicio usa la API
```

**Patrón para cada servicio** (este ticket lo aplica solo a `auth`):

```
services/auth.service.ts   → export const authService: ServicioAuth = usaApi('auth') ? authApi : authMock;
services/auth.mock.ts      → el objeto actual, sin cambios de comportamiento
services/auth.api.ts       → implementación con `api`
```

`ServicioAuth` es el tipo del objeto mock (`typeof authMock`), así que la versión API está obligada por el
compilador a tener la misma firma. **Por qué decidir al cargar el módulo y no en cada llamada:** el
valor sale de una variable de build (`import.meta.env`) que no cambia en ejecución, y Vite descarta del
bundle la rama que no se usa.

### 2.4 `authApi` (sin inventar contratos)

| Método                   | Implementación                                             | Por qué                                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `login(usuario, clave)`  | `POST /auth/login` con `{ usuario, clave }` → `Usuario`    | Endpoint del PRD §5. El cuerpo y la respuesta usan los nombres del contrato actual del frontend (`src/types`); **el SDD de S1.3 confirma o ajusta el contrato** y este archivo se adapta allí. |
| `logout(u)`              | `POST /auth/logout`                                        | PRD §5.                                                                                                                                                                                        |
| `obtener(id)`            | lanza `ErrorApi('…disponible en S1.x', 'NO_IMPLEMENTADO')` | El PRD no define el endpoint (con cookies será "usuario de la sesión", sin id). Lo define S1.x.                                                                                                |
| `cambiarClave(u, nueva)` | ídem `NO_IMPLEMENTADO`                                     | Sin endpoint en el PRD.                                                                                                                                                                        |
| `usuariosDemo()`         | `[]`                                                       | Con la API no hay usuarios de demostración.                                                                                                                                                    |

Con `VITE_USAR_API=true`, el login llama a la API y hoy recibe **404** (`NO_ENCONTRADO`, formato único de
S0.7), que llega a la pantalla de login como mensaje. Es lo que pide la DoD.

### 2.5 Vite, TanStack Query y demo

- `vite.config.ts`: `server.proxy['/api'] = { target: process.env.API_PROXY ?? 'http://localhost:3000', changeOrigin: false }`.
- `main.tsx`: `QueryClientProvider` con un `QueryClient` creado en `src/lib/consultas.ts`:
  - `retry`: 1 para errores de red; 0 para errores 4xx de `ErrorApi`, porque reintentar un 422 no tiene sentido.
  - `refetchOnWindowFocus: false`: evita recargas inesperadas en conexiones lentas (R4, Ancocagua).
  - `staleTime: 30_000`.
- "Reiniciar datos de demo" (`Header.tsx`) y el bloque de usuarios demo de `Login.tsx` se muestran solo si `VITE_DEMO === 'true'` **y** `todoMock()`.
- `.env.example` de la web: `VITE_USAR_API=false` y `VITE_API_URL=` (vacío → `/api/v1`), con comentarios.
- Tipos de `import.meta.env` en `vite-env.d.ts`.

---

## 3 · Cambios por archivo/módulo

| Archivo                                                                 | Cambio                                                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `apps/web/package.json`                                                 | Dependencias `axios`, `@tanstack/react-query`; dev `vitest`; script `test: vitest run`.  |
| `apps/web/vitest.config.ts`                                             | **Nuevo**: alias `@`, entorno `node`, `include: ['src/**/*.test.ts']`.                   |
| `apps/web/vite.config.ts`                                               | Proxy `/api` (§2.5).                                                                     |
| `apps/web/src/lib/errores.ts`                                           | **Nuevo** (§2.2).                                                                        |
| `apps/web/src/lib/transiciones.ts`                                      | `ErrorNegocio` → reexport desde `./errores`.                                             |
| `apps/web/src/lib/api.ts`                                               | **Nuevo** (§2.1).                                                                        |
| `apps/web/src/lib/consultas.ts`                                         | **Nuevo**: `crearQueryClient()`.                                                         |
| `apps/web/src/main.tsx`                                                 | `QueryClientProvider`.                                                                   |
| `apps/web/src/services/_modo.ts`                                        | **Nuevo** (§2.3).                                                                        |
| `apps/web/src/services/auth.mock.ts`                                    | El `authService` actual, renombrado `authMock` (sin cambios de lógica).                  |
| `apps/web/src/services/auth.api.ts`                                     | **Nuevo** (§2.4).                                                                        |
| `apps/web/src/services/auth.service.ts`                                 | Elige entre mock y API.                                                                  |
| `apps/web/src/components/layout/Header.tsx`, `pages/publicas/Login.tsx` | Condición de demo con `todoMock()`.                                                      |
| `apps/web/src/vite-env.d.ts`                                            | Tipos de `VITE_USAR_API`, `VITE_API_URL`, `VITE_DEMO` y `VITE_PUBLIC_URL`.               |
| `apps/web/.env.example`                                                 | §2.5.                                                                                    |
| `apps/web/src/**/*.test.ts`                                             | **Nuevos** (§4).                                                                         |
| `README.md`                                                             | Cómo cambiar un servicio de mock a API.                                                  |
| `docs/sdd/S0.10/SDD.md`                                                 | Sin cambios (está implementado); la corrección del diferimiento queda en §1 de este SDD. |

Commits en `feat/S0.8-axios-servicios`: `S0.8 SDD`, `S0.8 cliente Axios, ErrorApi e interruptor mock/API`, `S0.8 authService con implementación de API y TanStack Query`, `S0.8 tests de la web`.

---

## 4 · Plan de tests

**Unitarios (Vitest en `apps/web`, sin red: Axios con un `adapter` falso):**

| Caso                                                                                                                                                        | Cubre                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `aErrorApi` con `{ error: { code, message, details } }` → `ErrorApi` con el mismo mensaje, código, estado y detalles                                        | §2.1                  |
| Respuesta sin formato único (HTML de un 502) → `ERROR_SERVIDOR`                                                                                             | §2.1                  |
| Sin respuesta → `SIN_CONEXION`; timeout → `TIEMPO_AGOTADO`                                                                                                  | RNF-12                |
| `ErrorApi` es `instanceof ErrorNegocio` y `instanceof Error`                                                                                                | Pantallas sin cambios |
| `api` usa `/api/v1` y `withCredentials`                                                                                                                     | §2.1                  |
| `usaApi`: `'false'`, vacío → mock; `'true'` → todos; `'auth,files'` → solo esos (con espacios y mayúsculas tolerados); un nombre desconocido no activa nada | §2.3                  |
| `authApi.login` hace `POST /auth/login` con `{ usuario, clave }`; un 404 de la API llega como `ErrorApi` `NO_ENCONTRADO`                                    | DoD                   |
| `authApi.obtener` y `cambiarClave` → `NO_IMPLEMENTADO`; `usuariosDemo()` → `[]`                                                                             | §2.4                  |
| `crearQueryClient`: no reintenta un `ErrorApi` 422 y sí uno `SIN_CONEXION` (una vez)                                                                        | §2.5                  |

**E2E (scripts de Chrome headless de S0.3/S0.10, resultados en el PR):**

| Caso                                                                                                                                        | Cubre                             |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Con `VITE_USAR_API=false`: recorrido de 6 roles (43 pantallas) idéntico a `main` y flujos interactivos en verde                             | DoD "funciona igual que hoy"      |
| Con `VITE_USAR_API=auth` y la API de S0.7 corriendo (vía proxy): el login muestra el error de la API (404 → mensaje) y no hay botón de demo | DoD "authService apunta a la API" |

**Gate:** `grep -r "@/mocks" src/pages src/components src/hooks src/context` vacío (DoD); y la CI corre
los tests de la web, porque el `npm test` de la raíz recorre los workspaces.

---

## 5 · Definition of Done

- [ ] SDD con Estado = `Aprobado (fecha)`
- [ ] `VITE_USAR_API=false`: prototipo idéntico (recorrido + flujos)
- [ ] `VITE_USAR_API=true` o `auth`: el login llama a `POST /api/v1/auth/login` (404 hasta S1.3)
- [ ] Ninguna pantalla importa `@/mocks/*`
- [ ] Tests de §4 en verde; CI en verde
- [ ] PR a `main`; S0.8 en ClickUp → "necesita revisión"

---

## 6 · Riesgos

| Riesgo                                                                           | Gravedad | Mitigación                                                                                              |
| -------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| El contrato de `/auth/login` de S1.3 difiere de `{ usuario, clave }` → `Usuario` | Media    | Está aislado en `auth.api.ts`; el SDD de S1.3 lo fija y ajusta ese archivo. Queda anotado en el ticket. |
| Dos mecanismos de datos (`useAsync` y TanStack Query) conviviendo                | Baja     | Es temporal y explícito (§1); cada ticket "conectar" migra su pantalla.                                 |
| `import.meta.env` en los tests de Vitest                                         | Baja     | `usaApi` recibe el valor como parámetro (con el entorno como default), y los tests lo pasan explícito.  |

---

## 7 · Preguntas abiertas

_(Ninguna nueva.)_ El contrato de autenticación (cuerpo y respuesta de login, sesión por cookie) lo
define S1.3 (RF-01, RNF-02, D-14 y D-25).
