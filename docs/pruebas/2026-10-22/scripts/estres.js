// Prueba de estrés: sube hasta 400 usuarios sin pausa para hallar el punto de quiebre.
import { check, sleep } from 'k6';
import { sesiones, recorrido } from './comun.js';
export const options = {
  scenarios: { estres: { executor: 'ramping-vus', startVUs: 0, stages: [
    { duration: '1m', target: 50 }, { duration: '1m', target: 100 }, { duration: '1m', target: 200 },
    { duration: '1m', target: 300 }, { duration: '1m', target: 400 }, { duration: '1m', target: 400 }, { duration: '1m', target: 0 } ] } },
  thresholds: { http_req_failed: ['rate<0.05'], http_req_duration: ['p(95)<2000'] },
  tags: { prueba: 'estres' },
};
export function setup() { return sesiones(); }
export default function (s) { recorrido(s, check); sleep(0.3); }
