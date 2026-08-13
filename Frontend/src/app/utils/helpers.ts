import { TOKEN_KEY } from './constants';

/** Store JWT token in localStorage */
export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Retrieve JWT token from localStorage */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Remove JWT token from localStorage */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Check whether the user is currently authenticated */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/** Decode the JWT payload without verifying the signature */
export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/** Format a date string to a human-readable local date */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format a decimal number to 2 decimal places */
export function formatDecimal(value: number | null | undefined): string {
  if (value == null) return '—';
  return Number(value).toFixed(2);
}

/** Map a trade result code to a CSS class suffix */
export function resultClass(result: 'W' | 'BE' | 'L'): string {
  return { W: 'win', BE: 'breakeven', L: 'loss' }[result] ?? '';
}
