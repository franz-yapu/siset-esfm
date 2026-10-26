# 0012 — Captcha en el login después de 3 intentos fallidos

**Estado:** Aceptada
**Fecha:** 2026-10-26

## Contexto

El tutor observó (26-oct, observación #1, SDD OBS-T1) que el ingreso "no tiene contraseña segura, falta multifactor,
mínimo captcha". Ya existen la política de contraseña (DEC-011), el bloqueo de la cuenta tras 5 contraseñas mal
seguidas (S1.4) y el límite de 10 intentos por minuto por IP (RNF-10). El responsable decidió **captcha** para esta
entrega. La doble verificación con TOTP (DEC-018 #1, pedida por la escuela en D-03) sigue pendiente para cuando entren
los estudiantes reales.

El login es parte de "Auth y RBAC" en `docs/do-not-touch.md`: cambiarlo exige un ADR y pruebas negativas.

El captcha tiene que ser software libre y no puede depender de un servicio de terceros (RNF-09): nada de reCAPTCHA ni
hCaptcha.

## Decisión

1. **ALTCHA** (licencia MIT), autoalojado: `altcha-lib` en la API y el widget `altcha` en la web. Es una **prueba de
   trabajo**: el navegador resuelve un reto (PBKDF2/SHA-256) que cuesta unos segundos de cálculo, sin imágenes, sin
   cookies y sin enviar datos afuera.
2. **Cuándo se exige:** cuando la IP acumula **3 logins fallidos** (`CREDENCIALES_INVALIDAS`) en 15 minutos.
   - El conteo vive en memoria, como el rate limit, porque hay una sola instancia de la API.
   - Un login correcto desde esa IP borra el conteo.
   - `CAPTCHA_TRAS_FALLOS` lo configura: el valor por defecto es 3, y `0` lo apaga (lo usan los tests que prueban el
     bloqueo de la cuenta).
3. **`GET /api/v1/auth/captcha`** (pública) devuelve un reto que vence a los 5 minutos.
   - Va firmado con HMAC; la clave se deriva de `JWT_SECRET`, así que no hace falta una variable nueva.
   - El rate limit de esa ruta es el mismo del login.
4. **`POST /auth/login`** acepta el campo opcional `captcha` (la solución del widget).
   - Si la IP lo necesita y falta, responde 400 `CAPTCHA_REQUERIDO`. Si no verifica (mala firma, vencido o reusado),
     responde 400 `CAPTCHA_INVALIDO`.
   - En los dos casos no se mira la contraseña ni se cuenta un intento contra la cuenta.
   - Cada reto se usa una sola vez: se guarda en un `CappedMap` de 10 000 retos.
5. **Bitácora (DEC-007):** cada rechazo por captcha es un `LOGIN_FALLIDO`.
   - Lleva el motivo `CAPTCHA_REQUERIDO` o `CAPTCHA_INVALIDO`.
   - Va sin usuario y con el CI intentado en `entidad_id`, como el CI inexistente (D-26).
   - Es un evento de acceso nuevo dentro de la lista cerrada de DEC-011.
6. **Web:**
   - El widget aparece cuando la API responde `CAPTCHA_REQUERIDO`, o después de 3 errores de contraseña en esa
     pantalla.
   - El widget se carga solo en ese momento (`import()`), para no pesar en el resto del sistema.
   - En el modo demo (auth simulada) no hay captcha.
7. **CSP:** el widget resuelve el reto en Web Workers creados desde `blob:`. El nginx suma `worker-src 'self' blob:`;
   `script-src` sigue en `'self'`. Se probó en local con la CSP de producción: el reto se resolvió en menos de 1 s y
   el login entró.

## Consecuencias

- La matriz de rutas suma `GET /auth/captcha` como ruta pública. Las pruebas cubren:
  - sin captcha antes del tercer fallo;
  - `CAPTCHA_REQUERIDO` después;
  - `CAPTCHA_INVALIDO` con un reto alterado, vencido o reusado;
  - login correcto con un reto resuelto, que borra el conteo;
  - el evento de bitácora.
- Detrás de un NAT (la red del instituto) varias personas comparten IP. Si una se equivoca 3 veces, las demás también
  ven el captcha durante 15 minutos. Es una molestia de segundos, no un bloqueo.
- Los E2E y los tests de la API que prueban el bloqueo por intentos usan `CAPTCHA_TRAS_FALLOS=0`.
- No reemplaza al TOTP de DEC-018. Si el responsable decide no hacerlo, eso va en una DEC aparte.
