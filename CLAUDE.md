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
  (Express + TS + Prisma). Versiones: siempre la última estable (DEC-004).
- Arquitectura del backend: **monolito modular** (ADR-0001, DEC-002).
  `apps/api/src/modulos/<modulo>/` con capas internas rutas → controlador →
  servicio → repositorio; lo transversal en `src/compartido/`. Un módulo solo
  importa a otro desde su `index.ts`; cada tabla tiene un módulo dueño; las
  transacciones que cruzan módulos pasan `tx`. Nada de carpetas horizontales
  globales.
- Modelo de datos: `docs/product/modelo-datos.md` (DEC-006); ids `INTEGER`, nunca `BigInt`.
  Autorización: Casbin con política en archivo (ADR-0002); "propio" y sede se validan en el servicio.
- Trazabilidad (DEC-007): toda escritura de negocio y todo evento de acceso llama a
  `auditoria.registrarEvento()` en la misma transacción. Sin evento, el ticket no está terminado.
- Flujo SDD: antes de codear un ticket, `task-brief` → `write-sdd` →
  `docs/sdd/<ID>/SDD.md`. No se escribe código hasta que el SDD esté en
  Estado `Aprobado (fecha)`; si la implementación se desvía, se versiona el SDD.
- Frontend: las pantallas nunca importan mocks directo; siempre `src/services/`.
- TypeScript estricto, sin `any`. Solo software libre (RNF-09).
