import { Nota, PaginaGuia, Pregunta, Seccion, Subtitulo, Tabla } from './comun';

const APARTADOS = [
  { id: 'ingreso', titulo: 'Ingreso y seguridad' },
  { id: 'tramite', titulo: 'Cómo avanza un trámite' },
  { id: 'kardex', titulo: 'Kardex' },
  { id: 'sec-dir', titulo: 'Secretaría de Dirección General' },
  { id: 'sec-coord', titulo: 'Secretaría de Coordinación' },
  { id: 'coordinador', titulo: 'Coordinador Académico' },
  { id: 'estudiante', titulo: 'Estudiante' },
  { id: 'egresado', titulo: 'Egresado: seguimiento sin cuenta' },
  { id: 'frecuentes', titulo: 'Preguntas frecuentes' },
  { id: 'capacitacion', titulo: 'Plan de capacitación' },
] as const;

/** Manual de usuario por rol y plan de capacitación (S6.12, DEC-048). Público, sin sesión. */
export function ManualPersonal() {
  return (
    <PaginaGuia
      titulo="Manual del personal y capacitación"
      subtitulo="Cómo usar SISET en cada puesto: Kardex, Secretarías, Coordinación, estudiantes y egresados."
      apartados={APARTADOS}
    >
      <Seccion id="ingreso" titulo="1. Ingreso y seguridad">
        <ul>
          <li>
            Se entra con el <strong>número de carnet (CI)</strong> como usuario y la contraseña. Si el carnet tiene
            complemento, se escribe con guion (por ejemplo, 1234567-1A).
          </li>
          <li>
            La primera vez, Kardex le da una <strong>contraseña temporal</strong>: el sistema le pide cambiarla al
            entrar. La nueva debe tener al menos 8 caracteres, con letras, números y símbolos.
          </li>
          <li>
            Después de <strong>5 intentos fallidos</strong> la cuenta se bloquea 15 minutos. Si olvidó la contraseña,
            Kardex se la restablece (no hay recuperación por correo).
          </li>
          <li>
            Con <strong>15 minutos sin actividad</strong> la sesión se cierra sola; al minuto 14 aparece un aviso para
            seguir conectado. En una computadora compartida, use siempre <em>Cerrar sesión</em> (menú con su nombre,
            arriba a la derecha).
          </li>
          <li>
            La <strong>campana</strong> de arriba muestra lo que espera un paso suyo (por ejemplo, “2 trámites por
            recoger”) y lo lleva directo a esa bandeja.
          </li>
          <li>
            En <strong>Mi perfil</strong> ve sus datos y puede cambiar su contraseña. Los datos los corrige Kardex.
          </li>
        </ul>
        <Nota>
          Todo lo que se registra queda en la <strong>bitácora</strong> con quién, cuándo y desde dónde. No se puede
          borrar ni modificar.
        </Nota>
      </Seccion>

      <Seccion id="tramite" titulo="2. Cómo avanza un trámite">
        <p>
          Hay dos caminos, según el tipo de trámite. Cada paso lo registra quien lo hace, desde el detalle del trámite o
          desde su bandeja. El egresado ve cada paso en el seguimiento público.
        </p>
        <Subtitulo>Historial académico y legalización (llevan valorado)</Subtitulo>
        <Tabla
          cabecera={['Paso', 'Quién lo registra', 'Dónde']}
          filas={[
            ['1. Recibido', 'Secretaría de Dirección', 'Calahumana (La Paz)'],
            ['2. Avisado a Kardex', 'Secretaría de Dirección', 'Calahumana'],
            ['3. En impresión (Kardex lo recogió)', 'Kardex', 'Ancocagua'],
            ['4. Impreso', 'Kardex', 'Ancocagua'],
            ['5. Firmado por Dirección Académica', 'Secretaría de Dirección', 'Calahumana'],
            ['6. Listo para entregar (firma de Dirección General)', 'Secretaría de Dirección', 'Calahumana'],
            ['7. Entregado', 'Secretaría de Dirección', 'Calahumana'],
          ]}
        />
        <Subtitulo>Certificados de notas y de excelencia de años pasados (sin valorado)</Subtitulo>
        <Tabla
          cabecera={['Paso', 'Quién lo registra', 'Dónde']}
          filas={[
            ['1. Recibido', 'Secretaría de Dirección', 'Calahumana (La Paz)'],
            ['2. Avisado a Kardex', 'Secretaría de Dirección', 'Calahumana'],
            ['3. En impresión', 'Kardex', 'Ancocagua'],
            ['4. Impreso', 'Kardex', 'Ancocagua'],
            ['5. Firmado por el Coordinador', 'Coordinador', 'Ancocagua'],
            ['6. Remitido a Calahumana', 'Kardex', 'Ancocagua'],
            ['7. Listo para entregar (llegó a Calahumana)', 'Secretaría de Dirección', 'Calahumana'],
            ['8. Entregado', 'Secretaría de Dirección', 'Calahumana'],
          ]}
        />
        <Nota>
          Si el <strong>file del egresado está bloqueado</strong>, no se puede registrar el trámite ni recogerlo ni
          imprimirlo hasta que Kardex lo desbloquee. Un paso registrado por error no se borra: se aclara en la
          observación del paso siguiente.
        </Nota>
      </Seccion>

      <Seccion id="kardex" titulo="3. Kardex (Responsable de Sistemas y Archivo)">
        <Subtitulo>Files académicos</Subtitulo>
        <ol>
          <li>
            <strong>Buscar:</strong> menú <em>Files académicos</em>; busque por CI, nombre o código, y filtre por
            especialidad, año, condición, semáforo o solo bloqueados.
          </li>
          <li>
            <strong>Registrar un file:</strong> botón <em>Nuevo file</em>. Llene los datos y la condición (estudiante o
            egresado). Para que Secretaría registre un trámite, el titular debe tener file como{' '}
            <strong>egresado</strong>.
          </li>
          <li>
            <strong>Requisitos:</strong> en el file, pestaña <em>Requisitos</em>: los 24 de la hoja del folder personal,
            en su orden, más las tres defensas del TCLOA. Botón <em>Registrar</em>: estado (completo, pendiente u
            observado), fecha, N.º de documento y observación. Los TACFI piden además el nombre del curso y la entidad
            emisora; la matrícula y el certificado de notas se agregan por gestión (<em>Agregar gestión</em>: I/2025,
            II/2025 o 2023), una por cada año cursado. Lo que no corresponde al estudiante (por género o modalidad)
            aparece en gris. En <em>Datos personales</em> se anotan el género, la modalidad de ingreso (A, B1, B2 o B3;
            obligatoria al registrar un estudiante) y el año de formación.
          </li>
          <li>
            <strong>Bloquear:</strong> botón rojo <em>Bloquear</em> en la cabecera del file, solo por licencia temporal
            (obligatoria o voluntaria). Pide el número y la fecha de la resolución, una glosa con el motivo y el PDF de
            la resolución (hasta 5 MB). <strong>Desbloquear</strong> solo pide confirmar; la resolución queda en el
            historial.
          </li>
          <li>
            El color del file (semáforo): <strong>verde</strong> todo completo, <strong>amarillo</strong> le falta algo,{' '}
            <strong>rojo</strong> bloqueado, con un requisito observado o con un TACFI de un año que ya pasó.
          </li>
        </ol>
        <Subtitulo>Trámites</Subtitulo>
        <ol>
          <li>
            <strong>Recojo y remisión:</strong> pestaña <em>Por recoger</em> (los que avisó Secretaría) y{' '}
            <em>Por remitir</em> (certificados ya firmados por el Coordinador). Elija el trámite: a la derecha ve los
            requisitos del titular y el botón del paso.
          </li>
          <li>
            <strong>Impresión:</strong> pestaña <em>Por imprimir</em>; imprima como siempre y marque{' '}
            <em>Marcar como impreso</em>. La pestaña <em>Impresos</em> muestra los que esperan firma.
          </li>
          <li>
            <strong>Historial y legalización:</strong> antes de imprimir, contraste las notas del sistema con los
            empastes. Si están bien, <em>Marcar como impreso</em> deja anotado el N.º de valorado en que se imprimió. Si
            algo no coincide, no imprima: pulse <em>Devolver con observación</em> y escriba qué no coincide. El trámite
            termina en SISET; el egresado debe hacer otro trámite.
          </li>
          <li>Use el buscador de cada bandeja para encontrar un trámite por N.º, nombre o CI.</li>
        </ol>
        <Subtitulo>Administración</Subtitulo>
        <ul>
          <li>
            <strong>Usuarios:</strong> <em>Nuevo usuario</em> crea la cuenta del personal y muestra una sola vez la
            contraseña temporal (entréguela en persona). Desde la lista: editar, restablecer contraseña, desbloquear y
            dar de baja.
          </li>
          <li>
            <strong>Bitácora:</strong> quién hizo qué y cuándo. Filtre por fechas, usuario, módulo o acción; clic en el
            registro afectado muestra su historial completo.
          </li>
          <li>
            <strong>Reportes:</strong> trámites por estado, por tipo y por mes, tiempo promedio y trámites atrasados
            (más de 72 horas sin moverse: el trámite debe responderse en 48 a 72 horas).
          </li>
        </ul>
      </Seccion>

      <Seccion id="sec-dir" titulo="4. Secretaría de Dirección General (Calahumana)">
        <ol>
          <li>
            <strong>Recibir un trámite:</strong> menú <em>Nueva hoja de ruta</em>. Busque al egresado por CI o nombre y
            elíjalo. Si no aparece, pida a Kardex que registre o actualice su file.
          </li>
          <li>
            Elija el <strong>tipo de trámite</strong>. El historial y la legalización piden el{' '}
            <strong>N.º de valorado</strong>; los certificados no.
          </li>
          <li>
            <em>Registrar y avisar a Kardex</em> registra y avisa en un solo paso. <em>Solo registrar</em> lo deja en
            “Recibido” para avisar después (desde el detalle, botón <em>Avisar a Kardex</em>).
          </li>
          <li>
            Se genera el <strong>N.º de hoja de ruta</strong> (HR-AAAA-NNNNNN) con su <strong>código QR</strong>.{' '}
            <em>Imprimir carátula</em> da la hoja para el expediente físico, con los pasos y espacio para firmas y
            sellos. Entregue al egresado el N.º para su seguimiento.
          </li>
          <li>
            <strong>Firmas en Calahumana:</strong> cuando Dirección Académica y luego Dirección General firman el
            historial, regístrelo desde el detalle o desde el menú <em>Firma y entrega</em>, que junta lo que espera una
            firma, la llegada o la entrega.
          </li>
          <li>
            <strong>Certificados que llegan de Ancocagua:</strong> <em>Confirmar que llegó a Calahumana</em>.
          </li>
          <li>
            <strong>Entrega:</strong> <em>Registrar entrega</em> (en el detalle o en <em>Firma y entrega</em>): al
            titular o a un familiar de hasta primer grado (padre, madre, hijo/a, suegro/a, yerno/nuera), con su nombre y
            CI, después de verificar el parentesco y con su firma de recojo. Si la entrega fue otro día, ponga esa
            fecha: queda en el historial.
          </li>
          <li>
            <em>Hojas de ruta</em> lista todos los trámites con filtros por estado y tipo; la campana avisa los que
            esperan un paso suyo.
          </li>
          <li>
            <em>Bandeja de pases</em>: los trámites en camino hacia Ancocagua o hacia Calahumana, con quién los mandó,
            quién los recibió y cuándo. Kardex y Secretaría de Coordinación también la ven.
          </li>
        </ol>
      </Seccion>

      <Seccion id="sec-coord" titulo="5. Secretaría de Coordinación (Ancocagua)">
        <ul>
          <li>
            Su inicio muestra lo que está en Ancocagua: en impresión, impresos por firmar y por remitir, y los últimos
            trámites.
          </li>
          <li>
            Puede consultar las hojas de ruta y los files. En este flujo no registra pasos: los registran Kardex y el
            Coordinador.
          </li>
        </ul>
      </Seccion>

      <Seccion id="coordinador" titulo="6. Coordinador Académico">
        <ol>
          <li>
            Menú <strong>Firmas</strong>, pestaña <em>Esperan tu firma</em>: los certificados que Kardex imprimió. Botón{' '}
            <em>Firmar</em>, con una observación si hace falta.
          </li>
          <li>
            La pestaña <em>Firmados</em> muestra los que ya firmó y en qué estado están ahora.
          </li>
          <li>El historial y la legalización no pasan por su firma (los firman las direcciones en Calahumana).</li>
          <li>
            Su inicio muestra los trámites en curso, los entregados y cuántos hay en cada estado; también puede ver los
            files (sin editarlos) y los reportes.
          </li>
        </ol>
      </Seccion>

      <Seccion id="estudiante" titulo="7. Estudiante">
        <ul>
          <li>
            Su inicio muestra el color de su file, sus requisitos obligatorios y las alertas (bloqueo, requisitos
            observados o pendientes).
          </li>
          <li>
            <em>Mi file académico</em> muestra sus requisitos del folder personal y sus datos. Es solo lectura: si algo
            está mal, acérquese a Kardex.
          </li>
          <li>Funciona en el celular. Las cuentas de estudiantes se habilitan después del piloto del personal.</li>
        </ul>
      </Seccion>

      <Seccion id="egresado" titulo="8. Egresado: seguimiento sin cuenta">
        <ul>
          <li>
            Los egresados no tienen cuenta. Consultan en <em>siset.vertexall.com/seguimiento</em> (o escaneando el QR de
            la carátula) con el <strong>N.º de hoja de ruta</strong> y su <strong>CI</strong>.
          </li>
          <li>
            Ven su nombre, el tipo de trámite, dónde está y la fecha de cada paso; no ven quién hizo cada paso. Si el
            N.º o el CI no coinciden, el mensaje es el mismo (por seguridad).
          </li>
        </ul>
      </Seccion>

      <Seccion id="frecuentes" titulo="9. Preguntas frecuentes">
        <Pregunta p="Registré un paso por error, ¿cómo lo deshago?">
          <p>
            No se deshace: queda en el historial. Aclárelo en la observación del paso siguiente. (Se consultó a la
            escuela en D-38.)
          </p>
        </Pregunta>
        <Pregunta p="El egresado no aparece al registrar el trámite.">
          <p>
            Solo aparecen los files de <strong>egresados</strong>. Pida a Kardex que registre su file o que cambie su
            condición a egresado. (D-40.)
          </p>
        </Pregunta>
        <Pregunta p="El botón del paso aparece gris.">
          <p>
            El file del titular está bloqueado por una licencia temporal. Kardex debe desbloquearlo cuando se
            reincorpore.
          </p>
        </Pregunta>
        <Pregunta p="Me salió “Su sesión terminó”.">
          <p>
            Pasaron 15 minutos sin actividad o alguien cerró la sesión. Vuelva a entrar; lo registrado no se pierde.
          </p>
        </Pregunta>
        <Pregunta p="¿El sistema imprime el historial o el certificado?">
          <p>
            Por ahora no: Kardex imprime como siempre y el sistema registra que se imprimió, con quién y cuándo. Se está
            consultando a la escuela (D-39, D-10).
          </p>
        </Pregunta>
      </Seccion>

      <Seccion id="capacitacion" titulo="10. Plan de capacitación">
        <p>
          Antes del piloto de la primera semana de noviembre (D-06). Las fechas se coordinan con Coordinación y Kardex
          (D-16). Se practica en el entorno de prueba (<em>siset.vertexall.com</em>), con datos ficticios y las cuentas
          de prueba del login: los errores no afectan a nadie.
        </p>
        <Tabla
          cabecera={['Sesión', 'Para quién', 'Duración', 'Contenido y práctica']}
          filas={[
            [
              '1. Ingreso y seguridad',
              'Todo el personal',
              '45 min',
              'Entrar con el CI, cambiar la contraseña temporal, la campana, Mi perfil, cerrar sesión, qué queda en la bitácora.',
            ],
            [
              '2. Files y administración',
              'Kardex',
              '90 min',
              'Registrar 3 files (uno egresado), registrar requisitos, bloquear y desbloquear, crear un usuario y restablecer su contraseña, leer la bitácora.',
            ],
            [
              '3. Trámites en Calahumana',
              'Secretaría de Dirección',
              '60 min',
              'Registrar un historial y un certificado, imprimir la carátula, registrar las dos firmas, confirmar la llegada y entregar a un familiar.',
            ],
            [
              '4. Trámites en Ancocagua',
              'Kardex, Coordinador y Secretaría de Coordinación',
              '45 min',
              'Recoger, imprimir, firmar y remitir el certificado de la sesión 3; consultar los reportes.',
            ],
            [
              '5. Ensayo general',
              'Todos juntos',
              '60 min',
              'Un trámite de cada tipo de punta a punta; el egresado lo sigue con el QR desde su celular. Dudas y ajustes.',
            ],
          ]}
        />
        <Subtitulo>Al terminar, cada persona debe poder</Subtitulo>
        <ul>
          <li>Entrar con su CI, cambiar su contraseña y cerrar sesión.</li>
          <li>Hacer sin ayuda los pasos de su puesto en un trámite de cada tipo.</li>
          <li>Encontrar un trámite por N.º o CI y explicar en qué estado está.</li>
          <li>Kardex: crear una cuenta, restablecer una contraseña y revisar la bitácora.</li>
        </ul>
        <Nota>
          Material: este manual (se puede imprimir desde el navegador), el entorno de prueba y una hoja de ejercicios
          por sesión. Las dudas que surjan se anotan en la hoja de preguntas para la escuela.
        </Nota>
      </Seccion>
    </PaginaGuia>
  );
}
