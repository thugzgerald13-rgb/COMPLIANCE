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
