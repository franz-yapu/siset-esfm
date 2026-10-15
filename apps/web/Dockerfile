# Imagen de la web de SISET (SDD S0.4 §2.3): build de Vite + Nginx que sirve la SPA y hace de proxy de /api.
# Contexto de build: raíz del repo.

FROM node:26.11.1-alpine3.24 AS build
ARG VITE_USAR_API=false
ARG VITE_DEMO=true
ARG VITE_PUBLIC_URL=
ARG VITE_API_URL=
ARG VITE_CUENTAS_PRUEBA=false
ENV VITE_USAR_API=$VITE_USAR_API VITE_DEMO=$VITE_DEMO VITE_CUENTAS_PRUEBA=$VITE_CUENTAS_PRUEBA VITE_PUBLIC_URL=$VITE_PUBLIC_URL VITE_API_URL=$VITE_API_URL
WORKDIR /app
COPY package.json package-lock.json .npmrc tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci -w @siset/web --include-workspace-root --ignore-scripts
COPY apps/web/ apps/web/
RUN npm exec -w @siset/web -- vite build

FROM nginx:1.30-alpine
COPY apps/web/nginx/siset.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
