// Prueba de carga: uso normal y pico esperado (hasta 50 usuarios simultáneos).
import { check, sleep } from 'k6';
import { sesiones, recorrido } from './comun.js';
export const options = {
  scenarios: { carga: { executor: 'ramping-vus', startVUs: 0, stages: [
    { duration: '1m', target: 10 }, { duration: '2m', target: 25 }, { duration: '2m', target: 50 }, { duration: '1m', target: 0 } ] } },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
  tags: { prueba: 'carga' },
};
export function setup() { return sesiones(); }
export default function (s) { recorrido(s, check); sleep(1 + Math.random() * 2); }
