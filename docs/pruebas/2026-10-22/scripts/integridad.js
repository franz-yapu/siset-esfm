// Integridad bajo concurrencia: 30 usuarios crean hojas de ruta a la vez.
// Después se verifica en la base que el correlativo no se repite ni salta y que cada alta dejó su evento.
import http from 'k6/http';
import { check } from 'k6';
import { API, login } from './comun.js';
export const options = { scenarios: { altas: { executor: 'shared-iterations', vus: 30, iterations: 300, maxDuration: '3m' } }, tags: { prueba: 'integridad' } };
export function setup() { return { t: login('9000002') }; }
export default function (s) {
  const r = http.post(`${API}/hojas-ruta`, JSON.stringify({ fileId: 14, tipoTramite: 'CERT_NOTAS_ANTERIOR', observacion: 'k6-integridad' }),
    { headers: { 'content-type': 'application/json', authorization: `Bearer ${s.t}` }, tags: { name: 'POST /hojas-ruta' } });
  check(r, { 'creada 201': (x) => x.status === 201 });
}
