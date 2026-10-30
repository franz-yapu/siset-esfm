---
version: alpha
name: SISET-sistema-visual
description: 'Sistema administrativo institucional, claro y sobrio, para el seguimiento de trámites académicos entre La Paz y Ancocagua. Fondo gris azulado muy claro (#F5F7FA), tarjetas blancas con borde fino (#E2E8F0) y sombra mínima, sidebar en verde institucional (#0A5C40) y un único acento esmeralda (#047857) para foco, enlaces y pestañas activas. Tipografía Inter en tamaños compactos (14 px de base) pensada para pantallas de trabajo: tablas, bandejas, formularios y fichas. El color con significado vive en los badges de estado del trámite y en el semáforo de requisitos, nunca como decoración.'

colors:
  primario: '#0A5C40'
  primario-oscuro: '#173B5C'
  sobre-primario: '#FFFFFF'
  sobre-primario-suave: '#E0F2FE'
  acento: '#047857'
  fondo: '#F5F7FA'
  superficie: '#FFFFFF'
  superficie-suave: '#F8FAFC'
  borde: '#E2E8F0'
  borde-control: '#CBD5E1'
  tinta: '#1E293B'
  tinta-fuerte: '#0F172A'
  tinta-secundaria: '#64748B'
  tinta-terciaria: '#94A3B8'
  semaforo-verde: '#16A34A'
  semaforo-amarillo: '#D97706'
  semaforo-rojo: '#DC2626'
  info: '#0369A1'
  velo: '#0F172A'

typography:
  titulo-pagina:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0
  titulo-pagina-movil:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  titulo-modal:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0
  titulo-tarjeta:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: 0
  cuerpo:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0
  etiqueta:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: 0
  boton:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: 0
  pequeno:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0
  cabecera-tabla:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: 0.4px
  kpi:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0

rounded:
  sm: 4px
  lg: 8px
  xl: 12px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px

components:
  boton-primario:
    backgroundColor: '{colors.primario}'
    textColor: '{colors.sobre-primario}'
    typography: '{typography.boton}'
    rounded: '{rounded.lg}'
    padding: 8px 16px
  boton-primario-hover:
    backgroundColor: '{colors.primario-oscuro}'
    textColor: '{colors.sobre-primario}'
    typography: '{typography.boton}'
    rounded: '{rounded.lg}'
  boton-secundario:
    backgroundColor: '{colors.superficie}'
    textColor: '{colors.tinta}'
    typography: '{typography.boton}'
    rounded: '{rounded.lg}'
    padding: 8px 16px
  boton-peligro:
    backgroundColor: '{colors.semaforo-rojo}'
    textColor: '{colors.sobre-primario}'
    typography: '{typography.boton}'
    rounded: '{rounded.lg}'
    padding: 8px 16px
  boton-exito:
    backgroundColor: '{colors.semaforo-verde}'
    textColor: '{colors.sobre-primario}'
    typography: '{typography.boton}'
    rounded: '{rounded.lg}'
    padding: 8px 16px
  tarjeta:
    backgroundColor: '{colors.superficie}'
    textColor: '{colors.tinta}'
    typography: '{typography.cuerpo}'
    rounded: '{rounded.lg}'
    padding: 16px
  campo:
    backgroundColor: '{colors.superficie}'
    textColor: '{colors.tinta}'
    typography: '{typography.cuerpo}'
    rounded: '{rounded.lg}'
    padding: 8px 12px
  sidebar:
    backgroundColor: '{colors.primario}'
    textColor: '{colors.sobre-primario-suave}'
    typography: '{typography.cuerpo}'
    width: 256px
  sidebar-item-activo:
    backgroundColor: '{colors.superficie}'
    textColor: '{colors.primario}'
    typography: '{typography.etiqueta}'
    rounded: '{rounded.lg}'
    padding: 8px 12px
  header:
    backgroundColor: '{colors.superficie}'
    textColor: '{colors.tinta}'
    height: 56px
  modal:
    backgroundColor: '{colors.superficie}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.xl}'
    padding: 16px 20px
  tabla-cabecera:
    backgroundColor: '{colors.superficie-suave}'
    textColor: '{colors.tinta-secundaria}'
    typography: '{typography.cabecera-tabla}'
    padding: 8px 12px
---

# DESIGN.md — SISET

> Formato de [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) / Google Stitch.
> Fuente funcional: `docs/product/prototipo-pantallas.md` §4. Fuente técnica: `apps/web/src/index.css`
> (`@theme`), `apps/web/src/components/ui/` y `apps/web/src/config/estados.ts`. Si este archivo y el
> código discrepan, manda el código; corrige este archivo.

## Overview

SISET es una herramienta de trabajo, no un sitio de marketing. Lo usan Kardex, Secretaría,
Coordinación, Dirección y egresados para mover y consultar trámites. El diseño prioriza
**densidad legible, estado visible y cero ambigüedad** sobre cualquier efecto.

La base es clara: `{colors.fondo}` (#F5F7FA) de fondo de aplicación, tarjetas `{colors.superficie}`
con borde `{colors.borde}` y `shadow-sm`. El **verde institucional** `{colors.primario}` (#0A5C40) es
el ancla de identidad: sidebar, botón principal, avatar y el nombre "SISET" en el header. Un segundo
verde, `{colors.acento}` (#047857), marca foco, enlaces y pestañas activas.

El color con significado tiene dos sistemas cerrados:

1. **Badges de estado del trámite** — un color por estado (tabla abajo), definido solo en
   `config/estados.ts`.
2. **Semáforo** verde / amarillo / rojo — requisitos, files y avisos de plazo.

Fuera de esos dos sistemas no se introduce color.

**Rasgos clave:**

- Tema claro únicamente; no hay modo oscuro.
- Un primario (verde institucional) + un acento (esmeralda; DEC-065). Sin segundo color de marca.
- Inter en escala compacta: 14 px de cuerpo, 12 px para metadatos y cabeceras de tabla.
- Esquinas `rounded-lg` (8 px) en todo; `rounded-xl` (12 px) solo en modales.
- Sombras mínimas (`shadow-sm` en tarjetas, `shadow-lg` en menús desplegables, `shadow-xl` en modales).
- **Nada de degradados**, ilustraciones decorativas ni fondos con imagen.
- Imprimible: hojas de ruta y documentos oficiales usan `.zona-impresion` y tamaño carta.

## Colors

### Identidad

- **Primario** (`{colors.primario}` #0A5C40, `bg-primario`): sidebar, botón principal, avatar, marca.
- **Primario oscuro** (`{colors.primario-oscuro}` #173B5C, `bg-primario-oscuro`): hover del botón principal.
- **Acento** (`{colors.acento}` #047857, `text-acento`, `outline-acento`): anillo de foco, enlaces, pestaña activa.

### Superficies

- **Fondo** (`{colors.fondo}`, `bg-fondo`): fondo de toda la app.
- **Superficie** (`bg-white`): tarjetas, tablas, header, modales, menús.
- **Superficie suave** (`bg-slate-50`): cabecera de tabla, hover de filas e ítems de menú.
- **Borde** (`border-slate-200`): tarjetas, divisores, header. **Borde de control** (`border-slate-300`): inputs.

### Texto

- **Tinta fuerte** (`text-slate-900`): títulos de página y de modal, valores de KPI.
- **Tinta** (`text-slate-800`): cuerpo por defecto (lo aplica `body`).
- **Tinta secundaria** (`text-slate-500`): subtítulos, hints, cabeceras de tabla.
- **Tinta terciaria** (`text-slate-400`): placeholders, iconos inactivos, detalle de KPI.

### Semáforo y avisos

| Uso      | Color       | Tailwind    | Banner `<Alerta>`                     |
| -------- | ----------- | ----------- | ------------------------------------- |
| Verde    | #16A34A     | `green-600` | `exito`: `bg-green-50 text-green-800` |
| Amarillo | #D97706     | `amber-600` | `aviso`: `bg-amber-50 text-amber-800` |
| Rojo     | #DC2626     | `red-600`   | `error`: `bg-red-50 text-red-800`     |
| Bloqueo  | rojo sólido | `red-600`   | `bloqueo`: `bg-red-600 text-white`    |
| Info     | celeste     | `sky-*`     | `info`: `bg-sky-50 text-sky-800`      |

### Estados del trámite (badges)

Patrón único: `bg-{c}-50 text-{c}-700 ring-1 ring-{c}-300`, punto de timeline `bg-{c}-500/600`.

| Estado            | Etiqueta                | Color `{c}` |
| ----------------- | ----------------------- | ----------- |
| `REGISTRADO`      | Registrado              | `slate`     |
| `EN_TRANSITO_ANC` | En tránsito a Ancocagua | `sky`       |
| `RECIBIDO`        | Recibido                | `blue`      |
| `EN_REVISION`     | En revisión             | `indigo`    |
| `OBSERVADO`       | Observado               | `amber`     |
| `DICTAMINADO`     | Dictaminado             | `violet`    |
| `EN_IMPRESION`    | En impresión            | `cyan`      |
| `EN_TRANSITO_LP`  | En tránsito a La Paz    | `sky`       |
| `EN_FIRMA`        | En firma                | `purple`    |
| `LISTO`           | Listo para entrega      | `lime`      |
| `ENTREGADO`       | Entregado               | `green`     |

Un estado nuevo se agrega en `config/estados.ts`, nunca con clases sueltas en una pantalla.

## Typography

### Familia

- **Inter Variable** (`--font-sans`), con respaldo `Inter, ui-sans-serif, system-ui`. Única familia.
- Números en tablas y KPI con `tabular-nums`.

### Jerarquía

| Token                | Tamaño / peso      | Tailwind                              | Uso                                    |
| -------------------- | ------------------ | ------------------------------------- | -------------------------------------- |
| `titulo-pagina`      | 24 px / 600        | `text-xl sm:text-2xl font-semibold`   | `<PageHeader>` (20 px en celular)      |
| `kpi`                | 24 px / 600        | `text-2xl font-semibold tabular-nums` | Valor de `<KpiCard>`                   |
| `titulo-modal`       | 16 px / 600        | `text-base font-semibold`             | Cabecera de `<Modal>`                  |
| `titulo-tarjeta`     | 14 px / 600        | `text-sm font-semibold`               | Cabecera de `<Card>`                   |
| `etiqueta` / `boton` | 14 px / 500        | `text-sm font-medium`                 | Labels de campos, botones, ítem activo |
| `cuerpo`             | 14 px / 400        | `text-sm`                             | Texto, celdas, menús                   |
| `pequeno`            | 12 px / 400        | `text-xs`                             | Hints, errores de campo, metadatos     |
| `cabecera-tabla`     | 12 px / 500, mayús | `text-xs uppercase text-slate-500`    | `<thead>` de `<DataTable>`             |

### Principios

- `text-sm` es la base; `text-base` y mayores solo para títulos.
- Pesos 400, 500 y 600. No usar 700+ ni tracking negativo.
- Mayúsculas solo en cabeceras de tabla y rótulos de sección pequeños (p. ej. "Alertas").
- Toda la UI en español de Bolivia; fechas `dd/mm/aaaa`.

## Layout

### Estructura común (pantallas internas)

```
┌─────────────┬────────────────────────────────────────────────┐
│ Sidebar     │ Header 56 px: SISET · UA Ancocagua  🔔  Usuario ▾│
│ 256 px      ├────────────────────────────────────────────────┤
│ bg-primario │ Breadcrumb                                     │
│             │ PageHeader: título + subtítulo   [Acciones]    │
│ • Inicio    │ ────────────────────────────────────────────── │
│ • Files     │ Contenido (max-w-7xl, px-4 sm:px-6, py-5)      │
│ ...         │                                                │
│ Rol · Sede  │                                                │
└─────────────┴────────────────────────────────────────────────┘
```

- **Sidebar:** fijo en `lg+`, cajón deslizable con velo `bg-slate-900/40` debajo. Ítems
  `text-sky-100`, hover `bg-white/10`; activo `bg-white text-primario font-medium`. Pie con rol y sede.
- **Header:** `sticky`, blanco, borde inferior. Campana con contador rojo; menú de usuario.
- **Contenido:** `max-w-7xl`, separación vertical entre bloques de 16–20 px (`space-y-4`/`gap-4`).

### Espaciado

Escala de Tailwind en múltiplos de 4 px. Valores habituales: `gap-2` (8) entre controles,
`p-4` (16) dentro de tarjetas, `px-5 py-3/4` en modales, `mb-5 pb-4` bajo el `PageHeader`.

## Elevation & Depth

| Nivel       | Tratamiento                          | Dónde                    |
| ----------- | ------------------------------------ | ------------------------ |
| Plano       | sin borde ni sombra                  | fondo de la app          |
| Tarjeta     | `border-slate-200 shadow-sm`         | `<Card>`, tablas, KPI    |
| Desplegable | `border-slate-200 shadow-lg`         | menú de usuario, alertas |
| Modal       | `shadow-xl` + velo `bg-slate-900/50` | `<Modal>`                |
| Toast       | esquina inferior derecha, `z-[60]`   | `useToast()`             |

La jerarquía la dan bordes y espacio, no sombras.

## Shapes

| Token  | Valor  | Tailwind       | Uso                                                                    |
| ------ | ------ | -------------- | ---------------------------------------------------------------------- |
| `sm`   | 4 px   | `rounded`      | botones de icono pequeños (cerrar modal)                               |
| `lg`   | 8 px   | `rounded-lg`   | **por defecto**: botones, campos, tarjetas, alertas, ítems del sidebar |
| `xl`   | 12 px  | `rounded-xl`   | modales (en celular, solo arriba: `rounded-t-xl`)                      |
| `full` | 9999px | `rounded-full` | avatar, contador de la campana, punto del semáforo                     |

Iconos: `lucide-react`, `size-4` en botones y menús, `size-5` en header y alertas, siempre `aria-hidden`
cuando acompañan texto.

## Components

Todos viven en `apps/web/src/components/ui/` y se importan desde su `index.ts`. Una pantalla no
reimplementa un componente que ya existe.

### Botones (`<Button>`)

- Variantes: `primary`, `secondary` (blanco con `ring-slate-300`), `danger`, `success`, `ghost`.
- Tamaños `md` (`px-4 py-2 text-sm`) y `sm` (`px-2.5 py-1.5 text-xs`).
- `loading` muestra `<Spinner>` y deshabilita. Foco: `outline-2 outline-offset-2 outline-acento`.
- Un solo botón `primary` por zona de acción. Acciones destructivas en `danger` y con confirmación en `<Modal>`.

### Campos (`<Input>`, `<Select>`, `<Textarea>`)

- Label encima (`text-sm font-medium text-slate-700`), control `rounded-lg border-slate-300 px-3 py-2`.
- Foco: `border-acento ring-2 ring-acento/20`. Error: `border-red-400`, mensaje `text-xs text-red-600`
  debajo y `aria-invalid`. Si no hay error, se muestra el `hint` en `text-slate-500`.

### Tarjetas (`<Card>`, `<KpiCard>`)

- `<Card>`: cabecera opcional con título y acciones separada por `border-b`; cuerpo `p-4`.
- `<KpiCard>`: icono en cuadro de 40 px tintado, valor `text-2xl`, título `text-slate-500`; clicable si tiene `to`.

### Tablas (`<DataTable>`)

- Buscador con icono, ordenamiento por columna, paginación (`<Paginacion>`) y estado vacío.
- Escritorio (`md+`): tabla con cabecera `bg-slate-50 text-xs uppercase` y filas `divide-slate-100`.
- Celular: la misma data como lista de tarjetas. Nunca scroll horizontal obligatorio en celular.
- Carga: esqueletos de `h-10`, no un spinner suelto.

### Estado y progreso

- `<EstadoBadge>`: colores de la tabla de estados. `<EstadoHojaRutaBadge>` y `<RolBadge>` siguen el
  mismo patrón `bg-50 / text-700 / ring-300`; `<Badge>` es la base genérica.
- `<Semaforo>`: punto + texto en el color correspondiente; `size="lg"` para el estado global del file.
- `<Timeline>`: línea vertical con punto de color por estado, fecha y hora, sede, responsable y observación; el último paso resaltado.
- `<ProgresoPasos>`: avance por etapas del trámite.
- `<Alerta>`: banner `info | exito | aviso | error | bloqueo` dentro de una pantalla.

### Superposiciones

- `<Modal>`: velo `bg-slate-900/50`; en celular sube desde abajo; `Esc` cierra y el foco queda atrapado. Pie con "Cancelar" (secundario) y la acción (primario o peligro) a la derecha.
- Toasts: verde éxito, rojo error, se cierran solos a los 3 s.

### Navegación

- `<Breadcrumb>` sobre el `<PageHeader>`; `<Tabs>` con contador opcional para bandejas.
- `<EmptyState>` con icono, título y texto cuando no hay datos.

## Do's and Don'ts

### Do

- Usar los tokens del `@theme` (`bg-primario`, `text-acento`, `bg-fondo`) en lugar de hex sueltos.
- Mostrar siempre el estado del trámite con `EstadoBadge` y el cumplimiento con `<Semaforo>`.
- Mantener una acción principal clara por pantalla, arriba a la derecha en el `PageHeader`.
- Dar texto, no solo color, a todo indicador (accesibilidad y daltonismo).
- Diseñar primero para escritorio de oficina y verificar en celular (egresados consultan desde el teléfono).
- Reutilizar componentes de `components/ui/` y extenderlos con una variante si falta algo.

### Don't

- No usar degradados, glassmorphism, sombras de color ni imágenes de fondo.
- No introducir colores nuevos fuera de la paleta, el semáforo y la tabla de estados.
- No usar el verde primario como fondo de tarjetas o secciones de contenido (solo sidebar, botón, avatar).
- No usar tipografías distintas de Inter ni pesos 700+.
- No mezclar `rounded-md`, `rounded-2xl` o píldoras en controles.
- No poner texto en inglés en la UI.
- No importar mocks desde una pantalla: siempre `src/services/`.

## Responsive Behavior

### Breakpoints (Tailwind)

| Nombre | Ancho  | Cambios clave                                                        |
| ------ | ------ | -------------------------------------------------------------------- |
| base   | < 640  | una columna; título 20 px; modal desde abajo; toasts a lo ancho      |
| `sm`   | ≥ 640  | título 24 px; header muestra "· UA Ancocagua"; modal centrado        |
| `md`   | ≥ 768  | `<DataTable>` pasa de tarjetas a tabla; nombre en el menú de usuario |
| `lg`   | ≥ 1024 | sidebar fijo visible; desaparece el botón hamburguesa                |

### Objetivos táctiles

- Botones `md` y campos ≥ 36 px de alto; botones de icono del header con `p-2` (≥ 36 px).

### Impresión

- `.no-print` oculta sidebar, header, modales y toasts.
- Documentos oficiales (hoja de ruta, constancias) dentro de `.zona-impresion`; página carta con márgenes de 1,5 cm.

## Iteration Guide

1. Antes de crear una pantalla, revisar `docs/product/prototipo-pantallas.md` y este archivo.
2. Componer con `AppLayout` → `Breadcrumb` → `PageHeader` → `Card`/`DataTable`.
3. Si falta un patrón, agregarlo como variante en `components/ui/` y documentarlo aquí.
4. Un color nuevo exige un token en `@theme` y una línea en este archivo; si no, no entra.
5. Revisar con el skill `web-design-guidelines` (accesibilidad, foco, formularios) antes de cerrar un ticket de UI.

## Known Gaps

- No hay modo oscuro ni se planea por ahora.
- La pantalla de login (P-01) usa un panel verde a la izquierda; su detalle visual vive en `prototipo-pantallas.md`.
- No hay logotipo institucional definido; el header usa el texto "SISET".
- Las páginas 403/404 piden "ilustración simple" sin especificar; no se debe resolver con imágenes decorativas.
