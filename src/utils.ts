import { TaxPayerType, BIRForm, FormReference, Client } from './types';

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
  if (formReferences) {
    const ref = formReferences.find(r => r.code === form.code);
    if (ref) {
      const info = getComplianceDeadlineForPeriod(ref, selectedPeriod);
      if (form.period && info.period && form.period !== info.period) {
        const formDl = calculateDeadline(form.period, ref.frequency, ref.deadlineRule);
        return formDl.startsWith(selectedPeriod);
      }
      return info.isDue;
    }
  }

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

export function getFormsForClientAndPeriod(
  client: Client,
  selectedPeriod: string,
  formReferences: FormReference[]
): BIRForm[] {
  if (!selectedPeriod) return client.forms;

  // Get unique assigned compliance codes for this client
  const assignedCodes: string[] = Array.from(new Set(client.forms.map(f => f.code)));
  const resultForms: BIRForm[] = [];

  for (const code of assignedCodes) {
    const clientFormInstances = client.forms.filter(f => f.code === code);

    // Find earliest assignedPeriod or period for this compliance code
    let earliestAssignedPeriod = '2026-01';
    const assignedPeriods = clientFormInstances
      .map(f => f.assignedPeriod || f.period)
      .filter((p): p is string => Boolean(p) && p.length === 7);

    if (assignedPeriods.length > 0) {
      assignedPeriods.sort();
      earliestAssignedPeriod = assignedPeriods[0];
    }

    // Compliances assigned/selected for a month SHOULD NOT appear on preceding months
    if (selectedPeriod < earliestAssignedPeriod) {
      continue;
    }

    const ref = formReferences.find(r => r.code === code);
    if (!ref) {
      const existing = clientFormInstances.filter(f => isFormVisibleForPeriod(f, selectedPeriod, formReferences));
      resultForms.push(...existing);
      continue;
    }

    const info = getComplianceDeadlineForPeriod(ref, selectedPeriod);
    if (info.isDue) {
      // Find if there's an existing recorded form for this code and target period
      const existing = clientFormInstances.find(f => 
        (info.period && f.period === info.period) ||
        (f.deadline && f.deadline.startsWith(selectedPeriod))
      );

      if (existing) {
        resultForms.push({
          ...existing,
          deadline: info.deadline || existing.deadline,
          period: info.period || existing.period,
          assignedPeriod: existing.assignedPeriod || earliestAssignedPeriod
        });
      } else {
        resultForms.push({
          id: `${client.id}-${code}-${info.period || selectedPeriod}`,
          code: code,
          description: ref.description,
          status: 'Pending',
          deadline: info.deadline,
          period: info.period || selectedPeriod,
          assignedPeriod: earliestAssignedPeriod
        });
      }
    }
  }

  return resultForms;
}

export function getComplianceDeadlineForPeriod(ref: FormReference, selectedPeriod: string): { isDue: boolean; deadline: string; period: string } {
  if (!selectedPeriod) return { isDue: false, deadline: '', period: '' };
  
  const [yearStr, monthStr] = selectedPeriod.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const freq = (ref.frequency || '').toLowerCase().trim();
  const code = (ref.code || '').toUpperCase().trim();

  // 1. 0619-E: Due only for transaction periods in Jan, Feb, Apr, May, Jul, Aug, Oct, Nov
  if (code === '0619-E' || freq.includes('january') || (freq.includes('jan') && freq.includes('feb'))) {
    const prevD = new Date(year, month - 2, 1);
    const targetMonth = prevD.getMonth() + 1;
    const targetYear = prevD.getFullYear();
    const validMonths = [1, 2, 4, 5, 7, 8, 10, 11];
    if (validMonths.includes(targetMonth)) {
      const targetPeriod = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
      const dl = calculateDeadline(targetPeriod, ref.frequency, ref.deadlineRule);
      return { isDue: true, deadline: dl, period: targetPeriod };
    } else {
      return { isDue: false, deadline: '', period: '' };
    }
  }

  // 2. 1701Q (Individual Quarterly Income Tax: Q1 May 15, Q2 Aug 15, Q3 Nov 15)
  if (code === '1701Q') {
    if (month === 5) {
      return { isDue: true, deadline: `${year}-05-15`, period: `${year}-03` };
    }
    if (month === 8) {
      return { isDue: true, deadline: `${year}-08-15`, period: `${year}-06` };
    }
    if (month === 11) {
      return { isDue: true, deadline: `${year}-11-15`, period: `${year}-09` };
    }
    return { isDue: false, deadline: '', period: '' };
  }

  // 3. 1702Q (Corporate Quarterly Income Tax: Q1 May 30, Q2 Aug 29, Q3 Nov 29)
  if (code === '1702Q') {
    if (month === 5) {
      return { isDue: true, deadline: `${year}-05-30`, period: `${year}-03` };
    }
    if (month === 8) {
      return { isDue: true, deadline: `${year}-08-29`, period: `${year}-06` };
    }
    if (month === 11) {
      return { isDue: true, deadline: `${year}-11-29`, period: `${year}-09` };
    }
    return { isDue: false, deadline: '', period: '' };
  }

  // 4. Monthly forms (like 1601-C)
  if (freq === 'monthly') {
    const prevD = new Date(year, month - 2, 1);
    const targetPeriod = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
    const dl = calculateDeadline(targetPeriod, ref.frequency, ref.deadlineRule);
    return { isDue: true, deadline: dl, period: targetPeriod };
  }

  // 5. Quarterly forms (like 1601-EQ, 2550Q, 2551Q)
  if (freq === 'quarterly') {
    const testPeriods = [
      `${year - 1}-12`,
      `${year}-03`,
      `${year}-06`,
      `${year}-09`,
      `${year}-12`
    ];
    for (const p of testPeriods) {
      const dl = calculateDeadline(p, ref.frequency, ref.deadlineRule);
      if (dl.startsWith(selectedPeriod)) {
        return { isDue: true, deadline: dl, period: p };
      }
    }
    return { isDue: false, deadline: '', period: '' };
  }

  // 6. Annual forms (like 1701, 1702-RT, 0605)
  if (freq === 'annually' || freq === 'annual') {
    const testPeriods = [`${year - 1}-12`, `${year}-12`, `${year}-01`];
    for (const p of testPeriods) {
      const dl = calculateDeadline(p, ref.frequency, ref.deadlineRule);
      if (dl.startsWith(selectedPeriod)) {
        return { isDue: true, deadline: dl, period: p };
      }
    }
    return { isDue: false, deadline: '', period: '' };
  }

  if (freq === 'semi-annually' || freq === 'semi-annual') {
    const testPeriods = [`${year - 1}-12`, `${year}-06`, `${year}-12`];
    for (const p of testPeriods) {
      const dl = calculateDeadline(p, ref.frequency, ref.deadlineRule);
      if (dl.startsWith(selectedPeriod)) {
        return { isDue: true, deadline: dl, period: p };
      }
    }
    return { isDue: false, deadline: '', period: '' };
  }

  const dl = calculateDeadline(selectedPeriod, ref.frequency, ref.deadlineRule);
  if (dl.startsWith(selectedPeriod)) {
    return { isDue: true, deadline: dl, period: selectedPeriod };
  }

  return { isDue: false, deadline: dl, period: selectedPeriod };
}

export function getEffectiveDeadline(form: BIRForm, formReferences: FormReference[], selectedPeriod: string): string {
  const ref = formReferences.find(r => r.code === form.code);
  if (ref) {
    const info = getComplianceDeadlineForPeriod(ref, selectedPeriod);
    if (info.isDue) {
      return info.deadline;
    }
    if (form.period) {
      return calculateDeadline(form.period, ref.frequency, ref.deadlineRule);
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
