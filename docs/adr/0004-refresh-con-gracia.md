# 0004 — Refresh con una ventana de gracia para el token recién rotado

**Estado:** Aceptada (2026-10-14, con el SDD de S1.15)
**Fecha:** 2026-10-14

## Contexto

Los tokens de auth están en `docs/do-not-touch.md`: cambiarlos exige un ADR y la matriz de pruebas negativas
por rol. S1.5 (DEC-014 #3) trata como **reuso** todo refresh con un token ya revocado: revoca todas las
sesiones del usuario y registra `REUSO_SESION`.

El E2E contra la API real de S1.14 (DEC-025 #6) mostró que eso también pasa sin ningún robo. Si la página
navega, recarga y vuelve a navegar enseguida, la API alcanza a rotar el token pero el navegador no guarda la
cookie nueva. La carga siguiente manda la vieja y se cierran todas las sesiones. Se reprodujo en 3 de 3
corridas. La web ya hace un solo refresh a la vez (DEC-021 #4); que el navegador corte la respuesta no lo
controla la página.

## Decisión

1. Un refresh con un token **revocado por rotación** hace **≤ `SEG_GRACIA_REFRESH` segundos** (10, en
   `parametro`) no es reuso si su **cadena de rotación termina en un token vigente**. Se revoca ese último, se
   emite uno nuevo con el **mismo vencimiento** y toda la cadena apunta al nuevo. Si otra petición gana la carrera
   por el último token, se reintenta (hasta 10 veces).
2. `refresh_token.reemplazado_por_id` marca la revocación por rotación. Logout, cambio de contraseña, baja y
   reuso lo dejan nulo, así que esos tokens nunca entran en la gracia. La FK es `SET NULL`: es la segunda
   excepción a RESTRICT de DEC-006, porque la cadena de tokens se borra junto con su usuario.
3. Fuera de eso, el reuso sigue igual que en DEC-014 #3.

## Consecuencias

- Recargar o navegar rápido ya no saca al usuario del sistema.
- Quien robó la cookie y la usa dentro de los 10 s siguientes a la rotación obtiene una sesión sin disparar la
  alarma. Pasada la ventana, cualquier uso de un token viejo dispara el reuso y corta todas las sesiones. Es el
  "reuse interval" estándar de los proveedores de identidad; el riesgo queda acotado a 10 s.
- Se probó con el E2E en paralelo: sin la cadena (solo "sucesor sin usar") quedaban 6 reusos en 3 corridas; con
  la cadena y los reintentos, 0.
- La matriz HTTP de S1.14 y los tests de `auth-*` siguen en verde; los dos tests de S1.5 que esperaban reuso
  dentro de la ventana se actualizaron.
