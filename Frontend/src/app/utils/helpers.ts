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
