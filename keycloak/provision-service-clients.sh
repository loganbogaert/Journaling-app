#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
. ./.env
set +a

: "${KEYCLOAK_ADMIN:?Set KEYCLOAK_ADMIN in .env}"
: "${KEYCLOAK_ADMIN_PASSWORD:?Set KEYCLOAK_ADMIN_PASSWORD in .env}"
: "${TRADE_API_CLIENT_SECRET:?Set TRADE_API_CLIENT_SECRET in .env}"
: "${BROKER_INTEGRATION_CLIENT_SECRET:?Set BROKER_INTEGRATION_CLIENT_SECRET in .env}"

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

legacy_uuid=$(client_uuid broker-sync-api)
integration_uuid=$(client_uuid broker-integration-api)
if [[ -n "$legacy_uuid" && -z "$integration_uuid" ]]; then
  kc update "clients/$legacy_uuid" -r "$realm" -s clientId=broker-integration-api \
    -s "name=Broker Integration API" >/dev/null
fi

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
  ensure_mapper "$uuid" "$audience-audience" "$audience"
}

ensure_client trade-api "Trade API Service Client" "$TRADE_API_CLIENT_SECRET" broker-integration-api
ensure_client broker-integration-api "Broker Integration API" "$BROKER_INTEGRATION_CLIENT_SECRET" trade-api

trade_uuid=$(client_uuid trade-api)
old_mapper=$(kc get "clients/$trade_uuid/protocol-mappers/models" -r "$realm" |
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=JSON.parse(s).find(x=>x.name==="broker-sync-api-audience");process.stdout.write(m?.id||"")})')
if [[ -n "$old_mapper" ]]; then
  kc delete "clients/$trade_uuid/protocol-mappers/models/$old_mapper" -r "$realm" >/dev/null
fi

printf 'Configured trade-api and broker-integration-api service clients in realm %s.\n' "$realm"