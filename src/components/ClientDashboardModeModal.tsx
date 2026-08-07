import React from 'react';
import { Building2, Users, Check, ArrowRight, ShieldCheck, Briefcase, Sparkles, User, HelpCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ClientDashboardModeModalProps {
  isOpen: boolean;
  onSelectMode: (mode: 'shared_accountant' | 'business_owner') => void;
  currentMode?: 'shared_accountant' | 'business_owner';
  onClose?: () => void;
  isFirstLogin?: boolean;
}

export function ClientDashboardModeModal({
  isOpen,
  onSelectMode,
  currentMode,
  onClose,
  isFirstLogin = false,
}: ClientDashboardModeModalProps) {
  const { user } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full bg-slate-900 text-slate-100 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        {onClose && !isFirstLogin && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Taxpayer Portal Setup</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isFirstLogin ? `Welcome, ${user?.name || 'Taxpayer'}!` : 'Configure Your Taxpayer Dashboard'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Please choose how you want your BIZ-COMPLY compliance dashboard to operate:
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
          
          {/* Option 1: Shared by Accountant / Bookkeeper */}
          <div
            onClick={() => onSelectMode('shared_accountant')}
            className={`group relative p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] ${
              currentMode === 'shared_accountant'
                ? 'bg-slate-800/90 border-blue-500 ring-2 ring-blue-500/30 shadow-xl shadow-blue-500/10'
                : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/80 hover:border-blue-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>

              <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center space-x-1">
                <Users className="w-3 h-3 mr-1" />
                <span>Accountant Managed</span>
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors flex items-center justify-between">
                <span>Dashboard Shared with Accountant / Bookkeeper</span>
                <Check className={`w-5 h-5 text-blue-400 transition-opacity ${currentMode === 'shared_accountant' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                Ideal for taxpayers working with an external CPA firm or designated bookkeeper who handles and files BIR tax returns for you.
              </p>

              <div className="space-y-2 pt-3 border-t border-slate-700/50 text-xs text-slate-300">
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Real-time filing confirmation & eFPS payment receipt tracking</span>
                </div>
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Direct contact & inquiry box with your handling CPA</span>
                </div>
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Review tax form computations uploaded by your practitioner</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/30 group-hover:shadow-blue-600/30 cursor-pointer"
            >
              <span>Select Shared Accountant Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Option 2: Business Owner (Self-Managed) */}
          <div
            onClick={() => onSelectMode('business_owner')}
            className={`group relative p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] ${
              currentMode === 'business_owner'
                ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-500/30 shadow-xl shadow-amber-500/10'
                : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/80 hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>

              <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center space-x-1">
                <User className="w-3 h-3 mr-1" />
                <span>Self-Managed</span>
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                <span>Managed as Business Owner</span>
                <Check className={`w-5 h-5 text-amber-400 transition-opacity ${currentMode === 'business_owner' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                Ideal for independent business owners, sole proprietors, or internal tax teams who directly manage their own BIR obligations.
              </p>

              <div className="space-y-2 pt-3 border-t border-slate-700/50 text-xs text-slate-300">
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Self-assign BIR form obligations (2550Q, 1701Q, 1601-EQ, etc.)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Direct payment reference logging & BIR deadline alerts</span>
                </div>
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Full control over compliance schedules and self-audits</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/30 group-hover:shadow-amber-500/30 cursor-pointer"
            >
              <span>Select Business Owner Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>You can change or switch your dashboard setup mode anytime in your portal header.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
