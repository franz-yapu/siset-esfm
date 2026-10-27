// La foto del file (ADR-0013): el navegador la recorta a un cuadrado y la achica antes de subirla, así pesa decenas de
// KB y no los MB de una foto de celular. La API acepta hasta 1 MB.

export const LADO_FOTO = 400;

/** El cuadrado centrado más grande de una imagen de ancho × alto: [x, y, lado]. */
export function cuadradoCentrado(ancho: number, alto: number): [number, number, number] {
  const lado = Math.min(ancho, alto);
  return [Math.round((ancho - lado) / 2), Math.round((alto - lado) / 2), lado];
}

/** Recorta al centro, achica a 400 × 400 y la devuelve como JPG. */
export async function recortarFoto(archivo: Blob): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const [x, y, lado] = cuadradoCentrado(imagen.width, imagen.height);
  const lienzo = document.createElement('canvas');
  lienzo.width = LADO_FOTO;
  lienzo.height = LADO_FOTO;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no puede preparar la foto.');
  ctx.drawImage(imagen, x, y, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO);
  imagen.close();
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error('No se pudo preparar la foto.'))), 'image/jpeg', 0.85),
  );
}
