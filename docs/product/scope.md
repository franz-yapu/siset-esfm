# Alcance — SISET v1.0

Derivado de PRD §2 y §6. Si una respuesta del Registro de Dudas cambia algo, se
registra en `docs/decisions/LOG.md` y gana sobre este archivo.

## Entra (MVP — solo "Must" bloquea el Go-Live)

| Módulo                           | Contenido                                                                                        | RF                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------- |
| M1 Seguridad y RBAC              | Login CI + contraseña, sesiones JWT/refresh, 6 roles, usuarios, bloqueo por intentos             | RF-01, RF-02, RF-03        |
| M2 File académico                | Matrículas, resultado anual, requisitos, semáforo, bloqueo por UF reprobadas, carga masiva Excel | RF-04, RF-07               |
| M3 Ingesta de hojas de ruta      | Registro, correlativo HR-AAAA-NNNNNN, QR, carátula                                               | RF-08                      |
| M4 Tracking                      | Línea de tiempo pública (N.º + CI) y autenticada                                                 | RF-09                      |
| M5 Pases y derivaciones          | Envío/recepción entre sedes, cadena de custodia, bloqueo de fila                                 | RF-10                      |
| M6 Emisión en Kardex             | TCLO, TACFI, vista previa PDF con marca de agua, impresión oficial                               | RF-05, RF-06, RF-11, RF-12 |
| M7 Reportes y auditoría (Should) | Dictamen, dashboard KPI, exportación PDF/Excel, bitácora                                         | RF-13, RF-14               |

## Fuera de alcance (v1.1 o nunca)

- Cobros o pagos en línea (límite normativo).
- Modificar jerarquías o estructura institucional.
- Notificaciones por correo/WhatsApp (D-19 → v1.1).
- MFA (D-03 → v1.1 si se confirma).
- Integración automática con sistemas del Ministerio (D-07).
- Operación offline completa en Ancocagua (D-12); solo aviso "sin conexión" y borradores locales.
- Subida de escaneos PDF al file (D-22 → v1.1).
- App móvil nativa (la web responsiva desde 360 px cubre móviles).

## Fechas

- Plan base: 7 sprints, 12-oct-2026 → Go-Live 18-ene-2027 (opción A de D-06, pendiente de confirmar).
- El borrador de tesis pedía Go-Live la 1.ª semana de noviembre 2026: solo alcanza para S0 + S1.
