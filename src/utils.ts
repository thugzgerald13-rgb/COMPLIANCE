import { TaxPayerType } from './types';

export function isFormAllowedForTaxpayerType(formCode: string, type: TaxPayerType): boolean {
  const code = formCode.toUpperCase().trim();
  if (type === 'Corporate') {
    if (code.startsWith('1701')) {
      return false;
    }
  } else if (type === 'Individual') {
    if (code.startsWith('1702')) {
      return false;
    }
  }
  return true;
}

export function calculateDeadline(period: string, frequency: string, rule: string): string {
  if (!period) return new Date().toISOString().split('T')[0];
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Default to 15th of the selected period if no match
  let resultDate = new Date(year, month - 1, 15);

  const lowerRule = (rule || '').toLowerCase();

  if (lowerRule.includes('10th') && lowerRule.includes('following month')) {
    resultDate = new Date(year, month, 10);
  } else if (lowerRule.includes('last day') && (lowerRule.includes('following the close of the quarter') || lowerRule.includes('following month'))) {
    resultDate = new Date(year, month + 1, 0); // Last day of next month
  } else if (lowerRule.includes('25th') && lowerRule.includes('following the close of the quarter')) {
    resultDate = new Date(year, month, 25);
  } else if (lowerRule.includes('15th') && lowerRule.includes('following the close of the quarter')) {
    resultDate = new Date(year, month, 15);
  } else if (lowerRule.includes('60 days') && lowerRule.includes('following the close of the quarter')) {
    const endOfMonth = new Date(year, month, 0);
    resultDate = new Date(endOfMonth.getTime() + 60 * 24 * 60 * 60 * 1000);
  } else if (lowerRule.includes('april 15') && lowerRule.includes('following year')) {
    resultDate = new Date(year + 1, 3, 15); // April is 3 (0-indexed)
  } else if (lowerRule.includes('15th day of the 4th month') || lowerRule.includes('15th day of the 4th month following')) {
    resultDate = new Date(year + 1, 3, 15);
  } else {
    // Basic fallback parsing
    const dayMatch = lowerRule.match(/(\d+)(st|nd|rd|th)\s+day/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1], 10);
      if (lowerRule.includes('following month')) {
        resultDate = new Date(year, month, day);
      } else {
        resultDate = new Date(year, month - 1, day);
      }
    }
  }

  const rYear = resultDate.getFullYear();
  const rMonth = String(resultDate.getMonth() + 1).padStart(2, '0');
  const rDay = String(resultDate.getDate()).padStart(2, '0');

  return `${rYear}-${rMonth}-${rDay}`;
}
