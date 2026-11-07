'use strict';

const adminServer = process.env.KEYCLOAK_ADMIN_SERVER || 'http://keycloak:8080/auth';
const adminUser = process.env.KEYCLOAK_ADMIN;
const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;
const tradeApiSecret = process.env.TRADE_API_CLIENT_SECRET;
const brokerIntegrationSecret = process.env.BROKER_INTEGRATION_CLIENT_SECRET;
const realm = 'trading-journal';

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 204) return null;
  const body = await response.text();
  if (!response.ok) throw new Error(`Keycloak admin request failed (${response.status}): ${body}`);
  return body ? JSON.parse(body) : null;
}

async function waitForKeycloak() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${adminServer}/realms/master/.well-known/openid-configuration`);
      if (response.ok) return;
    } catch {}
    await delay(1000);
  }
  throw new Error('Keycloak did not become ready within 60 seconds');
}

async function getAdminToken() {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: adminUser,
    password: adminPassword,
  });
  const response = await fetch(`${adminServer}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Keycloak admin login failed (${response.status})`);
  return (await response.json()).access_token;
}

async function adminRequest(path, token, options = {}) {
  return request(`${adminServer}/admin/realms/${realm}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  });
}

async function findClient(clientId, token) {
  const query = new URLSearchParams({ clientId });
  const clients = await adminRequest(`/clients?${query}`, token);
  return clients.find((client) => client.clientId === clientId) || null;
}

async function ensureClient({ clientId, name, secret, audience }, token) {
  let client = await findClient(clientId, token);
  const representation = {
    ...(client || {}),
    clientId,
    name,
    enabled: true,
    protocol: 'openid-connect',
    publicClient: false,
    clientAuthenticatorType: 'client-secret',
    standardFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: true,
    secret,
  };

  if (client) {
    await adminRequest(`/clients/${client.id}`, token, {
      method: 'PUT',
      body: JSON.stringify(representation),
    });
  } else {
    await adminRequest('/clients', token, {
      method: 'POST',
      body: JSON.stringify(representation),
    });
    client = await findClient(clientId, token);
  }

  const mappers = await adminRequest(`/clients/${client.id}/protocol-mappers/models`, token);
  const mapperName = `${audience}-audience`;
  const existing = mappers.find((mapper) => mapper.name === mapperName);
  const mapper = {
    ...(existing || {}),
    name: mapperName,
    protocol: 'openid-connect',
    protocolMapper: 'oidc-audience-mapper',
    consentRequired: false,
    config: {
      'included.client.audience': audience,
      'id.token.claim': 'false',
      'access.token.claim': 'true',
    },
  };
  const mapperPath = `/clients/${client.id}/protocol-mappers/models`;
  if (existing) {
    await adminRequest(`${mapperPath}/${existing.id}`, token, {
      method: 'PUT',
      body: JSON.stringify(mapper),
    });
  } else {
    await adminRequest(mapperPath, token, {
      method: 'POST',
      body: JSON.stringify(mapper),
    });
  }
  return client;
}

async function run() {
  for (const [name, value] of Object.entries({
    KEYCLOAK_ADMIN: adminUser,
    KEYCLOAK_ADMIN_PASSWORD: adminPassword,
    TRADE_API_CLIENT_SECRET: tradeApiSecret,
    BROKER_INTEGRATION_CLIENT_SECRET: brokerIntegrationSecret,
  })) {
    if (!value) throw new Error(`${name} must be configured`);
  }

  await waitForKeycloak();
  const token = await getAdminToken();
  let brokerClient = await findClient('broker-integration-api', token);
  const legacyClient = await findClient('broker-sync-api', token);

  if (!brokerClient && legacyClient) {
    const renamed = { ...legacyClient, clientId: 'broker-integration-api', name: 'Broker Integration API' };
    await adminRequest(`/clients/${legacyClient.id}`, token, {
      method: 'PUT',
      body: JSON.stringify(renamed),
    });
    brokerClient = await findClient('broker-integration-api', token);
  } else if (brokerClient && legacyClient) {
    await adminRequest(`/clients/${legacyClient.id}`, token, { method: 'DELETE' });
  }

  const tradeClient = await ensureClient({
    clientId: 'trade-api',
    name: 'Trade API Service Client',
    secret: tradeApiSecret,
    audience: 'broker-integration-api',
  }, token);
  brokerClient = await ensureClient({
    clientId: 'broker-integration-api',
    name: 'Broker Integration API',
    secret: brokerIntegrationSecret,
    audience: 'trade-api',
  }, token);

  const mappers = await adminRequest(`/clients/${tradeClient.id}/protocol-mappers/models`, token);
  const oldMapper = mappers.find((mapper) => mapper.name === 'broker-sync-api-audience');
  if (oldMapper) {
    await adminRequest(`/clients/${tradeClient.id}/protocol-mappers/models/${oldMapper.id}`, token, { method: 'DELETE' });
  }

  console.log(`Configured trade-api and broker-integration-api in Keycloak realm ${realm}.`);
}

run().catch((error) => {
  console.error(`Keycloak client provisioning failed: ${error.message}`);
  process.exitCode = 1;
});
