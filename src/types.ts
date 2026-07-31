export type FormStatus = 'Pending' | 'Processing' | 'Filed' | 'Paid';

export type TaxPayerType = 'Individual' | 'Corporate';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface BIRForm {
  id: string;
  code: string;
  description: string;
  status: FormStatus;
  deadline?: string;
  period?: string;
  assignedPeriod?: string;
  dateFiled?: string;
  datePaid?: string;
  taxStatus?: 'With Payable' | 'W/O Payable';
}

export interface FormReference {
  code: string;
  description: string;
  frequency: string;
  deadlineRule: string;
}

export interface Client {
  id: string;
  name: string;
  tin: string;
  rdo: string;
  type: TaxPayerType;
  forms: BIRForm[];
}
