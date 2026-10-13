# 0001 — El backend es un monolito modular

**Estado:** Aceptada
**Fecha:** 2026-10-13

## Contexto

El PRD fija un solo servidor central (D-12), un equipo chico y 7 módulos de
negocio (M1–M7, PRD §2). RNF-07 exige un backend por capas (rutas →
controlador → servicio → repositorio), y el backlog (S0.7) lo traducía en
carpetas horizontales globales: `src/{rutas,controladores,servicios,repositorios}`.

Con carpetas horizontales, cada carpeta mezcla todos los módulos: nada impide
que el servicio de pases lea directo la tabla de files, y las reglas
protegidas por `docs/do-not-touch.md` (máquina de estados, correlativo,
semáforo, bitácora) quedan expuestas a cualquier parte del código.
Microservicios, en cambio, no se justifican: un solo servidor, una sola base y
transacciones que cruzan módulos (pase + cambio de estado + bitácora, D-17).

## Decisión

Se construye `apps/api` como **un monolito modular**: un solo proceso, un solo
despliegue y una sola base PostgreSQL, partido en módulos de negocio con
fronteras explícitas. Las capas de RNF-07 se mantienen **dentro de cada módulo**.

### Módulos

| Módulo (`src/modulos/…`) | Cubre | Tablas que posee (PRD §5) |
|---|---|---|
| `seguridad` | M1: login, sesiones, RBAC, usuarios | `rol`, `usuario`, `refresh_token` |
| `catalogos` | Sedes, especialidades, tipos de requisito | `sede`, `especialidad`, `requisito_tipo` |
| `files` | M2: file académico, matrícula, resultado anual, requisitos, semáforo, bloqueo por UF | `file_academico`, `matricula`, `resultado_anual`, `requisito_file` |
| `hojas-ruta` | M3 + M4: ingesta, correlativo, QR, máquina de estados, tracking | `hoja_ruta`, `movimiento_hoja_ruta` |
| `pases` | M5: envío/recepción entre sedes, cadena de custodia | `pase_derivacion` |
| `dictamenes` | Dictamen del coordinador (M7) | `dictamen` |
| `documentos` | M6: vista previa PDF, emisión, reimpresión | `documento_emitido` |
| `reportes` | M7: KPI y exportación (solo lectura) | — |
| `auditoria` | M7: bitácora append-only (RF-14) | `log_auditoria` |

Los módulos coinciden con los servicios que ya tiene el prototipo en
`apps/web/src/services/`, así el cambio mock → API (S0.8) es uno a uno.

### Estructura

```
apps/api/src/
  app.ts                 # arma Express y monta el router de cada módulo
  servidor.ts
  compartido/            # sin lógica de negocio
    errores/             # ErrorNegocio, middleware de errores {error:{code,message,details}}
    http/                # validación Zod, autenticación, authorize(rol), helpers
    bd/                  # cliente Prisma y tipo de transacción
    logger.ts
    config.ts
  modulos/
    <modulo>/
      index.ts           # API pública del módulo (lo único importable desde fuera)
      <modulo>.rutas.ts
      <modulo>.controlador.ts
      <modulo>.servicio.ts
      <modulo>.repositorio.ts
      <modulo>.esquemas.ts   # Zod + tipos DTO
      <modulo>.servicio.test.ts
```

### Reglas de frontera

1. **Solo por `index.ts`.** Un módulo importa a otro únicamente desde
   `@/modulos/<otro>`; nunca un archivo interno (`…/x.repositorio`).
   Se hace cumplir con ESLint (`no-restricted-imports`), sin plugins extra.
2. **Cada tabla tiene un dueño.** Solo el repositorio del módulo dueño lee o
   escribe sus tablas. Si `pases` necesita cambiar el estado de un trámite,
   llama al servicio público de `hojas-ruta`; no toca `hoja_ruta` directamente.
   Excepción explícita: `reportes` puede leer tablas ajenas en modo solo
   lectura, para KPI y exportación.
3. **Transacciones que cruzan módulos.** El módulo dueño del caso de uso abre
   la transacción y pasa el cliente transaccional (`tx`) a los servicios
   públicos de los otros módulos. Así, pase + movimiento + bitácora quedan en
   la misma transacción (RNF-03, D-17).
4. **`compartido/` no conoce el negocio.** No importa nada de `modulos/`.
5. **Sin ciclos.** Si dos módulos se necesitan mutuamente, la dependencia se
   invierte (uno recibe una función) o la lógica vuelve al dueño del dato.
6. **Sin bus de eventos en v1.0.** Las llamadas son síncronas y en proceso.
   Si después hace falta (notificaciones, D-19), se agrega con un nuevo ADR.

### Prisma

Un solo `schema.prisma` lógico (una sola base). El SDD de S0.6 decide si se
parte en archivos por módulo (`prisma/schema/<modulo>.prisma`) o si se queda
en un archivo con secciones comentadas por módulo. La propiedad de cada tabla
sigue la tabla de arriba en ambos casos.

## Consecuencias

- **Facilita:** que cada ticket toque un solo módulo; revisar las reglas
  protegidas en un lugar acotado; probar servicios aislados (cobertura ≥ 70 %,
  RNF-07); separar un módulo más adelante si alguna vez hiciera falta.
- **Dificulta:** las consultas con joins entre módulos (se resuelven en el
  servicio dueño o en `reportes`); hay que pasar `tx` explícitamente.
- **Descarta:** carpetas horizontales globales (`src/controladores/…`),
  microservicios y bases separadas por módulo.
- **Enmienda:** la estructura que proponían el backlog y el ticket S0.7
  (ver DEC-002). RNF-07 se sigue cumpliendo: las capas existen dentro de
  cada módulo.
- **Frontend:** `apps/web` mantiene su estructura actual (páginas por rol +
  `src/services/` por módulo); este ADR no la cambia.
