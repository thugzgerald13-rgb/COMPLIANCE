import React from 'react';
import { User, Users, Check, ArrowRight, ShieldCheck, Building2, Sparkles, Crown, HelpCircle, Lock } from 'lucide-react';
import { useAuth, WorkspaceMode } from '../context/AuthContext';

interface WorkspaceModeSelectionModalProps {
  onSelectMode: (mode: WorkspaceMode) => void;
  currentMode?: WorkspaceMode | null;
  onClose?: () => void;
  isModal?: boolean;
}

export function WorkspaceModeSelectionModal({
  onSelectMode,
  currentMode,
  onClose,
  isModal = false
}: WorkspaceModeSelectionModalProps) {
  const { user, isSuperAdmin, subscriptionTier } = useAuth();

  const isSubscriber = subscriptionTier === 'subscriber';

  const handleChoose = (mode: WorkspaceMode) => {
    onSelectMode(mode);
    if (onClose) onClose();
  };

  const containerClasses = isModal
    ? "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    : "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-6 text-slate-100 font-sans relative overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* Background Ambient Glows */}
      {!isModal && (
        <>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      <div className="max-w-4xl w-full bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10 space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-200">
        
        {/* Header Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          {isSuperAdmin ? (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 text-xs font-bold shadow-xs">
              <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Super Admin Workspace Privilege</span>
            </div>
          ) : isSubscriber ? (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 rounded-full text-amber-300 text-xs font-bold shadow-xs">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Subscriber Lock-In Selection</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free Trial Workspace Mode</span>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isSuperAdmin ? 'Select or Switch Workspace Mode' : isSubscriber ? 'Confirm Your Subscriber Plan Mode' : `Welcome, ${user?.name || 'Tax Professional'}!`}
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {isSuperAdmin ? (
              <span>
                As <strong>Super Admin</strong>, you have full privileges to switch between <strong>Single-User</strong> and <strong>Multi-User</strong> modes at any time via the sidebar or control center.
              </span>
            ) : isSubscriber ? (
              <span>
                As a <strong>Subscriber</strong>, please select your preferred operating mode below. Your selection will become your <strong>locked-in subscriber status</strong> for this account.
              </span>
            ) : (
              <span>
                Select your initial workspace mode for BIZ-COMPLY. During your <strong>Free Trial</strong>, you can freely switch between Single-User and Multi-User mode at any time in the sidebar menu.
              </span>
            )}
          </p>
        </div>

        {/* Workspace Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Card 1: Single-User Mode */}
          <div 
            onClick={() => handleChoose('single')}
            className={`group relative p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] ${
              currentMode === 'single'
                ? 'bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl shadow-emerald-500/10'
                : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/80 hover:border-emerald-500/50'
            }`}
          >
            {/* Tag */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <User className="w-6 h-6" />
              </div>

              <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                Single-User Mode
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <h2 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                <span>Solo Taxpayer / Single Business</span>
                <Check className={`w-5 h-5 text-emerald-400 transition-opacity ${currentMode === 'single' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                Streamlined, clutter-free workspace focused entirely on managing personal business entity deadlines, single BIR tax forms, and fast calendar reminders.
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-700/50 text-xs text-slate-300">
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Personal tax deadline tracking with zero team clutter</span>
                </div>
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Direct desktop & mobile push alerts for BIR forms</span>
                </div>
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Fast single-entity calendar view & quick form references</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30 group-hover:shadow-emerald-600/30"
            >
              <span>{isSubscriber ? 'Lock-In Single-User Subscription' : 'Select Single-User Mode'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: Multi-User / Practice Mode */}
          <div 
            onClick={() => handleChoose('multi')}
            className={`group relative p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] ${
              currentMode === 'multi'
                ? 'bg-slate-800/90 border-blue-500 ring-2 ring-blue-500/30 shadow-xl shadow-blue-500/10'
                : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/80 hover:border-blue-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>

              <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center space-x-1">
                <Crown className="w-3 h-3 text-amber-400 mr-1" />
                <span>Multi-User Workspace</span>
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors flex items-center justify-between">
                <span>Accounting Firm & Team Practice</span>
                <Check className={`w-5 h-5 text-blue-400 transition-opacity ${currentMode === 'multi' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                Full-featured collaborative workspace designed for accounting firms, CPA practices, and corporate tax compliance teams managing multiple client accounts.
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-700/50 text-xs text-slate-300">
                <div className="flex items-start space-x-2">
                  <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Unlimited client entity roster & compliance officer tagging</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Multi-account quick switcher & role-based security</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Centralized team audit logs & client-wide push hub</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/30 group-hover:shadow-blue-600/30"
            >
              <span>{isSubscriber ? 'Lock-In Multi-User Subscription' : 'Launch Multi-User Workspace'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>

        {/* Footer info note */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-800 gap-2">
          <div className="flex items-center space-x-1.5 text-[11px]">
            {isSubscriber ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-200">
                  Subscription Lock-In: The option chosen here will lock in as your permanent Subscriber operating mode.
                </span>
              </>
            ) : (
              <>
                <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  Free Trial: You can toggle between Single-User and Multi-User mode anytime from the user profile menu.
                </span>
              </>
            )}
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Keep Current Selection
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
