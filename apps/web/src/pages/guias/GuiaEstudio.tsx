import { Archivo, Codigo, Nota, PaginaGuia, Seccion, Tabla } from './comun';

const APARTADOS = [
  { id: 'mapa', titulo: 'Mapa del repositorio' },
  { id: 'arquitectura', titulo: 'Arquitectura del backend' },
  { id: 'contrasenas', titulo: 'Contraseñas: dónde está el hash' },
  { id: 'sesion', titulo: 'Sesión: JWT, refresh y cookies' },
  { id: 'permisos', titulo: 'Permisos por rol (Casbin)' },
  { id: 'bitacora', titulo: 'Bitácora inmutable' },
  { id: 'notificaciones', titulo: 'Notificaciones y avisos' },
  { id: 'hojas-ruta', titulo: 'Hojas de ruta: estados, correlativo y QR' },
  { id: 'files', titulo: 'File académico y semáforo' },
  { id: 'datos', titulo: 'Base de datos y migraciones' },
  { id: 'frontend', titulo: 'Frontend' },
  { id: 'pruebas', titulo: 'Pruebas, CI y despliegue' },
  { id: 'orden', titulo: 'Orden sugerido para estudiar' },
] as const;

/**
 * Guía de estudio del código para el autor del proyecto (DEC-048): dónde está cada pieza que se defiende. Las rutas
 * son relativas a la raíz del repositorio.
 */
export function GuiaEstudio() {
  return (
    <PaginaGuia
      titulo="Guía de estudio del código"
      subtitulo="Dónde está cada parte de SISET en el código y qué conviene entender de cada una para la defensa."
      apartados={APARTADOS}
    >
      <Seccion id="mapa" titulo="1. Mapa del repositorio">
        <Tabla
          cabecera={['Carpeta', 'Qué hay']}
          filas={[
            [<Archivo key="a">apps/api</Archivo>, 'Backend: Node + Express + TypeScript + Prisma (PostgreSQL).'],
            [<Archivo key="a">apps/web</Archivo>, 'Frontend: React + Vite + TypeScript + Tailwind CSS.'],
            [<Archivo key="a">apps/api/prisma</Archivo>, 'Esquema de la base por módulo, migraciones SQL y semilla.'],
            [
              <Archivo key="a">docs/product</Archivo>,
              'PRD, reglas de negocio, modelo de datos y dudas con la escuela.',
            ],
            [<Archivo key="a">docs/decisions/LOG.md</Archivo>, 'Cada decisión tomada (DEC-001 a DEC-048).'],
            [<Archivo key="a">docs/adr</Archivo>, 'Decisiones de arquitectura (ADR-0001 a 0006).'],
            [<Archivo key="a">docs/sdd</Archivo>, 'Documento de diseño de cada ticket, escrito antes de programar.'],
            [<Archivo key="a">.github/workflows</Archivo>, 'Integración continua (ci.yml) y publicación de imágenes.'],
            [<Archivo key="a">deploy/coolify</Archivo>, 'Despliegue de prueba en el VPS.'],
          ]}
        />
      </Seccion>

      <Seccion id="arquitectura" titulo="2. Arquitectura del backend">
        <p>
          <strong>Monolito modular</strong> (<Archivo>docs/adr/0001-monolito-modular.md</Archivo>): una sola aplicación,
          dividida en módulos con fronteras claras. Cada módulo vive en{' '}
          <Archivo>apps/api/src/modulos/&lt;modulo&gt;/</Archivo> con cuatro capas:
        </p>
        <ol>
          <li>
            <strong>rutas</strong> (<Codigo>*.rutas.ts</Codigo>): URL, autenticación, permiso y validación con Zod.
          </li>
          <li>
            <strong>controlador</strong> (<Codigo>*.controlador.ts</Codigo>): lee la petición validada y responde.
          </li>
          <li>
            <strong>servicio</strong> (<Codigo>*.servicio.ts</Codigo>): las reglas de negocio y las transacciones.
          </li>
          <li>
            <strong>repositorio</strong> (<Codigo>*.repositorio.ts</Codigo>): las consultas con Prisma.
          </li>
        </ol>
        <p>
          Módulos: <Codigo>seguridad</Codigo>, <Codigo>personas</Codigo>, <Codigo>files</Codigo>,{' '}
          <Codigo>catalogos</Codigo>, <Codigo>hojas-ruta</Codigo>, <Codigo>auditoria</Codigo> y <Codigo>salud</Codigo>.
          Un módulo solo usa a otro por su <Codigo>index.ts</Codigo>; la raíz los conecta en{' '}
          <Archivo>apps/api/src/app.ts</Archivo> (<Codigo>crearApp</Codigo>). Lo transversal (errores, contexto de la
          petición, base de datos, paginación) está en <Archivo>apps/api/src/compartido/</Archivo>.
        </p>
        <Nota>
          Ejemplo para seguir de punta a punta: registrar un trámite.{' '}
          <Archivo>modulos/hojas-ruta/hojas-ruta.rutas.ts</Archivo> → <Codigo>crear</Codigo> en el controlador →{' '}
          <Archivo>hojas-ruta.servicio.ts</Archivo> (valida el file, pide el correlativo y registra el evento en la
          misma transacción) → <Archivo>hoja-ruta.repositorio.ts</Archivo>.
        </Nota>
      </Seccion>

      <Seccion id="contrasenas" titulo="3. Contraseñas: dónde está el hash">
        <Tabla
          cabecera={['Qué', 'Dónde', 'Cómo']}
          filas={[
            [
              'Hash de la contraseña',
              <Archivo key="a">apps/api/src/modulos/seguridad/password.ts</Archivo>,
              <>
                <Codigo>hashPassword</Codigo> usa <strong>bcrypt</strong> (librería <Codigo>bcryptjs</Codigo>) con{' '}
                <Codigo>COSTO_BCRYPT = 12</Codigo> (RNF-01). <Codigo>compararPassword</Codigo> verifica al entrar. En la
                base solo se guarda el hash, en <Codigo>usuario.password_hash</Codigo>.
              </>,
            ],
            [
              'Política de la contraseña',
              <Archivo key="a">apps/api/src/modulos/seguridad/password.esquemas.ts</Archivo>,
              <>
                <Codigo>esquemaPassword</Codigo> (Zod): mínimo 8 caracteres, con letras, números y símbolos (DEC-011).
                La web repite la regla para avisar antes de enviar.
              </>,
            ],
            [
              'Contraseña temporal',
              <Archivo key="a">apps/api/src/modulos/seguridad/password-temporal.ts</Archivo>,
              'La genera el sistema al crear o restablecer una cuenta; obliga a cambiarla al entrar.',
            ],
            [
              'Login y bloqueo por intentos',
              <Archivo key="a">apps/api/src/modulos/seguridad/auth.servicio.ts</Archivo>,
              <>
                10 intentos fallidos seguidos bloquean 15 minutos (DEC-065). Los valores están en la tabla{' '}
                <Codigo>parametro</Codigo> (<Codigo>MAX_INTENTOS_LOGIN</Codigo>, <Codigo>MIN_BLOQUEO_LOGIN</Codigo>), no
                en el código.
              </>,
            ],
            [
              'Límite de peticiones',
              <Archivo key="a">apps/api/src/modulos/seguridad/auth.rutas.ts</Archivo>,
              <>
                <Codigo>express-rate-limit</Codigo>: 10 intentos de login por minuto por IP (RNF-10).
              </>,
            ],
          ]}
        />
        <Nota>
          Por qué bcrypt y no SHA-256: bcrypt es lento a propósito y agrega una “sal” aleatoria a cada hash. Un atacante
          que robe la base no puede probar millones de contraseñas por segundo, y dos personas con la misma contraseña
          tienen hashes distintos. El costo 12 significa 2¹² rondas.
        </Nota>
      </Seccion>

      <Seccion id="sesion" titulo="4. Sesión: JWT, refresh y cookies">
        <ul>
          <li>
            <strong>Access token (JWT):</strong> <Archivo>apps/api/src/modulos/seguridad/jwt.ts</Archivo>. Firmado con{' '}
            <Codigo>HS256</Codigo>, dura 15 minutos y lleva el usuario, el rol y la sede. Al verificarlo solo se acepta
            HS256, para que nadie cuele otro algoritmo.
          </li>
          <li>
            <strong>Refresh token:</strong> va en una cookie <Codigo>httpOnly</Codigo>, <Codigo>Secure</Codigo>,{' '}
            <Codigo>SameSite=Strict</Codigo>, solo para <Codigo>/api/v1/auth</Codigo> (
            <Archivo>auth.controlador.ts</Archivo>). JavaScript no puede leerla. Dura 8 horas.
          </li>
          <li>
            En la base se guarda solo su <strong>SHA-256</strong>, no el token: <Codigo>hashDeToken</Codigo> en{' '}
            <Archivo>apps/api/src/modulos/seguridad/token.ts</Archivo>, tabla <Codigo>refresh_token</Codigo>.
          </li>
          <li>
            <strong>Rotación y reuso:</strong> <Codigo>refrescar</Codigo> en <Archivo>auth.servicio.ts</Archivo>. Cada
            renovación revoca el token y emite otro. Si llega un token ya revocado, se toma como robo y se cierran todas
            las sesiones del usuario (evento <Codigo>REUSO_SESION</Codigo>). Una ventana de gracia de 10 s evita falsos
            positivos al recargar (<Archivo>docs/adr/0004-refresh-con-gracia.md</Archivo>).
          </li>
          <li>
            <strong>Web:</strong> <Archivo>apps/web/src/lib/api.ts</Archivo> renueva una sola vez a la vez y entre
            pestañas con un Web Lock (<Codigo>BLOQUEO_REFRESH</Codigo>). El cierre por 15 min de inactividad está en{' '}
            <Archivo>apps/web/src/lib/inactividad.ts</Archivo> y <Archivo>apps/web/src/context/AuthContext.tsx</Archivo>
            .
          </li>
          <li>
            Cabeceras de seguridad HTTP con <Codigo>helmet</Codigo> en <Archivo>apps/api/src/app.ts</Archivo>.
          </li>
        </ul>
      </Seccion>

      <Seccion id="permisos" titulo="5. Permisos por rol (Casbin)">
        <ul>
          <li>
            La política (quién puede qué) está escrita en un solo lugar:{' '}
            <Archivo>apps/api/src/modulos/seguridad/autorizacion.politica.ts</Archivo>, como filas{' '}
            <Codigo>[rol, recurso, acción]</Codigo> (por ejemplo, <Codigo>['KARDEX', 'files', 'crear']</Codigo>).
          </li>
          <li>
            Casbin la evalúa en <Archivo>autorizacion.enforcer.ts</Archivo> y el middleware{' '}
            <Archivo>autorizar.ts</Archivo> la aplica en cada ruta (
            <Archivo>docs/adr/0002-autorizacion-casbin.md</Archivo>
            ).
          </li>
          <li>
            Lo “propio” se valida en el servicio, no en la URL: “mi file” (<Codigo>GET /files/mio</Codigo>) toma el file
            de la sesión en <Codigo>idPropio</Codigo> de <Archivo>apps/api/src/modulos/files/files.servicio.ts</Archivo>
            ; un estudiante no puede leer otro cambiando un número.
          </li>
          <li>Quién hace cada paso del trámite (rol y sede) lo decide la máquina de estados, no Casbin (ver 8).</li>
          <li>
            La web arma el menú con los mismos permisos: <Archivo>apps/web/src/config/permisos.ts</Archivo>.
          </li>
        </ul>
      </Seccion>

      <Seccion id="bitacora" titulo="6. Bitácora inmutable">
        <ul>
          <li>
            Cada escritura de negocio y cada evento de acceso llama a <Codigo>registrarEvento</Codigo> (
            <Archivo>apps/api/src/modulos/auditoria/auditoria.servicio.ts</Archivo>){' '}
            <strong>en la misma transacción</strong>: si el evento falla, la acción tampoco queda (DEC-007).
          </li>
          <li>Guarda quién, cuándo, IP, navegador, módulo, acción, registro afectado, y los datos antes y después.</li>
          <li>
            Es de solo inserción por la base misma: el trigger <Codigo>tg_auditoria_inmutable</Codigo> con la función{' '}
            <Codigo>fn_solo_insercion</Codigo> rechaza UPDATE, DELETE y TRUNCATE (migración{' '}
            <Archivo>apps/api/prisma/migrations/20261013155722_inicial/migration.sql</Archivo>,{' '}
            <Archivo>docs/adr/0003-bitacora-inmutable.md</Archivo>).
          </li>
          <li>
            Quién hizo la petición sale del contexto de la petición (<Codigo>AsyncLocalStorage</Codigo>) en{' '}
            <Archivo>apps/api/src/compartido/http/contexto.ts</Archivo>.
          </li>
        </ul>
      </Seccion>

      <Seccion id="notificaciones" titulo="7. Notificaciones y avisos">
        <ul>
          <li>
            <strong>Campana del encabezado:</strong> <Archivo>apps/web/src/hooks/useNotificaciones.ts</Archivo>. La
            tabla <Codigo>REGLAS</Codigo> dice, por rol, qué estados esperan un paso suyo y a qué bandeja lleva el
            aviso; cuenta los trámites con la API y se refresca al registrar un paso y cada minuto. La dibuja{' '}
            <Archivo>apps/web/src/components/layout/Header.tsx</Archivo>.
          </li>
          <li>
            <strong>Alertas del estudiante</strong> (bloqueo, observados, pendientes):{' '}
            <Codigo>alertasDelEstudiante</Codigo> en <Archivo>apps/web/src/lib/requisitos.ts</Archivo>.
          </li>
          <li>
            <strong>Mensajes al guardar</strong> (“HR-2026-000004: Entregado”): <Codigo>useToast</Codigo> en{' '}
            <Archivo>apps/web/src/hooks/index.ts</Archivo>.
          </li>
          <li>No hay avisos por correo ni WhatsApp en esta versión (D-19).</li>
        </ul>
      </Seccion>

      <Seccion id="hojas-ruta" titulo="8. Hojas de ruta: estados, correlativo y QR">
        <ul>
          <li>
            <strong>Máquina de estados:</strong> <Archivo>apps/api/src/modulos/hojas-ruta/maquina.ts</Archivo>. La tabla{' '}
            <Codigo>TRANSICIONES</Codigo> tiene cada paso: desde qué estado, hacia cuál, en qué flujo (con valorado, sin
            valorado o sin valorado recibido en Ancocagua, ADR-0011), qué rol y desde qué sede.{' '}
            <Codigo>evaluarTransicion</Codigo> decide si se puede (409 si el paso no corresponde, 403 si es de otro rol
            o sede, 422 si el file está bloqueado) (<Archivo>docs/adr/0005-maquina-estados-hojas-ruta.md</Archivo>).
          </li>
          <li>
            <strong>Correlativo HR-AAAA-NNNNNN:</strong> la función SQL <Codigo>fn_siguiente_nro_hoja_ruta</Codigo> (
            <Archivo>apps/api/prisma/migrations/20261014230000_correlativo_hoja_ruta/migration.sql</Archivo>) hace{' '}
            <Codigo>INSERT … ON CONFLICT DO UPDATE</Codigo> sobre una fila por gestión: dos registros al mismo tiempo no
            pueden recibir el mismo número (<Archivo>docs/adr/0006-correlativo-hojas-ruta.md</Archivo>).
          </li>
          <li>
            <strong>Seguimiento público:</strong> <Codigo>POST /seguimiento</Codigo> en{' '}
            <Archivo>hojas-ruta.rutas.ts</Archivo>, con límite de peticiones; el mismo error si el N.º o el CI no
            coinciden (anti-enumeración) y sin datos de quién hizo cada paso.
          </li>
          <li>
            <strong>QR:</strong> la URL que codifica está en <Archivo>apps/web/src/lib/qr.ts</Archivo>; la carátula para
            imprimir, en <Archivo>apps/web/src/pages/hojas-ruta/Caratula.tsx</Archivo>.
          </li>
        </ul>
      </Seccion>

      <Seccion id="files" titulo="9. File académico y semáforo">
        <ul>
          <li>
            Servicio de files: <Archivo>apps/api/src/modulos/files/files.servicio.ts</Archivo> (alta, edición, búsqueda,
            bloqueo con resolución y PDF, desbloqueo). El PDF llega por{' '}
            <Archivo>apps/api/src/modulos/files/pdf-resolucion.ts</Archivo> (multer en memoria, 5 MB, empieza con{' '}
            <Codigo>%PDF-</Codigo>) y se guarda en la tabla <Codigo>bloqueo_file</Codigo>.
          </li>
          <li>
            Requisitos: <Archivo>apps/api/src/modulos/files/requisitos.servicio.ts</Archivo>; el catálogo (los 24 del
            folder personal) está en la tabla <Codigo>requisito_tipo</Codigo>, sembrado por la semilla. Los por gestión
            guardan una fila por gestión en <Codigo>requisito_file</Codigo>.
          </li>
          <li>
            Semáforo: <Codigo>semaforoDelFile</Codigo> en <Archivo>apps/api/src/modulos/files/semaforo.ts</Archivo>:
            rojo si está bloqueado, tiene un requisito observado o uno atrasado; amarillo si falta alguno obligatorio;
            verde si está completo. Qué requisitos entran (género, modalidad, gestiones) y cuándo uno está atrasado lo
            decide <Archivo>apps/api/src/modulos/files/requisitos-reglas.ts</Archivo> (ADR-0007). Lo calcula la API, no
            la web.
          </li>
        </ul>
      </Seccion>

      <Seccion id="datos" titulo="10. Base de datos y migraciones">
        <ul>
          <li>
            Esquema Prisma separado por módulo dueño: <Archivo>apps/api/prisma/schema/*.prisma</Archivo> (seguridad,
            personas, files, catálogos, hojas de ruta, auditoría).
          </li>
          <li>
            Migraciones en <Archivo>apps/api/prisma/migrations/</Archivo>; las reglas que Prisma no expresa (triggers,
            funciones, CHECK) van en SQL dentro de la migración.
          </li>
          <li>
            Modelo explicado en <Archivo>docs/product/modelo-datos.md</Archivo>. Los ids son <Codigo>INTEGER</Codigo>;
            las fechas, <Codigo>TIMESTAMPTZ</Codigo> en zona America/La_Paz.
          </li>
          <li>
            Semilla (roles, sedes, especialidades, requisitos y el Kardex inicial):{' '}
            <Archivo>apps/api/prisma/semilla.ts</Archivo>.
          </li>
        </ul>
      </Seccion>

      <Seccion id="frontend" titulo="11. Frontend">
        <ul>
          <li>
            Rutas y pantallas: <Archivo>apps/web/src/App.tsx</Archivo> y <Archivo>apps/web/src/pages/</Archivo>.
          </li>
          <li>
            Las pantallas nunca llaman a la API directo: usan <Archivo>apps/web/src/services/</Archivo>. Cada servicio
            tiene una versión <Codigo>.api.ts</Codigo> y otra <Codigo>.mock.ts</Codigo> con la misma firma;{' '}
            <Archivo>services/_modo.ts</Archivo> elige según <Codigo>VITE_USAR_API</Codigo>. Así el prototipo y el
            sistema real comparten las mismas pantallas.
          </li>
          <li>
            Datos con TanStack Query en <Archivo>apps/web/src/hooks/</Archivo> (caché, recarga al registrar un paso).
          </li>
          <li>
            Componentes reutilizables en <Archivo>apps/web/src/components/ui/</Archivo>.
          </li>
        </ul>
      </Seccion>

      <Seccion id="pruebas" titulo="12. Pruebas, CI y despliegue">
        <Tabla
          cabecera={['Tipo', 'Dónde', 'Qué prueba']}
          filas={[
            [
              'Unitarias (API)',
              <Archivo key="a">apps/api/test</Archivo>,
              'Reglas puras: máquina de estados, semáforo, JWT, política.',
            ],
            [
              'Integración con base de datos',
              <Archivo key="a">apps/api/test/bd</Archivo>,
              'Cada endpoint contra PostgreSQL real, incluida la matriz de permisos por rol.',
            ],
            [
              'Unitarias (web)',
              <Archivo key="a">apps/web/src/**/*.test.ts</Archivo>,
              'Servicios mock, permisos, reglas.',
            ],
            [
              'De punta a punta',
              <Archivo key="a">apps/web/e2e</Archivo>,
              <>
                Playwright en el navegador. <Archivo>e2e/api-real/flujos-completos.spec.ts</Archivo> recorre los tres
                flujos del trámite con cada rol.
              </>,
            ],
          ]}
        />
        <ul>
          <li>
            <Archivo>.github/workflows/ci.yml</Archivo>: en cada cambio corre lint, tipos, pruebas, pruebas con base de
            datos, E2E y la imagen Docker.
          </li>
          <li>
            Imágenes: <Archivo>apps/api/Dockerfile</Archivo> y <Archivo>apps/web/Dockerfile</Archivo> (Nginx sirve la
            web y hace de proxy de <Codigo>/api</Codigo>). Despliegue de prueba:{' '}
            <Archivo>deploy/coolify/docker-compose.yml</Archivo> y <Archivo>docs/despliegue/prueba-coolify.md</Archivo>.
          </li>
        </ul>
      </Seccion>

      <Seccion id="orden" titulo="13. Orden sugerido para estudiar">
        <ol>
          <li>
            <Archivo>docs/product/PRD.md</Archivo> §1 (problema y objetivos) y{' '}
            <Archivo>docs/product/business-rules.md</Archivo>.
          </li>
          <li>
            <Archivo>docs/adr/</Archivo>: las 6 decisiones de arquitectura, en orden.
          </li>
          <li>
            Seguridad: <Archivo>password.ts</Archivo> → <Archivo>auth.servicio.ts</Archivo> (login y refresh) →{' '}
            <Archivo>autorizacion.politica.ts</Archivo>.
          </li>
          <li>
            El trámite: <Archivo>maquina.ts</Archivo> → <Archivo>hojas-ruta.servicio.ts</Archivo> → la prueba{' '}
            <Archivo>flujos-completos.spec.ts</Archivo>.
          </li>
          <li>
            La bitácora: <Archivo>auditoria.servicio.ts</Archivo> y el trigger de la migración inicial.
          </li>
          <li>
            <Archivo>docs/decisions/LOG.md</Archivo> y <Archivo>docs/product/dudas.md</Archivo>: cómo se resolvió cada
            contradicción con la escuela.
          </li>
        </ol>
      </Seccion>
    </PaginaGuia>
  );
}
