# SISET — guía para Claude Code

- Idioma: todo en español (Bolivia) — código de dominio, UI, commits y docs.
- Fuente de verdad: `docs/` (ver `docs/README.md` para la precedencia). Antes de
  implementar, leer lo relevante de `docs/product/business-rules.md` y las
  `DEC-###` de `docs/decisions/LOG.md`.
- Las dudas abiertas (`docs/product/dudas.md`) se resuelven con la propuesta
  provisional; nunca inventar una regla que una duda deja abierta — señalarla.
- No tocar lo listado en `docs/do-not-touch.md` sin ADR.
- Convenciones del plan: IDs de tarea `Sx.y`; rama `feat/Sx.y-descripcion`;
  commit `Sx.y <qué hace>`. Definición de Terminado: PRD §6.
- Monorepo: `apps/web` (React + Vite + TS + Tailwind v4), `apps/api`
  (Express + TS + Prisma, capas rutas → controlador → servicio → repositorio).
- Frontend: las pantallas nunca importan mocks directo; siempre `src/services/`.
- TypeScript estricto, sin `any`. Solo software libre (RNF-09).
