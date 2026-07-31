import { useState, useEffect } from 'react';
import { Client, FormStatus, FormReference, BIRForm } from './types';
import { commonForms } from './data';
import { useAuth } from './context/AuthContext';

const FORMS_STORAGE_KEY = 'bir_monitor_forms_v2';

export function useFormReferences() {
  const [forms, setForms] = useState<FormReference[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(FORMS_STORAGE_KEY);
    if (stored) {
      try {
        setForms(JSON.parse(stored));
      } catch (e) {
        setForms(commonForms);
        localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(commonForms));
      }
    } else {
      setForms(commonForms);
      localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(commonForms));
    }
    setIsLoaded(true);
  }, []);

  const addFormReference = (formRef: FormReference) => {
    const updatedForms = [...forms, formRef];
    setForms(updatedForms);
    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(updatedForms));
  };

  const deleteFormReference = (code: string) => {
    const updatedForms = forms.filter(f => f.code !== code);
    setForms(updatedForms);
    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(updatedForms));
  };

  const updateFormReference = (updatedFormRef: FormReference) => {
    const updatedForms = forms.map(f => f.code === updatedFormRef.code ? updatedFormRef : f);
    setForms(updatedForms);
    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(updatedForms));
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

    const stored = localStorage.getItem(userKey);
    if (stored) {
      try {
        setClients(JSON.parse(stored));
      } catch (e) {
        setClients([]);
        localStorage.setItem(userKey, JSON.stringify([]));
      }
    } else {
      // New user registration or login starts with NO example clients (empty list)
      setClients([]);
      localStorage.setItem(userKey, JSON.stringify([]));
    }
    setIsLoaded(true);
  }, [user?.id, userKey]);

  const saveClients = (updated: Client[]) => {
    setClients(updated);
    if (userKey) {
      localStorage.setItem(userKey, JSON.stringify(updated));
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

