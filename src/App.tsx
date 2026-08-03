import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
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
  const { theme, toggleTheme } = useTheme();
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
    <div className="flex flex-col md:flex-row h-screen h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200 relative">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        selectedPeriod={selectedPeriod}
        onChangePeriod={setSelectedPeriod}
        clients={clients}
        formReferences={forms}
        onUpdateForm={updateForm}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Upper Right Corner Header Theme Toggle */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-30 flex items-center">
          <button
            onClick={toggleTheme}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer font-bold text-xs"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>

        <main className="flex-1 h-full overflow-y-auto pt-2 sm:pt-0">
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
