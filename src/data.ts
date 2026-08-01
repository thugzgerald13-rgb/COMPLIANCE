import { Client, FormStatus, BIRForm, FormReference } from './types';
import { calculateDeadline } from './utils';

const generateTIN = () => {
  return `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-000`;
};

export const commonForms: FormReference[] = [
  { code: '1601-C', description: 'Monthly Remittance Return of Income Taxes Withheld on Compensation', frequency: 'Monthly', deadlineRule: '10th day of the following month' },
  { code: '0619-E', description: 'Monthly Remittance Form for Creditable Income Taxes Withheld (Expanded)', frequency: 'Only for January, February, April, May, July, August, October and November', deadlineRule: '10th day of the following month' },
  { code: '0619-F', description: 'Monthly Remittance Form for Final Income Taxes Withheld', frequency: 'Only for January, February, April, May, July, August, October and November', deadlineRule: '10th day of the following month' },
  { code: '1601-EQ', description: 'Quarterly Remittance Return of Creditable Income Taxes Withheld', frequency: 'Quarterly', deadlineRule: 'Last day of the month following the close of the quarter' },
  { code: '2550Q', description: 'Quarterly Value-Added Tax Return', frequency: 'Quarterly', deadlineRule: '25th day of the month following the close of the quarter' },
  { code: '2551Q', description: 'Quarterly Percentage Tax Return', frequency: 'Quarterly', deadlineRule: '25th day of the month following the close of the quarter' },
  { code: '1701Q', description: 'Quarterly Income Tax Return (Individuals)', frequency: 'Quarterly', deadlineRule: '15th day of the month following the close of the quarter' },
  { code: '1702Q', description: 'Quarterly Income Tax Return (Corporations)', frequency: 'Quarterly', deadlineRule: '60 days following the close of the quarter' },
  { code: '1701', description: 'Annual Income Tax Return (Individuals)', frequency: 'Annually', deadlineRule: 'April 15 of the following year' },
  { code: '1702-RT', description: 'Annual Income Tax Return (Corporations)', frequency: 'Annually', deadlineRule: '15th day of the 4th month following the close of the taxable year' },
  { code: '1604-C', description: 'Annual Information Return of Income Taxes Withheld on Compensation', frequency: 'Annually', deadlineRule: 'January 31 of the following year' },
  { code: '1604-E', description: 'Annual Information Return of Creditable Income Taxes Withheld (Expanded)', frequency: 'Annually', deadlineRule: 'March 1 of the following year' },
  { code: '1604-F', description: 'Annual Information Return of Income Payments Subjected to Final Withholding Taxes', frequency: 'Annually', deadlineRule: 'January 31 of the following year' },
  { code: 'SSS', description: 'SSS Monthly Contributions & Loan Remittances', frequency: 'Monthly', deadlineRule: 'Last day of the month following the applicable month' },
  { code: 'Pag-IBIG/HDMF', description: 'Pag-IBIG/HDMF Monthly Remittance (Contributions & Loans)', frequency: 'Monthly', deadlineRule: '15th day of the following month' },
  { code: 'PhilHealth', description: 'PhilHealth Monthly Premium Remittance', frequency: 'Monthly', deadlineRule: '15th day of the following month' },
  { code: 'Inventory List', description: 'Annual BIR Inventory List and Schedules', frequency: 'Annually', deadlineRule: 'January 30 of the following year' },
  { code: 'Business Permit', description: 'Annual LGU Business & Mayor\'s Permit Renewal', frequency: 'Annually', deadlineRule: 'January 20 of each year' }
];

const getRelativeDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const getRandomForms = (isCorporate: boolean): BIRForm[] => {
  const forms: BIRForm[] = [];
  const statuses: FormStatus[] = ['Pending', 'Processing', 'Filed', 'Paid'];

  forms.push({
    id: crypto.randomUUID(),
    code: '1601-C',
    description: 'Monthly Remittance Return of Income Taxes Withheld on Compensation',
    status: statuses[Math.floor(Math.random() * statuses.length)],
    assignedPeriod: '2026-01',
  });

  forms.push({
    id: crypto.randomUUID(),
    code: '0619-E',
    description: 'Monthly Remittance Form for Creditable Income Taxes Withheld (Expanded)',
    status: statuses[Math.floor(Math.random() * statuses.length)],
    assignedPeriod: '2026-01',
  });

  const isVat = Math.random() > 0.5;
  if (isVat) {
    forms.push({
      id: crypto.randomUUID(),
      code: '2550Q',
      description: 'Quarterly Value-Added Tax Return',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      assignedPeriod: '2026-01',
    });
  } else {
    forms.push({
      id: crypto.randomUUID(),
      code: '2551Q',
      description: 'Quarterly Percentage Tax Return',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      assignedPeriod: '2026-01',
    });
  }

  if (isCorporate) {
    forms.push({
      id: crypto.randomUUID(),
      code: '1702Q',
      description: 'Quarterly Income Tax Return (Corporations)',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      assignedPeriod: '2026-01',
    });
    forms.push({
      id: crypto.randomUUID(),
      code: '1702-RT',
      description: 'Annual Income Tax Return (Corporations)',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      assignedPeriod: '2026-01',
    });
  } else {
    forms.push({
      id: crypto.randomUUID(),
      code: '1701Q',
      description: 'Quarterly Income Tax Return (Individuals)',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      assignedPeriod: '2026-01',
    });
    forms.push({
      id: crypto.randomUUID(),
      code: '1701',
      description: 'Annual Income Tax Return (Individuals)',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      assignedPeriod: '2026-01',
    });
  }

  return forms;
};

const clientNames = [
  "Acme Corporation", "TechNova Solutions", "Global Industries", "Starlight Enterprises",
  "Blue Ocean Trading", "Nexus Dynamics", "Quantum Systems Inc.", "Prime Logistics",
  "Apex Holdings", "Vertex Consulting", "Juan Dela Cruz", "Maria Clara",
  "Jose Rizal", "Andres Bonifacio", "Emilio Aguinaldo", "Apolinario Mabini",
  "Gabriela Silang", "Melchora Aquino", "Marcelo H. del Pilar", "Antonio Luna"
];

export const generateInitialClients = (): Client[] => {
  return clientNames.map((name, index) => {
    const isCorporate = index < 10;
    return {
      id: crypto.randomUUID(),
      name,
      tin: generateTIN(),
      rdo: String(Math.floor(20 + Math.random() * 80)).padStart(3, '0'),
      type: isCorporate ? 'Corporate' : 'Individual',
      forms: getRandomForms(isCorporate),
    };
  });
};
