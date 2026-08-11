import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface OfflineAction {
  id: string;
  type: 'UPDATE_FORM' | 'ADD_CLIENT' | 'DELETE_CLIENT' | 'ADD_FORM_TO_CLIENT' | 'REMOVE_FORM' | 'UPDATE_PAYABLE';
  description: string;
  timestamp: string;
  payload: any;
}

interface OfflineSyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: OfflineAction[];
  lastSyncedAt: string | null;
  queueAction: (type: OfflineAction['type'], description: string, payload: any) => void;
  syncNow: () => Promise<number>;
  clearQueue: () => void;
  simulatedOfflineMode: boolean;
  setSimulatedOfflineMode: (offline: boolean) => void;
}

const STORAGE_QUEUE_KEY = 'bizcomply_offline_sync_queue_v1';
const LAST_SYNC_KEY = 'bizcomply_last_sync_timestamp_v1';

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export const OfflineSyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [simulatedOfflineMode, setSimulatedOfflineMode] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return sessionStorage.getItem(LAST_SYNC_KEY) || null;
  });
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Effective online state taking simulation into account
  const effectiveOnline = isOnline && !simulatedOfflineMode;

  // Persist queue changes
  useEffect(() => {
    sessionStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(pendingActions));
  }, [pendingActions]);

  // Monitor network online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger automatic sync when network comes back
      setTimeout(() => {
        triggerAutoSync();
      }, 500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueUpdated = (e: any) => {
      if (e.detail) {
        setPendingActions(prev => [e.detail, ...prev]);
      } else {
        try {
          const stored = sessionStorage.getItem(STORAGE_QUEUE_KEY);
          setPendingActions(stored ? JSON.parse(stored) : []);
        } catch (err) {}
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('bizcomply_offline_queue_updated', handleQueueUpdated);

    // Listen to Service Worker message triggers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TRIGGER_OFFLINE_SYNC') {
          triggerAutoSync();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('bizcomply_offline_queue_updated', handleQueueUpdated);
    };
  }, []);

  const triggerAutoSync = async () => {
    if (!navigator.onLine) return;
    const currentQueueStr = sessionStorage.getItem(STORAGE_QUEUE_KEY);
    if (currentQueueStr) {
      try {
        const queue: OfflineAction[] = JSON.parse(currentQueueStr);
        if (queue.length > 0) {
          await processQueue(queue);
        }
      } catch (e) {
        console.warn('Error reading offline queue:', e);
      }
    }
  };

  const processQueue = async (queueToProcess: OfflineAction[]): Promise<number> => {
    if (queueToProcess.length === 0) return 0;

    setIsSyncing(true);
    let syncedCount = 0;

    try {
      // Simulate/perform network sync for each item
      for (const item of queueToProcess) {
        if (supabase && isSupabaseConfigured) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('audit_logs').insert([{
                user_id: user.id,
                action: item.type,
                details: item.description,
                created_at: new Date().toISOString()
              }]);
            }
          } catch (e) {
            // Ignore minor log errors
          }
        }
        syncedCount++;
      }

      // Clear processed queue
      setPendingActions([]);
      sessionStorage.removeItem(STORAGE_QUEUE_KEY);

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncedAt(nowStr);
      sessionStorage.setItem(LAST_SYNC_KEY, nowStr);

    } catch (err) {
      console.error('Offline sync execution failed:', err);
    } finally {
      setIsSyncing(false);
    }

    return syncedCount;
  };

  const queueAction = (type: OfflineAction['type'], description: string, payload: any) => {
    const newAction: OfflineAction = {
      id: crypto.randomUUID(),
      type,
      description,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      payload
    };

    setPendingActions(prev => [newAction, ...prev]);

    // Request Service Worker Background Sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        // @ts-ignore
        if (reg.sync) {
          // @ts-ignore
          reg.sync.register('bizcomply-offline-sync').catch(() => {});
        }
      }).catch(() => {});
    }
  };

  const syncNow = async (): Promise<number> => {
    if (pendingActions.length === 0) return 0;
    return await processQueue(pendingActions);
  };

  const clearQueue = () => {
    setPendingActions([]);
    sessionStorage.removeItem(STORAGE_QUEUE_KEY);
  };

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline: effectiveOnline,
        isSyncing,
        pendingActions,
        lastSyncedAt,
        queueAction,
        syncNow,
        clearQueue,
        simulatedOfflineMode,
        setSimulatedOfflineMode
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSync = () => {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
};
