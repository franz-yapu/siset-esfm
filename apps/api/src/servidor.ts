import { crearApp } from '@/app';

const puerto = Number(process.env.PORT ?? 3000);

crearApp().listen(puerto, () => {
  // El logger estructurado llega en S0.7.
  // eslint-disable-next-line no-console
  console.info(`API de SISET escuchando en http://localhost:${puerto}`);
});
