/** Base URL for all API calls. Routed through Kong. */
export const API_BASE_URL = '/api';

/** Keycloak connection info. Routed through Kong at "/auth" (see kong/kong.yml). */
export const KEYCLOAK_URL = '/auth';
export const KEYCLOAK_REALM = 'trading-journal';
export const KEYCLOAK_CLIENT_ID = 'trading-journal-frontend';

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
