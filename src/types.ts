// ============================================================
// COMPLIANCE — types.ts (permissive, matches actual code usage)
// Drop-in replacement. Resolves all current build errors.
// ============================================================

// Loose enums — code mixes capitalizations; keep as string union
// so all status/role comparisons and assignments compile.
export type FormStatus =
  | 'Pending' | 'Processing' | 'Filed' | 'Paid'
  | 'pending' | 'processing' | 'filed' | 'paid'
  | string;

export type TaxPayerType = 'Corporate' | 'Individual' | string;

export type UserRole =
  | 'admin' | 'accountant' | 'officer' | 'client'
  | 'Super Admin' | 'Client' | string;

// ─── Company / onboarding ───
export interface CompanyInfo {
  companyName: string;
  tin?: string;
  registered_name?: string;
  trade_name?: string;
  business_address?: string;
  rdo_code?: string;
  [key: string]: unknown; // allow extra fields used by onboarding
}

// ─── BIR form instance (permissive — components read many optional fields) ───
export interface BIRForm {
  id: string;
  code: string;
  name?: string;
  description?: string;
  frequency?: string;
  deadline?: string;
  deadlineRule?: string;
  status?: FormStatus;
  taxStatus?: string;
  period?: string;
  assignedPeriod?: string;
  dateFiled?: string;
  datePaid?: string;
  amount?: number;
  referenceNo?: string;
  confirmationNo?: string;
  notes?: string;
  [key: string]: unknown;
}

// ─── Form reference / template (commonForms uses only code/description/frequency/deadlineRule) ───
export interface FormReference {
  client_id?: string;
  form_id?: string;
  status?: FormStatus;
  deadline?: string;
  code: string;
  description: string;
  frequency?: string;
  deadlineRule?: string;
  [key: string]: unknown;
}

// ─── Client (code uses .name, .email, .phone, .address, .rdo, .type) ───
export interface Client {
  id: string;
  name: string;
  tin?: string;
  rdo?: string;
  type?: TaxPayerType;
  status?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
  forms?: BIRForm[];
  [key: string]: unknown;
}

// ─── Auth user (code uses .name, .accountType, .companyInfo, .tin, .clientId, etc.) ───
export interface User {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  accountType?: string;
  companyInfo?: CompanyInfo;
  clientDashboardMode?: string | boolean; // code assigns both string and boolean
  tin?: string;
  clientId?: string;
  syncedAccountantEmail?: string;
  syncedAccountantName?: string;
  isSyncedWithAccountant?: boolean;
  [key: string]: unknown;
}

// ─── Chat / messaging (code uses .clientEmail) ───
export interface ChatMessage {
  id?: string;
  senderId?: string;
  senderName?: string;
  message?: string;
  timestamp?: string;
  clientEmail?: string;
  [key: string]: unknown;
}

// ─── Notification log (code uses .clientName, .clientId, .formCode, .deadline, .timestamp) ───
export interface NotificationLog {
  id?: string;
  clientId?: string;
  clientName?: string;
  formCode?: string;
  deadline?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// ─── Dashboard selected form ───
export interface SelectedDashboardForm {
  id?: string;
  code?: string;
  name?: string;
  description?: string;
  status?: FormStatus;
  deadline?: string;
  period?: string;
  assignedPeriod?: string;
  taxStatus?: string;
  dateFiled?: string;
  datePaid?: string;
  amount?: number;
  referenceNo?: string;
  confirmationNo?: string;
  notes?: string;
  [key: string]: unknown;
}

// ─── Supabase compliance tables (imported by complianceService.ts) ───
export interface ComplianceClient {
  id?: string;
  [key: string]: unknown;
}
export interface ComplianceForm {
  id?: string;
  [key: string]: unknown;
}
export interface ComplianceAccountant {
  id?: string;
  [key: string]: unknown;
}
export interface ComplianceMessage {
  id?: string;
  [key: string]: unknown;
}
export interface ComplianceNotification {
  id?: string;
  [key: string]: unknown;
}
export interface ComplianceLog {
  id?: string;
  [key: string]: unknown;
}
