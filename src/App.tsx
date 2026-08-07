import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { ClientList } from './components/ClientList';
import { FormsDirectory } from './components/FormsDirectory';
import { AuthPage } from './components/AuthPage';
import { AccountOnboardingModal } from './components/AccountOnboardingModal';
import { ClientPortalView } from './components/ClientPortalView';
import { WorkspaceModeSelectionModal } from './components/WorkspaceModeSelectionModal';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FeatureReleaseProvider } from './context/FeatureReleaseContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { OfflineSyncProvider } from './context/OfflineSyncContext';
import { useClients, useFormReferences } from './store';
import { AppLockShield } from './components/AppLockShield';

function MainContent() {
  const { user, isAuthLoaded, workspaceMode, setWorkspaceMode } = useAuth();
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

  if (!user.accountType || !user.companyInfo) {
    return <AccountOnboardingModal />;
  }

  if (user.role === 'Client') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <OfflineSyncBanner />
        <ClientPortalView 
          clients={clients} 
          formReferences={forms} 
          selectedPeriod={selectedPeriod} 
          onChangePeriod={setSelectedPeriod}
          onUpdateForm={updateForm}
          onAddFormToClient={addFormToClient}
          onRemoveFormFromClient={removeFormFromClient}
        />
      </div>
    );
  }

  if (!workspaceMode) {
    return <WorkspaceModeSelectionModal onSelectMode={setWorkspaceMode} currentMode={workspaceMode} />;
  }

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200 relative">
      <OfflineSyncBanner />
      <div className="flex flex-col md:flex-row flex-1 h-full overflow-hidden relative">
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
          <main className="flex-1 h-full overflow-y-auto pt-2 sm:pt-0">
            {currentView === 'dashboard' && (
              <Dashboard 
                clients={clients} 
                formReferences={forms} 
                selectedPeriod={selectedPeriod} 
                onUpdateForm={updateForm}
                onRemoveFormFromClient={removeFormFromClient}
              />
            )}

            {currentView === 'calendar' && (
              <CalendarView
                clients={clients}
                formReferences={forms}
                selectedPeriod={selectedPeriod}
                onChangePeriod={setSelectedPeriod}
                onUpdateForm={updateForm}
                onRemoveFormFromClient={removeFormFromClient}
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
    </div>
  );
}


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeatureReleaseProvider>
          <OfflineSyncProvider>
            <AppLockShield />
            <MainContent />
          </OfflineSyncProvider>
        </FeatureReleaseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
