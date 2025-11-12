/**
 * Currency formatting utilities
 */

export const DEFAULT_CURRENCY = 'GEL';
export const DEFAULT_LOCALE = 'ka-GE';

/**
 * Format a number as currency using Georgian Lari (GEL) by default
 */
export const formatCurrency = (amount: string | number, currency: string = DEFAULT_CURRENCY, locale: string = DEFAULT_LOCALE): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '₾0.00';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(numericAmount);
};

/**
 * Format currency for display in Georgian Lari
 */
export const formatGEL = (amount: string | number): string => {
  return formatCurrency(amount, 'GEL', 'ka-GE');
};

/**
 * Format currency for display in USD (for backward compatibility)
 */
export const formatUSD = (amount: string | number): string => {
  return formatCurrency(amount, 'USD', 'en-US');
};
