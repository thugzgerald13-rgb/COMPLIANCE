import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClientList } from './components/ClientList';
import { FormsDirectory } from './components/FormsDirectory';
import { useClients, useFormReferences } from './store';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'clients' | 'forms'>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const { clients, isLoaded, updateForm, addClient, deleteClient, addFormToClient, removeFormFromClient } = useClients();
  const { forms, isLoaded: formsLoaded, addFormReference, deleteFormReference, updateFormReference } = useFormReferences();

  if (!isLoaded || !formsLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        selectedPeriod={selectedPeriod}
        onChangePeriod={setSelectedPeriod}
      />
      
      <main className="flex-1 overflow-auto">
        {currentView === 'dashboard' && (
          <Dashboard clients={clients} formReferences={forms} selectedPeriod={selectedPeriod} />
        )}
        
        {currentView === 'clients' && (
          <ClientList 
            clients={clients} 
            formReferences={forms}
            onUpdateForm={updateForm} 
            onAddClient={addClient}
            onDeleteClient={deleteClient}
            onAddFormToClient={addFormToClient}
            onRemoveFormFromClient={removeFormFromClient}
            selectedPeriod={selectedPeriod}
          />
        )}

        {currentView === 'forms' && (
          <FormsDirectory 
            forms={forms} 
            onAddFormReference={addFormReference} 
            onDeleteFormReference={deleteFormReference}
            onUpdateFormReference={updateFormReference}
          />
        )}
      </main>
    </div>
  );
}
