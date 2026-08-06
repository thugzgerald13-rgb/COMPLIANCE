import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface FeatureUpdate {
  id: string;
  codeKey: string;
  name: string;
  description: string;
  category: 'AI & Automation' | 'BIR Compliance' | 'Audit & Multi-Branch' | 'Notifications';
  stage: 'superadmin_only' | 'released_all'; // 'superadmin_only' = Available first on Super Admin; 'released_all' = Released to all users
  version: string;
  releaseDate: string;
  createdBy: string;
}

interface FeatureReleaseContextType {
  featureUpdates: FeatureUpdate[];
  isFeatureAvailable: (codeKey: string) => boolean;
  getFeatureStage: (codeKey: string) => 'superadmin_only' | 'released_all';
  toggleFeatureStage: (id: string) => void;
  setFeatureStage: (id: string, stage: 'superadmin_only' | 'released_all') => void;
  releaseAllToUsers: () => void;
  addFeatureUpdate: (update: Omit<FeatureUpdate, 'id'>) => void;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'bizcomply_feature_updates_v1';

const DEFAULT_FEATURE_UPDATES: FeatureUpdate[] = [
  {
    id: 'feat_ai_assistant',
    codeKey: 'ai_compliance_assistant',
    name: 'AI Compliance Assistant & Smart BIR Advisor',
    description: 'AI-powered automated tax deadline analyzer & BIR form summary generator with smart obligation risk scoring.',
    category: 'AI & Automation',
    stage: 'superadmin_only', // Available first on Super Admin for testing
    version: 'v2.5.0-beta',
    releaseDate: '2026-08-05',
    createdBy: 'Gerald (Super Admin)'
  },
  {
    id: 'feat_efps_sync',
    codeKey: 'efiling_api_sync',
    name: 'Automated eFPS / eBIRForms Direct API Sync',
    description: 'Direct API verification pipeline for eBIRForms reference numbers and automated filing status confirmation.',
    category: 'BIR Compliance',
    stage: 'superadmin_only', // Available first on Super Admin for testing
    version: 'v2.4.0-preview',
    releaseDate: '2026-08-04',
    createdBy: 'Gerald (Super Admin)'
  },
  {
    id: 'feat_multi_branch',
    codeKey: 'multi_branch_audit',
    name: 'Multi-Branch Consolidated BIR Audit Portal',
    description: 'Branch-by-branch TIN compliance rollups, multi-location filing health matrix, and audit trail exporter.',
    category: 'Audit & Multi-Branch',
    stage: 'superadmin_only', // Available first on Super Admin for testing
    version: 'v2.6.0-early',
    releaseDate: '2026-08-05',
    createdBy: 'Gerald (Super Admin)'
  },
  {
    id: 'feat_client_webhooks',
    codeKey: 'custom_client_webhooks',
    name: 'Client SMS & Webhook Compliance Automation',
    description: 'Automated webhook triggers that send direct SMS/Email filing alerts to clients 3 days before BIR deadlines.',
    category: 'Notifications',
    stage: 'superadmin_only', // Available first on Super Admin for testing
    version: 'v2.4.1-alpha',
    releaseDate: '2026-08-05',
    createdBy: 'Gerald (Super Admin)'
  },
  {
    id: 'feat_web_push',
    codeKey: 'web_push_8am_pht',
    name: '8:00 AM PHT Web Push Background Broadcaster',
    description: 'Service Worker automatic push notifications dispatched every 8:00 AM Philippine Standard Time (GMT+8) even when tab is closed.',
    category: 'Notifications',
    stage: 'released_all', // Released to all general users
    version: 'v2.3.0',
    releaseDate: '2026-08-01',
    createdBy: 'Gerald (Super Admin)'
  },
  {
    id: 'feat_1701a_gen',
    codeKey: 'form_1701a_generator',
    name: 'Interactive BIR Form 1701A Income Tax Generator',
    description: 'Automated tax rate calculator and printable summary generator for annual individual income tax returns.',
    category: 'BIR Compliance',
    stage: 'released_all', // Released to all general users
    version: 'v2.2.0',
    releaseDate: '2026-07-28',
    createdBy: 'Gerald (Super Admin)'
  }
];

const FeatureReleaseContext = createContext<FeatureReleaseContextType | undefined>(undefined);

export function FeatureReleaseProvider({ children }: { children: ReactNode }) {
  const { isSuperAdmin } = useAuth();
  const [featureUpdates, setFeatureUpdates] = useState<FeatureUpdate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_FEATURE_UPDATES;
      }
    }
    return DEFAULT_FEATURE_UPDATES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(featureUpdates));
  }, [featureUpdates]);

  // Check feature availability for the active user
  const isFeatureAvailable = (codeKey: string): boolean => {
    // Super Admin ALWAYS has access to ALL features regardless of stage!
    if (isSuperAdmin) {
      return true;
    }

    const feature = featureUpdates.find(f => f.codeKey === codeKey);
    if (!feature) {
      // If unlisted feature, default to true for general use
      return true;
    }

    // Regular users can only access features that have been officially released to all users
    return feature.stage === 'released_all';
  };

  const getFeatureStage = (codeKey: string): 'superadmin_only' | 'released_all' => {
    const feature = featureUpdates.find(f => f.codeKey === codeKey);
    return feature ? feature.stage : 'released_all';
  };

  const toggleFeatureStage = (id: string) => {
    setFeatureUpdates(prev => prev.map(item => {
      if (item.id === id) {
        const nextStage: 'superadmin_only' | 'released_all' = item.stage === 'superadmin_only' ? 'released_all' : 'superadmin_only';
        return { ...item, stage: nextStage };
      }
      return item;
    }));
  };

  const setFeatureStage = (id: string, stage: 'superadmin_only' | 'released_all') => {
    setFeatureUpdates(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, stage };
      }
      return item;
    }));
  };

  const releaseAllToUsers = () => {
    setFeatureUpdates(prev => prev.map(item => ({ ...item, stage: 'released_all' })));
  };

  const addFeatureUpdate = (newUpdate: Omit<FeatureUpdate, 'id'>) => {
    const item: FeatureUpdate = {
      ...newUpdate,
      id: 'feat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
    };
    setFeatureUpdates(prev => [item, ...prev]);
  };

  const resetToDefaults = () => {
    setFeatureUpdates(DEFAULT_FEATURE_UPDATES);
  };

  return (
    <FeatureReleaseContext.Provider value={{
      featureUpdates,
      isFeatureAvailable,
      getFeatureStage,
      toggleFeatureStage,
      setFeatureStage,
      releaseAllToUsers,
      addFeatureUpdate,
      resetToDefaults
    }}>
      {children}
    </FeatureReleaseContext.Provider>
  );
}

export function useFeatureRelease() {
  const context = useContext(FeatureReleaseContext);
  if (!context) {
    throw new Error('useFeatureRelease must be used within a FeatureReleaseProvider');
  }
  return context;
}
