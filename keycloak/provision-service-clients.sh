#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
. ./.env
set +a

: "${KEYCLOAK_ADMIN:?Set KEYCLOAK_ADMIN in .env}"
: "${KEYCLOAK_ADMIN_PASSWORD:?Set KEYCLOAK_ADMIN_PASSWORD in .env}"
: "${TRADE_API_CLIENT_SECRET:?Set TRADE_API_CLIENT_SECRET in .env}"
: "${BROKER_SYNC_CLIENT_SECRET:?Set BROKER_SYNC_CLIENT_SECRET in .env}"

realm=trading-journal
kc() {
  docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh "$@"
}

kc config credentials --server http://localhost:8080/auth --realm master \
  --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null

client_uuid() {
  kc get clients -r "$realm" -q "clientId=$1" |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const rows=JSON.parse(s);process.stdout.write(rows[0]?.id||"")})'
}

ensure_mapper() {
  local uuid="$1" mapper_name="$2" audience="$3" mapper_id
  mapper_id=$(kc get "clients/$uuid/protocol-mappers/models" -r "$realm" |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=JSON.parse(s).find(x=>x.name===process.argv[1]);process.stdout.write(m?.id||"")})' "$mapper_name")
  local args=(-r "$realm" -s "name=$mapper_name" -s protocol=openid-connect
    -s protocolMapper=oidc-audience-mapper -s consentRequired=false
    -s "config.\"included.client.audience\"=$audience"
    -s 'config."id.token.claim"=false' -s 'config."access.token.claim"=true')
  if [[ -n "$mapper_id" ]]; then
    kc update "clients/$uuid/protocol-mappers/models/$mapper_id" "${args[@]}" >/dev/null
  else
    kc create "clients/$uuid/protocol-mappers/models" "${args[@]}" >/dev/null
  fi
}

ensure_client() {
  local client_id="$1" name="$2" secret="$3" audience="$4" uuid
  uuid=$(client_uuid "$client_id")
  if [[ -z "$uuid" ]]; then
    kc create clients -r "$realm" -s "clientId=$client_id" -s "name=$name" \
      -s enabled=true -s protocol=openid-connect -s publicClient=false \
      -s clientAuthenticatorType=client-secret -s standardFlowEnabled=false \
      -s directAccessGrantsEnabled=false -s serviceAccountsEnabled=true >/dev/null
    uuid=$(client_uuid "$client_id")
  fi
  kc update "clients/$uuid" -r "$realm" -s enabled=true -s publicClient=false \
    -s standardFlowEnabled=false -s directAccessGrantsEnabled=false \
    -s serviceAccountsEnabled=true -s "secret=$secret" >/dev/null
  ensure_mapper "$uuid" "$client_id-audience" "$audience"
}

ensure_client trade-api "Trade API Service Client" "$TRADE_API_CLIENT_SECRET" broker-sync-api
ensure_client broker-sync-api "Broker Sync API" "$BROKER_SYNC_CLIENT_SECRET" trade-api
printf 'Configured trade-api and broker-sync-api service clients in realm %s.\n' "$realm"