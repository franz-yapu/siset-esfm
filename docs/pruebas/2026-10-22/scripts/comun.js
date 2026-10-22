import http from 'k6/http';
export const BASE = __ENV.BASE || 'http://127.0.0.1:8080';
export const API = `${BASE}/api/v1`;
export function login(usuario) {
  const r = http.post(`${API}/auth/login`, JSON.stringify({ usuario, password: 'Prueba.2026' }),
    { headers: { 'content-type': 'application/json' }, tags: { name: 'POST /auth/login' } });
  return r.json('accessToken');
}
export function get(path, token, nombre) {
  return http.get(`${API}${path}`, { headers: { authorization: `Bearer ${token}` }, tags: { name: nombre || `GET ${path}` } });
}
// Sesiones de los 4 roles de oficina + un estudiante (login respeta el límite de 10/min por IP).
export function sesiones() {
  return { kardex: login('9000001'), dir: login('9000002'), coord: login('9000004'), est: login('8100024') };
}
// Recorrido típico de un usuario de oficina y de un estudiante.
export function recorrido(s, check) {
  const pag = http.get(`${BASE}/`, { tags: { name: 'GET / (página)' } });
  const r = [
    pag,
    get('/files?pagina=1', s.kardex, 'GET /files'),
    get('/files/14', s.kardex, 'GET /files/:id'),
    get('/files/14/requisitos', s.kardex, 'GET /files/:id/requisitos'),
    get('/hojas-ruta', s.dir, 'GET /hojas-ruta'),
    get('/hojas-ruta/tipos', s.dir, 'GET /hojas-ruta/tipos'),
    get('/reportes/hojas-ruta', s.coord, 'GET /reportes/hojas-ruta'),
    get('/auth/mis-permisos', s.coord, 'GET /auth/mis-permisos'),
    get('/files/mio', s.est, 'GET /files/mio'),
  ];
  check(r, { 'todas 200': (a) => a.every((x) => x.status === 200) });
}
