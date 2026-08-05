import { useState, useEffect } from 'react';
import { Client, FormStatus, FormReference, BIRForm } from './types';
import { commonForms } from './data';
import { useAuth } from './context/AuthContext';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { logError, safeJsonParse, writeLocalStorage } from './lib/errors';

const FORMS_STORAGE_KEY = 'bir_monitor_forms_v2';

export function useFormReferences() {
  const { user } = useAuth();
  const [forms, setForms] = useState<FormReference[]>(commonForms);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const userFormsKey = user ? `bir_monitor_forms_u_${user.id}` : FORMS_STORAGE_KEY;
    const stored = localStorage.getItem(userFormsKey) || localStorage.getItem(FORMS_STORAGE_KEY);
    
    if (stored) {
      const parsed = safeJsonParse<FormReference[]>(stored, 'forms:parse-cache');
      if ('error' in parsed) {
        setForms(commonForms);
        setSyncError('Saved form references were corrupted and have been reset to the defaults.');
      } else {
        const existingCodes = new Set(parsed.value.map(f => f.code));
        const missingCommon = commonForms.filter(f => !existingCodes.has(f.code));
        const merged = missingCommon.length > 0 ? [...parsed.value, ...missingCommon] : parsed.value;
        setForms(merged);
        if (missingCommon.length > 0) {
          writeLocalStorage(userFormsKey, JSON.stringify(merged), 'forms:write-cache');
        }
      }
    } else {
      setForms(commonForms);
    }

    if (supabase && isSupabaseConfigured && user) {
      supabase.auth.getUser().then(({ data: { user: supabaseUser }, error }) => {
        if (!isMounted) return;
        if (error) {
          setSyncError(`Could not load your form references from the cloud: ${logError('forms:load-remote', error)}`);
          return;
        }
        if (supabaseUser?.user_metadata?.custom_forms) {
          const remoteForms: FormReference[] = supabaseUser.user_metadata.custom_forms;
          const existingCodes = new Set(remoteForms.map(f => f.code));
          const missingCommon = commonForms.filter(f => !existingCodes.has(f.code));
          const merged = missingCommon.length > 0 ? [...remoteForms, ...missingCommon] : remoteForms;
          setForms(merged);
          writeLocalStorage(userFormsKey, JSON.stringify(merged), 'forms:write-cache');
        }
      }).catch(err => {
        if (isMounted) {
          setSyncError(`Could not load your form references from the cloud: ${logError('forms:load-remote', err)}`);
        }
      });
    }

    setIsLoaded(true);

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const saveForms = async (updatedForms: FormReference[]) => {
    setForms(updatedForms);
    setSyncError(null);
    const userFormsKey = user ? `bir_monitor_forms_u_${user.id}` : FORMS_STORAGE_KEY;
    const writeError = writeLocalStorage(userFormsKey, JSON.stringify(updatedForms), 'forms:write-cache');
    if (writeError) {
      setSyncError(`Your form references could not be saved on this device: ${writeError}`);
    }

    if (supabase && isSupabaseConfigured && user) {
      try {
        // Sync to Supabase Storage bucket
        const blob = new Blob([JSON.stringify(updatedForms, null, 2)], { type: 'application/json' });
        const { error: storageError } = await supabase.storage
          .from('bizcomply-data')
          .upload(`users/${user.id}/forms.json`, blob, { upsert: true, contentType: 'application/json' });
        if (storageError) {
          logError('forms:upload-storage', storageError);
        }

        // Centralized metadata sync
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { custom_forms: updatedForms }
        });
        if (metadataError) {
          throw metadataError;
        }
      } catch (e) {
        setSyncError(`Your form references were saved on this device but could not be synced to the cloud: ${logError('forms:sync', e)}`);
      }
    }
  };

  const addFormReference = (formRef: FormReference) => {
    const updatedForms = [...forms, formRef];
    return saveForms(updatedForms);
  };

  const deleteFormReference = (code: string) => {
    const updatedForms = forms.filter(f => f.code !== code);
    return saveForms(updatedForms);
  };

  const updateFormReference = (updatedFormRef: FormReference) => {
    const updatedForms = forms.map(f => f.code === updatedFormRef.code ? updatedFormRef : f);
    return saveForms(updatedForms);
  };

  return { forms, isLoaded, syncError, dismissSyncError: () => setSyncError(null), addFormReference, deleteFormReference, updateFormReference };
}

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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
        const parsed = safeJsonParse<Client[]>(stored, 'clients:parse-cache');
        if ('error' in parsed) {
          if (isMounted) {
            setSyncError('Locally cached client data was corrupted and has been discarded.');
          }
        } else {
          localClients = parsed.value;
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

          if (storageErr) {
            logError('clients:download-storage', storageErr);
          } else if (storageFile) {
            const text = await storageFile.text();
            const parsedRemote = safeJsonParse<Client[]>(text, 'clients:parse-remote');
            if ('error' in parsedRemote) {
              if (isMounted) {
                setSyncError('Cloud client data could not be read and was ignored; showing locally cached data.');
              }
            } else if (Array.isArray(parsedRemote.value) && isMounted) {
              setClients(parsedRemote.value);
              writeLocalStorage(userKey, JSON.stringify(parsedRemote.value), 'clients:write-cache');
              setIsLoaded(true);
              return;
            }
          }

          // Attempt 2: Check Supabase User Metadata cloud storage
          const { data: { user: supabaseUser }, error: userErr } = await supabase.auth.getUser();
          if (userErr) {
            throw userErr;
          }
          if (supabaseUser?.user_metadata?.clients && Array.isArray(supabaseUser.user_metadata.clients)) {
            const remoteClients = supabaseUser.user_metadata.clients as Client[];
            if (isMounted) {
              setClients(remoteClients);
              writeLocalStorage(userKey, JSON.stringify(remoteClients), 'clients:write-cache');
            }
          } else {
            // Attempt 3: Fetch from Supabase database table 'user_clients'
            const { data, error: tableErr } = await supabase
              .from('user_clients')
              .select('clients_data')
              .eq('user_id', user.id)
              .maybeSingle();

            if (tableErr) {
              // The table is optional; storage and user metadata are the primary sources.
              logError('clients:select-table', tableErr);
            } else if (data?.clients_data && Array.isArray(data.clients_data) && isMounted) {
              setClients(data.clients_data);
              writeLocalStorage(userKey, JSON.stringify(data.clients_data), 'clients:write-cache');
            }
          }
        } catch (err) {
          if (isMounted) {
            setSyncError(`Could not load your clients from the cloud, showing locally cached data: ${logError('clients:load-remote', err)}`);
          }
        }
      }

      if (isMounted) {
        setIsLoaded(true);
      }
    }

    loadClientData().catch(err => {
      if (isMounted) {
        setSyncError(`Could not load your clients: ${logError('clients:load', err)}`);
        setIsLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user?.id, userKey]);

  const saveClients = async (updated: Client[]) => {
    setClients(updated);
    setSyncError(null);
    if (userKey) {
      const writeError = writeLocalStorage(userKey, JSON.stringify(updated), 'clients:write-cache');
      if (writeError) {
        setSyncError(`Your changes could not be saved on this device: ${writeError}`);
      }
    }

    // Sync to Supabase centralized cloud storage & database if Supabase is connected
    if (supabase && isSupabaseConfigured && user) {
      try {
        // 1. Save to Supabase Storage Bucket 'bizcomply-data'
        const jsonContent = JSON.stringify(updated, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const { error: storageError } = await supabase.storage
          .from('bizcomply-data')
          .upload(`users/${user.id}/clients.json`, blob, { upsert: true, contentType: 'application/json' });
        if (storageError) {
          throw storageError;
        }

        // 2. Centralized sync to Supabase user metadata (accessible on any device/login)
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { clients: updated }
        });
        if (metadataError) {
          throw metadataError;
        }

        // 3. Save to Supabase 'user_clients' table if provisioned
        const { error: tableError } = await supabase
          .from('user_clients')
          .upsert(
            { user_id: user.id, clients_data: updated, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          );
        if (tableError) {
          // Table might not exist yet, metadata/storage sync serves as fallback
          logError('clients:upsert-table', tableError);
        }
      } catch (e) {
        setSyncError(`Your changes were saved on this device but could not be synced to the cloud: ${logError('clients:sync', e)}`);
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
    
    return saveClients(updatedClients);
  };

  const addClient = (client: Client) => {
    const updatedClients = [client, ...clients];
    return saveClients(updatedClients);
  };

  const deleteClient = (clientId: string) => {
    const updatedClients = clients.filter(c => c.id !== clientId);
    return saveClients(updatedClients);
  };

  const clearAllClients = () => {
    return saveClients([]);
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
    return saveClients(updatedClients);
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
    return saveClients(updatedClients);
  };

  return { clients, isLoaded, syncError, dismissSyncError: () => setSyncError(null), updateForm, addClient, deleteClient, clearAllClients, addFormToClient, removeFormFromClient };
}

