#!/usr/bin/env bash
# Prueba de humo de SISET (SDD S0.4 §2.5, S0.9).
#   scripts/docker-smoke.sh               levanta el stack en un proyecto aparte (siset-smoke) y lo prueba
#   scripts/docker-smoke.sh --mantener    ídem, pero deja el stack arriba (p. ej. para correr la E2E)
#   scripts/docker-smoke.sh --url URL     solo las comprobaciones HTTP contra un despliegue existente (staging)
# Variables opcionales: SMOKE_CURL_OPTS (p. ej. "-k" con un certificado autofirmado de prueba) y
# SMOKE_HTTP_URL (URL HTTP para probar la redirección a HTTPS, si no es la misma del dominio).
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck disable=SC2086
curl() { command curl ${SMOKE_CURL_OPTS:-} "$@"; }

fallos=0
ok() { echo "  ✅ $1"; }
mal() { echo "  ❌ $1"; fallos=$((fallos + 1)); }
comprobar() { if eval "$2"; then ok "$1"; else mal "$1"; fi; }

# Comprobaciones HTTP comunes: local y staging.
comprobar_http() {
  local BASE="$1"
  comprobar "GET / devuelve la SPA" 'curl -fsS "$BASE/" | grep -q "<div id=\"root\">"'
  comprobar "ruta de la SPA (/files/123) cae en index.html" 'curl -fsS "$BASE/files/123" | grep -q "<div id=\"root\">"'
  comprobar "GET /api/v1/health → ok con BD" 'curl -fsS "$BASE/api/v1/health" | grep -q "\"bd\":\"ok\""'
  comprobar "ruta inexistente de la API → 404 en formato único" \
    '[ "$(curl -s -o /tmp/siset-smoke-404 -w "%{http_code}" "$BASE/api/v1/no-existe")" = "404" ] && grep -q "\"code\":\"NO_ENCONTRADO\"" /tmp/siset-smoke-404'
  CABECERAS="$(curl -fsS -D - -o /dev/null "$BASE/")"
  comprobar "CSP en la SPA" 'grep -qi "^content-security-policy: default-src .self." <<<"$CABECERAS"'
  comprobar "X-Frame-Options y nosniff" 'grep -qi "^x-frame-options: DENY" <<<"$CABECERAS" && grep -qi "^x-content-type-options: nosniff" <<<"$CABECERAS"'
  comprobar "Server sin versión" '! grep -qiE "^server: nginx/[0-9]" <<<"$CABECERAS"'
  comprobar "assets con caché inmutable" \
    'A=$(curl -fsS "$BASE/" | grep -oE "/assets/[^\"]+\.js" | head -1); curl -fsS -D - -o /dev/null "$BASE$A" | grep -qi "immutable"'
}

terminar() {
  echo
  if [ "$fallos" -eq 0 ]; then echo "✔ Prueba de humo en verde"; else echo "✖ $fallos comprobación(es) fallaron"; exit 1; fi
}

if [ "${1:-}" = "--url" ]; then
  BASE="${2:?Uso: $0 --url https://dominio}"
  echo "▶ Comprobaciones contra $BASE"
  comprobar_http "${BASE%/}"
  if [[ "$BASE" == https://* ]]; then
    CABECERAS="$(curl -fsS -D - -o /dev/null "$BASE/")"
    comprobar "HSTS (Strict-Transport-Security)" 'grep -qi "^strict-transport-security: max-age=" <<<"$CABECERAS"'
    comprobar "X-Robots-Tag: noindex" 'grep -qi "^x-robots-tag: noindex" <<<"$CABECERAS"'
    comprobar "HTTP redirige a HTTPS" \
      '[[ "$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "${SMOKE_HTTP_URL:-http://${BASE#https://}}/")" =~ ^30[178]\ https:// ]]'
  fi
  terminar
  exit 0
fi

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-siset-smoke}"
export DB_PORT="${SMOKE_DB_PORT:-5442}"
export WEB_PORT="${SMOKE_WEB_PORT:-8090}"
export WEB_ORIGEN="http://localhost:${WEB_PORT}"
BASE="http://localhost:${WEB_PORT}"
MANTENER="${1:-}"

limpiar() { [ "$MANTENER" = "--mantener" ] || docker compose --profile completo down -v --remove-orphans >/dev/null 2>&1 || true; }
trap limpiar EXIT

echo "▶ Levantando el stack (${COMPOSE_PROJECT_NAME}, web en ${BASE})"
docker compose --profile completo up -d --build --wait --wait-timeout 180

echo "▶ Comprobaciones"
comprobar "migrar terminó con código 0" \
  '[ "$(docker inspect -f "{{.State.ExitCode}}" "$(docker compose ps -a -q migrar)")" = "0" ]'
comprobar_http "$BASE"
comprobar "la API no corre como root" '[ "$(docker compose exec -T api id -u)" != "0" ]'
comprobar "el filesystem de la API es de solo lectura" '! docker compose exec -T api sh -c "touch /app/x" 2>/dev/null'
comprobar "el puerto de la API no se publica" \
  '[ "$(docker inspect -f "{{json .HostConfig.PortBindings}}" "$(docker compose ps -q api)")" = "{}" ]'
terminar
