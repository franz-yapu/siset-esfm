#!/usr/bin/env bash
# Despliega un commit de main en el staging del VPS (SDD S0.9 §2.5) y lo verifica desde afuera.
#   scripts/desplegar-staging.sh [commit]            despliega (default: origin/main)
#   scripts/desplegar-staging.sh --simular [commit]  muestra lo que haría, sin conectarse al servidor
# Variables: STAGING_SSH (franz@31.220.101.118), STAGING_DIR (~/siset-staging),
#            STAGING_DOMINIO (siset-staging.vertexall.com), STAGING_REPO (URL del repo).
# Rollback: volver a correrlo con el commit anterior.
set -euo pipefail
cd "$(dirname "$0")/.."

SIMULAR=0
if [ "${1:-}" = "--simular" ]; then SIMULAR=1; shift; fi
SSH_DESTINO="${STAGING_SSH:-franz@31.220.101.118}"
DIR="${STAGING_DIR:-siset-staging}"
DOMINIO="${STAGING_DOMINIO:-siset-staging.vertexall.com}"
REPO="${STAGING_REPO:-https://github.com/franz-yapu/siset-esfm.git}"

git fetch -q origin main
COMMIT="$(git rev-parse "${1:-origin/main}^{commit}")"
git merge-base --is-ancestor "$COMMIT" origin/main || { echo "✖ $COMMIT no está en main (solo se despliega lo que pasó por la CI)."; exit 1; }

# Script remoto: la contraseña de la BD se genera en el servidor y nunca se imprime.
read -r -d '' REMOTO <<SCRIPT || true
set -euo pipefail
if [ ! -d "$DIR/.git" ]; then git clone -q "$REPO" "$DIR"; fi
cd "$DIR"
if [ ! -f .env ]; then
  umask 077
  printf 'POSTGRES_PASSWORD=%s\nSTAGING_DOMINIO=%s\nWEB_ORIGEN=https://%s\nVITE_USAR_API=false\nVITE_DEMO=true\n' \
    "\$(openssl rand -base64 32 | tr -d '/+=')" "$DOMINIO" "$DOMINIO" > .env
  echo "  .env creado (600)"
fi
# APP_DB_PASSWORD (S6.4): contraseña del rol siset_app. Nunca se imprime.
if ! grep -q '^APP_DB_PASSWORD=' .env; then
  umask 077
  printf 'APP_DB_PASSWORD=%s\n' "\$(openssl rand -base64 32 | tr -d '/+=\n')" >> .env
  echo "  APP_DB_PASSWORD agregado al .env"
fi
# JWT_SECRET (S1.3): se agrega también a un .env creado antes de S1.3. Nunca se imprime.
if ! grep -q '^JWT_SECRET=' .env; then
  umask 077
  printf 'JWT_SECRET=%s\n' "\$(openssl rand -base64 48 | tr -d '/+=\n')" >> .env
  echo "  JWT_SECRET agregado al .env"
fi
git fetch -q origin
git checkout -q --detach "$COMMIT"
docker compose -f docker-compose.yml -f docker-compose.staging.yml --profile completo up -d --build --wait --wait-timeout 300
echo "  desplegado: \$(git log -1 --format='%h %s')"
SCRIPT

echo "▶ Staging: https://$DOMINIO  ←  $COMMIT  ($SSH_DESTINO:~/$DIR)"
if [ "$SIMULAR" = 1 ]; then
  echo "── (simulación) se ejecutaría en el servidor:"; echo "$REMOTO"
  echo "── (simulación) y después, desde aquí:"
  echo "scripts/docker-smoke.sh --url https://$DOMINIO"
  echo "E2E_BASE_URL=https://$DOMINIO npm run e2e"
  exit 0
fi

ssh -o BatchMode=yes "$SSH_DESTINO" bash -s <<<"$REMOTO"
echo "▶ Verificando desde afuera"
scripts/docker-smoke.sh --url "https://$DOMINIO"
E2E_BASE_URL="https://$DOMINIO" npm run e2e
echo "✔ Staging desplegado y verificado: https://$DOMINIO ($COMMIT)"
