import { useState, useEffect } from 'react';
import { Client, FormStatus, FormReference, BIRForm } from './types';
import { commonForms } from './data';
import { useAuth } from './context/AuthContext';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const FORMS_STORAGE_KEY = 'bir_monitor_forms_v2';

function recordOfflineAction(type: 'UPDATE_FORM' | 'ADD_CLIENT' | 'DELETE_CLIENT' | 'ADD_FORM_TO_CLIENT' | 'REMOVE_FORM' | 'UPDATE_PAYABLE', description: string, payload: any) {
  try {
    const QUEUE_KEY = 'bizcomply_offline_sync_queue_v1';
    const stored = localStorage.getItem(QUEUE_KEY);
    const queue = stored ? JSON.parse(stored) : [];
    const newAction = {
      id: crypto.randomUUID(),
      type,
      description,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      payload
    };
    queue.unshift(newAction);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event('bizcomply_offline_queue_updated'));
  } catch (e) {
    console.warn('Failed to record offline action:', e);
  }
}

export function useFormReferences() {
  const { user } = useAuth();
  const [forms, setForms] = useState<FormReference[]>(commonForms);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const userFormsKey = user ? `bir_monitor_forms_u_${user.id}` : FORMS_STORAGE_KEY;
    const stored = localStorage.getItem(userFormsKey) || localStorage.getItem(FORMS_STORAGE_KEY);
    
    if (stored) {
      try {
        const parsed: FormReference[] = JSON.parse(stored);
        const existingCodes = new Set(parsed.map(f => f.code));
        const missingCommon = commonForms.filter(f => !existingCodes.has(f.code));
        const merged = missingCommon.length > 0 ? [...parsed, ...missingCommon] : parsed;
        setForms(merged);
        if (missingCommon.length > 0) {
          localStorage.setItem(userFormsKey, JSON.stringify(merged));
        }
      } catch (e) {
        setForms(commonForms);
      }
    } else {
      setForms(commonForms);
    }

    // Sync from Central Storage Server
    const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}&userId=${encodeURIComponent(user.id)}` : '';
    fetch(`/api/forms${emailParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.forms) && data.forms.length > 0 && isMounted) {
          const remoteForms: FormReference[] = data.forms;
          const existingCodes = new Set(remoteForms.map(f => f.code));
          const missingCommon = commonForms.filter(f => !existingCodes.has(f.code));
          const merged = missingCommon.length > 0 ? [...remoteForms, ...missingCommon] : remoteForms;
          setForms(merged);
          localStorage.setItem(userFormsKey, JSON.stringify(merged));
        }
      })
      .catch(() => {});

    if (supabase && isSupabaseConfigured && user) {
      supabase.auth.getUser().then(({ data: { user: supabaseUser } }) => {
        if (supabaseUser?.user_metadata?.custom_forms && isMounted) {
          const remoteForms: FormReference[] = supabaseUser.user_metadata.custom_forms;
          const existingCodes = new Set(remoteForms.map(f => f.code));
          const missingCommon = commonForms.filter(f => !existingCodes.has(f.code));
          const merged = missingCommon.length > 0 ? [...remoteForms, ...missingCommon] : remoteForms;
          setForms(merged);
          localStorage.setItem(userFormsKey, JSON.stringify(merged));
        }
      }).catch(() => {});
    }

    setIsLoaded(true);

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const saveForms = async (updatedForms: FormReference[]) => {
    setForms(updatedForms);
    const userFormsKey = user ? `bir_monitor_forms_u_${user.id}` : FORMS_STORAGE_KEY;
    localStorage.setItem(userFormsKey, JSON.stringify(updatedForms));

    // Sync to Central Storage Server
    try {
      await fetch('/api/forms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forms: updatedForms, userEmail: user?.email, userId: user?.id }),
      });
    } catch (e) {}

    if (supabase && isSupabaseConfigured && user) {
      try {
        // Sync to Supabase Storage bucket
        const blob = new Blob([JSON.stringify(updatedForms, null, 2)], { type: 'application/json' });
        await supabase.storage
          .from('bizcomply-data')
          .upload(`users/${user.id}/forms.json`, blob, { upsert: true, contentType: 'application/json' })
          .catch(() => {});

        // Centralized metadata sync
        await supabase.auth.updateUser({
          data: { custom_forms: updatedForms }
        });
      } catch (e) {
        console.warn('Could not sync forms reference to Supabase:', e);
      }
    }
  };

  const addFormReference = (formRef: FormReference) => {
    const updatedForms = [...forms, formRef];
    saveForms(updatedForms);
  };

  const deleteFormReference = (code: string) => {
    const updatedForms = forms.filter(f => f.code !== code);
    saveForms(updatedForms);
  };

  const updateFormReference = (updatedFormRef: FormReference) => {
    const updatedForms = forms.map(f => f.code === updatedFormRef.code ? updatedFormRef : f);
    saveForms(updatedForms);
  };

  return { forms, isLoaded, addFormReference, deleteFormReference, updateFormReference };
}

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const userKey = user ? `bir_monitor_clients_u_${user.id}` : 'bir_monitor_clients_guest';

  useEffect(() => {
    if (!user) {
      setClients([]);
      setIsLoaded(true);
      return;
    }

    let isMounted = true;

    async function loadClientData() {
      // 1. Load local cache first for immediate rendering
      const stored = localStorage.getItem(userKey);
      let localClients: Client[] = [];
      if (stored) {
        try {
          localClients = JSON.parse(stored);
        } catch (e) {
          localClients = [];
        }
      }

      if (isMounted) {
        setClients(localClients);
      }

      // 2. Sync from Central Storage Server
      try {
        const userEmail = user?.email || '';
        const userTin = user?.companyInfo?.tin || user?.tin || '';
        const userName = user?.companyInfo?.companyName || user?.name || '';
        const userClientId = user?.clientId || user?.id || '';

        const params = new URLSearchParams();
        if (userEmail) params.append('email', userEmail);
        if (user?.id) params.append('userId', user.id);
        if (userTin) params.append('tin', userTin);
        if (userName) params.append('name', userName);
        if (userClientId) params.append('clientId', userClientId);

        const res = await fetch(`/api/clients?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.clients) && data.clients.length > 0) {
            if (isMounted) {
              setClients(data.clients);
              localStorage.setItem(userKey, JSON.stringify(data.clients));
            }
          }
        }
      } catch (e) {}

      // 3. Sync from Supabase Cloud Storage/Database if configured
      if (supabase && isSupabaseConfigured && user) {
        try {
          // Attempt 1: Fetch from Supabase Storage Bucket 'bizcomply-data'
          const { data: storageFile, error: storageErr } = await supabase.storage
            .from('bizcomply-data')
            .download(`users/${user.id}/clients.json`);

          if (storageFile && !storageErr) {
            const text = await storageFile.text();
            const remoteClients = JSON.parse(text);
            if (Array.isArray(remoteClients) && isMounted) {
              setClients(remoteClients);
              localStorage.setItem(userKey, JSON.stringify(remoteClients));
              setIsLoaded(true);
              return;
            }
          }

          // Attempt 2: Check Supabase User Metadata cloud storage
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          if (supabaseUser?.user_metadata?.clients && Array.isArray(supabaseUser.user_metadata.clients)) {
            const remoteClients = supabaseUser.user_metadata.clients as Client[];
            if (isMounted) {
              setClients(remoteClients);
              localStorage.setItem(userKey, JSON.stringify(remoteClients));
            }
          } else {
            // Attempt 3: Fetch from Supabase database table 'user_clients'
            const { data } = await supabase
              .from('user_clients')
              .select('clients_data')
              .eq('user_id', user.id)
              .maybeSingle();

            if (data?.clients_data && Array.isArray(data.clients_data) && isMounted) {
              setClients(data.clients_data);
              localStorage.setItem(userKey, JSON.stringify(data.clients_data));
            }
          }
        } catch (err) {
          console.warn('Supabase client data sync warning:', err);
        }
      }

      if (isMounted) {
        setIsLoaded(true);
      }
    }

    loadClientData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, userKey]);

  const saveClients = async (updated: Client[]) => {
    setClients(updated);
    if (userKey) {
      localStorage.setItem(userKey, JSON.stringify(updated));
    }

    // Sync to Central Storage Server
    try {
      await fetch('/api/clients/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: updated, userEmail: user?.email, userId: user?.id }),
      });
    } catch (e) {}

    // Sync to Supabase centralized cloud storage & database if Supabase is connected
    if (supabase && isSupabaseConfigured && user) {
      try {
        // 1. Save to Supabase Storage Bucket 'bizcomply-data'
        const jsonContent = JSON.stringify(updated, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        await supabase.storage
          .from('bizcomply-data')
          .upload(`users/${user.id}/clients.json`, blob, { upsert: true, contentType: 'application/json' })
          .catch(() => {});

        // 2. Centralized sync to Supabase user metadata (accessible on any device/login)
        await supabase.auth.updateUser({
          data: { clients: updated }
        });

        // 3. Save to Supabase 'user_clients' table if provisioned
        try {
          await supabase
            .from('user_clients')
            .upsert(
              { user_id: user.id, clients_data: updated, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            );
        } catch (dbErr) {
          // Table might not exist yet, metadata/storage sync serves as fallback
        }
      } catch (e) {
        console.warn('Could not sync clients to Supabase:', e);
      }
    }
  };

  const updateForm = (
    clientId: string, 
    formId: string, 
    updates: Partial<BIRForm>, 
    formMeta?: { code: string; description: string; deadline: string; period: string; assignedPeriod?: string }
  ) => {
    let clientName = 'Client';
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        clientName = client.name;
        const existingIndex = client.forms.findIndex(f => 
          f.id === formId || (formMeta && f.code === formMeta.code && f.period === formMeta.period)
        );

        if (existingIndex >= 0) {
          const newForms = [...client.forms];
          newForms[existingIndex] = { ...newForms[existingIndex], ...updates };
          return { ...client, forms: newForms };
        } else if (formMeta) {
          const codeExisting = client.forms.find(f => f.code === formMeta.code);
          const assignedPeriod = codeExisting?.assignedPeriod || formMeta.assignedPeriod || formMeta.period || '2026-01';
          const newForm: BIRForm = {
            id: formId,
            code: formMeta.code,
            description: formMeta.description,
            status: 'Pending',
            deadline: formMeta.deadline,
            period: formMeta.period,
            assignedPeriod,
            ...updates,
          };
          return { ...client, forms: [...client.forms, newForm] };
        }
      }
      return client;
    });
    
    if (!navigator.onLine || localStorage.getItem('bizcomply_offline_sync_queue_v1')) {
      const formCode = formMeta?.code || 'BIR Form';
      const statusText = updates.status ? `status to ${updates.status}` : 'details';
      recordOfflineAction('UPDATE_FORM', `Updated ${formCode} ${statusText} for ${clientName}`, { clientId, formId, updates });
    }

    saveClients(updatedClients);
  };

  const addClient = (client: Client) => {
    const updatedClients = [client, ...clients];
    if (!navigator.onLine || localStorage.getItem('bizcomply_offline_sync_queue_v1')) {
      recordOfflineAction('ADD_CLIENT', `Added new client entity ${client.name} (TIN: ${client.tin})`, client);
    }
    saveClients(updatedClients);
  };

  const deleteClient = (clientId: string) => {
    const target = clients.find(c => c.id === clientId);
    const updatedClients = clients.filter(c => c.id !== clientId);
    if (!navigator.onLine || localStorage.getItem('bizcomply_offline_sync_queue_v1')) {
      recordOfflineAction('DELETE_CLIENT', `Removed client entity ${target?.name || clientId}`, { clientId });
    }
    saveClients(updatedClients);
  };

  const clearAllClients = () => {
    saveClients([]);
  };

  const addFormToClient = (
    clientId: string, 
    formRef: FormReference, 
    deadline?: string, 
    period?: string,
    assignedPeriod?: string
  ) => {
    const defaultDeadline = deadline || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    const targetAssignedPeriod = assignedPeriod || period || '2026-01';
    const newForm: BIRForm = {
      id: crypto.randomUUID(),
      code: formRef.code,
      description: formRef.description,
      status: 'Pending',
      deadline: defaultDeadline,
      period: period,
      assignedPeriod: targetAssignedPeriod,
    };
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        const isDuplicate = client.forms.some(f => f.code === formRef.code);
        if (isDuplicate) {
          return client;
        }
        return {
          ...client,
          forms: [...client.forms, newForm]
        };
      }
      return client;
    });
    saveClients(updatedClients);
  };

  const removeFormFromClient = (clientId: string, formId: string, formCode?: string) => {
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        const targetForm = client.forms.find(f => f.id === formId);
        let targetCode = formCode || targetForm?.code;

        if (!targetCode && formId.includes('-')) {
          if (formId.startsWith(`${clientId}-`)) {
            const remainder = formId.substring(clientId.length + 1);
            const existingCodes = client.forms.map(f => f.code);
            const matchedCode = existingCodes.find(c => remainder.startsWith(`${c}-`));
            if (matchedCode) {
              targetCode = matchedCode;
            } else {
              const periodMatch = remainder.match(/(.+)-\d{4}-\d{2}$/);
              if (periodMatch) {
                targetCode = periodMatch[1];
              }
            }
          }
        }

        return {
          ...client,
          forms: client.forms.filter(f => f.id !== formId && (targetCode ? f.code !== targetCode : true))
        };
      }
      return client;
    });
    saveClients(updatedClients);
  };

  return { clients, isLoaded, updateForm, addClient, deleteClient, clearAllClients, addFormToClient, removeFormFromClient };
}

