# 0011 — Certificados recibidos en Ancocagua: tercer flujo de la hoja de ruta

**Estado:** Aceptada
**Fecha:** 2026-10-19

## Contexto

La máquina de estados (ADR-0005) está en `do-not-touch.md`. Tenía dos flujos según el valorado, y la ingesta era
solo de SEC_DIR en Calahumana. D-32 dijo que los certificados (sin valorado) también los puede recibir Secretaría de
Coordinación en Ancocagua, y D-32b (19-oct) explicó el camino: Secretaría de Coordinación recibe el pedido y lo
deriva a Kardex; Kardex imprime y se lo devuelve; Secretaría de Coordinación lo hace firmar con el Coordinador y lo
entrega al interesado. No pasa por Calahumana.

## Decisión

1. **`hoja_ruta.sede_ingreso_id`** (FK a `sede`, NOT NULL, con índice): dónde se recibió. Se fija en la ingesta y no
   cambia. La migración `20261019180000` la llena con la sede del movimiento `REGISTRAR` (hasta hoy, Calahumana).
2. Tercer flujo **`SIN_VALORADO_ANCOCAGUA`**. `flujoDe(requiereValorado, sedeIngreso)`: con valorado →
   `CON_VALORADO`; sin valorado → `SIN_VALORADO` o `SIN_VALORADO_ANCOCAGUA` según la sede de ingreso.
3. Transiciones del flujo nuevo:
   - `AVISAR_KARDEX` ("Derivar a Kardex"): SEC_COORD desde ANCOCAGUA, `RECIBIDO → AVISADO_KARDEX`.
   - `RECOGER` e `IMPRIMIR`: Kardex, como en los otros flujos.
   - `FIRMA_COORDINADOR`: Coordinador, `IMPRESO → FIRMADO_COORDINADOR` (comparte la fila con el sin valorado).
   - `ENTREGAR`: SEC_COORD desde ANCOCAGUA, `FIRMADO_COORDINADOR → ENTREGADO`.
     La devolución que hace Kardex a Secretaría de Coordinación después de imprimir es física, sin paso propio, como
     la recogida en Calahumana.
4. **Ingesta:** `INGESTA.reglas` con dos reglas. SEC_DIR en LA_PAZ, cualquier tipo. SEC_COORD en ANCOCAGUA, solo
   tipos sin valorado (un historial desde Ancocagua → 403). SEC_COORD recibe `hojas-ruta`/`crear` en la política
   (también para el buscador de titulares).
5. `GET /hojas-ruta` filtra por `sedeIngreso` y cada fila y detalle dicen dónde se recibió. La web separa las bandejas:
   - "Por remitir" de Kardex: solo los de Calahumana.
   - Las cuentas de SEC_DIR: solo los de Calahumana.
   - SEC_COORD, en "Firma y entrega": por derivar, por firmar y por entregar de Ancocagua.

## Consecuencias

- La tabla de pruebas de la máquina pasa a 3 flujos: 10 × 10 × 3 × 2 tipos × 6 roles × 3 sedes × 2 bloqueos
  (21 600 combinaciones), escrita a mano.
- La política suma `SEC_COORD · hojas-ruta · crear`; las matrices de la API y de la web se actualizan.
- La carátula y el seguimiento público muestran los 5 pasos del flujo nuevo.
