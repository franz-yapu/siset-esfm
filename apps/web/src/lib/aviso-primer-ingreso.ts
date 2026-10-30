// Aviso del primer ingreso del estudiante en el login (DEC-066, DEC-067). Se abre solo al entrar a la página; cerrarlo
// lo esconde hasta volver a entrar o tocar el ícono de ajustes. "No volver a mostrar" lo guarda en este navegador.
// Es una comodidad de cada persona: si el navegador no deja guardar (ventana privada), el aviso vuelve a salir.

const CLAVE = 'siset.avisoPrimerIngreso.oculto';

/** Si la persona pidió no volver a ver el aviso en este navegador. */
export function avisoOcultoParaSiempre(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

/** Guarda (o borra) la preferencia "no volver a mostrar". */
export function ocultarAvisoParaSiempre(ocultar: boolean): void {
  try {
    if (ocultar) localStorage.setItem(CLAVE, '1');
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: el aviso vuelve a salir la próxima vez, nada más.
  }
}
