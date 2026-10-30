# 0014 — La cuenta se bloquea al 10.º intento fallido seguido

**Estado:** Aceptada
**Fecha:** 2026-10-30

## Contexto

Desde S1.4 (DEC-010, DEC-011) la cuenta se bloquea 15 minutos al **5.º** intento fallido seguido
(`MAX_INTENTOS_LOGIN = 5`). En la prueba, el personal se bloqueaba con facilidad. El responsable pidió, el 30-oct,
que la cuenta se bloquee **solo si falla 10 veces seguidas**, no antes.

El login es parte de "Auth y RBAC" en `do-not-touch.md`: cambiar su comportamiento exige un ADR.

## Decisión

1. `MAX_INTENTOS_LOGIN` pasa de 5 a **10**, por la migración `20261030120000_bloqueo_tras_10_intentos` (el seed no
   pisa los parámetros). El código no cambia: ya lee el valor de la tabla `parametro`.
2. Lo demás sigue igual: 15 minutos de bloqueo (`MIN_BLOQUEO_LOGIN`), el contador vuelve a 0 con un login correcto o
   al bloquear, el captcha aparece tras 3 fallos desde la misma IP (ADR-0012) y el límite de 10 intentos por minuto
   por IP (S1.4).

## Consecuencias

- Un atacante tiene 10 intentos por cuenta cada 15 minutos en vez de 5. Lo compensan el captcha desde el 3.er fallo
  y el límite por IP; la contraseña sigue la regla de DEC-011.
- Con el límite de 10 por minuto, el 11.º intento dentro del mismo minuto recibe 429 aunque la cuenta ya esté
  bloqueada: las dos respuestas rechazan, el mensaje es otro.
- Las pruebas que siguen "la regla" (`parametro.test.ts`, `aceptacion-acceso.test.ts`) usan 10;
  `auth-bloqueo.test.ts` fija su propio valor y no cambia.
