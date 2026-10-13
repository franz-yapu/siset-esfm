# SDD — S0.3 · Monorepo con `apps/api`, lint, formato y Husky

- **Ticket:** ClickUp **S0.3** (`868mgh27z`, https://app.clickup.com/t/868mgh27z).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` §5 (Stack; RNF-07, RNF-09)
  2. `docs/product/PRD.md` §6 (Definición de Terminado)
  3. `docs/adr/0001-monolito-modular.md` (estructura y reglas de frontera)
  4. `docs/decisions/LOG.md` — DEC-002 (regla de fronteras en S0.3), DEC-004 (versiones más actuales; reemplaza DEC-003)
  5. `docs/planning/2026-10-12-tickets/S0.3-monorepo.json` (cuerpo del ticket)

---

## 1 · Alcance

### Entra

- `package.json` raíz con npm workspaces (`apps/*`) y un único `package-lock.json`.
- `tsconfig.base.json` con las opciones estrictas compartidas; `apps/web` hereda de él.
- `apps/api`: esqueleto Express + TypeScript estricto con la estructura de
  ADR-0001 (`compartido/`, `modulos/`), sin rutas de negocio.
- ESLint (flat config) para todo el repo, con la **regla de fronteras entre
  módulos** de ADR-0001 aplicada a `apps/api`.
- Prettier y un commit único de formateo del código existente.
- Husky + lint-staged en el pre-commit.
- Vitest en `apps/api`, con un test de humo y los tests de la regla de fronteras.
- Gate en la raíz: `typecheck`, `lint`, `test` y `build`.

### No entra (a propósito)

- `GET /api/v1/health`, el middleware de errores, Zod, Helmet, CORS, el logger y Swagger → **S0.7**.
- Docker Compose → S0.4. GitHub Actions → S0.5. Prisma → S0.6.
- Tests de `apps/web` (no hay; agregar Vitest a web queda para S0.8 o cuando haya lógica que probar).
- Detección de ciclos entre módulos (regla 5 de ADR-0001): ver §6.
- Cambios de comportamiento en `apps/web`: solo cambian su configuración y el formateo.

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket | Qué hay de verdad en el repo |
|---|---|
| No hay `package.json` raíz ni linter | ✅ Cierto. |
| Reusar `apps/web/tsconfig.app.json` (`strict`, alias `@/*`) | ✅ Existe, con `moduleResolution: "bundler"`. La base compartida lleva solo las opciones de rigor; la resolución de módulos queda en cada app. |
| `eslint-disable` de `exhaustive-deps` en `apps/web/src/hooks/index.ts` | ✅ Línea 66. Con `eslint-plugin-react-hooks` la directiva sigue siendo válida (si no lo fuera, ESLint avisa "unused directive"). |
| `.gitignore` raíz ignora `node_modules`, `dist`, `.env` | ✅ Cierto. |
| "Esqueleto Node 20" | ⚠️ Node 20 no tiene soporte desde abr-2026. Se usa **Node 26** (DEC-004). La máquina local tiene Node 22.21: hay que instalar 26 (`nvm install 26`). |
| `npm test` en la raíz | ⚠️ No hay ningún test ni runner. Este ticket instala Vitest en `apps/api`. |
| `npm install` en la raíz instala ambos workspaces | ⚠️ `apps/web` tiene su propio `package-lock.json` y `node_modules`; se eliminan a favor de los de la raíz. |
| Esqueleto de la API "sin rutas" | ⚠️ Ampliado por DEC-002: la regla de fronteras se configura aquí, así que se crean las carpetas de ADR-0001. |
| `npm run lint` pasa sobre `apps/web` | ❓ No se pudo verificar antes de instalar ESLint (ver §6). |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo | Rol en este ticket | API pública que agrega o consume (`index.ts`) | Tablas propias que toca |
|---|---|---|---|
| — | Ninguno. Solo se crean `src/compartido/` y `src/modulos/` vacíos (con `.gitkeep`) | — | — |

### 2.1 Workspaces

- **npm workspaces**, no pnpm/turbo: npm ya está instalado y en uso (`apps/web`
  tiene un lock de npm) y dos paquetes no justifican otra herramienta.
- Nombres de paquete: `@siset/web` (ya existe) y `@siset/api`.
- `engines.node: ">=26"` y `.nvmrc` con `26` (DEC-004). El script `prepare` no valida la versión; `engine-strict=true` en `.npmrc` hace que `npm install` falle con un Node viejo.
- Scripts de la raíz:

| Script | Comando | Por qué |
|---|---|---|
| `dev` | `concurrently -n web,api "npm:dev -w @siset/web" "npm:dev -w @siset/api"` | `npm run --workspaces` corre en serie, y dos servidores en serie se bloquean entre sí. |
| `typecheck` | `npm run typecheck --workspaces --if-present` | |
| `lint` | `eslint . --max-warnings=0` | Una sola configuración en la raíz; las advertencias también hacen fallar el gate. |
| `format` / `format:check` | `prettier --write .` / `prettier --check .` | |
| `test` | `npm run test --workspaces --if-present` | `apps/web` no tiene script `test` por ahora. |
| `build` | `npm run build --workspaces --if-present` | |
| `prepare` | `husky` | Instala los hooks al hacer `npm install`. |

### 2.2 TypeScript

- `tsconfig.base.json` en la raíz: `strict`, `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch`,
  `noUncheckedSideEffectImports`, `isolatedModules`, `skipLibCheck`,
  `moduleDetection: "force"`. Son las opciones que ya usa web; así no cambia
  nada para web.
- `apps/web/tsconfig.app.json` y `tsconfig.node.json` agregan
  `"extends": "../../tsconfig.base.json"` y conservan sus propias opciones
  (`lib`, `jsx`, `paths`, `tsBuildInfoFile`).
- `apps/api/tsconfig.json`: extiende la base; `target: ES2024`,
  `module: ESNext`, `moduleResolution: "bundler"`, `noEmit`, `paths: { "@/*": ["src/*"] }`,
  `types: ["node"]`; incluye `src` y `test`.

**Por qué `bundler` y no `NodeNext` en la API:** con `NodeNext` hay que
escribir `.js` en cada import relativo, y `tsc` no reescribe los alias `@/*`;
habría que sumar `tsc-alias`. En cambio, compilando con **tsdown** (Rolldown, el mismo motor de Vite 8)
y ejecutando en desarrollo con **tsx**, los alias se resuelven en la
compilación y el código de la API se escribe igual que el de web. `tsc` queda
solo para el typecheck.

### 2.3 `apps/api`

- `package.json`: `"type": "module"`. Scripts: `dev: tsx watch src/servidor.ts`,
  `build: tsdown`, `start: node dist/servidor.js`, `typecheck: tsc --noEmit`,
  `test: vitest run`.
- Dependencias: `express@5` (los errores de handlers `async` llegan solos al
  middleware de errores de S0.7, sin wrappers). Dev: `typescript`, `tsx`,
  `tsdown`, `vitest`, `supertest`, `@types/express`, `@types/supertest`, `@types/node`.
- `tsdown.config.ts`: entrada `src/servidor.ts`, `format: esm`, `target: node26`,
  `outDir: dist`, `clean: true`.
- `vitest.config.ts`: alias `@` → `src`, `environment: node`.
- `src/app.ts` exporta `crearApp(): Express`. Hoy solo crea la app con
  `express.json()`; S0.7 le agrega middlewares y los routers de los módulos.
  Se separa de `servidor.ts` para que los tests usen la app sin abrir un puerto.
- `src/servidor.ts`: lee `PORT` (por defecto `3000`) y llama a `crearApp().listen`.
  No usa logger todavía (S0.7): un `console.info` de arranque, con un
  `eslint-disable-next-line no-console` justificado.
- `.env.example` con `PORT=3000`.

### 2.4 ESLint (flat config, `eslint.config.js` en la raíz)

Bloques:

1. `ignores`: `**/dist`, `**/node_modules`, `**/coverage`.
2. `@eslint/js` recomendado + `typescript-eslint` recomendado (sin type-checked:
   es más rápido en el pre-commit, y `tsc` ya cubre los tipos), sobre `**/*.{ts,tsx}`.
   Se agregan `@typescript-eslint/no-explicit-any: error` (CLAUDE.md: sin `any`)
   y `no-console: warn` (que con `--max-warnings=0` también bloquea).
3. `apps/web/**/*.{ts,tsx}`: `eslint-plugin-react-hooks` recomendado y
   `globals.browser`.
4. `apps/api/**/*.ts`: `globals.node`.
5. **Fronteras (ADR-0001)** con `no-restricted-imports` (regla de ESLint, sin plugins):

| Archivos | Patrón prohibido | Mensaje |
|---|---|---|
| `apps/api/src/**` | `@/modulos/*/*` | "Importá el módulo por su index: `@/modulos/<modulo>` (ADR-0001)." |
| `apps/api/src/modulos/**` | `../*` | "Desde un módulo no se sale con rutas relativas: usá `@/modulos/<modulo>` o `@/compartido/...` (ADR-0001)." |
| `apps/api/src/compartido/**` | `@/modulos`, `@/modulos/*`, `**/modulos/*` | "`compartido/` no depende de ningún módulo (ADR-0001)." |

   Consecuencia: dentro de un módulo solo se usan imports `./archivo`; a otro
   módulo, `@/modulos/<x>`; a lo transversal, `@/compartido/...`. ADR-0001
   define los módulos como carpetas planas, así que prohibir `../` no
   molesta. Si un módulo necesitara subcarpetas, se revisa la regla con un SDD.
6. `eslint-config-prettier` al final, para apagar las reglas de estilo que
   decide Prettier.

### 2.5 Prettier

`.prettierrc.json`: `singleQuote: true`, `semi: true`, `trailingComma: "all"`,
`printWidth: 120`. Se toma del estilo actual de web (comillas simples, punto y
coma). Hay 889 líneas de más de 100 columnas; 120 reduce el reformateo.

`.prettierignore`: `dist`, `coverage`, `package-lock.json`, `docs/planning`
(los artefactos generados no se tocan a mano), `_templates`.

**Formateo del código existente en un commit aparte**, que solo contiene
`prettier --write .`, y su hash va en `.git-blame-ignore-revs`. Sin esto,
el primer cambio a cualquier archivo de web mezclaría lógica con cientos de
líneas reformateadas por lint-staged.

### 2.6 Husky + lint-staged

- `.husky/pre-commit`: `npx lint-staged`.
- `lint-staged` (en el `package.json` raíz):
  - `*.{ts,tsx,js}` → `eslint --max-warnings=0 --fix`, luego `prettier --write`.
  - `*.{json,md,css,html,yml,yaml}` → `prettier --write`.
- El typecheck no va en el pre-commit (es lento y no se puede limitar a los
  archivos staged); lo cubren el gate y la CI (S0.5).

### 2.7 Versiones (DEC-004)

La última estable mayor de cada herramienta, todas con licencia MIT,
Apache o ISC (RNF-09):

| Paquete | Versión | Paquete | Versión |
|---|---|---|---|
| typescript | ^6.0.3 (no 7: ver DEC-004) | express | ^5.3 |
| eslint | ^10.12 | tsx | ^4.23 |
| typescript-eslint | ^8.71 | tsdown | ^0.23 |
| eslint-plugin-react-hooks | ^7.1 | vitest | ^5.0 |
| globals | ^17 | supertest | ^7.3 |
| eslint-config-prettier | ^10.1 | @types/node | ^26 |
| prettier | ^3.9 | @types/express | ^5.0 |
| husky | ^9.1 | concurrently | ^10 |
| lint-staged | ^17 | | |

`apps/web` mantiene las versiones que tiene hoy (React 18, Vite 6). Su
actualización es **S0.10** (DEC-004), con su propio SDD, para que este PR no
mezcle infraestructura con cambios en 27 pantallas. Como web también usa la
base `typescript` de la raíz, en S0.3 queda con TS 6.0. Si TS 6 genera errores
en web, se corrigen aquí (son de tipos, no de comportamiento).

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo | Cambio |
|---|---|
| `package.json` (raíz) | **Nuevo.** `private`, workspaces `apps/*`, `engines`, scripts §2.1, `lint-staged`, devDeps de lint/formato/hooks/concurrently. |
| `package-lock.json` (raíz) | **Nuevo**, lo genera `npm install`. |
| `apps/web/package-lock.json` | **Se elimina.** |
| `apps/web/node_modules/` | **Se elimina** antes del `npm install` de la raíz (está ignorado; no aparece en el diff). |
| `.nvmrc`, `.npmrc` | **Nuevos:** `26` y `engine-strict=true`. |
| `tsconfig.base.json` | **Nuevo** (§2.2). |
| `apps/web/tsconfig.app.json`, `apps/web/tsconfig.node.json` | Agregan `extends`; se quitan las opciones repetidas de la base. Sin cambio de comportamiento. |
| `apps/web/package.json` | Sin cambios de scripts. Se mantiene `typecheck: tsc -b`. |
| `eslint.config.js` | **Nuevo** (§2.4). |
| `.prettierrc.json`, `.prettierignore` | **Nuevos** (§2.5). |
| `.husky/pre-commit` | **Nuevo** (§2.6). |
| `.git-blame-ignore-revs` | **Nuevo**, con el hash del commit de formateo. |
| `apps/api/package.json`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`, `.env.example` | **Nuevos** (§2.3). |
| `apps/api/src/app.ts`, `apps/api/src/servidor.ts` | **Nuevos** (§2.3). |
| `apps/api/src/compartido/.gitkeep`, `apps/api/src/modulos/.gitkeep` | **Nuevos.** |
| `apps/api/test/app.test.ts` | **Nuevo** (§4). |
| `apps/api/test/fronteras.test.ts` | **Nuevo** (§4). |
| `README.md` (raíz) | Sección "Desarrollo": Node 26, `npm install`, `npm run dev`, el gate. |
| Código de `apps/web/src/**` | Solo el commit de formateo, más las correcciones de lint mínimas que exija §6 (sin cambiar el comportamiento). |

Orden de commits en `feat/S0.3-monorepo`:
1. `S0.3 agrega workspaces, TypeScript base y esqueleto de apps/api`
2. `S0.3 configura ESLint con fronteras de módulos, Prettier y Husky`
3. `S0.3 formatea el código existente con Prettier` (solo formato)
4. `S0.3 registra el commit de formateo en .git-blame-ignore-revs`

---

## 4 · Plan de tests

| Caso | Nivel | Cubre |
|---|---|---|
| `crearApp()` responde 404 a una ruta inexistente (`supertest`) | integración (api) | El esqueleto arranca y Express 5 + TS + alias + Vitest funcionan de punta a punta. |
| Un import `@/modulos/pases/pases.repositorio` desde `src/modulos/hojas-ruta/x.ts` da error de `no-restricted-imports` | unit (ESLint API, `lintText`) | Regla 1 de ADR-0001. |
| Un import `../pases` desde `src/modulos/hojas-ruta/x.ts` da error | unit (ESLint API) | Que no se pueda saltar la frontera con rutas relativas. |
| Un import `@/modulos/seguridad` desde `src/compartido/http/x.ts` da error | unit (ESLint API) | Regla 4 de ADR-0001. |
| Imports permitidos (`@/modulos/pases`, `./pases.servicio`, `@/compartido/errores`) desde un módulo no dan errores | unit (ESLint API) | Que la regla no tenga falsos positivos. |
| `npm run lint` en la raíz termina en 0 sobre el repo actual | gate manual | DoD del ticket. |
| Un archivo con error de lint staged hace fallar `git commit` | prueba manual (se documenta en el PR) | DoD: "el pre-commit bloquea". |

`fronteras.test.ts` instancia `new ESLint({ cwd: <raíz del repo> })` y usa
`lintText(código, { filePath })` con rutas virtuales. No crea archivos ni
depende de módulos reales, así que sigue válido cuando se agreguen módulos.

**Deliberadamente sin test:**
- El hook de Husky no se prueba automáticamente: probar git hooks dentro de
  Vitest exige crear repos temporales y es frágil. Se verifica a mano una
  vez (DoD) y el gate de la CI (S0.5) cubre el mismo riesgo.
- `apps/web` queda sin tests: este ticket no cambia su comportamiento, y el
  `typecheck` + `build` del gate prueban que la nueva configuración no la rompe.

---

## 5 · Definition of Done

- [ ] SDD con Estado = `Aprobado (fecha)`
- [ ] `npm install` en la raíz instala ambos workspaces; ya no existe `apps/web/package-lock.json`
- [ ] `npm run dev` levanta web (Vite) y api (tsx) a la vez
- [ ] `npm run lint` pasa sin errores ni advertencias sobre el código actual de `apps/web`
- [ ] La directiva `eslint-disable` de `apps/web/src/hooks/index.ts:66` sigue siendo válida
- [ ] Los tests de fronteras rechazan los 3 imports prohibidos y aceptan los permitidos
- [ ] El pre-commit bloquea un archivo con error de lint (verificado a mano y anotado en el PR)
- [ ] El commit de formateo solo cambia formato y está en `.git-blame-ignore-revs`
- [ ] `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` en verde desde la raíz
- [ ] `npm run build -w @siset/web` produce el mismo bundle funcional (se revisan a mano 2 o 3 pantallas en `vite preview`)
- [ ] Commits `S0.3 …` en `feat/S0.3-monorepo`, con PR a `main`

---

## 6 · Riesgos

| Riesgo | Gravedad | Mitigación |
|---|---|---|
| `npm run lint` encuentra muchos errores en las 27 pantallas del prototipo (sobre todo `react-hooks`) | Media: puede pasarse de las 3 h | Se corrigen los triviales sin cambiar el comportamiento. Si son más de ~20 no triviales, se apaga **esa regla puntual** para `apps/web` con un comentario que apunte a un ticket nuevo, en vez de reescribir pantallas en S0.3. |
| El formateo masivo genera conflictos con ramas abiertas | Baja: hoy no hay otras ramas | Se hace ahora, antes de que existan ramas paralelas, en un commit aislado. |
| `extends` de la base cambia algo del typecheck de web | Baja | La base solo tiene opciones que web ya usa; `npm run typecheck` y `build` de web en el gate. |
| La regla de fronteras no detecta ciclos entre módulos (regla 5 de ADR-0001) | Baja hasta que haya más de 3 módulos | Se acepta por ahora. Cuando existan varios módulos (Ola 2) se evalúa `eslint-plugin-import-x/no-cycle` (MIT) en un ticket aparte; hoy no hay nada que analizar. |
| Prohibir `../` dentro de los módulos impide crear subcarpetas | Baja | ADR-0001 define módulos planos. Si alguno crece, se ajusta la regla con un SDD. |
| Node 26 todavía no es LTS (pasa a fines de oct-2026) | Baja | El Go-Live (ene-2027) ya es con 26 en LTS. Si algo falla antes, volver a 24 LTS es tocar `.nvmrc`, `engines` y `target`. |
| `eslint-plugin-react-hooks` 7 incluye las reglas del React Compiler (`set-state-in-effect`, `refs`, `purity`…), mucho más estrictas que la v5 | Media | Misma mitigación que el riesgo de lint de web: corregir lo trivial y, si hay muchos casos, apagar la regla puntual en web con referencia a S0.10. |
| tsdown todavía es 0.x | Baja | Solo compila un archivo de entrada. Si se rompe, `tsc` + `tsc-alias` es el plan B y no toca código. |
| TypeScript 6 cambia defaults/deprecaciones respecto de 5.6 en web | Baja | `typecheck` de web en el gate; se corrigen tipos sin cambiar comportamiento. |

---

## 7 · Preguntas abiertas

*(Ninguna.)* La estructura viene de ADR-0001 / DEC-002 y las versiones de
DEC-004. El salto a TypeScript 7 queda a la espera de que typescript-eslint
lo soporte (anotado en DEC-004).
