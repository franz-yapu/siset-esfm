# 0008 — Devolución del historial con observación: estado final DEVUELTO

**Estado:** Aceptada
**Fecha:** 2026-10-16

## Contexto

La máquina de estados (ADR-0005) está en `do-not-touch.md`. D-34 dijo que Kardex no revisa nada antes de imprimir,
y por eso no había estado Observado. El 16-oct la escuela respondió D-48 (por WhatsApp): el historial académico ya
existe, lo genera el sistema del Ministerio. Antes de imprimir, Kardex **contrasta las notas del sistema con los
empastes**:

- Si no hay observación, imprime y se anota en qué N.º de valorado se imprimió.
- Si hay observación, se anota, **no se imprime y se devuelve**. Hace falta otro trámite, que ya no es del alcance
  de SISET.

## Decisión

1. Se suman el **estado final `DEVUELTO`** y la **acción `DEVOLVER`** ("Devolver con observación"):
   - va de `EN_IMPRESION` a `DEVUELTO`;
   - solo en el flujo **con valorado** (historial y legalización; D-48b pregunta por la legalización);
   - la registra **KARDEX** desde **ANCOCAGUA**;
   - un file bloqueado no la impide.
2. `DEVOLVER` exige la observación: sin ella, **400** `VALIDACION`. Desde `DEVUELTO` no sale ningún paso.
3. `IMPRIMIR` en un trámite con valorado guarda en la observación del movimiento "Impreso en el valorado N.º …",
   seguido de lo que escriba Kardex.
4. El trigger pone `fecha_cierre` al entregar **o al devolver**.
   - Un devuelto no está en curso ni atrasado.
   - Los reportes lo cuentan aparte (`devueltos`).
   - El tiempo promedio a la entrega sigue siendo solo de los entregados.
5. La web repite la fila en `lib/maquina-hojas-ruta.ts` (mock). `pasosDelFlujo` (la carátula) no la incluye, porque
   no es un paso del camino normal.

## Consecuencias

- La tabla de pruebas pasa a 10 estados × 10 acciones (7 200 combinaciones) con la fila nueva escrita a mano.
- El certificado sin valorado no se devuelve: el Coordinador tampoco puede rechazarlo (D-37).
- Si D-48b dice que la legalización no se contrasta, se cambia `flujos` por un dato del tipo de trámite, con otro ADR.
