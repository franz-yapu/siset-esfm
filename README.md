# SISET — Sistema de Gestión y Seguimiento de Trámites

ESFM "Mcal. Andrés de Santa Cruz y Calahumana" — Unidad Académica Ancocagua.
Digitaliza hojas de ruta, file académico y pases entre La Paz y Ancocagua.

Stack (PRD §5, D-01; versiones según DEC-004): React + Vite + TS + Tailwind ·
Node 26 + Express 5 + TS + Prisma · PostgreSQL 16 · Docker Compose + Nginx.
Backend como monolito modular (ADR-0001).

## Estructura

```
docs/
  product/PRD.md               PRD v1.0 (transcrito del .docx)
  product/scope.md             qué entra / qué no en v1.0
  product/business-rules.md    máquina de estados, semáforo, bloqueo, seguridad
  product/dudas.md             Registro de Dudas D-01..D-23 (5 bloqueantes)
  product/prototipo-pantallas.md  spec de pantallas del prototipo (primer entregable)
  product/originales/          .docx y .md tal como llegaron
  do-not-touch.md              subsistemas protegidos (propuesta)
  decisions/LOG.md             respuestas a dudas y decisiones (DEC-###)
  adr/                         decisiones de arquitectura
  planning/                    plan de sprints original + artefactos generados
  sdd/                         SDD por ticket
.claude/skills/                kit de planificación (copiado de beta-ia)
scripts/tracker/               adaptador ClickUp
_templates/                    plantillas de backlog, roadmap, tickets, SDD
apps/web/                      frontend (prototipo navegable con datos de prueba)
apps/api/                      backend — monolito modular (src/compartido, src/modulos)
```

## Desarrollo

Requiere Node 26 (`nvm use` lee `.nvmrc`). Desde la raíz:

```bash
npm install          # instala los dos workspaces y los hooks de Husky
npm run dev          # web (Vite) + api (tsx watch) a la vez
```

Gate de calidad (lo mismo que corre la CI):

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Flujo de trabajo (kit beta-ia)

1. **Prototipo** navegable con datos de prueba (`docs/product/prototipo-pantallas.md`)
   en `apps/web/` — para mostrar al cliente y cerrar dudas en el Sprint 0.
2. "usá el skill prd-to-tickets" → backlog → roadmap por olas → tickets de la Ola 1
   (pide confirmación antes de crear en ClickUp; copiar
   `scripts/tracker/clickup.json.example` → `.clickup.json`).
3. Por ticket: "usá el skill task-brief ID" → "usá el skill write-sdd ID" → SDD aprobado → código.
4. Cada respuesta del cliente a una duda → entrada `DEC-###` en `docs/decisions/LOG.md`.
