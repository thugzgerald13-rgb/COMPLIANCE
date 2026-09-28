// ==============================================
// types.ts — FULL CORRECTED VERSION
// ==============================================

export type FormStatus = "pending" | "processing" | "filed" | "paid";

export type TaxPayerType = "Corporate" | "Individual";  // ✅ Added

export type UserRole = "admin" | "accountant" | "officer" | "client";

export interface CompanyInfo {
  company_name: string;
  tin?: string;  // ✅ Added
}

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
  company_name: string;  // ✅ was: name
  tin: string;
  rdo: string;
  type: TaxPayerType;
  status: string;
  created_at: string;
  updated_at: string;
  email?: string;    // ✅ Added
  phone?: string;    // ✅ Added
  address?: string;  // ✅ Added
  forms: BIRForm[];
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  accountType?: string;
  companyInfo?: CompanyInfo;
  clientDashboardMode?: boolean;
  tin?: string;
  clientId?: string;
  syncedAccountantEmail?: string;
  syncedAccountantName?: string;
  isSyncedWithAccountant?: boolean;
  // ✅ Removed 'name' — use companyInfo.company_name or email instead
}

export interface NotificationLog {
  id: string;
  clientId: string;
  formCode: string;
  deadline: string;
  timestamp: string;
  // ✅ Removed clientName — not in type
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
  // ✅ Removed clientEmail — not in type
}

// ✅ Added missing compliance types
export interface ComplianceClient {
  id: string;
  company_name: string;
  tin: string;
  rdo: string;
  type: TaxPayerType;
  status: string;
  created_at: string;
  updated_at: string;
  email?: string;
  phone?: string;
  address?: string;
  forms: ComplianceForm[];
}

export interface ComplianceForm {
  id: string;
  code: string;
  name: string;
  description: string;
  frequency: string;
  deadline: string;
  status: FormStatus;
  assignedPeriod: string;
  period: string;
  dateFiled?: string;
  datePaid?: string;
  amount?: number;
  referenceNo?: string;
  confirmationNo?: string;
}

export interface ComplianceAccountant {
  id: string;
  name: string;
  email: string;
  clients: string[];
}

export interface ComplianceMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

export interface ComplianceNotification {
  id: string;
  clientId: string;
  formCode: string;
  deadline: string;
  sentAt: string;
}

export interface ComplianceLog {
  id: string;
  clientId: string;
  formCode: string;
  action: string;
  timestamp: string;
}
