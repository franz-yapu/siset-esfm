# SISET — Especificación de pantallas para el prototipo (React + Vite + Tailwind)

Versión 1.1 · 12 oct 2026 · Basado en el PRD de SISET

Este documento describe **todas las pantallas** del sistema, **qué rol entra a cada una** y **qué contiene cada pantalla**. Sirve como instrucción para que una IA genere un **prototipo navegable** en React con datos de prueba, para mostrar al cliente cómo se verá el sistema.

El prototipo **no tiene backend**, pero está organizado para que sea **la base del frontend final**. Cuando exista la API, solo se cambia la capa `src/services/` (de datos de prueba a llamadas HTTP) y las pantallas quedan igual.

---

## 0. Cómo usar este documento

1. Instala **Node.js 20 LTS** o superior.
2. Crea una carpeta vacía `siset` y ábrela en VS Code.
3. Guarda este archivo dentro como `SPEC.md`.
4. Pega en la IA los prompts de la **sección 9**, **uno por uno y en orden**. No pegues todo junto: sale mejor por etapas.
5. Después de cada prompt, prueba con `npm run dev` (abre `http://localhost:5173`) y corrige antes de seguir.

---

## 1. Reglas del prototipo (para la IA)

| Regla                | Detalle                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tecnología           | **React 18 + Vite + TypeScript** (plantilla `react-ts`).                                                                                                                                      |
| Estilos              | **Tailwind CSS v4** con el plugin `@tailwindcss/vite`. Sin librerías de componentes pesadas: los componentes se hacen a mano con Tailwind.                                                    |
| Librerías            | `react-router-dom` (rutas), `lucide-react` (iconos), `chart.js` + `react-chartjs-2` (gráficos), `qrcode.react` (QR), `clsx` (clases condicionales), `date-fns` (fechas en español). Nada más. |
| Ubicación            | El proyecto vive en `apps/web/` (es el mismo frontend del sistema final, ver PRD §5).                                                                                                         |
| Datos                | Los datos de prueba están en `src/mocks/`. **Las pantallas nunca importan los mocks directo**: siempre usan funciones de `src/services/`.                                                     |
| Servicios            | Cada función de `src/services/` devuelve una **Promise** con un retraso de 300 ms (`await delay(300)`), igual que una API real. Así luego se reemplaza por Axios sin tocar las pantallas.     |
| Estado               | Los datos viven en memoria (un "store" simple en `src/mocks/db.ts`). Al recargar la página vuelven al estado inicial. Hay un botón **"Reiniciar datos de demo"** en el menú de usuario.       |
| Sesión simulada      | `AuthContext` guarda el usuario logueado en `sessionStorage`. El login busca el usuario en los mocks.                                                                                         |
| Cambio de rol rápido | En el header, un selector **"Ver como: [rol]"** cambia de usuario sin cerrar sesión (útil para la demo). Se muestra solo si `import.meta.env.VITE_DEMO === 'true'`.                           |
| Permisos             | Un solo archivo `src/config/permisos.ts` define qué rol entra a qué ruta (tabla de la sección 3). El menú y las rutas protegidas leen de ahí.                                                 |
| Idioma               | Todo en español (Bolivia). Fechas `dd/mm/aaaa` con `date-fns` y locale `es`.                                                                                                                  |
| Responsivo           | Debe verse bien desde 360 px (celular) hasta escritorio. En celular, el menú lateral se vuelve un menú deslizable con botón hamburguesa.                                                      |
| Acciones             | Los botones **sí** hacen algo visible: llaman al servicio, cambian el estado, agregan un movimiento al timeline, registran en la bitácora y muestran un toast ("Pase enviado").               |
| Calidad              | TypeScript estricto, sin `any`. Componentes pequeños (máx. ~200 líneas). Sin errores en la consola.                                                                                           |

### 1.1 Estructura de carpetas

```
siset/
├─ SPEC.md
└─ apps/web/
   ├─ index.html
   ├─ vite.config.ts
   ├─ .env                      # VITE_DEMO=true, VITE_PUBLIC_URL (base del QR)
   └─ src/
      ├─ main.tsx
      ├─ App.tsx                # rutas
      ├─ index.css              # @import "tailwindcss"; + tema
      ├─ types/                 # tipos: Usuario, FileAcademico, HojaRuta, Movimiento, Estado...
      ├─ config/
      │  ├─ permisos.ts         # rol → rutas y menú (sección 3)
      │  └─ estados.ts          # estados, etiquetas y colores (sección 4.2)
      ├─ mocks/                 # datos de prueba (sección 8)
      │  ├─ db.ts               # store en memoria + reset()
      │  ├─ usuarios.ts
      │  ├─ files.ts
      │  ├─ hojasRuta.ts
      │  └─ bitacora.ts
      ├─ services/              # ÚNICA puerta a los datos (luego será Axios)
      │  ├─ auth.service.ts
      │  ├─ files.service.ts
      │  ├─ hojasRuta.service.ts
      │  ├─ pases.service.ts
      │  ├─ dictamenes.service.ts
      │  ├─ documentos.service.ts
      │  ├─ usuarios.service.ts
      │  ├─ reportes.service.ts
      │  └─ bitacora.service.ts
      ├─ lib/
      │  ├─ reglas.ts           # semáforo y bloqueo
      │  ├─ transiciones.ts     # máquina de estados: qué acción permite cada estado y rol
      │  └─ formato.ts          # fechas, días transcurridos
      ├─ context/
      │  ├─ AuthContext.tsx
      │  └─ ToastContext.tsx
      ├─ hooks/                 # useAsync, useAuth, useToast, usePermiso
      ├─ components/
      │  ├─ layout/             # AppLayout, Sidebar, Header, Breadcrumb, ProtectedRoute
      │  └─ ui/                 # Button, Input, Select, Badge, Card, Modal, Tabs, DataTable,
      │                         # KpiCard, Semaforo, EstadoBadge, Timeline, EmptyState, Spinner
      └─ pages/
         ├─ publicas/           # Login, Seguimiento, CambiarClave, NoAutorizado, NoEncontrado
         ├─ inicio/             # InicioEstudiante, InicioEgresado, InicioSecDir, ...
         ├─ estudiante/         # MiFile, MisTramites
         ├─ hojas-ruta/         # NuevaHojaRuta, HojasRuta, DetalleHojaRuta, Caratula
         ├─ pases/              # BandejaPases, FirmaEntrega
         ├─ kardex/             # Files, DetalleFile, FormFile, Revision, Emision,
         │                      # CargaMasiva, Usuarios, Bitacora
         ├─ coordinador/        # Dictamenes, EmitirDictamen
         ├─ documentos/         # PlantillaHistorial, PlantillaTCLO, PlantillaTACFI
         ├─ reportes/           # Reportes
         └─ perfil/             # MiPerfil
```

---

## 2. Roles y usuarios de prueba

| Rol                                   | Código        | Sede      | Usuario demo  | Contraseña |
| ------------------------------------- | ------------- | --------- | ------------- | ---------- |
| Estudiante en formación               | `ESTUDIANTE`  | —         | `7012345`     | `demo123`  |
| Maestro egresado                      | `EGRESADO`    | —         | `6098765`     | `demo123`  |
| Secretaría de Dirección General       | `SEC_DIR`     | La Paz    | `secdir`      | `demo123`  |
| Secretaría de Coordinación            | `SEC_COORD`   | Ancocagua | `seccoord`    | `demo123`  |
| Coordinador Académico                 | `COORDINADOR` | Ancocagua | `coordinador` | `demo123`  |
| Responsable de Archivo Kardex (admin) | `KARDEX`      | Ancocagua | `kardex`      | `demo123`  |

Estudiante y egresado entran con su **CI**; el personal entra con su usuario.

---

## 3. Mapa de navegación: qué ve cada rol en el menú

✓ = aparece en su menú lateral · — = no tiene acceso (si escribe la URL, ve la pantalla 403)

| Sección del menú      | Pantalla                  | ESTUDIANTE | EGRESADO | SEC_DIR      | SEC_COORD    | COORDINADOR  | KARDEX |
| --------------------- | ------------------------- | ---------- | -------- | ------------ | ------------ | ------------ | ------ |
| Inicio                | P-10 a P-15 (una por rol) | ✓          | ✓        | ✓            | ✓            | ✓            | ✓      |
| Mi file académico     | P-20                      | ✓          | ✓        | —            | —            | —            | —      |
| Mis trámites          | P-21                      | —          | ✓        | —            | —            | —            | —      |
| Nueva hoja de ruta    | P-30                      | —          | —        | ✓            | —            | —            | —      |
| Hojas de ruta         | P-31                      | —          | —        | ✓            | ✓            | ✓            | ✓      |
| Bandeja de pases      | P-33                      | —          | —        | ✓            | ✓            | —            | ✓      |
| Firma y entrega       | P-34                      | —          | —        | ✓            | —            | —            | —      |
| Files académicos      | P-40                      | —          | —        | ✓ (solo ver) | ✓ (solo ver) | ✓ (solo ver) | ✓      |
| Revisión de trámites  | P-43                      | —          | —        | —            | —            | —            | ✓      |
| Dictámenes            | P-50                      | —          | —        | —            | —            | ✓            | —      |
| Emisión de documentos | P-44                      | —          | —        | —            | —            | —            | ✓      |
| Carga masiva          | P-46                      | —          | —        | —            | —            | —            | ✓      |
| Reportes              | P-60                      | —          | —        | ✓            | —            | ✓            | ✓      |
| Usuarios              | P-47                      | —          | —        | —            | —            | —            | ✓      |
| Bitácora              | P-48                      | —          | —        | —            | —            | —            | ✓      |
| Mi perfil             | P-05                      | ✓          | ✓        | ✓            | ✓            | ✓            | ✓      |

**Total: 27 pantallas** (4 públicas, 1 común, 6 inicios, 16 de trabajo).

---

## 4. Diseño visual

### 4.1 Paleta

| Uso                                                   | Color                             | Tailwind aproximado                   |
| ----------------------------------------------------- | --------------------------------- | ------------------------------------- |
| Primario institucional (sidebar, botones principales) | `#1F4E79`                         | `bg-[#1F4E79]`                        |
| Acento (links, foco, pestañas activas)                | `#2E75B6`                         | `text-[#2E75B6]`                      |
| Fondo de la app                                       | `#F5F7FA`                         | `bg-slate-50`                         |
| Tarjetas                                              | `#FFFFFF` con borde `#E2E8F0`     | `bg-white border-slate-200`           |
| Texto principal / secundario                          | `#1E293B` / `#64748B`             | `text-slate-800` / `text-slate-500`   |
| Semáforo verde / amarillo / rojo                      | `#16A34A` / `#D97706` / `#DC2626` | `green-600` / `amber-600` / `red-600` |

Tipografía: **Inter** (Google Fonts). Esquinas redondeadas `rounded-lg`. Sombras suaves (`shadow-sm`). Nada de degradados.

### 4.2 Colores por estado del trámite (badges)

| Estado (código)   | Texto del badge         | Color       |
| ----------------- | ----------------------- | ----------- |
| `REGISTRADO`      | Registrado              | gris        |
| `EN_TRANSITO_ANC` | En tránsito a Ancocagua | celeste     |
| `RECIBIDO`        | Recibido                | azul        |
| `EN_REVISION`     | En revisión             | índigo      |
| `OBSERVADO`       | Observado               | ámbar       |
| `DICTAMINADO`     | Dictaminado             | violeta     |
| `EN_IMPRESION`    | En impresión            | cian        |
| `EN_TRANSITO_LP`  | En tránsito a La Paz    | celeste     |
| `EN_FIRMA`        | En firma                | púrpura     |
| `LISTO`           | Listo para entrega      | verde claro |
| `ENTREGADO`       | Entregado               | verde       |

### 4.3 Layout común (todas las pantallas internas)

```
┌──────────────────────────────────────────────────────────────────┐
│ [≡] SISET · UA Ancocagua     Ver como: [Kardex ▾]   🔔  María Q. ▾│  ← Header
├────────────┬─────────────────────────────────────────────────────┤
│ Sidebar    │  Inicio / Files académicos / Detalle    ← breadcrumb│
│ azul       │                                                     │
│ • Inicio   │  Título de la pantalla         [Botón principal]    │
│ • Files    │  ─────────────────────────────────────────────      │
│ • ...      │  Contenido                                          │
│            │                                                     │
│ Sede:      │                                                     │
│ Ancocagua  │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
```

- **Header:** logo/nombre, selector "Ver como" (solo prototipo), campana de alertas con contador, menú de usuario (Mi perfil, Cerrar sesión).
- **Sidebar:** fondo `#1F4E79`, ítems con icono de `lucide-react`, ítem activo resaltado. Abajo: rol y sede del usuario.
- **Toasts:** esquina inferior derecha, verdes (éxito) o rojos (error), se cierran solos a los 3 s.
- **Modales:** fondo oscuro semitransparente, tarjeta centrada, botones "Cancelar" y "Confirmar".

### 4.4 Componentes reutilizables (en `src/components/ui/`)

| Componente                          | Props principales                                                | Qué hace                                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `<Button>`                          | `variant` (primary, secondary, danger, ghost), `loading`, `icon` | Botón con estado de carga.                                                                                                |
| `<Input>`, `<Select>`, `<Textarea>` | `label`, `error`, `hint`                                         | Campos con etiqueta y mensaje de error en rojo.                                                                           |
| `<Card>`                            | `title`, `actions`                                               | Tarjeta blanca con borde.                                                                                                 |
| `<EstadoBadge>`                     | `estado`                                                         | Badge de color según la tabla 4.2 (lee de `config/estados.ts`).                                                           |
| `<Semaforo>`                        | `color`, `texto`, `size`                                         | Círculo verde/amarillo/rojo + texto.                                                                                      |
| `<Timeline>`                        | `movimientos`                                                    | Línea de tiempo vertical: punto de color, estado, fecha y hora, sede, responsable, observación. El último paso resaltado. |
| `<DataTable>`                       | `columns`, `data`, `searchable`, `pageSize=10`, `onRowClick`     | Tabla con buscador, ordenamiento, paginación y estado vacío "Sin resultados". En celular se muestra como tarjetas.        |
| `<KpiCard>`                         | `titulo`, `valor`, `icono`, `color`, `to`                        | Tarjeta de indicador; si tiene `to`, es clicable.                                                                         |
| `<Modal>`                           | `open`, `title`, `onClose`, `footer`, `size`                     | Ventana modal accesible (Esc cierra, foco atrapado).                                                                      |
| `<Tabs>`                            | `tabs: { id, label, count? }[]`                                  | Pestañas con contador opcional.                                                                                           |
| `<EmptyState>`                      | `icono`, `titulo`, `texto`                                       | Mensaje cuando no hay datos.                                                                                              |
| `<Spinner>` / esqueletos            | —                                                                | Carga mientras el servicio responde (los 300 ms).                                                                         |
| `useToast()`                        | `toast.success(msg)`, `toast.error(msg)`                         | Notificación temporal (desde `ToastContext`).                                                                             |

---

## 5. Pantallas públicas y comunes

### P-01 · Login — `/login`

- **Quién:** todos (sin sesión).
- **Diseño:** pantalla dividida. Izquierda (oculta en celular): fondo azul institucional, nombre del sistema, frase "Seguimiento de trámites en línea, de La Paz a Ancocagua". Derecha: tarjeta de login.
- **Campos:** "CI o usuario", "Contraseña" (con botón ver/ocultar), botón **Ingresar**.
- **Debajo:** enlace grande **"¿Eres egresado? Consulta tu trámite sin iniciar sesión"** → P-02.
- **Comportamiento:** llama a `authService.login()`. Error: "CI o contraseña incorrectos". Al 5.º intento fallido: "Cuenta bloqueada por 15 minutos" (simulado). Al entrar, redirige al Inicio del rol.
- **Ayuda para la demo:** un recuadro plegable "Usuarios de prueba" con la tabla de la sección 2 (clic en una fila = autocompleta).

### P-02 · Consulta pública de trámite — `/seguimiento`

- **Quién:** cualquiera (es la página a la que apunta el **QR** de la hoja de ruta).
- **Formulario:** "N.º de hoja de ruta" (ej. `HR-2026-000123`) + "CI del titular" + botón **Consultar**.
- **Resultado:** nombre del titular, tipo de trámite, badge del estado actual, sede actual y el componente `timeline`.
- **Seguridad visible:** no muestra datos personales extra. Si no coincide: "No encontramos un trámite con esos datos" (mismo mensaje para N.º o CI incorrecto).
- **Si la URL trae parámetros** (`/seguimiento?hr=HR-2026-000123`), el campo de N.º se llena solo.

### P-03 · Cambio de contraseña obligatorio — `/cambiar-clave`

- **Quién:** cualquier usuario al que Kardex le reseteó la contraseña.
- **Campos:** nueva contraseña, repetir contraseña, indicador de fuerza, reglas (mín. 8, letras, números y símbolos; DEC-011).

### P-04 · Acceso denegado (403) y no encontrado (404)

- Ilustración simple, mensaje "No tienes permiso para ver esta sección" y botón "Volver a mi inicio".

### P-05 · Mi perfil — `/perfil`

- **Quién:** todos con sesión.
- Datos del usuario (solo lectura: nombre, CI, rol, sede) + bloque "Cambiar contraseña".

---

## 6. Inicios por rol (dashboards)

### P-10 · Inicio Estudiante — `/estudiante`

- **Saludo:** "Hola, Juan" + especialidad y año de formación.
- **Tarjeta grande de estado:** semáforo global (verde "Todo en orden", amarillo "Tienes requisitos pendientes", rojo "Tu file está bloqueado").
- **Lista de requisitos** con semáforo cada uno: Matrícula vigente, Certificado de notas, TACFI, TCLO (nivel).
- **Alertas:** ej. "Falta entregar TACFI en Kardex".
- **Botón:** "Ver mi file completo" → P-20.

### P-11 · Inicio Egresado — `/egresado`

- Tarjeta "Mis trámites activos" con el último trámite: N.º HR, tipo, badge de estado y barra de progreso por pasos (11 estados).
- Botón "Ver seguimiento" → detalle con timeline (P-21).
- Bloque "Mi file" resumido (semáforo).

### P-12 · Inicio Secretaría de Dirección (La Paz) — `/sec-dir`

- **KPIs:** Ingresados hoy · En tránsito a Ancocagua · Retornos por recibir · Listos para entrega.
- **Botón principal:** "+ Nueva hoja de ruta" → P-30.
- **Tabla corta:** últimos 5 trámites ingresados.
- **Aviso:** "Tienes 2 retornos por recibir" → P-33.

### P-13 · Inicio Secretaría de Coordinación (Ancocagua) — `/sec-coord`

- **KPIs:** Por recibir · Recibidos hoy · Derivados a Kardex hoy.
- **Tabla:** bandeja "Por recibir" resumida con botón "Recibir" directo.

### P-14 · Inicio Coordinador — `/coordinador`

- **KPIs:** Pendientes de dictamen · Observados · Dictaminados este mes · Tiempo promedio del trámite (días).
- **Tabla:** "Pendientes de dictamen" (los 5 más antiguos primero) con botón "Dictaminar" → P-51.
- **Mini gráfico:** trámites por estado (barras).

### P-15 · Inicio Kardex — `/kardex`

- **KPIs:** Files bloqueados (rojo) · Trámites en revisión · Por imprimir · Pases por recibir.
- **Accesos rápidos:** Buscar file · Revisión de trámites · Emisión de documentos · Usuarios.
- **Tabla:** "Requieren atención" (files bloqueados y trámites observados hace más de 5 días).

---

## 7. Pantallas de trabajo

### P-20 · Mi file académico — `/mi-file`

- **Quién:** ESTUDIANTE, EGRESADO (solo lectura, solo el propio).
- **Cabecera:** foto genérica (iniciales), nombre, CI, código de estudiante, especialidad, año de ingreso, semáforo global.
- **Pestañas:**
  1. **Matrículas:** tabla Año de formación (1.º a 5.º) · Gestión · Estado.
  2. **Resultados anuales:** tabla Año · Resultado (Aprobado/Reprobado) · UF reprobadas.
  3. **Requisitos:** tabla Requisito · Estado (semáforo) · Fecha · N.º documento.
- Si está bloqueado: banner rojo arriba "File bloqueado: 2 UF reprobadas en 3.er año. Acércate a Kardex."

### P-21 · Mis trámites — `/mis-tramites` y `/mis-tramites/:nro`

- **Quién:** EGRESADO.
- **Lista:** tarjetas por trámite (N.º HR, tipo, fecha de ingreso, badge de estado).
- **Detalle:** igual que P-02 pero sin pedir CI, con el `timeline` completo y el botón "Descargar comprobante" (simulado).

### P-30 · Nueva hoja de ruta (ingesta) — `/hojas-ruta/nueva`

- **Quién:** SEC_DIR.
- **Paso 1 – Buscar titular:** campo CI con autocompletado. Al elegir, muestra una tarjeta con nombre, especialidad y **semáforo del file**. Si el file está bloqueado: aviso rojo y el botón Registrar queda desactivado.
- **Paso 2 – Datos del trámite:** Tipo de trámite (Historial académico, Copia legalizada, Certificación), N.º de valorado, Observación (opcional).
- **Botón:** "Registrar y enviar a Ancocagua" (y otro secundario "Solo registrar").
- **Al guardar:** modal de éxito con el **código generado** (`HR-2026-000124`), el **QR** (apunta a `/seguimiento?hr=...`) y botones "Imprimir carátula" (P-32) y "Ver trámite".

### P-31 · Hojas de ruta — `/hojas-ruta` y detalle `/hojas-ruta/:nro`

- **Quién:** SEC_DIR, SEC_COORD, COORDINADOR, KARDEX.
- **Lista:** tabla N.º HR · Titular · CI · Tipo · Estado (badge) · Sede actual · Fecha ingreso · Días transcurridos · Acción "Ver".
- **Filtros:** buscador (N.º, nombre, CI), estado, sede, rango de fechas. Los trámites con más de 10 días sin movimiento llevan un ícono de alerta.
- **Detalle (dos columnas):**
  - Izquierda: datos del trámite, titular, mini-resumen del file con semáforo, QR pequeño.
  - Derecha: `timeline` completo.
  - **Botones de acción según el estado y el rol** (solo aparece la acción permitida en ese momento):

| Estado actual                    | Rol                | Botón que aparece            |
| -------------------------------- | ------------------ | ---------------------------- |
| Registrado                       | SEC_DIR            | Enviar a Ancocagua           |
| En tránsito a Ancocagua          | SEC_COORD / KARDEX | Confirmar recepción          |
| Recibido                         | KARDEX             | Tomar para revisión          |
| En revisión                      | KARDEX             | Observar · Enviar a dictamen |
| Observado                        | KARDEX             | Marcar como subsanado        |
| En revisión (enviado a dictamen) | COORDINADOR        | Dictaminar                   |
| Dictaminado (aprobado)           | KARDEX             | Emitir documento             |
| En impresión                     | KARDEX             | Enviar a La Paz              |
| En tránsito a La Paz             | SEC_DIR            | Confirmar recepción          |
| En firma                         | SEC_DIR            | Marcar como listo            |
| Listo                            | SEC_DIR            | Registrar entrega            |

### P-32 · Carátula de hoja de ruta (vista de impresión) — `/hojas-ruta/:nro/caratula`

- Hoja tamaño carta en blanco con encabezado institucional (texto, sin logo real), N.º HR grande, QR, datos del titular, tipo de trámite, fecha, y una tabla vacía de "Pases" para firmas físicas (Fecha · De · A · Firma).
- Botón "Imprimir" (`window.print()`), oculto al imprimir.

### P-33 · Bandeja de pases — `/pases`

- **Quién:** SEC_DIR, SEC_COORD, KARDEX.
- **Pestañas con contador:** **Por recibir (3)** · **Enviados** · **Historial**.
- **Por recibir:** tabla N.º HR · Titular · Viene de · Enviado por · Fecha de envío · Observación · botón **Recibir** (pide confirmación). Selección múltiple con "Recibir seleccionados".
- **Enviados:** lo que salió de mi sede y aún no recibieron (estado "en tránsito").
- **Al recibir:** toast "Pase recibido", el trámite cambia de estado y desaparece de la bandeja.

### P-34 · Firma y entrega — `/entregas`

- **Quién:** SEC_DIR.
- **Columnas tipo tablero (kanban simple):** En firma → Listo para entrega → Entregado (últimos 7 días).
- **Tarjetas:** N.º HR, titular, tipo. Botón para avanzar al siguiente paso.
- **Registrar entrega:** modal con "Entregado a" (titular o apoderado), CI de quien recibe y fecha.

### P-40 · Files académicos — `/files`

- **Quién:** KARDEX (edita); SEC_DIR, SEC_COORD, COORDINADOR (solo ver).
- **Tabla:** CI · Nombre completo · Código · Especialidad · Año · Semáforo · Bloqueado (candado) · Acción "Ver".
- **Filtros:** buscador, especialidad, año de formación, estado del semáforo, solo bloqueados.
- **Botón (solo KARDEX):** "+ Nuevo file" → P-42.

### P-41 · Detalle del file — `/files/:id`

- **Quién:** igual que P-40.
- **Cabecera:** como P-20, más el botón **Bloquear / Desbloquear** (solo KARDEX; pide motivo).
- **Pestañas:**
  1. **Datos personales** (editable para KARDEX).
  2. **Matrículas:** tabla + botón "Registrar matrícula".
  3. **Resultados anuales:** tabla + botón "Registrar resultado" (modal: año, Aprobado/Reprobado, n.º UF reprobadas). Si supera el límite (2 UF), el sistema muestra "Este resultado bloqueará el file".
  4. **Requisitos:** una tarjeta por requisito con su semáforo y su acción:
     - **TACFI:** "Registrar recepción física" (fecha, responsable).
     - **TCLO:** "Registrar certificado" (nivel: Básico/Intermedio/Avanzado, N.º de certificado, fecha).
     - **Certificado de notas:** "Registrar" (N.º, fecha).
  5. **Trámites:** hojas de ruta de esta persona.
  6. **Historial:** cambios hechos a este file (mini bitácora).

### P-42 · Nuevo / editar file — `/files/nuevo`

- **Quién:** KARDEX.
- **Formulario en 2 columnas:** CI, nombres, apellidos, fecha de nacimiento, celular, correo, código de estudiante, especialidad, año de ingreso, condición (Estudiante / Egresado).
- Check "Crear cuenta de acceso" (genera usuario = CI, contraseña temporal).
- Validaciones visibles en rojo bajo cada campo.

### P-43 · Revisión de trámites — `/revision`

- **Quién:** KARDEX.
- **Pestañas con contador:** Recibidos · En revisión · Observados · Enviados a dictamen.
- **Tabla:** N.º HR · Titular · Tipo · Semáforo del file · Días en la etapa · Acciones.
- **Panel lateral (al hacer clic en una fila):** checklist de requisitos con su estado y botones **Observar** (modal con motivo obligatorio y lista de requisitos faltantes) o **Enviar a dictamen** (desactivado si el file está en rojo).

### P-44 · Emisión de documentos — `/emision`

- **Quién:** KARDEX.
- **Pestañas:** Por emitir (dictamen aprobado) · Emitidos.
- **Tabla Por emitir:** N.º HR · Titular · Tipo de documento · Fecha de dictamen · Botón **Vista previa**.
- **Vista previa:** modal grande con el documento (P-45) y marca de agua diagonal "VISTA PREVIA". Botones: "Cancelar" y "Emitir e imprimir" (pide N.º de valorado).
- **Emitidos:** tabla con N.º de valorado, fecha, usuario, botón "Reimprimir" (pide motivo obligatorio).

### P-45 · Plantillas de documentos (vista de impresión)

Hojas tamaño carta en HTML, con encabezado institucional en texto:

1. **Historial académico:** datos del titular + tabla por año (Año · Gestión · Resultado) + firmas.
2. **Certificación TCLO:** nivel acreditado, N.º de certificado.
3. **Constancia TACFI.**

### P-46 · Carga masiva de files — `/carga-masiva`

- **Quién:** KARDEX.
- **Paso 1:** botón "Descargar plantilla Excel" (simulado) + zona de arrastrar archivo.
- **Paso 2 (simulado con datos fijos):** tabla de vista previa con 10 filas, 2 de ellas en rojo con su error ("CI duplicado", "Especialidad no existe").
- **Paso 3:** botón "Importar 8 filas válidas" → resumen "8 importados, 2 con error".

### P-47 · Usuarios — `/usuarios`

- **Quién:** KARDEX.
- **Tabla:** CI/Usuario · Nombre · Rol (badge) · Sede · Estado (Activo/Inactivo/Bloqueado) · Último acceso · Acciones (Editar, Resetear contraseña, Dar de baja/Reactivar).
- **Filtros:** rol, estado, buscador.
- **Modal Crear/Editar:** nombre, CI, correo, rol (select), sede (select).
- Las bajas piden confirmación: "El usuario no podrá ingresar. Sus registros se conservan."

### P-48 · Bitácora de auditoría — `/bitacora`

- **Quién:** KARDEX.
- **Tabla:** Fecha y hora · Usuario · IP · Módulo · Acción · Registro afectado · Botón "Ver cambios".
- **Filtros:** rango de fechas, usuario, módulo, acción.
- **"Ver cambios":** modal con dos columnas "Antes" y "Después" (resaltar en amarillo lo que cambió).
- Aviso arriba: "Registro de solo lectura. No se puede modificar ni borrar."

### P-50 · Dictámenes — `/dictamenes`

- **Quién:** COORDINADOR.
- **Pestañas:** Pendientes · Emitidos.
- **Tabla Pendientes:** N.º HR · Titular · Especialidad · Tipo · Días esperando · Botón **Dictaminar**.

### P-51 · Emitir dictamen — `/dictamenes/:nro`

- **Quién:** COORDINADOR.
- **Izquierda:** resumen del file (semáforo, requisitos, resultados anuales) en solo lectura + `timeline` del trámite.
- **Derecha:** formulario con dos opciones grandes tipo tarjeta: **Aprobado** (verde) y **Observado** (ámbar). Campo "Observaciones" (obligatorio si es Observado). Botón "Firmar dictamen".
- Si el file está bloqueado, aparece un banner rojo y la opción Aprobado queda desactivada.

### P-60 · Reportes — `/reportes`

- **Quién:** SEC_DIR, COORDINADOR, KARDEX.
- **Filtros arriba:** rango de fechas, sede, tipo de trámite.
- **KPIs:** Total de trámites · En curso · Entregados · Tiempo promedio (días) · Detenidos más de 10 días.
- **Gráficos (`react-chartjs-2`):**
  1. Barras horizontales: trámites por estado.
  2. Línea: trámites ingresados por mes (últimos 6 meses).
  3. Barras: tiempo promedio por etapa (días).
- **Tabla:** trámites detenidos más de 10 días.
- **Botones:** "Exportar PDF" y "Exportar Excel" (simulados con toast).

---

## 8. Datos de prueba (`src/mocks/`) y tipos (`src/types/`)

Crear datos ficticios (nombres y CI inventados). Cantidades mínimas: **8 estudiantes**, **5 egresados**, **12 hojas de ruta** repartidas en todos los estados, **6 usuarios** de personal, **20 registros** de bitácora.

### 8.1 Tipos principales (`src/types/index.ts`)

```ts
export type Rol = 'ESTUDIANTE' | 'EGRESADO' | 'SEC_DIR' | 'SEC_COORD' | 'COORDINADOR' | 'KARDEX';

export type EstadoTramite =
  | 'REGISTRADO'
  | 'EN_TRANSITO_ANC'
  | 'RECIBIDO'
  | 'EN_REVISION'
  | 'OBSERVADO'
  | 'DICTAMINADO'
  | 'EN_IMPRESION'
  | 'EN_TRANSITO_LP'
  | 'EN_FIRMA'
  | 'LISTO'
  | 'ENTREGADO';

export type ColorSemaforo = 'VERDE' | 'AMARILLO' | 'ROJO';
export type EstadoRequisito = 'PENDIENTE' | 'COMPLETO';

export interface Sede {
  id: number;
  codigo: 'LA_PAZ' | 'ANCOCAGUA';
  nombre: string;
}

export interface Usuario {
  id: number;
  usuario: string;
  nombre: string;
  rol: Rol;
  sedeId: number | null;
  activo: boolean;
  fileId?: number;
  ultimoAcceso?: string;
}

export interface Requisito {
  estado: EstadoRequisito;
  fecha?: string;
  nro?: string;
  nivel?: 'Básico' | 'Intermedio' | 'Avanzado';
}

export interface FileAcademico {
  id: number;
  ci: string;
  nombres: string;
  apellidos: string;
  codigo: string;
  especialidad: string;
  anioIngreso: number;
  condicion: 'ESTUDIANTE' | 'EGRESADO';
  bloqueado: boolean;
  motivoBloqueo?: string;
  matriculas: { anio: number; gestion: number; estado: 'Vigente' | 'Concluida' }[];
  resultados: { anio: number; resultado: 'APROBADO' | 'REPROBADO'; ufReprobadas: number }[];
  requisitos: { TACFI: Requisito; TCLO: Requisito; CERT_NOTAS: Requisito };
}

export interface Movimiento {
  estado: EstadoTramite;
  fecha: string;
  sedeId: number;
  usuario: string;
  obs?: string;
}

export interface HojaRuta {
  nro: string;
  fileId: number;
  tipo: 'Historial académico' | 'Copia legalizada' | 'Certificación';
  estado: EstadoTramite;
  sedeActualId: number;
  fechaIngreso: string;
  nroValorado?: string;
  movimientos: Movimiento[];
}

export interface Dictamen {
  nro: string;
  resultado: 'APROBADO' | 'OBSERVADO';
  obs?: string;
  fecha: string;
  coordinador: string;
}

export interface RegistroBitacora {
  id: number;
  fecha: string;
  usuario: string;
  ip: string;
  modulo: string;
  accion: string;
  registro: string;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
}
```

### 8.2 Ejemplo de datos (`src/mocks/*.ts`)

```ts
// src/mocks/usuarios.ts — en el prototipo la contraseña de todos es "demo123"
export const usuarios: Usuario[] = [
  { id: 1, usuario: 'kardex', nombre: 'María Quispe Mamani', rol: 'KARDEX', sedeId: 2, activo: true },
  { id: 2, usuario: 'secdir', nombre: 'Rosa Choque Apaza', rol: 'SEC_DIR', sedeId: 1, activo: true },
  { id: 3, usuario: 'seccoord', nombre: 'Ana Ticona Laura', rol: 'SEC_COORD', sedeId: 2, activo: true },
  { id: 4, usuario: 'coordinador', nombre: 'Lic. Pedro Huanca', rol: 'COORDINADOR', sedeId: 2, activo: true },
  {
    id: 5,
    usuario: '7012345',
    nombre: 'Juan Carlos Mamani Condori',
    rol: 'ESTUDIANTE',
    sedeId: null,
    activo: true,
    fileId: 1,
  },
  { id: 6, usuario: '6098765', nombre: 'Lucía Flores Alanoca', rol: 'EGRESADO', sedeId: null, activo: true, fileId: 9 },
  // ...una cuenta por cada estudiante/egresado
];

// src/mocks/files.ts
export const files: FileAcademico[] = [
  {
    id: 1,
    ci: '7012345',
    nombres: 'Juan Carlos',
    apellidos: 'Mamani Condori',
    codigo: 'EST-2023-0041',
    especialidad: 'Matemática',
    anioIngreso: 2023,
    condicion: 'ESTUDIANTE',
    bloqueado: false,
    matriculas: [
      { anio: 1, gestion: 2023, estado: 'Concluida' },
      { anio: 2, gestion: 2024, estado: 'Concluida' },
      { anio: 3, gestion: 2025, estado: 'Concluida' },
      { anio: 4, gestion: 2026, estado: 'Vigente' },
    ],
    resultados: [
      { anio: 1, resultado: 'APROBADO', ufReprobadas: 0 },
      { anio: 2, resultado: 'APROBADO', ufReprobadas: 1 },
      { anio: 3, resultado: 'APROBADO', ufReprobadas: 0 },
    ],
    requisitos: {
      TACFI: { estado: 'PENDIENTE' },
      TCLO: { estado: 'COMPLETO', nivel: 'Intermedio', nro: 'TCLO-1182', fecha: '2025-11-04' },
      CERT_NOTAS: { estado: 'COMPLETO', nro: 'CN-5521', fecha: '2026-02-10' },
    },
  },
  // ...incluir al menos 1 file BLOQUEADO (3 UF reprobadas en un año) y 2 con requisitos pendientes
];

// src/mocks/hojasRuta.ts
export const hojasRuta: HojaRuta[] = [
  {
    nro: 'HR-2026-000123',
    fileId: 9,
    tipo: 'Historial académico',
    estado: 'EN_REVISION',
    sedeActualId: 2,
    fechaIngreso: '2026-09-28',
    nroValorado: '004512',
    movimientos: [
      { estado: 'REGISTRADO', fecha: '2026-09-28T09:12', sedeId: 1, usuario: 'Rosa Choque Apaza' },
      {
        estado: 'EN_TRANSITO_ANC',
        fecha: '2026-09-28T09:15',
        sedeId: 1,
        usuario: 'Rosa Choque Apaza',
        obs: 'Valorado N.º 004512',
      },
      { estado: 'RECIBIDO', fecha: '2026-09-30T10:40', sedeId: 2, usuario: 'Ana Ticona Laura' },
      { estado: 'EN_REVISION', fecha: '2026-10-01T08:30', sedeId: 2, usuario: 'María Quispe Mamani' },
    ],
  },
  // ...una o más hojas de ruta en CADA estado de la tabla 4.2
];
```

Sedes: `1 = Sede Central La Paz`, `2 = UA Ancocagua (Pucarani)`. Especialidades: Educación Primaria Comunitaria Vocacional, Matemática, Comunicación y Lenguajes, Ciencias Naturales: Biología-Geografía, Educación Física y Deportes.

### 8.3 Ejemplo de servicio (patrón obligatorio)

```ts
// src/services/pases.service.ts
import { db } from '@/mocks/db';
import { delay } from '@/lib/formato';
import { aplicarTransicion } from '@/lib/transiciones';

export const pasesService = {
  async porRecibir(sedeId: number) {
    await delay(300);
    return db.hojasRuta.filter(
      (h) => (sedeId === 2 && h.estado === 'EN_TRANSITO_ANC') || (sedeId === 1 && h.estado === 'EN_TRANSITO_LP'),
    );
  },
  async recibir(nro: string, usuario: Usuario) {
    await delay(300);
    return aplicarTransicion(nro, 'RECIBIR', usuario); // valida, agrega movimiento y registra en bitácora
  },
};
// Más adelante, este archivo se reemplaza por: return api.patch(`/pases/${id}/recepcion`)
```

### 8.4 Reglas de negocio (`src/lib/`)

- **Semáforo (`reglas.ts`):**
  - **Rojo:** file bloqueado (más de 2 UF reprobadas en un mismo año).
  - **Amarillo:** al menos un requisito pendiente.
  - **Verde:** todo completo.
- **Transiciones (`transiciones.ts`):** implementar la tabla de acciones de P-31 como un objeto `{ estadoActual: { accion, rol, siguienteEstado } }`. Si la acción no corresponde al estado o al rol, el servicio lanza un error y la pantalla muestra un toast rojo.

---

## 9. Prompts para pegar en la IA (en orden)

> Antes de cada prompt, asegúrate de que la IA tiene acceso a `SPEC.md` (menciónalo con `@SPEC.md` o adjúntalo).
> Después de cada prompt: `npm run dev`, prueba, y si algo falla, pídele a la IA que lo corrija **antes** de pasar al siguiente.

**Prompt 1 — Proyecto base**

```
Lee @SPEC.md completo. Crea el proyecto en apps/web con Vite (plantilla react-ts) y configura
todo lo de la sección 1: Tailwind v4 con @tailwindcss/vite, alias "@" a src, fuente Inter,
tema de colores de la sección 4.1 en index.css, y las librerías indicadas. Crea la estructura
de carpetas de la sección 1.1 (vacía por ahora). No hagas pantallas todavía.
Al terminar, dime los comandos que debo ejecutar.
```

**Prompt 2 — Tipos, datos y servicios**

```
Según @SPEC.md sección 8: crea los tipos en src/types, TODOS los datos de prueba en
src/mocks (completa las cantidades mínimas con datos ficticios bolivianos y al menos una
hoja de ruta en cada estado), el store en memoria con reset(), src/lib (reglas, transiciones,
formato) y todos los servicios de src/services siguiendo el patrón de la sección 8.3.
Cada acción debe registrar en la bitácora.
```

**Prompt 3 — Componentes y layout**

```
Según @SPEC.md secciones 3 y 4: crea todos los componentes de src/components/ui (tabla 4.4),
AuthContext, ToastContext, config/permisos.ts y config/estados.ts, y el layout
(AppLayout, Sidebar por rol, Header con selector "Ver como" y botón "Reiniciar datos de demo",
ProtectedRoute). Configura las rutas en App.tsx: cada ruta muestra "En construcción" por ahora.
Si un rol entra a una ruta sin permiso, mostrar P-04.
```

**Prompt 4 — Pantallas públicas e inicios**

```
Implementa P-01 a P-05 (sección 5) y los 6 inicios P-10 a P-15 (sección 6) según @SPEC.md.
Los números de los KPIs se calculan con los servicios, no escritos a mano. El login lleva
a cada rol a su inicio.
```

**Prompt 5 — Estudiante y egresado**

```
Implementa P-20 Mi file académico y P-21 Mis trámites según @SPEC.md. Cada usuario solo
ve SU propio file y SUS trámites (el servicio filtra por el usuario logueado).
```

**Prompt 6 — Hojas de ruta y pases**

```
Implementa P-30, P-31 (con los botones de acción según la tabla de estado y rol), P-32,
P-33 y P-34 según @SPEC.md. Las acciones usan lib/transiciones.ts, agregan un movimiento
al timeline, registran en la bitácora y muestran un toast. P-32 se imprime con window.print()
y oculta el layout al imprimir.
```

**Prompt 7 — Kardex**

```
Implementa P-40 a P-48 según @SPEC.md. En P-41 las pestañas deben funcionar y los modales
deben actualizar el semáforo al instante. P-45: plantillas tamaño carta como componentes React,
con marca de agua diagonal "VISTA PREVIA" cuando se muestran en el modal de vista previa.
```

**Prompt 8 — Coordinador y reportes**

```
Implementa P-50, P-51 y P-60 según @SPEC.md. Los gráficos de P-60 usan react-chartjs-2 con
datos calculados por reportes.service.ts.
```

**Prompt 9 — Revisión final**

```
Revisa todo el prototipo contra @SPEC.md: que cada rol vea solo su menú (sección 3), que
todas las pantallas se vean bien a 360 px de ancho, que no haya errores de TypeScript
(npm run build) ni en la consola, y que el flujo completo funcione: SEC_DIR registra →
SEC_COORD recibe → KARDEX revisa → COORDINADOR dictamina → KARDEX emite → SEC_DIR entrega.
Haz una lista de lo que corregiste.
```

---

## 10. Guion de demo para el cliente (10 minutos)

> **Para que el QR funcione en el celular:** el celular no puede abrir `localhost`. Opciones: (a) ejecutar `npm run dev -- --host` y conectar el celular a la misma red Wi-Fi (el QR debe usar la IP de la PC, ej. `http://192.168.1.10:5173`), o (b) publicar el prototipo con `npm run build` en tu VPS o en un hosting gratuito de sitios estáticos. Configura la URL base del QR en `.env` como `VITE_PUBLIC_URL`.

1. **Login** como `secdir` → registrar una hoja de ruta nueva → mostrar el **QR** y la carátula.
2. Abrir **P-02** en el celular (escaneando el QR) → se ve "En tránsito a Ancocagua".
3. "Ver como" **SEC_COORD** → recibir el pase.
4. "Ver como" **KARDEX** → abrir el file, mostrar el semáforo, tomar el trámite y enviarlo a dictamen. Mostrar también un file **bloqueado** para que vea que el sistema impide avanzar.
5. "Ver como" **COORDINADOR** → aprobar el dictamen.
6. "Ver como" **KARDEX** → vista previa del PDF con marca de agua → emitir.
7. "Ver como" **SEC_DIR** → recibir el retorno → firma → entrega.
8. Volver al **celular**: el timeline muestra todo el recorrido.
9. Cerrar con **Reportes** y la **Bitácora** (cada paso quedó registrado).
