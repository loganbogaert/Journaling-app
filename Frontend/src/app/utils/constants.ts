/** Base URL for all API calls. Override via environment if needed. */
export const API_BASE_URL = '/api';

/** JWT storage key in localStorage */
export const TOKEN_KEY = 'tj_token';

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
