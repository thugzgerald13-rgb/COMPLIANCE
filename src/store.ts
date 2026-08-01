import { useState, useEffect } from 'react';
import { Client, FormStatus, FormReference, BIRForm } from './types';
import { commonForms } from './data';
import { useAuth } from './context/AuthContext';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const FORMS_STORAGE_KEY = 'bir_monitor_forms_v2';

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

    if (supabase && isSupabaseConfigured && user) {
      supabase.auth.getUser().then(({ data: { user: supabaseUser } }) => {
        if (supabaseUser?.user_metadata?.custom_forms && isMounted) {
          const remoteForms = supabaseUser.user_metadata.custom_forms;
          setForms(remoteForms);
          localStorage.setItem(userFormsKey, JSON.stringify(remoteForms));
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

      // 2. Sync from Supabase Cloud Storage/Database if configured
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
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
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
    
    saveClients(updatedClients);
  };

  const addClient = (client: Client) => {
    const updatedClients = [client, ...clients];
    saveClients(updatedClients);
  };

  const deleteClient = (clientId: string) => {
    const updatedClients = clients.filter(c => c.id !== clientId);
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

  const removeFormFromClient = (clientId: string, formId: string) => {
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        const targetForm = client.forms.find(f => f.id === formId);
        let targetCode = targetForm?.code;
        if (!targetCode && formId.includes('-')) {
          const parts = formId.split('-');
          if (parts.length >= 2) {
            targetCode = parts[1];
          }
        }
        return {
          ...client,
          forms: client.forms.filter(f => f.id !== formId && f.code !== targetCode)
        };
      }
      return client;
    });
    saveClients(updatedClients);
  };

  return { clients, isLoaded, updateForm, addClient, deleteClient, clearAllClients, addFormToClient, removeFormFromClient };
}

