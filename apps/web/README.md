# SISET · frontend (prototipo navegable)

Prototipo de las 27 pantallas de `docs/product/prototipo-pantallas.md`, con datos de prueba en memoria.
Es la base del frontend final: cuando exista la API solo se reemplaza `src/services/` por llamadas HTTP.

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev -- --host   # para abrirlo desde el celular en la misma red
npm run build        # tsc + build de producción en dist/
```

- Usuarios de prueba: ver el recuadro "Usuarios de prueba" en el login (contraseña `demo123`).
- `.env`: `VITE_DEMO=true` muestra "Ver como" y "Reiniciar datos de demo"; `VITE_PUBLIC_URL` es la base del QR.
- Al recargar la página los datos vuelven al estado inicial.
