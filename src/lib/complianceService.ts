import { supabase } from './supabase'
import type {
  ComplianceClient, ComplianceForm, ComplianceAccountant,
  ComplianceMessage, ComplianceNotification, ComplianceLog
} from '../types'

// ─── Clients ───
export const getClients = async () => {
  const { data, error } = await supabase
    .from('compliance_clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as ComplianceClient[]
}

export const createClient = async (client: Partial<ComplianceClient>) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('compliance_clients')
    .insert({ ...client, created_by: user?.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateClient = async (id: string, updates: Partial<ComplianceClient>) => {
  const { data, error } = await supabase
    .from('compliance_clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteClient = async (id: string) => {
  const { error } = await supabase
    .from('compliance_clients')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Forms ───
export const getForms = async (clientId?: string) => {
  let query = supabase
    .from('compliance_forms')
    .select('*, client:client_id(name)')
    .order('due_date', { ascending: true, nullsFirst: false })
  if (clientId) query = query.eq('client_id', clientId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const createForm = async (form: Partial<ComplianceForm>) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('compliance_forms')
    .insert({ ...form, created_by: user?.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateForm = async (id: string, updates: Partial<ComplianceForm>) => {
  const { data, error } = await supabase
    .from('compliance_forms')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const submitForm = async (id: string) => {
  const { data, error } = await supabase
    .from('compliance_forms')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Accountants / Officers ───
export const getAccountants = async () => {
  const { data, error } = await supabase
    .from('compliance_accountants')
    .select('*')
    .eq('is_active', true)
  if (error) throw error
  return data as ComplianceAccountant[]
}

export const createAccountant = async (acc: Partial<ComplianceAccountant>) => {
  const { data, error } = await supabase
    .from('compliance_accountants')
    .insert(acc)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Messages ───
export const getMessages = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('compliance_messages')
    .select('*, sender:sender_id(email), recipient:recipient_id(email)')
    .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const sendMessage = async (msg: Partial<ComplianceMessage>) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('compliance_messages')
    .insert({ ...msg, sender_id: user?.id })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Notifications ───
export const getNotifications = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('compliance_notifications')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as ComplianceNotification[]
}

export const markNotificationRead = async (id: string) => {
  const { error } = await supabase
    .from('compliance_notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw error
}

export const createNotification = async (userId: string, title: string, message?: string, link?: string) => {
  const { error } = await supabase
    .from('compliance_notifications')
    .insert({ user_id: userId, title, message, link })
  if (error) throw error
}

// ─── Activity Logs ───
export const createLog = async (action: string, entityType?: string, entityId?: string, details?: Record<string, unknown>) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('compliance_logs')
    .insert({
      user_id: user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    })
  if (error) throw error
}
