import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { createDocument, type ZodOpenApiPathsObject } from 'zod-openapi';

/**
 * Arma el documento OpenAPI 3.1 a partir de los `paths` que exporta cada
 * módulo, generados desde sus esquemas Zod (SDD S0.7 §2.8).
 */
export function crearDocumentoOpenApi(paths: ZodOpenApiPathsObject[], version: string) {
  return createDocument({
    openapi: '3.1.0',
    info: { title: 'SISET API', version, description: 'API del Sistema de Gestión y Seguimiento de Trámites.' },
    paths: Object.assign({}, ...paths),
  });
}

/** `/openapi.json` y `/docs` (Swagger UI). Solo se monta fuera de producción. */
export function routerDocs(documento: ReturnType<typeof createDocument>): Router {
  const r = Router();
  r.get('/openapi.json', (_req, res) => {
    res.json(documento);
  });
  r.use('/docs', swaggerUi.serve, swaggerUi.setup(documento));
  return r;
}

/** Contrato de todo módulo HTTP (SDD S0.7 §2): su router y sus `paths` de OpenAPI. */
export interface ModuloHttp {
  router: Router;
  openapi: ZodOpenApiPathsObject;
}
