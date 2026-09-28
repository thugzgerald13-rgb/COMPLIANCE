export type FormStatus = "pending" | "processing" | "filed" | "paid";

export interface BIRForm {
  id: string;
  code: string;
  name: string;
  description: string;
  frequency: string;
  deadline: string;
  status: FormStatus;
  assignedPeriod: string;
  period: string;
  taxStatus?: string;
  dateFiled?: string;
  datePaid?: string;
  amount?: number;
  referenceNo?: string;
  confirmationNo?: string;
  notes?: string;
}

export interface FormReference {
  client_id: string;
  form_id: string;
  status: FormStatus;
  deadline: string;
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
}

export interface CompanyInfo {
  company_name: string;
}

export interface User {
  id: string;
  email: string;
  role: "admin" | "accountant" | "officer" | "client";
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
  clientId: string;
  formCode: string;
  deadline: string;
  timestamp: string;
}

export interface SelectedDashboardForm {
  id: string;
  code: string;
  name: string;
  description: string;
  status: FormStatus;
  deadline: string;
  period: string;
  assignedPeriod: string;
  taxStatus?: string;
  dateFiled?: string;
  datePaid?: string;
  amount?: number;
  referenceNo?: string;
  confirmationNo?: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}
