# SISET — Sistema de Gestión y Seguimiento de Trámites

ESFM "Mcal. Andrés de Santa Cruz y Calahumana" — Unidad Académica Ancocagua.
Digitaliza hojas de ruta, file académico y pases entre La Paz y Ancocagua.

Stack previsto (PRD §5, D-01): React 18 + Vite + TS + Tailwind · Node 20 +
Express + TS + Prisma · PostgreSQL 16 · Docker Compose + Nginx.

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
apps/web/                      (por crear) frontend — arranca como prototipo
apps/api/                      (por crear) backend
```

## Flujo de trabajo (kit beta-ia)

1. **Prototipo** navegable con datos de prueba (`docs/product/prototipo-pantallas.md`)
   en `apps/web/` — para mostrar al cliente y cerrar dudas en el Sprint 0.
2. "usá el skill prd-to-tickets" → backlog → roadmap por olas → tickets de la Ola 1
   (pide confirmación antes de crear en ClickUp; copiar
   `scripts/tracker/clickup.json.example` → `.clickup.json`).
3. Por ticket: "usá el skill write-sdd ID" → "usá el skill task-brief ID" → código.
4. Cada respuesta del cliente a una duda → entrada `DEC-###` en `docs/decisions/LOG.md`.
