import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adjustDeadlineForWeekend,
  calculateDeadline,
  formatTIN,
  getComplianceDeadlineForPeriod,
  getComplianceStatusInfo,
  getEffectiveDeadline,
  getFormsForClientAndPeriod,
  isFormAllowedForTaxpayerType,
  isFormVisibleForPeriod,
} from './utils';
import { BIRForm, Client, FormReference } from './types';

const MONTHLY_1601C: FormReference = {
  code: '1601-C',
  description: 'Monthly Remittance Return of Income Taxes Withheld on Compensation',
  frequency: 'Monthly',
  deadlineRule: '10th day of the following month',
};

const EXPANDED_0619E: FormReference = {
  code: '0619-E',
  description: 'Monthly Remittance Form for Creditable Income Taxes Withheld (Expanded)',
  frequency: 'Only for January, February, April, May, July, August, October and November',
  deadlineRule: '10th day of the following month',
};

const QUARTERLY_1601EQ: FormReference = {
  code: '1601-EQ',
  description: 'Quarterly Remittance Return of Creditable Income Taxes Withheld',
  frequency: 'Quarterly',
  deadlineRule: 'Last day of the month following the close of the quarter',
};

const ANNUAL_1701: FormReference = {
  code: '1701',
  description: 'Annual Income Tax Return (Individuals)',
  frequency: 'Annually',
  deadlineRule: 'April 15 of the following year',
};

function makeForm(overrides: Partial<BIRForm> = {}): BIRForm {
  return {
    id: 'form-1',
    code: '1601-C',
    description: 'Monthly Remittance Return',
    status: 'Pending',
    ...overrides,
  };
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    name: 'Acme Corporation',
    tin: '123-456-789-00000',
    rdo: '044',
    type: 'Corporate',
    forms: [],
    ...overrides,
  };
}

describe('formatTIN', () => {
  it('returns an empty string when there are no digits', () => {
    expect(formatTIN('')).toBe('');
    expect(formatTIN('abc-def')).toBe('');
  });

  it('groups digits progressively as they are typed', () => {
    expect(formatTIN('12')).toBe('12');
    expect(formatTIN('1234')).toBe('123-4');
    expect(formatTIN('1234567')).toBe('123-456-7');
    expect(formatTIN('123456789')).toBe('123-456-789');
    expect(formatTIN('12345678901234')).toBe('123-456-789-01234');
  });

  it('strips non-digits and truncates beyond 14 digits', () => {
    expect(formatTIN('123abc456!789/01234')).toBe('123-456-789-01234');
    expect(formatTIN('123456789012349999')).toBe('123-456-789-01234');
  });
});

describe('isFormAllowedForTaxpayerType', () => {
  it('blocks individual-only forms for corporate taxpayers', () => {
    expect(isFormAllowedForTaxpayerType('1701Q', 'Corporate')).toBe(false);
    expect(isFormAllowedForTaxpayerType('1701', 'Corporate')).toBe(false);
    expect(isFormAllowedForTaxpayerType('1702-RT', 'Corporate')).toBe(true);
  });

  it('blocks corporate-only forms for individual taxpayers', () => {
    expect(isFormAllowedForTaxpayerType('1702Q', 'Individual')).toBe(false);
    expect(isFormAllowedForTaxpayerType('1702-RT', 'Individual')).toBe(false);
    expect(isFormAllowedForTaxpayerType('1701Q', 'Individual')).toBe(true);
  });

  it('allows shared forms and normalizes casing/whitespace', () => {
    expect(isFormAllowedForTaxpayerType('1601-C', 'Corporate')).toBe(true);
    expect(isFormAllowedForTaxpayerType('1601-C', 'Individual')).toBe(true);
    expect(isFormAllowedForTaxpayerType('  1702q  ', 'Individual')).toBe(false);
  });
});

describe('adjustDeadlineForWeekend', () => {
  it('moves Saturday deadlines to the following Monday', () => {
    expect(adjustDeadlineForWeekend('2026-01-10')).toBe('2026-01-12');
  });

  it('moves Sunday deadlines to the following Monday', () => {
    expect(adjustDeadlineForWeekend('2026-01-11')).toBe('2026-01-12');
  });

  it('leaves weekday deadlines untouched', () => {
    expect(adjustDeadlineForWeekend('2026-01-13')).toBe('2026-01-13');
  });

  it('rolls over into the next month when needed', () => {
    // 2026-01-31 is a Saturday
    expect(adjustDeadlineForWeekend('2026-01-31')).toBe('2026-02-02');
  });

  it('returns the input unchanged when it is not an ISO date', () => {
    expect(adjustDeadlineForWeekend('')).toBe('');
    expect(adjustDeadlineForWeekend('not-a-date')).toBe('not-a-date');
    expect(adjustDeadlineForWeekend('2026-1-5')).toBe('2026-1-5');
  });
});

describe('calculateDeadline', () => {
  it('falls back to today when no period is supplied', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T08:00:00Z'));
    expect(calculateDeadline('', 'Monthly', '10th day of the following month')).toBe('2026-03-04');
    vi.useRealTimers();
  });

  it('handles the 10th of the following month', () => {
    expect(calculateDeadline('2026-01', 'Monthly', '10th day of the following month')).toBe('2026-02-10');
  });

  it('handles last day of the following month', () => {
    expect(calculateDeadline('2026-03', 'Quarterly', 'Last day of the month following the close of the quarter')).toBe('2026-04-30');
  });

  it('handles last day of the same month', () => {
    expect(calculateDeadline('2026-04', 'Monthly', 'Last day of the applicable month')).toBe('2026-04-30');
  });

  it('handles the 25th with and without a following-month offset', () => {
    // 2026-04-25 is a Saturday, so it shifts to Monday
    expect(calculateDeadline('2026-03', 'Quarterly', '25th day of the month following the close of the quarter')).toBe('2026-04-27');
    expect(calculateDeadline('2026-05', 'Monthly', '25th day of the applicable month')).toBe('2026-05-25');
  });

  it('handles the 15th with and without a following-month offset', () => {
    expect(calculateDeadline('2026-03', 'Quarterly', '15th day of the month following the close of the quarter')).toBe('2026-04-15');
    expect(calculateDeadline('2026-04', 'Monthly', '15th day of the applicable month')).toBe('2026-04-15');
  });

  it('handles the 60-days-after-quarter-close rule', () => {
    // 60 days after 2026-03-31 is 2026-05-30 (Saturday) -> Monday 2026-06-01
    expect(calculateDeadline('2026-03', 'Quarterly', '60 days following the close of the quarter')).toBe('2026-06-01');
  });

  it('handles fixed annual calendar rules', () => {
    expect(calculateDeadline('2025-12', 'Annually', 'April 15 of the following year')).toBe('2026-04-15');
    expect(calculateDeadline('2025-12', 'Annually', '15th day of the 4th month following the close of the taxable year')).toBe('2026-04-15');
    // 2026-01-31 is a Saturday
    expect(calculateDeadline('2025-12', 'Annually', 'January 31 of the following year')).toBe('2026-02-02');
    expect(calculateDeadline('2025-12', 'Annually', 'January 30 of the following year')).toBe('2026-01-30');
    expect(calculateDeadline('2025-12', 'Annually', 'January 20 of each year')).toBe('2026-01-20');
    // 2026-03-01 is a Sunday
    expect(calculateDeadline('2025-12', 'Annually', 'March 1 of the following year')).toBe('2026-03-02');
  });

  it('resolves the 4th-month rule ahead of the generic 15th rule', () => {
    expect(calculateDeadline('2026-12', 'Annually', '15th day of the 4th month following the close of the taxable year')).toBe('2027-04-15');
    expect(calculateDeadline('2026-12', 'Annually', '15th day of the following month')).toBe('2027-01-15');
  });

  it('parses an arbitrary day-of-month from an unrecognized rule', () => {
    expect(calculateDeadline('2026-04', 'Monthly', '20th day of the applicable month')).toBe('2026-04-20');
    expect(calculateDeadline('2026-04', 'Monthly', '20th day of the following month')).toBe('2026-05-20');
  });

  it('defaults to the 15th of the period when the rule is unparseable', () => {
    expect(calculateDeadline('2026-05', 'Monthly', 'upon demand')).toBe('2026-05-15');
    expect(calculateDeadline('2026-05', 'Monthly', '')).toBe('2026-05-15');
  });
});

describe('getComplianceDeadlineForPeriod', () => {
  it('is never due without a selected period', () => {
    expect(getComplianceDeadlineForPeriod(MONTHLY_1601C, '')).toEqual({ isDue: false, deadline: '', period: '' });
  });

  it('reports monthly forms as due for the preceding transaction month', () => {
    expect(getComplianceDeadlineForPeriod(MONTHLY_1601C, '2026-03')).toEqual({
      isDue: true,
      deadline: '2026-03-10',
      period: '2026-02',
    });
  });

  it('only reports 0619-E/F for the eight valid transaction months', () => {
    // Filing month 2026-03 covers transaction month February -> due
    expect(getComplianceDeadlineForPeriod(EXPANDED_0619E, '2026-03')).toEqual({
      isDue: true,
      deadline: '2026-03-10',
      period: '2026-02',
    });
    // Filing month 2026-04 covers transaction month March (quarter-end) -> not due
    expect(getComplianceDeadlineForPeriod(EXPANDED_0619E, '2026-04')).toEqual({
      isDue: false,
      deadline: '',
      period: '',
    });
  });

  it('crosses the year boundary for 0619-E', () => {
    // Filing month 2025-12 covers transaction month November 2025
    expect(getComplianceDeadlineForPeriod(EXPANDED_0619E, '2025-12')).toEqual({
      isDue: true,
      deadline: '2025-12-10',
      period: '2025-11',
    });
    // Filing month 2026-01 covers transaction month December (year-end) -> not due
    expect(getComplianceDeadlineForPeriod(EXPANDED_0619E, '2026-01')).toEqual({
      isDue: false,
      deadline: '',
      period: '',
    });
  });

  it('uses the statutory 1701Q quarterly schedule', () => {
    const ref: FormReference = { ...QUARTERLY_1601EQ, code: '1701Q' };
    expect(getComplianceDeadlineForPeriod(ref, '2026-05')).toEqual({ isDue: true, deadline: '2026-05-15', period: '2026-03' });
    // 2026-08-15 is a Saturday
    expect(getComplianceDeadlineForPeriod(ref, '2026-08')).toEqual({ isDue: true, deadline: '2026-08-17', period: '2026-06' });
    // 2026-11-15 is a Sunday
    expect(getComplianceDeadlineForPeriod(ref, '2026-11')).toEqual({ isDue: true, deadline: '2026-11-16', period: '2026-09' });
    expect(getComplianceDeadlineForPeriod(ref, '2026-02').isDue).toBe(false);
  });

  it('uses the statutory 1702Q quarterly schedule', () => {
    const ref: FormReference = { ...QUARTERLY_1601EQ, code: '1702Q' };
    // 2026-05-30 is a Saturday
    expect(getComplianceDeadlineForPeriod(ref, '2026-05')).toEqual({ isDue: true, deadline: '2026-06-01', period: '2026-03' });
    // 2026-08-29 is a Saturday
    expect(getComplianceDeadlineForPeriod(ref, '2026-08')).toEqual({ isDue: true, deadline: '2026-08-31', period: '2026-06' });
    // 2026-11-29 is a Sunday
    expect(getComplianceDeadlineForPeriod(ref, '2026-11')).toEqual({ isDue: true, deadline: '2026-11-30', period: '2026-09' });
    expect(getComplianceDeadlineForPeriod(ref, '2026-03').isDue).toBe(false);
  });

  it('matches quarterly forms to the quarter whose deadline lands in the period', () => {
    expect(getComplianceDeadlineForPeriod(QUARTERLY_1601EQ, '2026-04')).toEqual({
      isDue: true,
      deadline: '2026-04-30',
      period: '2026-03',
    });
    expect(getComplianceDeadlineForPeriod(QUARTERLY_1601EQ, '2026-05').isDue).toBe(false);
  });

  it('matches a quarterly form on the unadjusted deadline month when a weekend shift moved it', () => {
    // Q4 2025 deadline is 2026-01-31 (Saturday), shifted into February
    expect(getComplianceDeadlineForPeriod(QUARTERLY_1601EQ, '2026-01')).toEqual({
      isDue: true,
      deadline: '2026-02-02',
      period: '2025-12',
    });
  });

  it('matches annual forms to their filing month', () => {
    expect(getComplianceDeadlineForPeriod(ANNUAL_1701, '2026-04')).toEqual({
      isDue: true,
      deadline: '2026-04-15',
      period: '2025-12',
    });
    expect(getComplianceDeadlineForPeriod(ANNUAL_1701, '2026-07').isDue).toBe(false);
  });

  it('reports 1702-RT in April, not January', () => {
    const ref: FormReference = {
      code: '1702-RT',
      description: 'Annual Income Tax Return (Corporations)',
      frequency: 'Annually',
      deadlineRule: '15th day of the 4th month following the close of the taxable year',
    };
    expect(getComplianceDeadlineForPeriod(ref, '2027-04')).toEqual({
      isDue: true,
      deadline: '2027-04-15',
      period: '2026-12',
    });
    expect(getComplianceDeadlineForPeriod(ref, '2027-01').isDue).toBe(false);
  });

  it('matches semi-annual forms to their filing month', () => {
    const ref: FormReference = { ...QUARTERLY_1601EQ, code: 'SEMI', frequency: 'Semi-Annually' };
    expect(getComplianceDeadlineForPeriod(ref, '2026-07')).toEqual({
      isDue: true,
      deadline: '2026-07-31',
      period: '2026-06',
    });
    expect(getComplianceDeadlineForPeriod(ref, '2026-09').isDue).toBe(false);
  });

  it('falls back to the selected period for unrecognized frequencies', () => {
    const sameMonth: FormReference = { code: 'AD-HOC', description: 'Ad hoc', frequency: 'As needed', deadlineRule: '25th day of the applicable month' };
    expect(getComplianceDeadlineForPeriod(sameMonth, '2026-05')).toEqual({
      isDue: true,
      deadline: '2026-05-25',
      period: '2026-05',
    });

    const nextMonth: FormReference = { code: 'AD-HOC', description: 'Ad hoc', frequency: 'As needed', deadlineRule: '10th day of the following month' };
    expect(getComplianceDeadlineForPeriod(nextMonth, '2026-05')).toEqual({
      isDue: false,
      deadline: '2026-06-10',
      period: '2026-05',
    });
  });
});

describe('getEffectiveDeadline', () => {
  it('uses the reference schedule when the form is due in the period', () => {
    const form = makeForm({ code: '1601-C', period: '2026-02', deadline: '2026-03-10' });
    expect(getEffectiveDeadline(form, [MONTHLY_1601C], '2026-03')).toBe('2026-03-10');
  });

  it("derives the deadline from the form's own period when it is not due in the selected period", () => {
    const form = makeForm({ code: '1601-EQ', period: '2026-03' });
    expect(getEffectiveDeadline(form, [QUARTERLY_1601EQ], '2026-05')).toBe('2026-04-30');
  });

  it('derives the deadline from the selected period when the form has no period', () => {
    const form = makeForm({ code: '1601-EQ' });
    expect(getEffectiveDeadline(form, [QUARTERLY_1601EQ], '2026-05')).toBe('2026-06-30');
  });

  it('falls back to the stored deadline when the code has no reference', () => {
    const form = makeForm({ code: 'CUSTOM', deadline: '2026-01-10' });
    expect(getEffectiveDeadline(form, [], '2026-01')).toBe('2026-01-12');
  });

  it('falls back to today when there is neither a reference nor a deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T08:00:00Z'));
    expect(getEffectiveDeadline(makeForm({ code: 'CUSTOM' }), [], '2026-03')).toBe('2026-03-04');
    vi.useRealTimers();
  });
});

describe('isFormVisibleForPeriod', () => {
  it('uses the reference schedule when the form period matches the derived period', () => {
    const form = makeForm({ code: '1601-C', period: '2026-02' });
    expect(isFormVisibleForPeriod(form, '2026-03', [MONTHLY_1601C])).toBe(true);
  });

  it('hides a reference-backed form whose compliance is not due in the period', () => {
    const form = makeForm({ code: '0619-E', period: '2026-03' });
    expect(isFormVisibleForPeriod(form, '2026-04', [EXPANDED_0619E])).toBe(false);
  });

  it('shows a form recorded for another period when its own deadline lands in the period', () => {
    const form = makeForm({ code: '1601-C', period: '2026-01' });
    // The February deadline for the January transaction month is 2026-02-10
    expect(isFormVisibleForPeriod(form, '2026-02', [MONTHLY_1601C])).toBe(true);
    expect(isFormVisibleForPeriod(form, '2026-05', [MONTHLY_1601C])).toBe(false);
  });

  it('falls back to the stored deadline when no references are supplied', () => {
    const form = makeForm({ deadline: '2026-03-10' });
    expect(isFormVisibleForPeriod(form, '2026-03')).toBe(true);
    expect(isFormVisibleForPeriod(form, '2026-04')).toBe(false);
  });

  it('returns false when a form has no deadline and no matching reference', () => {
    expect(isFormVisibleForPeriod(makeForm({ code: 'CUSTOM' }), '2026-03', [MONTHLY_1601C])).toBe(false);
  });
});

describe('getFormsForClientAndPeriod', () => {
  it('returns every assigned form when no period is selected', () => {
    const forms = [makeForm({ id: 'a' }), makeForm({ id: 'b', code: '0619-E' })];
    const client = makeClient({ forms });
    expect(getFormsForClientAndPeriod(client, '', [MONTHLY_1601C, EXPANDED_0619E])).toBe(forms);
  });

  it('generates a pending placeholder for a due compliance with no recorded instance', () => {
    const client = makeClient({ forms: [makeForm({ id: 'a', assignedPeriod: '2026-01' })] });
    const result = getFormsForClientAndPeriod(client, '2026-03', [MONTHLY_1601C]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'client-1-1601-C-2026-02',
      code: '1601-C',
      description: MONTHLY_1601C.description,
      status: 'Pending',
      deadline: '2026-03-10',
      period: '2026-02',
      assignedPeriod: '2026-01',
    });
  });

  it('reuses a recorded instance for the derived period and refreshes its deadline', () => {
    const recorded = makeForm({
      id: 'recorded',
      status: 'Filed',
      period: '2026-02',
      assignedPeriod: '2026-01',
      deadline: '2026-03-09',
      dateFiled: '2026-03-01',
    });
    const client = makeClient({ forms: [recorded] });
    const result = getFormsForClientAndPeriod(client, '2026-03', [MONTHLY_1601C]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'recorded',
      status: 'Filed',
      dateFiled: '2026-03-01',
      deadline: '2026-03-10',
      period: '2026-02',
      assignedPeriod: '2026-01',
    });
  });

  it('does not surface a compliance in months preceding its assigned period', () => {
    const client = makeClient({ forms: [makeForm({ assignedPeriod: '2026-06' })] });
    expect(getFormsForClientAndPeriod(client, '2026-03', [MONTHLY_1601C])).toEqual([]);
  });

  it('skips compliances that are not due in the selected period', () => {
    const client = makeClient({ forms: [makeForm({ code: '0619-E', assignedPeriod: '2026-01' })] });
    expect(getFormsForClientAndPeriod(client, '2026-04', [EXPANDED_0619E])).toEqual([]);
  });

  it('keeps existing instances for codes that have no reference entry', () => {
    const visible = makeForm({ id: 'custom-visible', code: 'CUSTOM', assignedPeriod: '2026-01', deadline: '2026-03-20' });
    const hidden = makeForm({ id: 'custom-hidden', code: 'CUSTOM', assignedPeriod: '2026-01', deadline: '2026-09-20' });
    const client = makeClient({ forms: [visible, hidden] });
    const result = getFormsForClientAndPeriod(client, '2026-03', [MONTHLY_1601C]);
    expect(result.map(f => f.id)).toEqual(['custom-visible']);
  });

  it('deduplicates repeated codes and evaluates each code once', () => {
    const client = makeClient({
      forms: [
        makeForm({ id: 'jan', period: '2026-01', assignedPeriod: '2026-01' }),
        makeForm({ id: 'feb', period: '2026-02', assignedPeriod: '2026-01' }),
      ],
    });
    const result = getFormsForClientAndPeriod(client, '2026-03', [MONTHLY_1601C]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('feb');
  });
});

describe('getComplianceStatusInfo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flags pending forms past their deadline as overdue', () => {
    const info = getComplianceStatusInfo(makeForm({ status: 'Pending' }), '2026-03-09');
    expect(info.label).toBe('OVERDUE');
    expect(info.urgency).toBe('high');
  });

  it('flags forms due today', () => {
    const info = getComplianceStatusInfo(makeForm({ status: 'Processing' }), '2026-03-10');
    expect(info.label).toBe('Due Today');
    expect(info.urgency).toBe('high');
  });

  it('warns about forms due within a week and singularizes one day', () => {
    expect(getComplianceStatusInfo(makeForm(), '2026-03-11')).toMatchObject({
      label: 'Due in 1 day',
      urgency: 'medium',
    });
    expect(getComplianceStatusInfo(makeForm(), '2026-03-17')).toMatchObject({
      label: 'Due in 7 days',
      urgency: 'medium',
    });
  });

  it('treats deadlines beyond a week as low urgency', () => {
    expect(getComplianceStatusInfo(makeForm(), '2026-03-25')).toMatchObject({
      label: 'Due in 15 days',
      urgency: 'low',
    });
  });

  it('reports no-payable forms as on time or late based on the filing date', () => {
    const base = { status: 'Filed' as const, taxStatus: 'W/O Payable' as const };
    expect(getComplianceStatusInfo(makeForm({ ...base, dateFiled: '2026-03-05' }), '2026-03-10').label).toBe('BOTH ON TIME');
    expect(getComplianceStatusInfo(makeForm({ ...base, dateFiled: '2026-03-15' }), '2026-03-10').label).toBe('BOTH ON LATE');
  });

  it('defaults the filing date to today when it is missing', () => {
    const form = makeForm({ status: 'Filed', taxStatus: 'W/O Payable' });
    expect(getComplianceStatusInfo(form, '2026-03-10').label).toBe('BOTH ON TIME');
    expect(getComplianceStatusInfo(form, '2026-03-09').label).toBe('BOTH ON LATE');
  });

  it('distinguishes filed-but-unpaid forms with payables', () => {
    const base = { status: 'Filed' as const, taxStatus: 'With Payable' as const };
    expect(getComplianceStatusInfo(makeForm({ ...base, dateFiled: '2026-03-05' }), '2026-03-10')).toMatchObject({
      label: 'FILED ON TIME (UNPAID)',
      urgency: 'medium',
    });
    expect(getComplianceStatusInfo(makeForm({ ...base, dateFiled: '2026-03-20' }), '2026-03-10')).toMatchObject({
      label: 'FILED LATE (UNPAID)',
      urgency: 'high',
    });
  });

  it('covers the four filed/paid timeliness combinations', () => {
    const base = { status: 'Paid' as const, taxStatus: 'With Payable' as const };
    expect(getComplianceStatusInfo(makeForm({ ...base, dateFiled: '2026-03-05', datePaid: '2026-03-06' }), '2026-03-10').label).toBe('BOTH ON TIME');
    expect(getComplianceStatusInfo(makeForm({ ...base, dateFiled: '2026-03-05', datePaid: '2026-03-20' }), '2026-03-10').label).toBe('ON TIME BUT PAID LATE');
    expect(getComplianceStatusInfo(makeForm({ ...base, dateFiled: '2026-03-20', datePaid: '2026-03-21' }), '2026-03-10').label).toBe('BOTH ON LATE');
    expect(getComplianceStatusInfo(makeForm({ ...base, dateFiled: '2026-03-20', datePaid: '2026-03-05' }), '2026-03-10').label).toBe('FILED LATE BUT PAID ON TIME');
  });

  it('infers the payment date from the filing date for paid forms', () => {
    const form = makeForm({ status: 'Paid', taxStatus: 'With Payable', dateFiled: '2026-03-05' });
    expect(getComplianceStatusInfo(form, '2026-03-10').label).toBe('BOTH ON TIME');
  });
});
