import { Archivo, Codigo, Nota, PaginaGuia, Pregunta, Seccion } from './comun';

const APARTADOS = [
  { id: 'problema', titulo: 'Problema, objetivos y alcance' },
  { id: 'requisitos', titulo: 'Requisitos y validación con la escuela' },
  { id: 'arquitectura', titulo: 'Arquitectura y tecnologías' },
  { id: 'seguridad', titulo: 'Seguridad' },
  { id: 'datos', titulo: 'Datos, trazabilidad y concurrencia' },
  { id: 'calidad', titulo: 'Calidad, metodología y despliegue' },
  { id: 'limites', titulo: 'Limitaciones y trabajo futuro' },
] as const;

/**
 * Preguntas que pueden hacer el tutor y el tribunal, con respuestas basadas en lo que hay en el repositorio (DEC-048).
 * Cada respuesta cita dónde verificarla.
 */
export function PreguntasDefensa() {
  return (
    <PaginaGuia
      titulo="Preguntas de tutores y tribunal"
      subtitulo="Preguntas probables sobre SISET, con respuestas cortas y dónde está la evidencia en el proyecto."
      apartados={APARTADOS}
    >
      <Nota>
        Consejo: responda primero en una frase y después dé la evidencia (un archivo, una prueba o una decisión
        registrada). Haga clic en cada pregunta para ver la respuesta.
      </Nota>

      <Seccion id="problema" titulo="1. Problema, objetivos y alcance">
        <Pregunta p="¿Qué problema resuelve SISET?">
          <p>
            Hoy el seguimiento de los trámites es en papel: el egresado viaja entre La Paz y Pucarani sin saber en qué
            instancia está su trámite, y Kardex revisa los requisitos (TACFI, TCLO, notas) a mano. SISET digitaliza la
            hoja de ruta y el file académico: cada paso queda registrado con quién y cuándo, y el egresado consulta el
            avance en línea con un QR.
          </p>
        </Pregunta>
        <Pregunta p="¿Cuáles son los objetivos y cómo se miden?">
          <p>
            Del PRD (<Archivo>docs/product/PRD.md</Archivo> §1): O1 trazabilidad total (100 % de trámites con todos sus
            pasos registrados), O2 reducir el tiempo de tramitación en un 40 % y O3 cero trámites emitidos con
            requisitos incompletos. O1 y O3 los garantiza el diseño: la máquina de estados obliga a registrar cada paso
            y el file bloqueado impide avanzar. O2 se mide con el reporte de tiempo promedio por estado.
          </p>
        </Pregunta>
        <Pregunta p="¿Cómo va a demostrar la reducción del 40 %?">
          <p>
            Hace falta una línea base del tiempo actual, que la escuela todavía no tiene (D-20). El sistema ya mide el
            tiempo de cada trámite y de cada estado (Reportes). El plan es medir los primeros meses del piloto y
            compararlo con los tiempos en papel que la escuela registre. No afirmo el 40 % como logrado: es una meta.
          </p>
        </Pregunta>
        <Pregunta p="¿Quiénes usan el sistema?">
          <p>
            Seis roles: Kardex (administra y es dueño del file), Secretaría de Dirección General (recibe y entrega en
            Calahumana), Secretaría de Coordinación, Coordinador (firma los certificados), estudiante (consulta su file)
            y egresado (seguimiento público, sin cuenta).
          </p>
        </Pregunta>
        <Pregunta p="¿Qué quedó fuera del alcance y por qué?">
          <ul>
            <li>
              Generar los documentos (historial, certificados): falta que la escuela entregue los formatos (D-10, D-39).
            </li>
            <li>Avisos por correo o WhatsApp: la escuela los dejó para después (D-19).</li>
            <li>Subir escaneos: la escuela dijo que no (D-22).</li>
            <li>Cuentas de estudiantes con doble verificación: después del piloto con el personal (DEC-018).</li>
          </ul>
          <p>Cada exclusión está respaldada por una respuesta de la escuela o una decisión registrada.</p>
        </Pregunta>
      </Seccion>

      <Seccion id="requisitos" titulo="2. Requisitos y validación con la escuela">
        <Pregunta p="¿Cómo levantó los requisitos?">
          <p>
            Partí del borrador de tesis, que tenía contradicciones (por ejemplo, tres significados distintos para
            TACFI). Las convertí en un PRD con decisiones provisionales y en una lista de dudas. Las dudas se enviaron a
            la escuela en una hoja compartida, en lenguaje simple, cada una con “qué haremos si no hay respuesta”. Cada
            respuesta se pasa a <Archivo>docs/product/dudas.md</Archivo> y, si decide algo, a una decisión en{' '}
            <Archivo>docs/decisions/LOG.md</Archivo>. Si una respuesta queda incompleta, se repregunta (D-07b, D-10b…).
          </p>
        </Pregunta>
        <Pregunta p="Deme un ejemplo de un requisito que cambió por la validación.">
          <p>
            El dictamen del Coordinador. El borrador decía que el Coordinador aprobaba u observaba los trámites. La
            escuela respondió (D-11) que “solo firma”. Se quitó el dictamen y su pantalla pasó a ser “Firmas”, un paso
            más de la hoja de ruta (DEC-040). Otro: los egresados no tienen cuenta (D-08), así que el seguimiento es
            público con N.º de trámite y CI.
          </p>
        </Pregunta>
        <Pregunta p="¿Qué hace el sistema cuando la escuela no respondió una duda?">
          <p>
            Aplica la propuesta provisional escrita en la propia duda, y nunca inventa una regla. Por ejemplo, mientras
            no respondan D-34, no hay estado “Observado”: el file bloqueado impide avanzar.
          </p>
        </Pregunta>
        <Pregunta p="¿Por qué hay dos flujos de trámite?">
          <p>
            Porque así funciona la escuela (D-05): el historial y la legalización llevan valorado y los firman las
            direcciones en Calahumana; los certificados no llevan valorado, los firma el Coordinador en Ancocagua y se
            remiten a Calahumana. Están en la tabla <Codigo>TRANSICIONES</Codigo> de{' '}
            <Archivo>apps/api/src/modulos/hojas-ruta/maquina.ts</Archivo>.
          </p>
        </Pregunta>
      </Seccion>

      <Seccion id="arquitectura" titulo="3. Arquitectura y tecnologías">
        <Pregunta p="¿Por qué un monolito modular y no microservicios?">
          <p>
            Por el tamaño del equipo (una persona), del sistema y de la escuela: microservicios agregan red, despliegues
            y consistencia distribuida sin beneficio aquí. El monolito modular mantiene las fronteras (cada módulo es
            dueño de sus tablas y solo se usa por su <Codigo>index.ts</Codigo>), así que un módulo se podría separar
            después. Está en <Archivo>docs/adr/0001-monolito-modular.md</Archivo>.
          </p>
        </Pregunta>
        <Pregunta p="¿Por qué esas tecnologías (React, Express, PostgreSQL, Prisma)?">
          <ul>
            <li>Todas son software libre (RNF-09) y con mucha documentación y comunidad.</li>
            <li>
              TypeScript en el frontend y el backend: un solo lenguaje, con tipos que detectan errores al compilar.
            </li>
            <li>
              PostgreSQL: relacional, con transacciones, triggers y bloqueos de fila, que el sistema usa para la
              bitácora inmutable y para evitar carreras.
            </li>
            <li>Prisma: consultas tipadas y migraciones versionadas; las consultas van parametrizadas.</li>
            <li>React + Vite: interfaz rápida que funciona en celular y en computadora.</li>
          </ul>
        </Pregunta>
        <Pregunta p="¿Cómo se comunican el frontend y el backend?">
          <p>
            Por una API REST con JSON en <Codigo>/api/v1</Codigo>, documentada con OpenAPI (Swagger en{' '}
            <Codigo>/api/v1/docs</Codigo>, fuera de producción). En el despliegue, Nginx sirve la web y hace de proxy de{' '}
            <Codigo>/api</Codigo>: mismo origen, sin CORS abierto.
          </p>
        </Pregunta>
        <Pregunta p="¿Cómo organizó el código?">
          <p>
            Monorepo con <Archivo>apps/api</Archivo> y <Archivo>apps/web</Archivo>. En la API, cada módulo tiene rutas,
            controlador, servicio y repositorio. En la web, las pantallas solo usan servicios, con una versión real y
            otra de demostración (mock) con la misma firma. Detalle en la guía de estudio.
          </p>
        </Pregunta>
      </Seccion>

      <Seccion id="seguridad" titulo="4. Seguridad">
        <Pregunta p="¿Cómo guarda las contraseñas?">
          <p>
            Nunca en texto: se guarda un hash <strong>bcrypt con costo 12</strong> (
            <Archivo>apps/api/src/modulos/seguridad/password.ts</Archivo>). bcrypt es lento a propósito y usa una sal
            aleatoria: aunque roben la base, adivinar contraseñas es muy costoso y dos contraseñas iguales tienen hashes
            distintos. La política exige 8 caracteres con letras, números y símbolos (DEC-011).
          </p>
        </Pregunta>
        <Pregunta p="¿Qué pasa si alguien intenta adivinar una contraseña?">
          <p>
            Después de 5 intentos fallidos la cuenta se bloquea 15 minutos, y además hay un límite de 10 intentos por
            minuto por IP. Cada intento queda en la bitácora, también los hechos con un carnet que no existe (D-26).
          </p>
        </Pregunta>
        <Pregunta p="¿Cómo maneja la sesión? ¿Por qué no guarda el token en localStorage?">
          <p>
            Un access token JWT de 15 minutos en memoria y un refresh token de 8 horas en una cookie{' '}
            <Codigo>httpOnly</Codigo>, <Codigo>Secure</Codigo> y <Codigo>SameSite=Strict</Codigo>. JavaScript no puede
            leer esa cookie, así que un script malicioso (XSS) no puede robarla, cosa que sí podría hacer con
            localStorage. El refresh rota en cada uso; si llega uno ya usado, se toma como robo y se cierran todas las
            sesiones del usuario. En la base solo se guarda el SHA-256 del refresh token.
          </p>
        </Pregunta>
        <Pregunta p="¿Cómo evita que alguien vea o haga lo que no le corresponde?">
          <p>
            Tres niveles: (1) la política de permisos por rol con Casbin, en un solo archivo (
            <Archivo>autorizacion.politica.ts</Archivo>); (2) “lo propio” se valida en el servicio: el estudiante solo
            lee su file porque el id sale de su sesión, no de la URL; (3) la máquina de estados decide qué rol y desde
            qué sede registra cada paso. Hay pruebas que recorren toda la matriz de rutas por rol y comprueban cada
            negación.
          </p>
        </Pregunta>
        <Pregunta p="El seguimiento público, ¿no expone datos personales?">
          <p>
            Pide el N.º de trámite <strong>y</strong> el CI del titular, muestra solo el nombre y los estados (sin quién
            hizo cada paso) y responde lo mismo si falla el N.º o el CI, para que nadie pueda adivinar trámites
            (anti-enumeración). Además tiene un límite de consultas por minuto.
          </p>
        </Pregunta>
        <Pregunta p="¿Cómo se protege de ataques comunes (OWASP)?">
          <ul>
            <li>Inyección SQL: consultas parametrizadas con Prisma.</li>
            <li>Datos inválidos: toda entrada se valida con Zod en el borde de la API.</li>
            <li>XSS: React escapa el contenido y el token no es accesible desde JavaScript.</li>
            <li>Cabeceras de seguridad con helmet; HTTPS con certificado de Let’s Encrypt.</li>
            <li>Fuerza bruta: bloqueo por intentos y límite de peticiones.</li>
            <li>Control de acceso: política por rol y validación de lo propio en el servidor.</li>
          </ul>
        </Pregunta>
      </Seccion>

      <Seccion id="datos" titulo="5. Datos, trazabilidad y concurrencia">
        <Pregunta p="¿Cómo garantiza la trazabilidad?">
          <p>
            Cada escritura registra un evento en la bitácora <strong>en la misma transacción</strong>: si el evento no
            se guarda, la acción tampoco. La bitácora es de solo inserción por un trigger de PostgreSQL que rechaza
            modificar o borrar (<Archivo>docs/adr/0003-bitacora-inmutable.md</Archivo>). Ni siquiera el sistema puede
            alterarla.
          </p>
        </Pregunta>
        <Pregunta p="¿Cómo evita números de trámite duplicados?">
          <p>
            Con una función de PostgreSQL (<Codigo>fn_siguiente_nro_hoja_ruta</Codigo>) que incrementa un contador por
            gestión con <Codigo>INSERT … ON CONFLICT DO UPDATE</Codigo>, dentro de la misma transacción del registro.
            Dos registros simultáneos no pueden recibir el mismo número (
            <Archivo>docs/adr/0006-correlativo-hojas-ruta.md</Archivo>).
          </p>
        </Pregunta>
        <Pregunta p="¿Qué pasa si dos personas registran el mismo paso al mismo tiempo?">
          <p>
            Cada paso bloquea la fila del trámite con <Codigo>SELECT … FOR UPDATE</Codigo> hasta terminar. El segundo
            espera, ve que el trámite ya cambió de estado y recibe “el trámite no admite ese paso”; la pantalla se
            recarga con el estado actual.
          </p>
        </Pregunta>
        <Pregunta p="¿Cómo diseñó la base de datos?">
          <p>
            Relacional, con un módulo dueño por tabla (<Archivo>docs/product/modelo-datos.md</Archivo>). La persona está
            separada del usuario y del file, para que alguien pueda tener file sin cuenta (el egresado). Las reglas que
            el ORM no expresa (triggers, funciones, CHECK) están en SQL dentro de las migraciones versionadas.
          </p>
        </Pregunta>
      </Seccion>

      <Seccion id="calidad" titulo="6. Calidad, metodología y despliegue">
        <Pregunta p="¿Cómo probó el sistema?">
          <p>
            En cuatro niveles, más de 800 pruebas automáticas: unitarias de la API y de la web, de integración contra
            PostgreSQL real (cada endpoint y la matriz completa de permisos) y de punta a punta con Playwright en el
            navegador, que recorren los dos flujos del trámite con cada rol (
            <Archivo>apps/web/e2e/api-real/flujos-completos.spec.ts</Archivo>). Corren solas en cada cambio (
            <Archivo>.github/workflows/ci.yml</Archivo>); si una falla, el cambio no se considera terminado.
          </p>
        </Pregunta>
        <Pregunta p="¿Qué metodología siguió?">
          <p>
            Iterativa, por sprints (S0 a S6) con un backlog priorizado. Cada ticket tiene un documento de diseño (SDD)
            en <Archivo>docs/sdd/</Archivo> antes de programar, y cada decisión queda en el registro de decisiones. La
            validación con la escuela fue continua por la hoja de dudas y una demostración del prototipo.
          </p>
        </Pregunta>
        <Pregunta p="¿Dónde y cómo está desplegado?">
          <p>
            En contenedores Docker (API, web con Nginx y PostgreSQL) en un servidor en la nube administrado con Coolify,
            con HTTPS. La escuela no tiene servidor (D-12) y autorizó el servidor externo (D-12b). El entorno actual es
            de prueba con datos ficticios; la producción con datos reales espera los respaldos diarios.
          </p>
        </Pregunta>
        <Pregunta p="¿Cómo se usa el prototipo y el sistema real con las mismas pantallas?">
          <p>
            Cada servicio de la web tiene una versión que llama a la API y otra de demostración en memoria, con la misma
            firma. Una variable (<Codigo>VITE_USAR_API</Codigo>) elige cuál. Así el prototipo validado con la escuela se
            convirtió en el sistema real pantalla por pantalla.
          </p>
        </Pregunta>
      </Seccion>

      <Seccion id="limites" titulo="7. Limitaciones y trabajo futuro">
        <Pregunta p="¿Qué le falta al sistema?">
          <ul>
            <li>Generar e imprimir los documentos oficiales (falta el formato, D-10 y D-39).</li>
            <li>Cuentas de estudiantes con doble verificación (decidida con app TOTP, DEC-018).</li>
            <li>Avisos por correo, exportar reportes a PDF y Excel, y la prueba de carga.</li>
            <li>Producción con respaldos diarios y la carga de los 152 files reales.</li>
          </ul>
        </Pregunta>
        <Pregunta p="¿Funciona sin internet?">
          <p>
            No en esta versión: es un solo servidor con HTTPS al que entran las dos sedes (D-12). Funcionar sin conexión
            exigiría sincronizar datos y resolver conflictos, y no lo pidió la escuela.
          </p>
        </Pregunta>
        <Pregunta p="¿Por qué no hizo una app móvil?">
          <p>
            Porque la web se adapta al celular (diseño responsivo): el egresado consulta con el QR desde el navegador
            sin instalar nada, y el personal trabaja en computadora. Una app exigiría publicarla y mantener dos
            versiones.
          </p>
        </Pregunta>
        <Pregunta p="¿Quién mantiene el sistema cuando usted no esté?">
          <p>
            Kardex lo administra desde el propio sistema (D-27): crea usuarios, restablece contraseñas, registra los
            files y revisa la bitácora. El catálogo de requisitos y los parámetros (intentos, bloqueo, tiempos) están en
            tablas, no en el código: se amplían sin programar (la pantalla para editar el catálogo es trabajo futuro).
            El código está documentado con decisiones, ADR, SDD y pruebas.
          </p>
        </Pregunta>
      </Seccion>
    </PaginaGuia>
  );
}
