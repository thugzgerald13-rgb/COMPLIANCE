import React, { useState, useEffect } from 'react';
import { Building2, Users, Check, ArrowRight, ShieldCheck, Briefcase, Sparkles, User, HelpCircle, X, Lock, Link, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isEligibleComplianceOfficer } from '../shared/complianceOfficerFilter';

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
  const { user, syncWithAccountant } = useAuth();

  const [isSyncStepOpen, setIsSyncStepOpen] = useState(false);
  const [accountantList, setAccountantList] = useState<any[]>([]);
  const [selectedAccEmail, setSelectedAccEmail] = useState('');
  const [customAccEmail, setCustomAccEmail] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isSynced = !!(user?.isSyncedWithAccountant || user?.syncedAccountantEmail);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/accountants/list')
        .then(async res => {
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              return res.json();
            }
          }
          return null;
        })
        .then(data => {
          if (data && data.success && Array.isArray(data.accountants) && data.accountants.length > 0) {
            // Server already filters to verified Compliance Officers, but we
            // re-apply the same predicate here defensively so this list can never
            // show a business_owner/client record even if the API response is
            // stale, cached, or tampered with in transit.
            const filtered = data.accountants.filter((acc: any) => isEligibleComplianceOfficer(acc));
            const listWithCompanyNames = filtered.map((acc: any) => ({
              ...acc,
              name: acc.companyInfo?.companyName || acc.name || 'Registered Compliance Officer Practice',
            }));
            setAccountantList(listWithCompanyNames);
            if (listWithCompanyNames.length > 0) {
              setSelectedAccEmail(listWithCompanyNames[0].email);
            }
          } else {
            // Local fallback accountants — used only if the central API is
            // unreachable or returns no results. Uses the exact same eligibility
            // predicate as the server so the fallback can't drift into showing
            // business_owner/client accounts that the server would have excluded.
            const rawUsers = localStorage.getItem('biz_comply_users_v2');
            let list: any[] = [];
            if (rawUsers) {
              try {
                const parsed = JSON.parse(rawUsers);
                list = parsed
                  .filter((u: any) => isEligibleComplianceOfficer(u))
                  .map((u: any) => ({
                    id: u.id,
                    name: u.companyInfo?.companyName || u.name || 'Compliance Officer Practice',
                    email: u.email,
                    cpaLicenseNo: u.companyInfo?.cpaLicenseNo || 'CPA-0192834',
                  }));
              } catch (e) {}
            }
            if (list.length === 0) {
              list = [
                { id: 'acc1', name: 'CAPO Management & Advisory Services', email: 'thugz.gerald13@gmail.com', cpaLicenseNo: 'CPA-0192834' },
                { id: 'acc2', name: 'MAW Tax & Accounting Services', email: 'mawcons.bir@gmail.com', cpaLicenseNo: 'CPA-0884120' }
              ];
            }
            setAccountantList(list);
            if (list.length > 0) setSelectedAccEmail(list[0].email);
          }
        })
        .catch(() => {
          const defaultList = [
            { id: 'acc1', name: 'CAPO Management & Advisory Services', email: 'thugz.gerald13@gmail.com', cpaLicenseNo: 'CPA-0192834' },
            { id: 'acc2', name: 'MAW Tax & Accounting Services', email: 'mawcons.bir@gmail.com', cpaLicenseNo: 'CPA-0884120' }
          ];
          setAccountantList(defaultList);
          setSelectedAccEmail('thugz.gerald13@gmail.com');
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectSharedAccountantMode = () => {
    if (isSynced) {
      onSelectMode('shared_accountant');
    } else {
      setIsSyncStepOpen(true);
    }
  };

  const handleExecuteSync = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToSync = customAccEmail.trim() || selectedAccEmail;
    if (!emailToSync) {
      setSyncError('Please enter or select a Registered Compliance Officer email.');
      return;
    }

    setSyncLoading(true);
    setSyncError(null);

    const matchAcc = accountantList.find(a => a.email.toLowerCase().trim() === emailToSync.toLowerCase().trim());
    const accName = matchAcc?.name;

    const result = await syncWithAccountant(emailToSync, accName);
    setSyncLoading(false);

    if (result.success) {
      setIsSyncStepOpen(false);
      onSelectMode('shared_accountant');
    } else {
      setSyncError(result.message || 'Failed to sync with compliance officer.');
    }
  };

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

        {/* Inline Accountant Sync Form if requested */}
        {isSyncStepOpen ? (
          <div className="p-6 bg-blue-950/40 border border-blue-500/40 rounded-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-blue-500/30 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Link className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Sync with Accountant / Compliance Officer</h3>
                  <p className="text-xs text-slate-300">Link your taxpayer record to your designated CPA firm to unlock the shared dashboard.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncStepOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Back
              </button>
            </div>

            {syncError && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{syncError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteSync} className="space-y-4 text-xs">
              {accountantList.length > 0 && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Select Registered Compliance Officer:</label>
                  <select
                    value={selectedAccEmail}
                    onChange={(e) => setSelectedAccEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {accountantList.map(acc => (
                      <option key={acc.id} value={acc.email}>
                        {acc.name} — ({acc.email}) [{acc.cpaLicenseNo}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">Or Enter Compliance Officer's Email Address:</label>
                <input
                  type="email"
                  value={customAccEmail}
                  onChange={(e) => setCustomAccEmail(e.target.value)}
                  placeholder="e.g. cpa.gerald@bizcomply.ph"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSyncStepOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncLoading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Link className="w-4 h-4" />
                  <span>{syncLoading ? 'Syncing...' : 'Sync & Unlock Shared Dashboard'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
            
            {/* Option 1: Shared by Accountant / Bookkeeper */}
            <div
              onClick={handleSelectSharedAccountantMode}
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

                {isSynced ? (
                  <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center space-x-1">
                    <Check className="w-3 h-3 mr-1" />
                    <span>Synced with CPA</span>
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 mr-1" />
                    <span>Sync Required</span>
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors flex items-center justify-between">
                  <span>Shared Accountant Dashboard</span>
                  {currentMode === 'shared_accountant' && <Check className="w-5 h-5 text-blue-400" />}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Ideal for taxpayers working with an external CPA firm or designated bookkeeper who handles and files BIR tax returns for you.
                </p>

                {!isSynced && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center space-x-2 font-medium">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Requires syncing with an Accountant / Compliance Officer first.</span>
                  </div>
                )}

                <div className="space-y-2 pt-3 border-t border-slate-700/50 text-xs text-slate-300">
                  <div className="flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Real-time filing confirmation & eFPS payment receipt tracking</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Direct contact & 2-way message chat with your handling CPA</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`w-full py-2.5 px-4 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg cursor-pointer ${
                  isSynced 
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' 
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30'
                }`}
              >
                <span>{isSynced ? 'Select Shared Accountant Dashboard' : 'Sync with Accountant to Unlock'}</span>
                {isSynced ? <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> : <Lock className="w-4 h-4" />}
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
        )}

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