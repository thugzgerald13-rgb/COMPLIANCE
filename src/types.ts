// ==========================================
// COMPLIANCE PORTAL — Full Type Definitions
// Original app types + Supabase tables combined
// ==========================================

// ─── Original App Types (required by all components) ───

export type User = {
  id: string
  email: string
  name?: string
  role: 'admin' | 'accountant' | 'officer' | 'client'
  created_at?: string
}

export type CompanyInfo = {
  id?: string
  registered_name: string
  trade_name?: string
  tin: string
  business_address: string
  email?: string
  phone?: string
  rdo_code?: string
  taxpayer_type: TaxPayerType
  fiscal_year_end?: string
  created_at?: string
}

export type TaxPayerType =
  | 'individual'
  | 'corporation'
  | 'partnership'
  | 'estate'
  | 'trust'

export type FormStatus = 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected' | 'overdue'

export type BIRForm = {
  id: string
  code: string
  name: string
  description: string
  frequency: 'monthly' | 'quarterly' | 'annually' | 'once'
  deadline_schedule: string
  category: string
  is_active: boolean
}

export type FormReference = {
  id: string
  client_id: string
  form_id: string
  status: FormStatus
  period_start?: string
  period_end?: string
  deadline: string
  date_filed?: string
  date_paid?: string
  amount?: number
  reference_no?: string
  confirmation_no?: string
  notes?: string
  created_at: string
  updated_at: string
  // joined fields
  form?: BIRForm
}

export type Client = {
  id: string
  company_name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  tin?: string
  rdo_code?: string
  taxpayer_type?: TaxPayerType
  status: 'active' | 'inactive' | 'archived'
  accountant_id?: string
  officer_id?: string
  created_at: string
  updated_at: string
  // joined
  forms?: FormReference[]
}

export type ChatMessage = {
  id: string
  sender_id: string
  recipient_id?: string
  client_id?: string
  subject?: string
  body: string
  is_read: boolean
  created_at: string
  // expanded
  sender?: { email: string; name?: string }
  recipient?: { email: string; name?: string }
}

export type NotificationLog = {
  id: string
  user_id: string
  title: string
  message?: string
  link?: string
  is_read: boolean
  created_at: string
}

export type SelectedDashboardForm = {
  id: string
  code: string
  description: string
  status: FormStatus
  deadline: string
  period?: string
  assignedPeriod?: string
  taxStatus?: string
  dateFiled?: string
  datePaid?: string
  amount?: number
  referenceNo?: string
  confirmationNo?: string
  notes?: string
}

// ─── Supabase Compliance Tables (new) ───

export interface ComplianceClient {
  id: string
  created_by: string
  name: string
  email?: string
  phone?: string
  address?: string
  tin?: string
  business_type?: string
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
}

export interface ComplianceForm {
  id: string
  created_by: string
  client_id?: string
  form_type: string
  form_name: string
  status: 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected'
  period_start?: string
  period_end?: string
  submitted_at?: string
  due_date?: string
  data: Record<string, unknown>
  notes?: string
  created_at: string
  updated_at: string
}

export interface ComplianceAccountant {
  id: string
  user_id: string
  full_name: string
  license_number?: string
  role: 'accountant' | 'officer' | 'admin'
  is_active: boolean
  created_at: string
}

export interface ComplianceMessage {
  id: string
  sender_id: string
  recipient_id?: string
  client_id?: string
  subject?: string
  body: string
  is_read: boolean
  created_at: string
}

export interface ComplianceNotification {
  id: string
  user_id: string
  title: string
  message?: string
  link?: string
  is_read: boolean
  created_at: string
}

export interface ComplianceLog {
  id: string
  user_id?: string
  action: string
  entity_type?: string
  entity_id?: string
  details?: Record<string, unknown>
  created_at: string
}
