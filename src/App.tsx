import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { ClientList } from './components/ClientList';
import { FormsDirectory } from './components/FormsDirectory';
import { AuthPage } from './components/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useClients, useFormReferences } from './store';

function MainContent() {
  const { user, isAuthLoaded } = useAuth();
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar' | 'clients' | 'forms'>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const { clients, isLoaded, updateForm, addClient, deleteClient, clearAllClients, addFormToClient, removeFormFromClient } = useClients();
  const { forms, isLoaded: formsLoaded, addFormReference, deleteFormReference, updateFormReference } = useFormReferences();

  if (!isAuthLoaded || !isLoaded || !formsLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        selectedPeriod={selectedPeriod}
        onChangePeriod={setSelectedPeriod}
      />
      
      <main className="flex-1 h-full overflow-y-auto">
        {currentView === 'dashboard' && (
          <Dashboard 
            clients={clients} 
            formReferences={forms} 
            selectedPeriod={selectedPeriod} 
            onUpdateForm={updateForm}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            clients={clients}
            formReferences={forms}
            selectedPeriod={selectedPeriod}
            onChangePeriod={setSelectedPeriod}
            onUpdateForm={updateForm}
          />
        )}
        
        {currentView === 'clients' && (
          <ClientList 
            clients={clients} 
            formReferences={forms}
            onUpdateForm={updateForm} 
            onAddClient={addClient}
            onDeleteClient={deleteClient}
            onClearAllClients={clearAllClients}
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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
