import React, { useState } from 'react';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { Wifi, WifiOff, RefreshCw, Layers, CheckCircle2, AlertTriangle, Clock, X, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export function OfflineSyncBanner() {
  const {
    isOnline,
    isSyncing,
    pendingActions,
    lastSyncedAt,
    syncNow,
    clearQueue,
    simulatedOfflineMode,
    setSimulatedOfflineMode
  } = useOfflineSync();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const handleManualSync = async () => {
    const count = await syncNow();
    if (count > 0) {
      setSyncSuccessMsg(`Successfully synchronized ${count} queued compliance update(s) to cloud!`);
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    }
  };

  return (
    <>
      {/* Offline Status or Sync Alert Banner */}
      {(!isOnline || pendingActions.length > 0 || syncSuccessMsg) && (
        <div 
          className={`w-full py-2 px-4 transition-all duration-300 border-b flex flex-wrap items-center justify-between gap-2 text-xs font-medium z-30 ${
            !isOnline
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200'
              : pendingActions.length > 0
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-900 dark:text-blue-200'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {!isOnline ? (
              <div className="p-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
              </div>
            ) : pendingActions.length > 0 ? (
              <div className="p-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}

            <div>
              {!isOnline ? (
                <span>
                  <strong className="font-bold">Offline Mode Active:</strong> Connection lost. All compliance status edits and tax updates are safely cached locally and will auto-sync when back online.
                </span>
              ) : pendingActions.length > 0 ? (
                <span>
                  <strong className="font-bold">{pendingActions.length} Pending Offline Change(s):</strong> Ready to sync with your BIR compliance cloud repository.
                </span>
              ) : (
                <span>{syncSuccessMsg}</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {pendingActions.length > 0 && (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors cursor-pointer"
              >
                <Layers className="w-3 h-3 text-amber-400" />
                <span>View Queue ({pendingActions.length})</span>
              </button>
            )}

            {isOnline && pendingActions.length > 0 && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            )}

            {/* Simulated Offline Toggle for testing */}
            <button
              type="button"
              onClick={() => setSimulatedOfflineMode(!simulatedOfflineMode)}
              className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Test offline behavior and queuing by simulating offline state"
            >
              {simulatedOfflineMode ? (
                <>
                  <ToggleRight className="w-3.5 h-3.5 text-amber-500" />
                  <span>Test Offline: ON</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>Simulate Offline</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Offline Queue Details Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 relative">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Offline Sync Queue</h3>
                <p className="text-xs text-slate-400">
                  Changes saved while working offline. They will automatically upload when network is connected.
                </p>
              </div>
            </div>

            <div className="my-4 max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/60">
              {pendingActions.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No queued offline items. All updates are synchronized!
                </div>
              ) : (
                pendingActions.map((action) => (
                  <div key={action.id} className="pt-2.5 pb-1 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {action.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{action.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1">{action.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  clearQueue();
                  setIsDrawerOpen(false);
                }}
                className="inline-flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Queue</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                {isOnline && pendingActions.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleManualSync();
                      setIsDrawerOpen(false);
                    }}
                    disabled={isSyncing}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Synchronize Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
