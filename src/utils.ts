import { TaxPayerType, BIRForm, FormReference } from './types';

export interface ComplianceStatusInfo {
  label: string;
  color: string;
  urgency?: 'high' | 'medium' | 'low' | 'completed';
}

export function getComplianceStatusInfo(form: BIRForm, effectiveDeadline: string): ComplianceStatusInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadDate = new Date(effectiveDeadline);
  deadDate.setHours(0, 0, 0, 0);

  const diffTime = deadDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // If compliance is still Pending or Processing
  if (form.status === 'Pending' || form.status === 'Processing') {
    if (diffDays < 0) {
      return {
        label: 'OVERDUE',
        color: 'text-red-700 bg-red-50 border-red-200 font-bold',
        urgency: 'high'
      };
    }
    if (diffDays === 0) {
      return {
        label: 'Due Today',
        color: 'text-red-700 bg-red-50 border-red-200 font-bold',
        urgency: 'high'
      };
    }
    if (diffDays <= 7) {
      return {
        label: `Due in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`,
        color: 'text-amber-700 bg-amber-50 border-amber-200 font-medium',
        urgency: 'medium'
      };
    }
    return {
      label: `Due in ${diffDays} days`,
      color: 'text-slate-600 bg-slate-50 border-slate-200 font-normal',
      urgency: 'low'
    };
  }

  // If status is 'Filed' or 'Paid'
  const dateFiledStr = form.dateFiled || new Date().toISOString().split('T')[0];
  const isFiledOnTime = dateFiledStr <= effectiveDeadline;

  const isNoPayable = form.taxStatus === 'W/O Payable';
  
  if (isNoPayable) {
    if (isFiledOnTime) {
      return {
        label: 'BOTH ON TIME',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold',
        urgency: 'completed'
      };
    } else {
      return {
        label: 'BOTH ON LATE',
        color: 'text-red-700 bg-red-50 border-red-200 font-semibold',
        urgency: 'completed'
      };
    }
  }

  const datePaidStr = form.datePaid || (form.status === 'Paid' ? (form.dateFiled || new Date().toISOString().split('T')[0]) : undefined);
  
  if (!datePaidStr && form.status === 'Filed') {
    if (isFiledOnTime) {
      return {
        label: 'FILED ON TIME (UNPAID)',
        color: 'text-blue-700 bg-blue-50 border-blue-200 font-semibold',
        urgency: 'medium'
      };
    } else {
      return {
        label: 'FILED LATE (UNPAID)',
        color: 'text-red-700 bg-red-50 border-red-200 font-semibold',
        urgency: 'high'
      };
    }
  }

  const isPaidOnTime = datePaidStr ? datePaidStr <= effectiveDeadline : false;

  if (isFiledOnTime && isPaidOnTime) {
    return {
      label: 'BOTH ON TIME',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold',
      urgency: 'completed'
    };
  } else if (isFiledOnTime && !isPaidOnTime) {
    return {
      label: 'ON TIME BUT PAID LATE',
      color: 'text-amber-700 bg-amber-50 border-amber-200 font-semibold',
      urgency: 'completed'
    };
  } else if (!isFiledOnTime && !isPaidOnTime) {
    return {
      label: 'BOTH ON LATE',
      color: 'text-red-700 bg-red-50 border-red-200 font-semibold',
      urgency: 'completed'
    };
  } else {
    return {
      label: 'FILED LATE BUT PAID ON TIME',
      color: 'text-amber-700 bg-amber-50 border-amber-200 font-semibold',
      urgency: 'completed'
    };
  }
}

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

export function isFormVisibleForPeriod(form: BIRForm, selectedPeriod: string, formReferences?: FormReference[]): boolean {
  const effectiveDeadline = formReferences 
    ? getEffectiveDeadline(form, formReferences, selectedPeriod)
    : form.deadline;

  if (effectiveDeadline && effectiveDeadline.startsWith(selectedPeriod)) {
    return true;
  }
  if (form.deadline && form.deadline.startsWith(selectedPeriod)) {
    return true;
  }
  return false;
}

export function getEffectiveDeadline(form: BIRForm, formReferences: FormReference[], selectedPeriod: string): string {
  const ref = formReferences.find(r => r.code === form.code);
  if (ref) {
    if (form.period) {
      return calculateDeadline(form.period, ref.frequency, ref.deadlineRule);
    }
    if (form.deadline) {
      return form.deadline;
    }
    return calculateDeadline(selectedPeriod, ref.frequency, ref.deadlineRule);
  }
  return form.deadline || new Date().toISOString().split('T')[0];
}

export function calculateDeadline(period: string, frequency: string, rule: string): string {
  if (!period) return new Date().toISOString().split('T')[0];
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Default to 15th of the selected period
  let resultDate = new Date(year, month - 1, 15);

  const lowerRule = (rule || '').toLowerCase();

  if (lowerRule.includes('10th') && (lowerRule.includes('following') || lowerRule.includes('next'))) {
    resultDate = new Date(year, month, 10);
  } else if (lowerRule.includes('last day') || lowerRule.includes('end of')) {
    if (lowerRule.includes('following') || lowerRule.includes('next')) {
      resultDate = new Date(year, month + 1, 0); // Last day of next month
    } else {
      resultDate = new Date(year, month, 0); // Last day of selected month
    }
  } else if (lowerRule.includes('25th')) {
    if (lowerRule.includes('following') || lowerRule.includes('next')) {
      resultDate = new Date(year, month, 25);
    } else {
      resultDate = new Date(year, month - 1, 25);
    }
  } else if (lowerRule.includes('15th')) {
    if (lowerRule.includes('following') || lowerRule.includes('next')) {
      resultDate = new Date(year, month, 15);
    } else {
      resultDate = new Date(year, month - 1, 15);
    }
  } else if (lowerRule.includes('60 days') && (lowerRule.includes('following') || lowerRule.includes('next'))) {
    const endOfMonth = new Date(year, month, 0);
    resultDate = new Date(endOfMonth.getTime() + 60 * 24 * 60 * 60 * 1000);
  } else if (lowerRule.includes('april 15') && (lowerRule.includes('following') || lowerRule.includes('next'))) {
    resultDate = new Date(year + 1, 3, 15);
  } else if (lowerRule.includes('15th day of the 4th month')) {
    resultDate = new Date(year + 1, 3, 15);
  } else {
    // Basic fallback parsing
    const dayMatch = lowerRule.match(/(\d+)(st|nd|rd|th)?/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1], 10);
      if (day > 0 && day <= 31) {
        if (lowerRule.includes('following') || lowerRule.includes('next')) {
          resultDate = new Date(year, month, day);
        } else {
          resultDate = new Date(year, month - 1, day);
        }
      }
    }
  }

  const rYear = resultDate.getFullYear();
  const rMonth = String(resultDate.getMonth() + 1).padStart(2, '0');
  const rDay = String(resultDate.getDate()).padStart(2, '0');

  return `${rYear}-${rMonth}-${rDay}`;
}
