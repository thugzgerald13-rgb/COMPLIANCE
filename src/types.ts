// src/types.ts

export type FormStatus = "pending" | "processing" | "filed" | "paid";

export interface BIRForm {
  id: string;
  code: string;
  name: string;
  description: string;
  frequency: string;
  deadline: string;
  
  // ↓ ADD ALL MISSING PROPERTIES ↓
  status?: FormStatus;
  taxStatus?: string;
  dateFiled?: string;
  datePaid?: string;
  amount?: number;
  referenceNo?: string;
  confirmationNo?: string;
  notes?: string;
  period?: string;
  assignedPeriod?: string;
}

export interface FormReference {
  client_id: string;
  form_id: string;
  status: FormStatus;
  deadline: string;
  
  // ↓ ADD MISSING PROPERTIES ↓
  code: string;
  description: string;
  frequency: string;
  deadlineRule?: string;
}

export interface Client {
  id: string;
  company_name: string;
  tin: string;
  rdo: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  forms: BIRForm[];
  
  // ↓ ADD ALIAS FOR EASIER ACCESS ↓
  get name(): string;  // or just add `name: string`
}

export interface CompanyInfo {
  company_name: string;
  // Add alias
  companyName?: string;
}

export interface User {
  id: string;
  email: string;
  role: "admin" | "accountant" | "officer" | "client";
  
  // ↓ ADD MISSING PROPERTIES ↓
  accountType?: string;
  companyInfo?: CompanyInfo;
  clientDashboardMode?: boolean;
  tin?: string;
  clientId?: string;
  syncedAccountantEmail?: string;
  syncedAccountantName?: string;
  isSyncedWithAccountant?: boolean;
}

export interface NotificationLog {
  id: string;
  // ↓ ADD MISSING ↓
  clientId: string;
  formCode: string;
  deadline: string;
  timestamp: string;
}
