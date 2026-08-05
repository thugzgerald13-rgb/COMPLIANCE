import { describe, expect, it } from 'vitest';
import { commonForms, generateInitialClients, getRandomForms } from './data';
import { calculateDeadline } from './utils';

describe('commonForms', () => {
  it('has a unique, fully populated entry per compliance code', () => {
    const codes = commonForms.map(f => f.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const form of commonForms) {
      expect(form.description.length).toBeGreaterThan(0);
      expect(form.frequency.length).toBeGreaterThan(0);
      expect(form.deadlineRule.length).toBeGreaterThan(0);
    }
  });

  it('produces a resolvable deadline for every reference', () => {
    for (const form of commonForms) {
      expect(calculateDeadline('2026-03', form.frequency, form.deadlineRule)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('includes the statutory BIR and statutory-agency compliances', () => {
    const codes = commonForms.map(f => f.code);
    expect(codes).toContain('1601-C');
    expect(codes).toContain('2550Q');
    expect(codes).toContain('1701');
    expect(codes).toContain('1702-RT');
    expect(codes).toContain('SSS');
    expect(codes).toContain('PhilHealth');
  });
});

describe('getRandomForms', () => {
  it('assigns the corporate income tax returns to corporate clients', () => {
    const codes = getRandomForms(true).map(f => f.code);
    expect(codes).toContain('1702Q');
    expect(codes).toContain('1702-RT');
    expect(codes).not.toContain('1701Q');
    expect(codes).not.toContain('1701');
  });

  it('assigns the individual income tax returns to individual clients', () => {
    const codes = getRandomForms(false).map(f => f.code);
    expect(codes).toContain('1701Q');
    expect(codes).toContain('1701');
    expect(codes).not.toContain('1702Q');
    expect(codes).not.toContain('1702-RT');
  });

  it('always includes the monthly withholding compliances and exactly one business tax return', () => {
    for (const isCorporate of [true, false]) {
      const forms = getRandomForms(isCorporate);
      const codes = forms.map(f => f.code);
      expect(codes).toContain('1601-C');
      expect(codes).toContain('0619-E');
      expect(codes.filter(c => c === '2550Q' || c === '2551Q')).toHaveLength(1);
      expect(forms).toHaveLength(5);
    }
  });

  it('produces unique ids, known statuses and a January 2026 assigned period', () => {
    const forms = getRandomForms(true);
    expect(new Set(forms.map(f => f.id)).size).toBe(forms.length);
    for (const form of forms) {
      expect(['Pending', 'Processing', 'Filed', 'Paid']).toContain(form.status);
      expect(form.assignedPeriod).toBe('2026-01');
      expect(form.description.length).toBeGreaterThan(0);
    }
  });

  it('only references codes that exist in commonForms', () => {
    const known = new Set(commonForms.map(f => f.code));
    for (const isCorporate of [true, false]) {
      for (const form of getRandomForms(isCorporate)) {
        expect(known).toContain(form.code);
      }
    }
  });
});

describe('generateInitialClients', () => {
  it('generates 20 clients: the first 10 corporate, the rest individual', () => {
    const clients = generateInitialClients();
    expect(clients).toHaveLength(20);
    expect(clients.slice(0, 10).every(c => c.type === 'Corporate')).toBe(true);
    expect(clients.slice(10).every(c => c.type === 'Individual')).toBe(true);
  });

  it('generates unique ids and formatted TIN and RDO values', () => {
    const clients = generateInitialClients();
    expect(new Set(clients.map(c => c.id)).size).toBe(clients.length);
    for (const client of clients) {
      expect(client.name.length).toBeGreaterThan(0);
      expect(client.tin).toMatch(/^\d{3}-\d{3}-\d{3}-00000$/);
      expect(client.rdo).toMatch(/^\d{3}$/);
      expect(Number(client.rdo)).toBeGreaterThanOrEqual(20);
      expect(Number(client.rdo)).toBeLessThan(100);
    }
  });

  it('gives each client a form set matching its taxpayer type', () => {
    const clients = generateInitialClients();
    for (const client of clients) {
      const codes = client.forms.map(f => f.code);
      expect(client.forms).toHaveLength(5);
      if (client.type === 'Corporate') {
        expect(codes).toContain('1702Q');
      } else {
        expect(codes).toContain('1701Q');
      }
    }
  });
});
