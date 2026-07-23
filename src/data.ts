import { Client, FormStatus, BIRForm, FormReference } from './types';
import { calculateDeadline } from './utils';

const generateTIN = () => {
  return `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-000`;
};

export const commonForms: FormReference[] = [
  { code: '1601-C', description: 'Monthly Remittance Return of Income Taxes Withheld on Compensation', frequency: 'Monthly', deadlineRule: '10th day of the following month' },
  { code: '0619-E', description: 'Monthly Remittance Form for Creditable Income Taxes Withheld (Expanded)', frequency: 'Monthly', deadlineRule: '10th day of the following month' },
  { code: '1601-EQ', description: 'Quarterly Remittance Return of Creditable Income Taxes Withheld', frequency: 'Quarterly', deadlineRule: 'Last day of the month following the close of the quarter' },
  { code: '2550Q', description: 'Quarterly Value-Added Tax Return', frequency: 'Quarterly', deadlineRule: '25th day of the month following the close of the quarter' },
  { code: '2551Q', description: 'Quarterly Percentage Tax Return', frequency: 'Quarterly', deadlineRule: '25th day of the month following the close of the quarter' },
  { code: '1701Q', description: 'Quarterly Income Tax Return (Individuals)', frequency: 'Quarterly', deadlineRule: '15th day of the month following the close of the quarter' },
  { code: '1702Q', description: 'Quarterly Income Tax Return (Corporations)', frequency: 'Quarterly', deadlineRule: '60 days following the close of the quarter' },
  { code: '1701', description: 'Annual Income Tax Return (Individuals)', frequency: 'Annually', deadlineRule: 'April 15 of the following year' },
  { code: '1702-RT', description: 'Annual Income Tax Return (Corporations)', frequency: 'Annually', deadlineRule: '15th day of the 4th month following the close of the taxable year' }
];

const getRelativeDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const getRandomForms = (isCorporate: boolean): BIRForm[] => {
  const forms: BIRForm[] = [];
  const statuses: FormStatus[] = ['Pending', 'Processing', 'Filed', 'Paid'];
  const today = new Date();
  
  // Create period strings for previous month (due in current month) and current month (due in next month)
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevPeriod = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // 1. Monthly forms for PREVIOUS period (Deadline falls in CURRENT month)
  forms.push({
    id: crypto.randomUUID(),
    code: '1601-C',
    description: 'Monthly Remittance Return of Income Taxes Withheld on Compensation',
    status: statuses[Math.floor(Math.random() * statuses.length)],
    deadline: calculateDeadline(prevPeriod, 'Monthly', '10th day of the following month'),
    period: prevPeriod,
  });

  forms.push({
    id: crypto.randomUUID(),
    code: '0619-E',
    description: 'Monthly Remittance Form for Creditable Income Taxes Withheld (Expanded)',
    status: statuses[Math.floor(Math.random() * statuses.length)],
    deadline: calculateDeadline(prevPeriod, 'Monthly', '10th day of the following month'),
    period: prevPeriod,
  });

  // 2. Monthly forms for CURRENT period (Deadline falls in NEXT month)
  forms.push({
    id: crypto.randomUUID(),
    code: '1601-C',
    description: 'Monthly Remittance Return of Income Taxes Withheld on Compensation',
    status: 'Pending',
    deadline: calculateDeadline(currentPeriod, 'Monthly', '10th day of the following month'),
    period: currentPeriod,
  });

  // 3. VAT or Non-VAT quarterly forms for previous quarter close (Deadline in current month)
  const isVat = Math.random() > 0.5;
  if (isVat) {
    forms.push({
      id: crypto.randomUUID(),
      code: '2550Q',
      description: 'Quarterly Value-Added Tax Return',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      deadline: calculateDeadline(prevPeriod, 'Quarterly', '25th day of the month following the close of the quarter'),
      period: prevPeriod,
    });
  } else {
    forms.push({
      id: crypto.randomUUID(),
      code: '2551Q',
      description: 'Quarterly Percentage Tax Return',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      deadline: calculateDeadline(prevPeriod, 'Quarterly', '25th day of the month following the close of the quarter'),
      period: prevPeriod,
    });
  }

  // 4. Income Tax
  if (isCorporate) {
    forms.push({
      id: crypto.randomUUID(),
      code: '1702Q',
      description: 'Quarterly Income Tax Return (Corporations)',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      deadline: calculateDeadline(prevPeriod, 'Quarterly', '60 days following the close of the quarter'),
      period: prevPeriod,
    });
  } else {
    forms.push({
      id: crypto.randomUUID(),
      code: '1701Q',
      description: 'Quarterly Income Tax Return (Individuals)',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      deadline: calculateDeadline(prevPeriod, 'Quarterly', '15th day of the month following the close of the quarter'),
      period: prevPeriod,
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
