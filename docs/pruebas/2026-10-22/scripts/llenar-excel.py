# Completa "observaciones a corregir.xlsx": respuestas en la columna B, con los resultados medidos el 22-oct-2026.
import math
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

wb = openpyxl.load_workbook('obs.xlsx')
AR = Font(name='Arial', size=10)
ARB = Font(name='Arial', size=10, bold=True, color='1F4E79')
RES = PatternFill('solid', fgColor='EAF1F8')


def poner(ws, fila, texto, ancho, resaltar=False):
    c = ws.cell(fila, 2, texto)
    c.font = ARB if resaltar else AR
    c.alignment = Alignment(wrap_text=True, vertical='top')
    if resaltar:
        c.fill = RES
    lineas = sum(max(1, math.ceil(len(p) / (ancho * 1.05))) for p in texto.split('\n'))
    ws.row_dimensions[fila].height = max(15.75, 13.5 * lineas + 3)
    ws.cell(fila, 1).alignment = Alignment(wrap_text=True, vertical='top')


h1 = wb['Hoja1']
h1.column_dimensions['B'].width = 100
h1.unmerge_cells('B41:B47')  # el encabezado queda en B41; cada fila lleva su respuesta
H1 = {
    2: 'Desarrollo incremental por sprints (S0–S6), 12 al 20-oct-2026, 218 commits, con CI en cada cambio. Herramientas: VS Code + Claude Code, Git/GitHub y Docker; no se usaron Postman ni Figma (ver abajo).',
    3: 'Editor principal (TypeScript, ESLint, Prettier, Tailwind, Prisma) con el asistente de IA Claude Code para programar, revisar y probar.',
    4: 'Git en un monorepo (apps/web y apps/api) en GitHub. Cada commit lleva el número de la tarea; Husky + lint-staged antes de cada commit; GitHub Actions para la CI y la publicación de imágenes en GitHub Container Registry.',
    5: 'No se usó. Se reemplazó por Swagger UI / OpenAPI (documentación interactiva de la API) y Supertest + Vitest (prueban cada endpoint automáticamente); curl para pruebas manuales.',
    6: 'Contenedores db (PostgreSQL), migrar, api (Node.js) y web (Nginx). El mismo docker-compose sirve en desarrollo, CI y servidor. Contenedores endurecidos: cap_drop ALL, no-new-privileges, API de solo lectura.',
    7: 'No se usó. Diseño directo en código con guía propia DESIGN.md (formato Google Stitch): azules #1F4E79 y #2E75B6, IBM Plex, Tailwind CSS, íconos Lucide; revisado con capturas de Playwright. Diagramas con Mermaid.',
    8: 'TypeScript 6 estricto (frontend y backend) sobre Node.js 26; SQL (PostgreSQL); HTML/CSS (Tailwind); Bash.',
    9: 'Frontend: React 19, Vite 8, Tailwind 4, React Router 8, TanStack Query, Axios, Chart.js, qrcode.react. Backend: Express 5, Prisma 7, Zod 4, Casbin, jose (JWT), bcryptjs, Helmet, CORS, express-rate-limit, multer, pino. Pruebas: Vitest, Supertest, Playwright.',
    10: 'SPA en React + API REST/JSON; JWT de 15 min + refresh en cookie httpOnly/Secure/SameSite=Strict; OpenAPI 3; diseño responsivo desde 360 px; QR en la carátula; CSP, X-Frame-Options y HSTS.',
    11: 'Nginx 1.30 sirve la web y hace de proxy de /api hacia Node.js + Express 5. En el servidor, Traefik (Coolify) termina HTTPS con Let’s Encrypt y redirige http → https.',
    12: 'VPS Contabo con Coolify. Imágenes construidas en GitHub Actions y publicadas en GHCR (etiquetas "prueba" y "AAAA.MM.DD-sha" para volver atrás). Dominio siset.vertexall.com (DNS Cloudflare). Hoy es entorno de prueba con datos ficticios.',
    13: 'IaaS (VPS en la nube de Contabo) + SaaS de apoyo: GitHub (código, CI/CD, registro de imágenes), Cloudflare (DNS), Let’s Encrypt. Portable: el mismo docker-compose corre en otro VPS o en un servidor de la escuela.',
    14: 'Desarrollo asistido por IA (Claude Code); contenedores y CI/CD; monolito modular (un solo sistema dividido en módulos); seguridad desde el diseño (Casbin, bitácora inmutable); observabilidad (pino, Grafana); documentos de diseño y de decisiones; QR para seguimiento público.',
    15: 'Lista de verificación de “terminado” por tarea y CI que bloquea el cambio si falla: Prettier, ESLint (0 advertencias), TypeScript estricto, Vitest, migraciones + seed 2 veces, cobertura de seguridad ≥ 70 % (real 98,55 %), E2E Playwright, build, npm audit y prueba de arranque en Docker.',
    16: 'bcrypt costo 12; bloqueo tras 5 intentos; 10 logins/min por IP; JWT 15 min + detección de reuso; permisos por rol (Casbin): cada usuario ve solo lo suyo y lo de su sede; Zod (rechaza campos extra y cuerpos > 100 KB); Helmet/CSP/CORS/HTTPS; bitácora inmutable; npm audit en CI. Probado: 17/17 ataques rechazados.',
    17: 'Referencia: Anexo A ISO/IEC 27001:2022. Cumple: 5.15 control de acceso, 5.17 manejo de contraseñas, 8.2 accesos privilegiados, 8.15 registro de eventos, 8.20 seguridad de redes, 8.25 desarrollo seguro, 8.28 código seguro y 8.32 gestión de cambios. Parcial: 8.5 autenticación segura (falta doble verificación), 8.13 respaldo (falta el automático diario) y 8.24 criptografía (base sin cifrar en disco). Cumplimiento medido: 77,13 % (Hoja 2, 4.3).',
    18: 'Fórmulas de la Hoja 2 (adecuación, tiempo promedio, CPU, compatibilidad, usabilidad, disponibilidad, seguridad, mantenibilidad, portabilidad, riesgo, recuperación, accesos seguros, vulnerabilidades) + cobertura de pruebas y percentil p95.',
    19: 'Modelo de calidad usado para los requisitos no funcionales (seguridad, desempeño, usabilidad…) y para la Hoja 2. Resultado global: 95,18 % (alto).',
    20: 'Mínimo privilegio (rol de BD sin borrar la bitácora); entorno de prueba solo con datos ficticios; trazabilidad (quién, cuándo, IP, antes/después); secretos fuera del código (Coolify); matriz de riesgos.',
    21: 'Procedimiento probado el 22-oct: pg_dump → pg_restore en base nueva, 18/18 tablas idénticas y MD5 igual. Pendiente antes de producción: respaldo diario automático con retención de 30 días.',
    22: '13 riesgos valorados con Riesgo = Probabilidad × Impacto (1–5): 1 alto (R1 falta de respaldo diario), 7 medios, 5 bajos. Detalle en Hoja 2, 4.3.1.',
    23: 'En tránsito: HTTPS/TLS (Let’s Encrypt). Contraseñas: bcrypt 12. Sesión: JWT firmado HS256 y cookie httpOnly. En reposo: la base no está cifrada (recomendado cifrar volumen y respaldos).',
    24: 'COCOMO básico orgánico con 27,07 KLOC reales: E = 2,4 × 27,07^1,05 = 76,63 personas-mes; T = 2,5 × 76,63^0,38 = 13,00 meses; P = 5,89 personas. (Real: 9 días, 2 personas con IA.)',
    25: 'Con Bs 6.000 por persona-mes (supuesto): 76,63 × 6.000 = Bs 459.772 según COCOMO. Costo real estimado del proyecto: Bs 17.000.',
    26: 'COCOMO: 76,63 personas-mes en 13 meses. Real: 218 commits del 12 al 20-oct-2026; backlog de 301 h.',
    27: 'Factible: todo es software libre (requisito del proyecto) y corre en un VPS común; con 50 usuarios la API usa 21 % de un núcleo y 175 MB de RAM. El equipo domina la pila.',
    28: 'Factible: navegador y celular sin instalar nada; accesibilidad 98–100 (Lighthouse); manual en /guia/manual; capacitación 28–29 oct.',
    29: 'Supuestos (a confirmar con la escuela): inversión Bs 17.000; costo anual Bs 5.740; beneficio anual Bs 22.000 (horas ahorradas + papel); flujo neto Bs 16.260; tasa 10 %, 5 años.',
    30: 'Rentable con esos supuestos: VAN > 0, TIR > tasa, B/C > 1; recuperación en ~12,6 meses.',
    31: 'VAN = −17.000 + 16.260 × Σ 1/(1,10)^t (t = 1..5) = Bs 44.638.',
    32: 'TIR = 92,0 % anual (> 10 %).',
    33: 'B/C = VA beneficios / (I₀ + VA costos) = 2,15.',
    34: '(Evidencias, imagen 20) Unitarias API 721/721; integración API+PostgreSQL 400/400 (1.121/1.121 en total); web 265/265; E2E Playwright 103/104; carga, estrés, seguridad, compatibilidad, integridad y respaldo el 22-oct-2026.',
    35: '(Evidencias, imagen 21) E2E Playwright de los flujos de cada rol (mock, API y API real con PostgreSQL): 103/104; la que falló es intermitente (pasa 2 de 3).',
    36: '9/9: Chromium, Google Chrome y Firefox × escritorio 1366, tablet 820 y celular 360. Safari pendiente (requiere Mac/iPhone).',
    37: '17/17 controles probados (tokens, permisos, inyección SQL, mass assignment, fuerza bruta, rate limit, bitácora); npm audit 0 vulnerabilidades; cabeceras y TLS revisados.',
    41: 'COMO SE REALIZO ?',
    42: 'GitHub Actions publica siset-api, siset-migrar y siset-web en GHCR; Coolify las baja, migrar aplica migraciones y datos, luego arrancan api y web. Rollback cambiando la etiqueta.',
    43: 'VPS Contabo + Docker + Coolify; Traefik con Let’s Encrypt y redirección HTTPS; DNS Cloudflare; PostgreSQL con límites (30 conexiones, 128 MB); API con rol de mínimo privilegio, secretos de Coolify, healthchecks y reinicio automático.',
    44: 'Publicado como entorno de prueba en https://siset.vertexall.com desde el 14-oct-2026, con cuentas de prueba por rol. Última versión: 44 h en línea, 0 reinicios, 0 errores 5xx.',
    45: 'Programada el 28 y 29 de octubre de 2026. Material listo: manual y guía de capacitación en /guia/manual. Falta confirmar horario.',
    46: 'Documento de requisitos, alcance, reglas de negocio, modelo de datos, 12 decisiones de arquitectura, 64 decisiones registradas, documento de diseño por tarea, guía de despliegue, DESIGN.md, manual en el sistema, OpenAPI e informe de pruebas (Word).',
    47: 'AÚN NO. Falta: respaldo diario (pendiente), datos del Administrador real, subir keepalive de Nginx y HSTS, y la capacitación.',
    49: 'SE REALIZO O NO SE REALIZO AUN ?',
    51: 'SÍ — API 721/721 y web 265/265 (Vitest), en cada CI.',
    52: 'SÍ — 400/400 contra PostgreSQL real (1.121/1.121 con unitarias); cobertura de seguridad 98,55 %; integridad con 300 altas simultáneas sin duplicados.',
    53: 'SÍ — E2E Playwright 103/104 (1 intermitente).',
    54: 'SÍ — 9/9 (3 navegadores × 3 tamaños). Safari pendiente.',
    55: 'SÍ — Carga 50 usuarios: 36.796 peticiones, 0 % error, p95 9,35 ms. Estrés 400 usuarios: quiebre en ~60 por Nginx; con keepalive 0 % error (384.349 peticiones).',
    56: 'SÍ — 17/17 controles, npm audit 0 vulnerabilidades.',
    57: 'SÍ, en curso — 4/4 rachas de CI fallidas corregidas (mediana 17 min). Hallazgos del 22-oct: keepalive Nginx (verificado), HSTS en la web y 1 E2E intermitente (pendientes).',
}
for f, t in H1.items():
    if f in (41, 49):  # encabezados de columna
        h1.cell(f, 2).value = t
        continue
    poner(h1, f, t, 100)

h2 = wb['Hoja2']
h2.column_dimensions['A'].width = 52
h2.column_dimensions['B'].width = 95
H2 = {
    4: 'Funciones que cumplen los 14 requisitos funcionales del proyecto y flujos funcionales probados de punta a punta (Playwright).',
    5: 'Adecuación funcional = Funciones correctas / Funciones evaluadas × 100',
    6: '1. Inicio y cierre de sesión: PARCIAL (falta la doble verificación por código) · 2. Permisos por rol: CUMPLE · 3. Gestión de usuarios: CUMPLE · 4. Consulta del file académico: CUMPLE · 5. Registro del TCLO: CUMPLE · 6. Recepción del certificado TACFI: CUMPLE · 7. Semáforo y bloqueo por requisitos: CUMPLE · 8. Registro de la hoja de ruta con N.º correlativo y QR: CUMPLE · 9. Seguimiento público del trámite: CUMPLE · 10. Pases entre sedes: CUMPLE · 11. Vista previa de documentos: PARCIAL (faltan las plantillas oficiales) · 12. Impresión oficial: PARCIAL (faltan las plantillas oficiales) · 13. Firma del Coordinador, reportes y panel: PARCIAL (falta exportar a PDF/Excel) · 14. Bitácora de auditoría: CUMPLE',
    7: '10 requisitos completos, 4 parciales, 0 ausentes. E2E: 103 de 104 flujos correctos.',
    8: '99,04 % por pruebas · 71,43 % por requisitos completos · 85,71 % ponderado',
    9: 'Lo construido funciona (99 %). Lo que falta depende de la escuela (plantillas) o de funciones planificadas (doble verificación, exportar reportes); nada crítico del flujo diario.',
    10: 'Adecuación = 103 / 104 × 100 = 99,04 %',
    15: 'Carga k6 0→50 usuarios, 6 min: 36.796 peticiones; promedio 3,45 ms; p95 9,35 ms; máx 269 ms (login 262 ms por bcrypt, a propósito).',
    16: 'Equipo: CPU 6,4 % prom. (pico 23 %). API 21,4 % de 1 núcleo y 175 MB; BD 8,9 % y 65 MB; web 3,8 % y 15 MB.',
    17: 'Carga 0 % error. Estrés 400 usuarios: 57 % de error desde ~60 usuarios (Nginx sin keepalive); tras corregir, 0 % de error, p95 633 ms, ~1.050 req/s.',
    18: 'Tiempo promedio = 126.966 ms / 36.796 = 3,45 ms · Uso de CPU = 6,4 / 100 × 100 = 6,4 %',
    25: 'GET /files 6,40 ms prom / 12,20 p95 · /files/:id 4,76 / 10,03 · /files/mio 4,78 / 9,95 · /reportes 4,83 / 9,95 · /hojas-ruta 4,23 / 9,00 · requisitos 2,14 / 4,67 · tipos 1,95 / 4,38 · mis-permisos 1,19 / 2,57 · página 0,53 / 0,94',
    26: 'Ver hoja Evidencias, imágenes 1 a 9 (Grafana: carga, estrés antes y después de la corrección, recursos; tiempos por operación).',
    27: 'Muy rápido: p95 < 10 ms con 50 usuarios, 200 veces bajo la meta de 2 s del proyecto. Desde internet ~450 ms por página.',
    29: 'Chromium, Google Chrome y Firefox: login, lista y detalle de files y seguimiento público.',
    30: 'Escritorio 1366×768, tablet 820×1180 y celular 360×800 (táctil).',
    31: '9 de 9 exitosas, sin scroll horizontal ni errores de consola. Ver hoja Evidencias, imágenes 10 y 11.',
    32: 'Compatibilidad = 9 / 9 × 100 = 100 %',
    35: 'Funciona igual en todos los navegadores y tamaños probados. Safari no se pudo probar en Linux.',
    36: '100 %',
    37: 'Chrome, Edge, Firefox y Safari (2 últimas versiones, requisito del proyecto). Probados: Chromium, Chrome, Firefox.',
    39: 'AÚN NO se aplicaron encuestas a usuarios; se aplicará SUS (10 preguntas) en la capacitación del 28–29 oct. Mientras, se midió accesibilidad con Lighthouse.',
    40: 'Responsivo desde 360 px, menú por rol, inicio con indicadores, errores en español, manual en el sistema.',
    41: 'Lighthouse accesibilidad: /login 98, /seguimiento 100, /guia/manual 100 (prom. 99,33). Buenas prácticas 96.',
    42: 'Usabilidad (accesibilidad) = 298 / 300 × 100 = 99,33 %',
    46: 'Cuestionario SUS listo en el Word (sección 4.2.4); resultados pendientes de la capacitación.',
    47: 'Ver hoja Evidencias, imágenes 12 y 13 (Lighthouse).',
    48: 'Accesibilidad excelente (99,33 %). Satisfacción SUS pendiente (> 68 aceptable, > 80 bueno).',
    50: 'Servidor de prueba: 15.522 respuestas, 0 errores 5xx, 0 logs de error.',
    51: '502 en estrés (Nginx sin keepalive, corrección verificada) · 1 E2E intermitente · web sin HSTS · 16 CI fallidas en main (corregidas).',
    52: 'Sondeo cada 15 s por 10 min: 80/80 OK. Contenedores 44 h en línea, 0 reinicios. Ver hoja Evidencias, imágenes 14 y 15.',
    53: 'Disponibilidad = 44 h / 44 h × 100 = 100 %',
    56: 'Estable: 0 caídas, 0 errores 5xx; integridad con 300 altas simultáneas: 0 duplicados, 0 saltos, 300/300 en bitácora (hoja Evidencias, imagen 16).',
    57: 'Alta: 0 reinicios; memoria de la API estable (~180–230 MB).',
    58: '100 % en el periodo medido (meta de producción ≥ 99 %).',
    60: 'Sin token, token alterado o falso → 401; roles fuera de su permiso → 403 (7 casos probados).',
    61: 'JWT 15 min; refresh en cookie httpOnly; logout invalida; detección de reuso (3 casos cortados en el servidor).',
    62: 'bcrypt 12; Zod (inyección SQL sin efecto, campos extra y cuerpos grandes rechazados); bitácora inmutable; HTTPS.',
    63: 'Seguridad = 20 / 24 × 100 = 83,33 %',
    67: 'Ver hoja Evidencias, imagen 17. Implementados 20 de 24. Faltan: HSTS en la web, TOTP, respaldo diario (pendiente), cifrado en reposo.',
    68: '83,33 %',
    70: '4/4 rachas de CI fallidas corregidas; mediana 17 min (prom. 46 min).',
    71: 'Monolito modular, 7 módulos con capas rutas → controlador → servicio → repositorio.',
    72: '17 migraciones versionadas, imágenes etiquetadas, rollback por etiqueta, 1.490 pruebas automáticas.',
    73: 'Mantenibilidad = 63 / 79 × 100 = 79,75 % (integraciones a main que pasaron la CI al primer intento)',
    77: 'Desarrollo local, Docker Compose local, GitHub Actions (Ubuntu) y VPS Contabo + Coolify.',
    78: 'Las mismas imágenes Docker corren en cualquier servidor con Docker.',
    79: 'Portabilidad = 4 / 4 × 100 = 100 %',
    84: '13 amenazas: falta de respaldo diario, caída del VPS, corte de internet en Ancocagua, robo de contraseñas, acceso indebido, saturación, reglas no confirmadas, dependencias vulnerables, alteración de bitácora, error humano, poca capacitación, un solo responsable técnico, vencimiento TLS.',
    85: 'Escala 1–5 en probabilidad e impacto.',
    86: 'Alto (15–25): R1. Medio (8–12): R3, R12, R4, R7, R11, R2, R8. Bajo (1–6): R6, R10, R5, R9, R13. Matriz: hoja Evidencias, imagen 18.',
    87: 'Riesgo = Probabilidad × Impacto · ej. R1 = 3 × 5 = 15 (alto)',
    92: 'R1 15 · R3 12 · R12 12 · R4 10 · R7 9 · R11 9 · R2 8 · R8 8 · R6 6 · R10 6 · R5 5 · R9 4 · R13 3',
    93: '1 alto · 7 medios · 5 bajos',
    94: 'El único alto (R1) se cierra con el respaldo diario antes de la puesta en producción; el acceso indebido es bajo por los controles probados.',
    96: 'Planificada diaria con 30 días de retención; hoy no hay respaldo automático en el servidor (pendiente).',
    97: 'pg_dump (110 KB, 0,2 s) → pg_restore en base nueva (0,5 s).',
    98: '18 de 18 tablas idénticas; huella MD5 igual (hoja Evidencias, imagen 19).',
    99: 'Tasa de recuperación = 1 / 1 × 100 = 100 %',
    103: 'Bitácora del servidor (15–21 oct): 113 LOGIN válidos, 61 LOGOUT.',
    104: '10 LOGIN_FALLIDO rechazados; en prueba local: bloqueo tras 5 intentos y 429 con > 10 logins/min.',
    105: 'Casbin por rol; 7 intentos de acceso indebido rechazados.',
    106: 'Accesos seguros = 113 / 123 × 100 = 91,87 % (100 % de los inválidos rechazados)',
    110: 'npm audit; 17 ataques contra la API; cabeceras y TLS; estrés.',
    111: '3: csv-parse GHSA-8cw4-87c7-c6xx (moderada) · saturación Nginx→API (media) · web sin HSTS (baja).',
    112: '1: csv-parse (override a v7). Keepalive verificado en local, falta subir; HSTS pendiente.',
    113: 'Corrección de vulnerabilidades = 1 / 3 × 100 = 33,33 % (100 % al subir las 2 correcciones)',
    117: 'Adecuación 99,04 · Desempeño 100 (meta < 2 s) · Compatibilidad 100 · Usabilidad 99,33 · Fiabilidad 100 · Seguridad 83,33 · Mantenibilidad 79,75 · Portabilidad 100 · Recuperación 100 · Accesos 91,87 · Vulnerabilidades 33,33',
    118: 'Ver hoja Evidencias, imagen 22 (gráfico consolidado).',
    119: '95,18 % (alto)',
    120: '77,13 % (aceptable)',
    121: 'Cumple con holgura calidad; en seguridad lo que baja el puntaje son tareas conocidas (respaldo diario, TOTP, HSTS, keepalive).',
    123: '95,18 % ISO/IEC 25010 — alto.',
    124: '77,13 % ISO/IEC 27001 — aceptable, con plan para alto.',
    125: 'p95 9,35 ms con 50 usuarios; integridad perfecta con 300 altas simultáneas; acceso por rol probado; 1.490 pruebas automáticas; despliegue reproducible; accesibilidad 98–100.',
    126: 'Respaldo diario; subir keepalive y HSTS; doble verificación por código (TOTP); cifrado en reposo; plantillas y exportar reportes; encuesta SUS y Safari; corregir E2E intermitente.',
    127: 'Las 13 fórmulas se calcularon con datos medidos el 22-oct-2026 y con evidencia (Grafana, k6, Playwright, Lighthouse, PostgreSQL, servidor).',
}
FORM = {5, 8, 10, 18, 32, 36, 42, 53, 58, 63, 68, 73, 79, 87, 93, 99, 106, 113, 119, 120, 123, 124}
for f, t in H2.items():
    poner(h2, f, t, 95, resaltar=f in FORM)
h2.cell(1, 1).value = 'REALIZAR EN BASE A SU SISTEMA — respondido con datos medidos el 22-oct-2026 (detalle y capturas en el Word SISET_Respuestas_observaciones_y_pruebas)'

# Las fórmulas venían ancladas a dos celdas: al ensanchar la columna A se estiraban. Ancla de una celda con su tamaño real.
from openpyxl.drawing.spreadsheet_drawing import OneCellAnchor, AnchorMarker
from openpyxl.drawing.xdr import XDRPositiveSize2D
from openpyxl.utils.units import pixels_to_EMU
for im in h2._images:
    a = im.anchor._from
    im.anchor = OneCellAnchor(_from=AnchorMarker(col=0, colOff=0, row=a.row, rowOff=0), ext=XDRPositiveSize2D(pixels_to_EMU(im.width), pixels_to_EMU(im.height)))
    h2.row_dimensions[a.row + 1].height = max(h2.row_dimensions[a.row + 1].height or 15.75, im.height * 0.75 + 4)

# Hoja Evidencias: capturas de cada prueba, numeradas como se citan en las respuestas.
from openpyxl.drawing.image import Image as XLImage
from PIL import Image as PILImage
import os
EV = [
 ('carga-grafana-k6', 'Grafana — prueba de carga (0 a 50 usuarios): usuarios, peticiones por segundo, tiempos y errores (0).'),
 ('carga-grafana-recursos', 'Grafana — CPU y RAM del equipo y de cada contenedor durante la carga.'),
 ('carga-endpoints', 'Tiempo promedio y p95 por operación con 50 usuarios.'),
 ('carga-k6-terminal', 'Resumen de k6 de la prueba de carga: 36.796 peticiones, 0 % de error, p95 = 9,35 ms.'),
 ('estres-grafana-k6', 'Grafana — estrés ANTES de la corrección: aparecen errores desde ~60 usuarios.'),
 ('estres-k6-terminal', 'Resumen de k6 del estrés antes de la corrección: 57 % de peticiones fallidas.'),
 ('estres2-grafana-k6', 'Grafana — estrés DESPUÉS de activar keepalive en Nginx: 0 errores hasta 400 usuarios.'),
 ('estres2-grafana-recursos', 'Grafana — CPU y RAM durante el estrés corregido.'),
 ('estres-antes-despues', 'Comparación del estrés antes y después de la corrección.'),
 ('compat-mosaico', 'Compatibilidad: lista de files en Chromium, Google Chrome y Firefox, en escritorio, tablet y celular.'),
 ('compat-celular', 'Compatibilidad: detalle del file y seguimiento público en celular (360 px).'),
 ('lighthouse-login', 'Lighthouse en la pantalla de inicio de sesión: accesibilidad 98.'),
 ('lighthouse-seguimiento', 'Lighthouse en el seguimiento público: accesibilidad 100.'),
 ('disponibilidad', 'Disponibilidad de siset.vertexall.com: 80 de 80 respuestas correctas.'),
 ('servidor', 'Servidor de prueba: 44 h en línea, 0 reinicios, 0 errores 5xx, cabeceras de seguridad.'),
 ('integridad', 'Integridad: 300 hojas de ruta creadas a la vez, sin números repetidos ni saltos.'),
 ('seguridad', 'Pruebas de seguridad: 17 de 17 controles OK.'),
 ('matriz-riesgos', 'Matriz de riesgos (probabilidad × impacto).'),
 ('respaldo', 'Respaldo y restauración: 18 de 18 tablas idénticas.'),
 ('unitarias', 'Pruebas unitarias y de integración: 1.121/1.121 (API) y 265/265 (web); 0 vulnerabilidades.'),
 ('e2e', 'Pruebas de punta a punta (Playwright): 103 de 104.'),
 ('consolidado', 'Métricas consolidadas ISO/IEC 25010 e ISO/IEC 27001.'),
]
ev = wb.create_sheet('Evidencias')
ev.column_dimensions['A'].width = 8; ev.column_dimensions['B'].width = 150
ev['A1'] = 'Evidencias de las pruebas del 22-oct-2026 (cada respuesta indica el número de imagen)'; ev['A1'].font = Font(name='Arial', size=12, bold=True, color='1F4E79')
os.makedirs('ev', exist_ok=True)
fila = 3
for n, (nom, ley) in enumerate(EV, 1):
    im = PILImage.open(f'../pruebas/img/{nom}.png').convert('RGB')
    if im.width > 1400: im = im.resize((1400, round(im.height * 1400 / im.width)))
    ruta = f'ev/{n:02d}-{nom}.jpg'; im.save(ruta, quality=82, optimize=True)
    ev.cell(fila, 1, n).font = ARB
    c = ev.cell(fila, 2, f'Imagen {n}. {ley}'); c.font = ARB
    xi = XLImage(ruta); ancho = 1000; xi.height = round(im.height * ancho / im.width); xi.width = ancho
    ev.add_image(xi, f'B{fila + 1}')
    filas = math.ceil(xi.height * 0.75 / 15) + 2
    fila += filas + 2

# Glosario para quien lee el perfil del proyecto
gl = wb.create_sheet('Glosario')
gl.column_dimensions['A'].width = 32; gl.column_dimensions['B'].width = 110
GL = [('Término', 'Qué significa'),
 ('p95 (percentil 95)', 'El 95 % de las respuestas tardó menos que ese valor; muestra los casos lentos mejor que el promedio.'),
 ('ms', 'Milisegundo: la milésima parte de un segundo.'),
 ('Prueba de carga', 'Simula muchos usuarios a la vez en un uso normal para medir la velocidad.'),
 ('Prueba de estrés', 'Sube los usuarios hasta que el sistema falle, para conocer su límite.'),
 ('E2E (de punta a punta)', 'Prueba automática que usa el sistema como una persona: abre el navegador, hace clic y escribe.'),
 ('CI (integración continua)', 'Cada cambio en el código se prueba automáticamente antes de aceptarlo.'),
 ('k6', 'Herramienta libre para pruebas de carga y estrés.'),
 ('Grafana / InfluxDB', 'Grafana dibuja los gráficos; InfluxDB guarda las mediciones.'),
 ('Playwright', 'Controla navegadores (Chrome, Firefox) para pruebas automáticas.'),
 ('Lighthouse', 'Herramienta de Google que califica de 0 a 100 la accesibilidad y buenas prácticas de una página.'),
 ('SUS', 'Cuestionario estándar de 10 preguntas sobre facilidad de uso (0 a 100 puntos).'),
 ('Doble verificación (TOTP)', 'Además de la contraseña, un código de 6 dígitos generado por una aplicación del celular.'),
 ('HSTS', 'Cabecera que obliga al navegador a usar siempre la conexión segura (https).'),
 ('Keepalive', 'Reutilizar una conexión de red para muchas peticiones en vez de abrir una nueva cada vez.'),
 ('Nginx', 'Servidor web que entrega las páginas y pasa las consultas a la API.'),
 ('API', 'Parte del sistema que recibe las consultas, aplica las reglas y lee o guarda en la base de datos.'),
 ('bcrypt', 'Forma segura de guardar contraseñas (una “huella” que no se puede revertir).'),
 ('JWT', 'Credencial digital firmada que identifica al usuario durante 15 minutos.'),
 ('401 / 403 / 429 / 5xx', '401: sin sesión; 403: sin permiso; 429: demasiados intentos; 5xx: error del servidor.'),
 ('Docker / contenedor', 'Empaqueta el sistema para que funcione igual en cualquier servidor.'),
 ('VPS / Coolify', 'VPS: servidor virtual en internet. Coolify: panel para instalar y actualizar el sistema.'),
 ('pg_dump / pg_restore', 'Herramientas de PostgreSQL para sacar y restaurar copias de seguridad.'),
 ('Correlativo', 'Número de trámite consecutivo y único por año (ej. HR-2026-000123).'),
 ('Bitácora de auditoría', 'Registro de quién hizo qué, cuándo y desde dónde; no se puede modificar ni borrar.'),
 ('KLOC', 'Miles de líneas de código fuente (modelo COCOMO).')]
for i, (t, d) in enumerate(GL, 1):
    gl.cell(i, 1, t).font = ARB if i == 1 else Font(name='Arial', size=10, bold=True)
    c = gl.cell(i, 2, d); c.font = ARB if i == 1 else AR; c.alignment = Alignment(wrap_text=True, vertical='top')

for ws in wb:  # imprimir cada hoja ajustada al ancho de la página
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0; ws.page_setup.orientation = 'landscape'
wb.save('observaciones_respondidas.xlsx')
print('ok', len(h2._images))
