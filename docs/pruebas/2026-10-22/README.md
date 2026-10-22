# Pruebas y evaluación ISO 25010 / 27001 — 22 de octubre de 2026

Respuestas a **“observaciones a corregir.xlsx”** (desarrollo, lanzamiento, pruebas y evaluación de calidad y
seguridad) con datos medidos el 22-oct-2026. Es material para el perfil del proyecto.

> **¿Primera vez?** Lee [GUIA-ESTUDIANTE.md](GUIA-ESTUDIANTE.md): explica cada prueba con palabras simples, cómo
> leer cada imagen y qué responder en la defensa.

## Informe

| Archivo                                                      | Qué es                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `informe/SISET_Respuestas_observaciones_y_pruebas.docx`      | Informe completo (39 págs., 23 figuras, glosario). Fuente: `scripts/gen.cjs` |
| `informe/SISET_Respuestas_observaciones_y_pruebas.pdf`       | El mismo informe en PDF                                                      |
| `informe/observaciones-a-corregir-respondido.xlsx`           | El Excel original respondido + hojas “Evidencias” (22 imágenes) y “Glosario” |

## Resultados

| Prueba                                   | Resultado                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| Carga (k6, 0 → 50 usuarios, 6 min)       | 36 796 peticiones · 0 % de error · p95 = 9,35 ms                               |
| Estrés (k6, 0 → 400 usuarios sin pausa)  | Quiebre en ~60 usuarios: 502 por Nginx sin `keepalive` (57 % de error)         |
| Estrés con `keepalive 64` en Nginx       | 384 349 peticiones · 0 % de error · p95 = 633 ms · ~1 050 req/s                |
| Integridad (300 altas simultáneas)       | 0 N.º repetidos · 0 saltos · 300/300 eventos en la bitácora                    |
| Seguridad                                | 17/17 controles OK · `npm audit` 0 vulnerabilidades                            |
| Compatibilidad (Playwright)              | 9/9: Chromium, Google Chrome y Firefox × escritorio, tablet y celular          |
| Accesibilidad (Lighthouse)               | 98 · 100 · 100                                                                 |
| Disponibilidad (siset.vertexall.com)     | 80/80 respuestas · 44 h en línea sin reinicios · 0 errores 5xx                 |
| Respaldo y restauración                  | 18/18 tablas idénticas                                                         |
| Automatizadas                            | API 1 121/1 121 · web 265/265 · E2E 103/104 (1 intermitente)                   |
| ISO/IEC 25010 · ISO/IEC 27001            | 95,18 % · 77,13 %                                                              |

**Pendiente de lo encontrado:** subir el `keepalive` de Nginx (`scripts/nginx-keepalive.conf`, verificado solo en
el contenedor local), agregar HSTS en la web, corregir el E2E intermitente de `hojas-ruta.spec.ts` y probar Safari.
Los montos de VAN, TIR y B/C son supuestos del equipo (marcados en el informe).

## Carpetas

- `imagenes/`: capturas de Grafana, terminal, gráficos y matriz de riesgos; `compatibilidad/` (27 capturas) y
  `lighthouse/` (informes HTML).
- `datos/`: resultados crudos (resúmenes de k6, tramos de 30 s del estrés, CSV de disponibilidad, seguridad e
  integridad, riesgos y cálculos de COCOMO/VAN/TIR).
- `scripts/`: todo para repetirlo. Se guardan tal como se corrieron (por eso están en `.prettierignore`).

## Cómo repetir

Entorno: stack local en Docker (no contra el VPS, que es compartido) con los datos de prueba.

```bash
VITE_USAR_API=true docker compose --profile completo up -d --build --wait   # web en :8080
# seed + datos de prueba (ver docs/despliegue/prueba-coolify.md), luego:
cd docs/pruebas/2026-10-22/scripts/grafana && docker compose up -d          # Grafana :3300, InfluxDB :8086
cd .. && ./recolector.sh &                                                  # CPU/RAM de los contenedores
k6 run --out influxdb=http://127.0.0.1:8086/k6 carga.js
k6 run --out influxdb=http://127.0.0.1:8086/k6 estres.js
k6 run integridad.js && ./integridad-check.sh <max id de hoja_ruta antes>
./seguridad.sh            # bloquea la cuenta 9000003 y activa el rate limit: correr al final
./respaldo.sh
node compatibilidad.mjs   # usa @playwright/test de apps/web
```

`gen.cjs` (Word), `llenar-excel.py` (Excel) y `graficos*.py` se corrieron desde una carpeta de trabajo con
`docx` (npm), `openpyxl`, `matplotlib` y `Pillow`; las rutas relativas apuntan a esa carpeta.
