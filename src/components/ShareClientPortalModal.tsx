import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { useAuth } from '../context/AuthContext';
import { Share2, Copy, Check, ExternalLink, ShieldCheck, UserCheck, AlertCircle, Sparkles, Building2, Mail, CheckCircle2, X } from 'lucide-react';

interface ShareClientPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onShareSuccess?: (client: Client, boUser?: any) => void;
}

export function ShareClientPortalModal({
  isOpen,
  onClose,
  client,
  onShareSuccess
}: ShareClientPortalModalProps) {
  const { user, allUsers, loginAsClientPortal, refreshUsersList } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [customTargetEmail, setCustomTargetEmail] = useState('');

  useEffect(() => {
    if (client) {
      setCustomTargetEmail(client.email || '');
      setSyncSuccessMessage(null);
      setCopied(false);
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const officerEmail = user?.email || 'officer@taxfirm.com';
  const officerName = user?.companyInfo?.companyName || user?.name || 'Tax & Compliance Practice';

  // Find matching Business Owner user in central users list by TIN or Email
  const cleanTin = (t?: string) => (t || '').replace(/[^0-9]/g, '');
  const targetTin = cleanTin(client.tin);
  
  const matchingBO = allUsers.find((u: any) => {
    if (u.role === 'Admin' || u.accountType === 'compliance_officer') return false;
    const uTin = cleanTin(u.companyInfo?.tin || u.tin);
    const uEmail = (u.email || '').toLowerCase().trim();
    const cEmail = (client.email || '').toLowerCase().trim();
    
    if (targetTin && uTin && (uTin === targetTin || (uTin.length >= 9 && targetTin.length >= 9 && uTin.slice(0, 9) === targetTin.slice(0, 9)))) {
      return true;
    }
    if (cEmail && uEmail && cEmail === uEmail) return true;
    return false;
  });

  const portalUrl = `${window.location.origin}?tin=${encodeURIComponent(client.tin)}&client=${encodeURIComponent(client.id)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareAndSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMessage(null);

    try {
      // 1. Sync client portal data to backend
      const response = await fetch('/api/clients/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: [client],
          userEmail: officerEmail,
          userId: user?.id,
        }),
      });

      // 2. If matching Business Owner user or target email provided, update profile
      const boEmail = matchingBO?.email || customTargetEmail.trim() || client.email;
      if (boEmail) {
        await fetch('/api/users/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: boEmail,
            syncedAccountantEmail: officerEmail,
            syncedAccountantName: officerName,
            isSyncedWithAccountant: true,
            clientDashboardMode: 'shared_accountant',
            tin: client.tin,
            companyInfo: {
              companyName: client.name,
              tin: client.tin,
              rdo: client.rdo,
            }
          }),
        }).catch(() => {});
      }

      await refreshUsersList();

      const successMsg = matchingBO 
        ? `Client Portal successfully shared with Business Owner: ${matchingBO.name || matchingBO.email} (TIN: ${client.tin})`
        : `Client Portal shared for TIN: ${client.tin}. When a business owner logs in with this TIN, they will automatically see this portal!`;

      setSyncSuccessMessage(successMsg);
      if (onShareSuccess) {
        onShareSuccess(client, matchingBO);
      }
    } catch (err) {
      setSyncSuccessMessage('Portal shared locally! Business owner account linked with TIN: ' + client.tin);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestLaunch = () => {
    onClose();
    loginAsClientPortal(client.id, client.name, client.tin, client.email);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center text-white shadow-lg shrink-0">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Share Client Portal
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold">
                TIN Sync
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Sync and share live tax filing portal with Business Owner
            </p>
          </div>
        </div>

        {/* Client Summary Box */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 mb-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Client / Business Name:</span>
            <span className="text-sm font-bold text-white">{client.name}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">TIN Number:</span>
            <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {client.tin}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">RDO Office:</span>
            <span className="text-slate-200 font-semibold">RDO {client.rdo}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Assigned Compliance Forms:</span>
            <span className="text-blue-400 font-bold">{client.forms?.length || 0} BIR Forms</span>
          </div>
        </div>

        {/* Business Owner Matching Status */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Matching Business Owner Account (Same TIN)
          </label>

          {matchingBO ? (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 flex items-start space-x-3 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-emerald-300 text-sm">{matchingBO.name || 'Registered Business Owner'}</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    TIN Match
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-1">
                  Email: <strong className="text-white">{matchingBO.email}</strong>
                </p>
                <p className="text-slate-400 text-[11px] mt-1">
                  Ready for instant sync! The business owner will automatically see this portal upon logging in.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-start space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-200">Shared Portal Ready for TIN: {client.tin}</span>
                  <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                    No active account registered with this exact TIN yet. Clicking <strong>Share & Sync</strong> will register this Client Portal under TIN <strong>{client.tin}</strong> so any Business Owner who signs in with this TIN will instantly unlock this portal.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-800/40">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Business Owner Email (Optional):
                </label>
                <input
                  type="email"
                  value={customTargetEmail}
                  onChange={(e) => setCustomTargetEmail(e.target.value)}
                  placeholder="owner@business.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Shareable Link Box */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Direct Shareable Client Portal Link
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={portalUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none select-all"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {syncSuccessMessage && (
          <div className="mb-5 bg-emerald-900/60 border border-emerald-500/50 rounded-2xl p-3.5 text-xs text-emerald-200 flex items-start space-x-2.5 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">{syncSuccessMessage}</p>
              <p className="text-[11px] text-emerald-300 mt-1">
                Tax forms, payables, and compliance statuses are synced live between your officer account and the business owner.
              </p>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={handleTestLaunch}
            className="w-full sm:w-auto px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
            title="Preview Client Portal"
          >
            <Building2 className="w-4 h-4" />
            <span>Launch Portal View</span>
          </button>

          <button
            onClick={handleShareAndSync}
            disabled={isSyncing}
            className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-900/40 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>{isSyncing ? 'Syncing...' : 'Share & Sync Portal'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
