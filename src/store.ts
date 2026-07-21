import { useState, useEffect } from 'react';
import { Client, FormStatus, FormReference } from './types';
import { generateInitialClients, commonForms } from './data';

const STORAGE_KEY = 'bir_monitor_clients_v2';
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

  return { forms, isLoaded, addFormReference, deleteFormReference };
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

  const updateFormStatus = (clientId: string, formId: string, newStatus: FormStatus) => {
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          forms: client.forms.map(form => 
            form.id === formId ? { ...form, status: newStatus } : form
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

  return { clients, isLoaded, updateFormStatus, addClient, deleteClient };
}
