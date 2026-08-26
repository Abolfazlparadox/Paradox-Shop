/**
 * Formats a decimal/integer string or number as Rial currency with standard separators.
 * Example: 1250000 -> "1,250,000 Rial"
 */
export function formatCurrency(amount: string | number | null | undefined, unit: 'Rial' | 'Toman' = 'Rial'): string {
  if (amount === null || amount === undefined || amount === '') {
    return '0 ' + unit;
  }
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ' + unit;

  const displayNum = unit === 'Toman' ? Math.floor(num / 10) : num;
  return `${new Intl.NumberFormat('en-US').format(displayNum)} ${unit}`;
}

/**
 * Formats ISO date string to readable format.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Formats order number or SKU with consistent monospace rendering.
 */
export function formatOrderNumber(orderNumber: string): string {
  return orderNumber;
}
