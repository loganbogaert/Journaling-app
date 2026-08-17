/** Base URL for all API calls. Routed through Kong. */
export const API_BASE_URL = '/api';

// __env is populated on window at container startup, see Frontend/public/env.js
const env = (window as any).__env ?? {};

/** Keycloak connection info — injected at container startup, see Frontend/public/env.js */
export const KEYCLOAK_URL = env.KEYCLOAK_URL || '/auth';
export const KEYCLOAK_REALM = env.KEYCLOAK_REALM || 'trading-journal';
export const KEYCLOAK_CLIENT_ID = env.KEYCLOAK_CLIENT_ID || 'trading-journal-frontend';

/** Trade result labels */
export const TRADE_RESULT_LABELS: Record<string, string> = {
  W: 'Win',
  BE: 'Break Even',
  L: 'Loss',
};

/** Trade direction labels */
export const TRADE_DIRECTION_LABELS: Record<string, string> = {
  long: 'Long',
  short: 'Short',
};
