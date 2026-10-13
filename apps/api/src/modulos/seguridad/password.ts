import bcrypt from 'bcryptjs';

/** RNF-01: bcrypt con costo ≥ 12. */
export const COSTO_BCRYPT = 12;

/** No valida la política: eso lo hace `esquemaPassword` en el borde (SDD S1.2 §2.1). */
export const hashPassword = (plano: string): Promise<string> => bcrypt.hash(plano, COSTO_BCRYPT);

export const compararPassword = (plano: string, hash: string): Promise<boolean> => bcrypt.compare(plano, hash);
