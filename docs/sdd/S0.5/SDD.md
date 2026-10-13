# SDD — S0.5 · CI en GitHub Actions y protección de `main`

- **Ticket:** ClickUp **S0.5** (`868mgh285`, https://app.clickup.com/t/868mgh285).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-13)
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` §6 (DoD: "pruebas pasan en CI"; código en `main` vía PR revisado)
  2. `docs/decisions/LOG.md` — DEC-004 (Node 26), DEC-005 (PostgreSQL 18)
  3. `docs/sdd/S0.6/SDD.md` v1.1 §2.7 (`test:bd` con base temporal por corrida) y comentario del ticket S0.5 en ClickUp
  4. `docs/planning/2026-10-12-tickets/S0.5-ci.json`

---

## 1 · Alcance

### Entra

- `.github/workflows/ci.yml` con dos jobs:
  - **`calidad`**: formato, lint, tipos, tests unitarios y de HTTP, build y audit de dependencias.
  - **`base-de-datos`**: migraciones, seed y `test:bd` contra un servicio PostgreSQL 18.
- Protección de `main` (ruleset de GitHub): PR obligatorio, con los dos jobs en verde y sin push directo.
- Verificar que la CI sirve: un PR de prueba con un error de tipos tiene que quedar en rojo, y después se cierra.
- Badge de CI en el README.

### No entra (a propósito)

- Despliegue (CD) a staging → S0.9.
- Tests E2E con Playwright → cuando existan flujos conectados a la API.
- Imagen Docker de la API → S0.4.

### Premisas verificadas (`task-brief`)

| Premisa del ticket                  | Qué hay de verdad                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| "Crear el repo remoto y hacer push" | ✅ Ya hecho: `franz-yapu/siset-esfm`, con `main` y PRs #1 a #4. ⚠️ El repo es **público** (ver §7).                             |
| Node 20                             | ⚠️ Node 26 (DEC-004). `setup-node` lo lee de `.nvmrc`.                                                                          |
| `postgres:16`                       | ⚠️ `postgres:18-alpine` (DEC-005).                                                                                              |
| Comandos del gate                   | ✅ `npm ci`, `lint`, `typecheck`, `test` y `build` existen en la raíz; más `prettier --check` y `test:bd` (S0.6).               |
| Tests de BD                         | ✅ `test:bd` crea y elimina su propia base `siset_test_<id>`; en la CI solo necesita `DATABASE_URL_TEST` apuntando al servicio. |
| Protección de rama                  | ✅ El repo es público, así que los rulesets están disponibles en el plan gratuito.                                              |
| Versiones de las acciones           | ✅ `actions/checkout` v7.0.1 y `actions/setup-node` v7.1.0 (releases del 2026-10-13).                                           |

---

## 2 · Diseño técnico

### 2.1 Workflow (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
permissions: { contents: read }          # mínimo privilegio
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
env:
  HUSKY: '0'                              # sin hooks de git en la CI
jobs:
  calidad:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - checkout (SHA fijado, comentario con v7.0.1)
      - setup-node (SHA fijado, v7.1.0) con node-version-file: .nvmrc y cache: npm
      - npm ci                            # postinstall genera el cliente Prisma
      - npx prettier --check .
      - npm run lint
      - npm run typecheck
      - npm test
      - npm run build
      - npm audit --audit-level=high      # falla con vulnerabilidades altas o críticas
  base-de-datos:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:18-alpine
        env: { POSTGRES_USER: siset, POSTGRES_PASSWORD: siset_ci, POSTGRES_DB: siset }
        ports: ['5432:5432']
        options: --health-cmd "pg_isready -U siset" --health-interval 5s --health-timeout 3s --health-retries 10
    env:
      DATABASE_URL: postgresql://siset:siset_ci@localhost:5432/siset
      DATABASE_URL_TEST: postgresql://siset:siset_ci@localhost:5432/siset_test
      SEED_KARDEX_CI: '9000001'
      SEED_KARDEX_PASSWORD: ci12345678
    steps:
      - checkout, setup-node, npm ci (igual que arriba)
      - npm run bd:desplegar -w @siset/api   # migrate deploy sobre la base limpia
      - npm run bd:seed -w @siset/api        # seed
      - npm run bd:seed -w @siset/api        # seed otra vez: idempotencia en la base real
      - npm run test:bd -w @siset/api
```

Decisiones y por qué:

- **Dos jobs en paralelo:** `calidad` no necesita base de datos y termina antes; separados, el PR muestra qué falló.
- **Acciones fijadas por SHA** (con el tag en un comentario) y no por `@v7`: un tag se puede mover, un SHA no. Es la defensa estándar contra ataques a la cadena de suministro.
- **`npm audit --audit-level=high`:** hoy solo queda una moderada (`react-router`, S0.10), así que pasa. Una alta nueva bloquea el PR, como pasó con `deepmerge-ts` y `mysql2` en S0.7, que se detectaron a mano.
- **El seed se corre dos veces sobre la base real:** prueba que funciona en un entorno limpio, no solo en las máquinas de desarrollo.
- **Credenciales de la CI:** son de un contenedor efímero y nunca salen del runner, así que no hacen falta _secrets_. La contraseña de prueba cumple la regla de business-rules.
- **`permissions: contents: read`:** el workflow no puede escribir en el repo.

### 2.2 Protección de `main` (ruleset, vía `gh api`)

| Regla                                   | Valor                                                      | Por qué                                                                                                                |
| --------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Objetivo                                | rama por defecto (`main`)                                  | —                                                                                                                      |
| Exigir PR                               | sí, con **0 aprobaciones obligatorias**                    | Hay un solo desarrollador y GitHub no deja aprobar el propio PR. La revisión la hace el responsable, como hasta ahora. |
| Checks obligatorios                     | `calidad` y `base-de-datos`, con la rama al día con `main` | DoD del PRD §6                                                                                                         |
| Bloquear force-push y borrado de `main` | sí                                                         | Proteger el historial                                                                                                  |
| Bypass                                  | ninguno                                                    | Nadie puede saltarse la CI, tampoco el dueño                                                                           |

Se aplica **después** de que la CI corra en verde por primera vez: el ruleset necesita los nombres reales
de los checks.

### 2.3 Badge

`[![CI](https://github.com/franz-yapu/siset-esfm/actions/workflows/ci.yml/badge.svg)](…/actions/workflows/ci.yml)`
al inicio del README.

---

## 3 · Cambios por archivo/módulo

| Archivo                          | Cambio                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`       | **Nuevo** (§2.1).                                                                             |
| `README.md`                      | Badge (§2.3) y una línea en "Gate de calidad": la CI corre lo mismo más `test:bd` y el audit. |
| Configuración del repo en GitHub | Ruleset de `main` (§2.2). **Requiere autorización: es un cambio de configuración del repo.**  |

Commits en `feat/S0.5-ci`: `S0.5 SDD`, `S0.5 workflow de CI con jobs de calidad y base de datos`, `S0.5 badge de CI en el README`.

---

## 4 · Plan de tests

La "prueba" de una CI es verla correr. No se agregan tests de Vitest.

| Caso                                              | Cómo se verifica                                                                                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El PR de S0.5 queda en verde (ambos jobs)         | `gh pr checks`                                                                                                                                                                                                                        |
| `test:bd` corre de verdad en la CI (no se saltea) | El log del job muestra los tests de BD pasados                                                                                                                                                                                        |
| **Un error de tipos deja el PR en rojo** (DoD)    | Rama temporal `prueba/ci-rojo` desde `feat/S0.5-ci` con `const x: number = 'texto'` en un archivo de `apps/api/src`; se abre un PR borrador, se confirma que `calidad` falla en `typecheck`, y **se cierra el PR y se borra la rama** |
| Push directo a `main` rechazado                   | Después del ruleset: `git push --dry-run` no sirve (no lo valida el servidor). Se confirma leyendo el ruleset con `gh api …/rulesets`                                                                                                 |
| `main` en verde después del merge                 | `gh run list --branch main`                                                                                                                                                                                                           |

---

## 5 · Definition of Done

- [ ] SDD con Estado = `Aprobado (fecha)`
- [ ] Workflow en verde en el PR de S0.5 (`calidad` y `base-de-datos`)
- [ ] PR de prueba con error de tipos en rojo, cerrado y rama borrada
- [ ] Ruleset de `main` activo (PR + checks obligatorios, sin force-push)
- [ ] CI en verde en `main` después del merge
- [ ] Badge en el README
- [ ] S0.5 en ClickUp → "necesita revisión"

---

## 6 · Riesgos

| Riesgo                                                                              | Gravedad | Mitigación                                                                                                 |
| ----------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| Node 26 no está en la caché de `setup-node` del runner                              | Baja     | `setup-node` lo descarga de nodejs.org; solo suma unos segundos.                                           |
| npm 11 bloquea los scripts de instalación también en la CI                          | Baja     | Ya probado localmente: `npm ci` funciona y el `postinstall` del workspace (Prisma generate) sí corre.      |
| Con el ruleset, un PR con la CI caída por un problema de GitHub queda bloqueado     | Baja     | Se vuelve a correr el workflow. Sin bypass, a propósito.                                                   |
| Una vulnerabilidad alta nueva en una dependencia ajena bloquea un PR no relacionado | Media    | Es intencional (DoD de seguridad). Se resuelve con un `override` o actualizando, y queda anotado en el PR. |
| Repo público: el código y los docs del cliente están expuestos                      | Media    | Ver §7.                                                                                                    |

---

## 7 · Preguntas abiertas

1. **El repo es público.** Contiene el PRD, el registro de dudas y datos de la ESFM. Si debe ser
   privado, el cambio es del responsable, en Settings → General → Danger Zone. En privado, el ruleset de
   §2.2 requiere GitHub Pro o una organización. La CI funciona igual en ambos casos.
