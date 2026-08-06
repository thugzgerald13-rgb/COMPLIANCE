export type FormStatus = 'Pending' | 'Processing' | 'Filed' | 'Paid';

export type TaxPayerType = 'Individual' | 'Corporate';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_id?: string;
  clientId?: string;
  tin?: string;
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
  amount?: number;
  referenceNo?: string;
  confirmationNo?: string;
  notes?: string;
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
  email?: string;
  phone?: string;
  notifyEmail?: boolean;
  notifyPhone?: boolean;
  forms: BIRForm[];
  organization_id?: string;
}

export interface NotificationLog {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  formCode: string;
  formDescription: string;
  deadline: string;
  type: 'Web Push';
  status: 'Sent' | 'Delivered' | 'Failed';
  timestamp: string;
  message: string;
  isOverdue?: boolean;
}
