import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test as preparar, type APIRequestContext } from '@playwright/test';
import { API_E2E, ARCHIVO_USUARIOS, type Credencial, type CuentaE2E, type RolPersonal } from './utilidades';

/**
 * Preparación del E2E contra la API real (SDD S1.14 §2.4). Idempotente: la base local sobrevive
 * entre corridas, así que crea las cuentas o, si ya existen, les restablece la contraseña.
 */

// Local: el Kardex inicial sale de apps/api/.env (las variables del entorno mandan).
try {
  process.loadEnvFile(new URL('../../../api/.env', import.meta.url));
} catch {
  // En la CI vienen del entorno.
}

/** Nueva por corrida; cumple DEC-011 (letras, números y símbolos). */
const passwordNueva = () => `E2e.${randomBytes(6).toString('hex')}-7`;

const CUENTAS: { cuenta: Exclude<CuentaE2E, 'KARDEX'>; rol: RolPersonal; ci: string }[] = [
  { cuenta: 'SEC_DIR', rol: 'SEC_DIR', ci: '8800001' },
  { cuenta: 'SEC_COORD', rol: 'SEC_COORD', ci: '8800002' },
  { cuenta: 'COORDINADOR', rol: 'COORDINADOR', ci: '8800003' },
  { cuenta: 'BLOQUEO', rol: 'SEC_DIR', ci: '8800004' },
  { cuenta: 'TEMPORAL', rol: 'SEC_DIR', ci: '8800005' },
];

interface Sesion {
  accessToken: string;
  usuario: { id: number; usuario: string; sedeId: number | null; debeCambiarPassword: boolean };
}

const login = async (request: APIRequestContext, usuario: string, password: string) => {
  const r = await request.post(`${API_E2E}/auth/login`, { data: { usuario, password } });
  return r.ok() ? ((await r.json()) as Sesion) : null;
};

const cambiar = async (request: APIRequestContext, sesion: Sesion, passwordActual: string, nueva: string) => {
  const r = await request.post(`${API_E2E}/auth/cambiar-password`, {
    headers: { Authorization: `Bearer ${sesion.accessToken}` },
    data: { passwordActual, passwordNueva: nueva },
  });
  expect(r.status(), `cambiar la contraseña de ${sesion.usuario.usuario}`).toBe(200);
  return (await r.json()) as Sesion;
};

/**
 * El Kardex del seed. Su contraseña E2E es la del seed + "-e2e" (o E2E_KARDEX_PASSWORD): se deduce
 * del entorno en cada corrida y nunca va al repo. Si todavía tiene la del seed, se cambia una vez.
 */
async function sesionKardex(request: APIRequestContext): Promise<{ sesion: Sesion; password: string }> {
  const ci = process.env.SEED_KARDEX_CI;
  const seed = process.env.SEED_KARDEX_PASSWORD;
  if (!ci || !seed) throw new Error('Faltan SEED_KARDEX_CI y SEED_KARDEX_PASSWORD (apps/api/.env o el entorno).');
  const e2e = process.env.E2E_KARDEX_PASSWORD ?? `${seed}-e2e`;

  // Como mucho un intento fallido por corrida, y el login correcto deja el contador en 0 (DEC-013).
  const conE2e = await login(request, ci, e2e);
  if (conE2e && !conE2e.usuario.debeCambiarPassword) return { sesion: conE2e, password: e2e };
  const conSeed = await login(request, ci, seed);
  if (!conSeed)
    throw new Error(`El Kardex ${ci} no entra con la contraseña del seed ni con la E2E: definí E2E_KARDEX_PASSWORD.`);
  if (!conSeed.usuario.debeCambiarPassword) return { sesion: conSeed, password: seed };
  return { sesion: await cambiar(request, conSeed, seed, e2e), password: e2e };
}

preparar('cuentas E2E por rol (SDD S1.14 §2.4)', async ({ request }) => {
  const kardex = await sesionKardex(request);
  const auth = { Authorization: `Bearer ${kardex.sesion.accessToken}` };
  const sedeId = kardex.sesion.usuario.sedeId;
  expect(sedeId, 'el Kardex inicial tiene sede').not.toBeNull();

  const resultado: Partial<Record<CuentaE2E, Credencial>> = {
    KARDEX: { id: kardex.sesion.usuario.id, usuario: kardex.sesion.usuario.usuario, password: kardex.password },
  };

  for (const { cuenta, rol, ci } of CUENTAS) {
    const creado = await request.post(`${API_E2E}/usuarios`, {
      headers: auth,
      data: { ci, nombres: 'Prueba', apellidoPaterno: `E2E ${cuenta.toLowerCase()}`, rol, sedeId },
    });
    let id: number;
    let temporal: string;
    if (creado.status() === 201) {
      const cuerpo = (await creado.json()) as { usuario: { id: number }; passwordTemporal: string };
      id = cuerpo.usuario.id;
      temporal = cuerpo.passwordTemporal;
    } else {
      expect(creado.status(), `crear ${ci}`).toBe(409);
      const lista = await request.get(`${API_E2E}/usuarios`, { headers: auth, params: { texto: ci } });
      const { datos } = (await lista.json()) as { datos: { id: number; usuario: string }[] };
      id = datos.find((u) => u.usuario === ci)!.id;
      // Por si una corrida anterior lo dejó de baja o con otro rol (422 = ya estaba así).
      await request.post(`${API_E2E}/usuarios/${id}/reactivar`, { headers: auth });
      await request.patch(`${API_E2E}/usuarios/${id}`, { headers: auth, data: { rol, sedeId } });
      // Restablecer también quita el bloqueo y cierra sus sesiones (DEC-020 #2).
      const r = await request.post(`${API_E2E}/usuarios/${id}/restablecer-password`, { headers: auth });
      expect(r.status(), `restablecer ${ci}`).toBe(200);
      temporal = ((await r.json()) as { passwordTemporal: string }).passwordTemporal;
    }

    if (cuenta === 'TEMPORAL') {
      resultado[cuenta] = { id, usuario: ci, password: temporal };
      continue;
    }
    const primera = await login(request, ci, temporal);
    expect(primera?.usuario.debeCambiarPassword, `${ci} entra con la temporal`).toBe(true);
    const password = passwordNueva();
    await cambiar(request, primera!, temporal, password);
    resultado[cuenta] = { id, usuario: ci, password };
  }

  mkdirSync(new URL('.', ARCHIVO_USUARIOS), { recursive: true });
  writeFileSync(ARCHIVO_USUARIOS, JSON.stringify(resultado, null, 2));
});
