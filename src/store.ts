import { useState, useEffect } from 'react';
import { Client, FormStatus, FormReference, BIRForm } from './types';
import { generateInitialClients, commonForms } from './data';

const STORAGE_KEY = 'bir_monitor_clients_v4';
const FORMS_STORAGE_KEY = 'bir_monitor_forms_v1';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setClients(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored clients", e);
        const initial = generateInitialClients();
        setClients(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } else {
      const initial = generateInitialClients();
      setClients(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }
    setIsLoaded(true);
  }, []);

  const updateForm = (clientId: string, formId: string, updates: Partial<BIRForm>) => {
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          forms: client.forms.map(form => 
            form.id === formId ? { ...form, ...updates } : form
          )
        };
      }
      return client;
    });
    
    setClients(updatedClients);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClients));
  };

  const addClient = (client: Client) => {
    const updatedClients = [client, ...clients];
    setClients(updatedClients);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClients));
  };

  const deleteClient = (clientId: string) => {
    const updatedClients = clients.filter(c => c.id !== clientId);
    setClients(updatedClients);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClients));
  };

  const addFormToClient = (clientId: string, formRef: FormReference, deadline?: string, period?: string) => {
    const defaultDeadline = deadline || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    const newForm: BIRForm = {
      id: crypto.randomUUID(),
      code: formRef.code,
      description: formRef.description,
      status: 'Pending',
      deadline: defaultDeadline,
      period: period,
    };
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        // Prevent duplicate codes in the same period
        const isDuplicate = client.forms.some(f => {
          if (f.code !== formRef.code) return false;
          if (period && f.period) {
            return f.period === period;
          }
          return f.deadline === defaultDeadline;
        });
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
    setClients(updatedClients);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClients));
  };

  const removeFormFromClient = (clientId: string, formId: string) => {
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          forms: client.forms.filter(f => f.id !== formId)
        };
      }
      return client;
    });
    setClients(updatedClients);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClients));
  };

  return { clients, isLoaded, updateForm, addClient, deleteClient, addFormToClient, removeFormFromClient };
}
