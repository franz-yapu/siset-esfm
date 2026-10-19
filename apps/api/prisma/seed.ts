import { crearClienteBd } from '../src/compartido/bd';
import { leerAdminInicial, leerKardexInicial, sembrar } from './semilla';

const bd = crearClienteBd();
try {
  const r = await sembrar(bd, leerKardexInicial(), leerAdminInicial());
  // Solo conteos: nunca la contraseña ni el hash (RNF-01).
  // eslint-disable-next-line no-console
  console.info(
    `Seed listo: ${r.roles} roles, ${r.sedes} sedes, ${r.especialidades} especialidades, ${r.personas} personas, ${r.usuarios} usuarios.`,
  );
} finally {
  await bd.$disconnect();
}
