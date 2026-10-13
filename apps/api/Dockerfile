# Imagen de la API de SISET (SDD S0.4 §2.2). Contexto de build: raíz del repo.

FROM node:26.11.1-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Con devDependencies (CLI de Prisma, tsdown). Sin scripts: el cliente se genera abajo, con el esquema ya copiado.
RUN npm ci -w @siset/api --include-workspace-root --ignore-scripts
COPY apps/api/ apps/api/
RUN npm exec -w @siset/api -- prisma generate && npm run build -w @siset/api
# Este stage también lo usa el servicio `migrar` (tiene el CLI de Prisma y las migraciones).

FROM node:26.11.1-alpine3.24 AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json apps/api/
# Solo dependencias de producción de la API (sin el workspace web). Se omiten también peers y opcionales:
# @prisma/client declara el CLI de Prisma y TypeScript como peers opcionales, y el CLI arrastra Prisma
# Studio con React. El cliente de Prisma generado ya va dentro del bundle.
RUN npm ci -w @siset/api --omit=dev --omit=optional --omit=peer --ignore-scripts && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/servidor.mjs"]
