# 0007 — Requisitos del folder personal y semáforo con TACFI atrasado

**Estado:** Aceptada
**Fecha:** 2026-10-16

## Contexto

El motor del semáforo está en `do-not-touch.md`. Hasta hoy recibía el estado de cada requisito obligatorio de un
catálogo provisional de 6 (DEC-016, DEC-031) y la regla de "atrasado" esperaba D-31.

El 16-oct la escuela mandó la hoja oficial "Documentación existente en folder personal" (24 requisitos, D-18b) y
respondió D-31: el estudiante debe tener cada TACFI en su año (Artístico I en 1.º, Artístico II en 2.º, Tecnológico
I en 3.º, Tecnológico II en 4.º) salvo autorización de las autoridades. La hoja trae requisitos que no son para
todos (libreta militar solo varones; tres solo para algunas modalidades), otros "si corresponde", y matrículas y
certificados de notas que se entregan **una vez por gestión** (D-30b, D-39).

## Decisión

1. **El motor sigue siendo una función pura** (`semaforoDelFile`) y suma una entrada: `atrasado`.
   - Rojo: file bloqueado, algún requisito OBSERVADO o **algún requisito atrasado**.
   - Amarillo: algún PENDIENTE. Verde: todo COMPLETO.
2. **Qué entra al motor** lo decide otra función pura (`requisitos-reglas.ts`), con su propia tabla de casos:
   - Solo los requisitos **activos, obligatorios y que aplican** al file: `solo_genero` y `solo_modalidad` del
     catálogo contra el género y la modalidad del file. Si el file no tiene el dato, el requisito condicional no
     aplica (no se pide lo que no se sabe si corresponde).
   - `solo_modalidad` de una letra ("B") vale para toda modalidad que empiece con esa letra (provisional, D-45).
   - Un requisito **por gestión** resume sus registros: sin registros, PENDIENTE; con alguno OBSERVADO, OBSERVADO;
     con alguno PENDIENTE, PENDIENTE; si no, COMPLETO.
   - **Atrasado** (D-31): el requisito tiene año de formación, el file tiene año de formación mayor y el
     requisito no está COMPLETO. Hoy solo los TACFI tienen año. La autorización de las autoridades se anota como
     observación; el file sigue en rojo hasta que el TACFI esté completo.
3. La web repite las dos funciones para el mock y un test de paridad usa las mismas tablas de casos.

## Consecuencias

- Con 24 requisitos, la mayoría de los files arranca en amarillo hasta que Kardex los cargue: es lo esperado.
- Un file sin año de formación nunca tiene requisitos atrasados.
- Cambiar qué requisitos se piden es tocar el catálogo, no el motor. Cambiar cuándo uno es rojo sigue pidiendo un
  ADR.

## Enmienda (2026-10-16, DEC-052)

- **Modalidades exactas (D-45):** `solo_modalidad` es una lista separada por comas y se compara exacta. Se quita la
  regla "una letra vale para todas las que empiezan con ella".
- **Gestiones esperadas (D-47):** un requisito por gestión también queda PENDIENTE si cubre menos años distintos que
  los esperados: el año de formación (matrícula) o el año de formación menos uno (certificado de notas,
  `solo_anios_terminados`). Sin año de formación, basta uno. Tabla de casos: `CASOS_GESTIONES` y `CASOS_ESPERADAS`.
- Las defensas del TCLOA vuelven con su año (D-46): entran en la regla de atrasado igual que los TACFI.
