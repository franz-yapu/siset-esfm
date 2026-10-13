# SDD — S0.10 · Actualizar `apps/web` al stack vigente (DEC-004)

- **Ticket:** ClickUp **S0.10** (`868mgt162`, https://app.clickup.com/t/868mgt162).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-13)
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/decisions/LOG.md` — DEC-004 (última versión estable de cada dependencia; React 19, React Router 8, Vite 8)
  2. `docs/planning/2026-10-12-tickets/S0.10-web-stack-vigente.json`
  3. `docs/sdd/S0.3/SDD.md` §2.7 (la web quedó con sus versiones a propósito para este ticket)
  4. `npm audit` de `main` (2026-10-13): 2 moderadas en `react-router` 6 (GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg)

---

## 1 · Alcance

### Entra

- Actualizar las dependencias de `apps/web` a la última versión estable mayor (§2.1).
- `react-router-dom` 6 → **`react-router` 8**: cambiar el import en 32 archivos.
- Quitar los flags `future` de `BrowserRouter`, que eran de transición a v7 y en v8 no existen.
- Mantener el comportamiento: las 43 pantallas, recorridas por los 6 roles, deben verse y navegarse igual (§4).

### No entra (a propósito)

- Pasar al "modo framework" de React Router (data loaders, `createBrowserRouter`): sería un cambio de arquitectura del frontend. El modo declarativo (`BrowserRouter`/`Routes`) sigue siendo una opción de primera clase en v8.
- React Compiler, Server Components y otras funciones nuevas de React 19.
- Code-splitting para el aviso de bundle > 500 kB (ya existía; se trata cuando haga falta).
- TanStack Query y Axios → S0.8.
- Revisar el disable de `react-hooks/set-state-in-effect` en `useAsync`: lo reemplaza TanStack Query en S0.8 (el ticket lo pedía aquí; se difiere porque S0.8 borra ese hook).

### Premisas verificadas (prueba aislada en el scratchpad, sin tocar el repo)

Se copió `apps/web` al scratchpad, se actualizaron las versiones de §2.1 y se corrió todo:

| Premisa / riesgo del ticket                | Resultado de la prueba                                                                                                                                                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 19 rompe tipos o APIs                | ✅ **0 errores** de tipos atribuibles a React 19 (no se usa `defaultProps`, `forwardRef`, `ReactDOM.render` ni `propTypes`).                                                                                                  |
| React Router 6 → 8                         | ⚠️ **1 error**: los flags `future` de `BrowserRouter` (`main.tsx`). Todo lo demás (`Link`, `useNavigate`, `useParams`, `Navigate`, `NavLink`, `Outlet`, `useSearchParams`, `useLocation`) funciona igual cambiando el import. |
| `lucide-react` 0.460 → 1.x renombra íconos | ✅ **0 errores**: los 42 imports siguen existiendo.                                                                                                                                                                           |
| Vite 6 → 8 + `@vitejs/plugin-react` 6      | ✅ `vite.config.ts` sin cambios; build en 0,6 s (Rolldown).                                                                                                                                                                   |
| Vulnerabilidades                           | ✅ `npm audit` de la web: **0** (desaparecen las 2 moderadas de `react-router` 6).                                                                                                                                            |
| "Las 27 pantallas navegan igual"           | ✅ Recorrido en Chrome headless con los 6 roles: **43 pantallas** (cada opción del menú + el primer detalle de cada lista). Antes y después: **mismas URLs, mismos títulos, 0 errores y 0 advertencias de consola**.          |
| Node                                       | ✅ `react-router` 8 exige Node ≥ 22.22; usamos 26.                                                                                                                                                                            |

---

## 2 · Diseño técnico

### 2.1 Versiones (DEC-004, verificadas el 2026-10-13)

| Paquete                              | Antes                    | Después                  |
| ------------------------------------ | ------------------------ | ------------------------ |
| `react`, `react-dom`                 | ^18.3.1                  | ^19.3.0                  |
| `react-router-dom`                   | ^6.28.0                  | **eliminado**            |
| `react-router`                       | —                        | ^8.4.0                   |
| `lucide-react`                       | ^0.460.0                 | ^1.56.0                  |
| `chart.js` / `react-chartjs-2`       | ^4.4.6 / ^5.2.0          | ^4.5.1 / ^5.3.1          |
| `date-fns` / `qrcode.react` / `clsx` | ^4.1.0 / ^4.1.0 / ^2.1.1 | ^4.4.0 / ^4.2.0 / ^2.1.1 |
| `vite` / `@vitejs/plugin-react`      | ^6.0.3 / ^4.3.4          | ^8.3.4 / ^6.1.2          |
| `tailwindcss` / `@tailwindcss/vite`  | ^4.1.11                  | ^4.3.3                   |
| `@types/react` / `@types/react-dom`  | ^18                      | ^19.3.0                  |
| `@types/node`                        | ^22.10.1                 | ^26 (igual que la API)   |
| `typescript`                         | ~6.0.3                   | sin cambios              |

### 2.2 Cambios de código

1. `from 'react-router-dom'` → `from 'react-router'` en los 32 archivos. Es un reemplazo mecánico: en v7+ todo lo de `-dom` está en `react-router`.
2. `src/main.tsx`: `<BrowserRouter future={…}>` → `<BrowserRouter>`.
3. Nada más. Si el lint (react-hooks 7 con React 19) marcara algo nuevo, se corrige sin cambiar el comportamiento, igual que en S0.3.

**Por qué un solo PR y no paso a paso:** la prueba mostró que el cambio total es chico (1 error, 32 imports) y que las piezas dependen entre sí: `react-router` 8 exige React ≥ 19.2.7 y `plugin-react` 6 exige Vite 8. Hacerlo por partes obligaría a pasar por versiones intermedias que no se usarían.

---

## 3 · Cambios por archivo/módulo

| Archivo                               | Cambio                                         |
| ------------------------------------- | ---------------------------------------------- |
| `apps/web/package.json`               | Versiones de §2.1.                             |
| `package-lock.json`                   | Regenerado por `npm install`.                  |
| `apps/web/src/**/*.tsx` (32 archivos) | Import de `react-router-dom` → `react-router`. |
| `apps/web/src/main.tsx`               | Sin flags `future`.                            |
| `docs/sdd/S0.10/SDD.md`               | Este documento.                                |

Commits en `feat/S0.10-web-stack-vigente`: `S0.10 SDD`, `S0.10 actualiza la web a React 19, React Router 8 y Vite 8`.

---

## 4 · Plan de tests

| Caso                                                                                                                                           | Nivel                                            | Cubre                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| `typecheck`, `lint` y `build` de la web                                                                                                        | gate / CI                                        | Que compila con las versiones nuevas                              |
| `npm audit --audit-level=high` en la CI y `npm audit` sin vulnerabilidades en la web                                                           | CI / manual                                      | Cierra GHSA-wrjc-x8rr-h8h6 y GHSA-337j-9hxr-rhxg                  |
| **Recorrido por rol** en Chrome headless (6 roles, 43 pantallas) antes y después: misma URL, mismo `h1`, 0 errores y 0 advertencias de consola | e2e (script del scratchpad, resultados en el PR) | DoD "las pantallas navegan igual"                                 |
| Flujos interactivos ya probados en S0.3 (redirige sin sesión, login, recarga con sesión, lista y filtro, modal con Esc)                        | e2e (script del scratchpad)                      | Comportamiento de React 19 en `AuthContext`, `useAsync` y `Modal` |
| Ningún import de `react-router-dom` (`grep`)                                                                                                   | gate manual                                      | DoD                                                               |

**Deliberadamente sin test automatizado en el repo:** el recorrido queda como evidencia en el PR y no
como suite de Playwright. La suite E2E del proyecto (PRD §5) se arma cuando las pantallas estén
conectadas a la API (S0.8 en adelante); probar hoy los mocks del prototipo la haría descartable.

---

## 5 · Definition of Done

- [ ] SDD con Estado = `Aprobado (fecha)`
- [ ] Versiones de §2.1 instaladas; `react-router-dom` eliminado
- [ ] `npm audit` sin vulnerabilidades en `apps/web`
- [ ] Recorrido de 6 roles: 0 diferencias y 0 errores de consola frente a `main`
- [ ] Flujos interactivos de S0.3 en verde
- [ ] CI en verde (`calidad` + `base-de-datos`)
- [ ] PR a `main`; S0.10 en ClickUp → "necesita revisión"

---

## 6 · Riesgos

| Riesgo                                                                                                      | Gravedad | Mitigación                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una pantalla o interacción que el recorrido no cubre (por ejemplo, un formulario largo) cambia con React 19 | Baja     | El recorrido cubre todas las rutas del menú y sus detalles, más los flujos interactivos de S0.3. El resto de la lógica son mocks que S0.8+ reemplaza. |
| React Router 8 cambia comportamientos sutiles (rutas relativas, `splat`)                                    | Baja     | El prototipo usa rutas absolutas; el recorrido no mostró diferencias de URL.                                                                          |
| El bundle sigue > 500 kB                                                                                    | Baja     | Ya pasaba antes; es una advertencia, no un error. Se resuelve con lazy loading cuando haga falta.                                                     |

---

## 7 · Preguntas abiertas

_(Ninguna.)_
