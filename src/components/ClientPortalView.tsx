import React, { useState } from 'react';
import { Client, FormStatus, FormReference, BIRForm } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Building2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Download, 
  Copy, 
  Check, 
  Send, 
  LogOut, 
  Sun, 
  Moon, 
  ShieldCheck, 
  HelpCircle, 
  Lock, 
  ChevronRight, 
  FileCheck, 
  CreditCard, 
  Crown,
  Search,
  MessageSquare,
  Plus,
  Trash2,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { getFormsForClientAndPeriod, getEffectiveDeadline, getComplianceStatusInfo } from '../utils';
import { getRDOLocationDisplay } from '../rdoData';

interface ClientPortalViewProps {
  clients: Client[];
  formReferences: FormReference[];
  selectedPeriod: string;
  onChangePeriod: (period: string) => void;
  onUpdateForm: (
    clientId: string, 
    formId: string, 
    updates: Partial<BIRForm>, 
    formMeta?: { code: string; description: string; deadline: string; period: string }
  ) => void;
  onAddFormToClient?: (
    clientId: string, 
    formRef: FormReference, 
    deadline?: string, 
    period?: string, 
    assignedPeriod?: string
  ) => void;
  onRemoveFormFromClient?: (
    clientId: string, 
    formId: string, 
    formCode?: string
  ) => void;
  onSwitchBackToPractice?: () => void;
}

export function ClientPortalView({
  clients,
  formReferences,
  selectedPeriod,
  onChangePeriod,
  onUpdateForm,
  onAddFormToClient,
  onRemoveFormFromClient,
  onSwitchBackToPractice
}: ClientPortalViewProps) {
  const { user, isSuperAdmin, logout, switchUser, allUsers } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Find the logged in client by user.clientId, user.email, or user.tin
  const currentClient = clients.find(c => 
    c.id === user?.clientId || 
    (c.email && c.email.toLowerCase().trim() === user?.email?.toLowerCase().trim()) ||
    c.tin === user?.tin ||
    c.tin === user?.email // user logging in via TIN as email
  ) || clients[0]; // Fallback to first client if none found

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedClientOverride, setSelectedClientOverride] = useState<string>(currentClient?.id || '');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSentMsg, setSupportSentMsg] = useState(false);
  const [paymentReceiptForm, setPaymentReceiptForm] = useState<BIRForm | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [paymentNotesInput, setPaymentNotesInput] = useState('');

  // Self-assignment of forms state
  const [isManageFormsModalOpen, setIsManageFormsModalOpen] = useState(false);
  const [formSearchQuery, setFormSearchQuery] = useState('');
  const [assignmentSuccessToast, setAssignmentSuccessToast] = useState<string | null>(null);

  // Effective active client
  const activeClient = clients.find(c => c.id === (selectedClientOverride || currentClient?.id)) || currentClient || clients[0];

  if (!activeClient) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <Building2 className="w-16 h-16 text-amber-400 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold mb-2">Client Entity Record Not Found</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          No client tax profile was found linked to email ({user?.email}). Please contact your designated tax administrator or CPA firm to link your taxpayer record.
        </p>
        <button
          onClick={logout}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg"
        >
          Return to Sign In Portal
        </button>
      </div>
    );
  }

  // Get active forms for selected period
  const activeForms = getFormsForClientAndPeriod(activeClient, selectedPeriod, formReferences);

  const pendingCount = activeForms.filter(f => f.status === 'Pending').length;
  const processingCount = activeForms.filter(f => f.status === 'Processing').length;
  const filedCount = activeForms.filter(f => f.status === 'Filed' || f.status === 'Paid').length;
  const totalPayable = activeForms.reduce((sum, f) => sum + (f.amount || 0), 0);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendSupportMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSentMsg(true);
    setTimeout(() => {
      setSupportMessage('');
      setSupportSentMsg(false);
    }, 4000);
  };

  const handleSavePaymentReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentReceiptForm) return;

    onUpdateForm(
      activeClient.id,
      paymentReceiptForm.id,
      {
        status: 'Processing',
        referenceNo: paymentRefInput.trim() || paymentReceiptForm.referenceNo || 'CLIENT-REF-' + Math.floor(100000 + Math.random() * 900000),
        notes: paymentNotesInput.trim() ? `[Client Note]: ${paymentNotesInput.trim()}` : paymentReceiptForm.notes,
        datePaid: new Date().toISOString().split('T')[0]
      },
      {
        code: paymentReceiptForm.code,
        description: paymentReceiptForm.description,
        deadline: paymentReceiptForm.deadline || getEffectiveDeadline(paymentReceiptForm, formReferences, selectedPeriod),
        period: selectedPeriod
      }
    );

    setPaymentReceiptForm(null);
    setPaymentRefInput('');
    setPaymentNotesInput('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Client Portal Bar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-8 py-4 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400/30 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-tight text-white">{activeClient.name}</h1>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Client Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                <span>TIN: <strong className="text-slate-200 font-mono">{activeClient.tin}</strong></span>
                <span>•</span>
                <span>RDO: <strong className="text-slate-200">{activeClient.rdo}</strong> ({getRDOLocationDisplay(activeClient.rdo)})</span>
                <span>•</span>
                <span>Org ID: <strong className="text-indigo-300 font-mono bg-indigo-500/20 border border-indigo-400/30 px-1.5 py-0.2 rounded">{activeClient.organization_id || user?.organization_id || 'org_main_practice'}</strong></span>
                <span>•</span>
                <span className="text-amber-400 font-medium">{activeClient.type} Taxpayer</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Controls */}
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            
            {/* Period Selector */}
            <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-slate-400 font-medium">Tax Period:</span>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => onChangePeriod(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
              />
            </div>

            {/* Client Switcher for Super Admin / CPAs */}
            {(isSuperAdmin || user?.role === 'Admin' || user?.role === 'Compliance Officer') && clients.length > 1 && (
              <div className="relative">
                <select
                  value={activeClient.id}
                  onChange={(e) => setSelectedClientOverride(e.target.value)}
                  className="bg-slate-800 text-amber-300 border border-amber-500/40 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer font-bold"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} ({c.tin})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Return to Practice View (for Admins) */}
            {(isSuperAdmin || onSwitchBackToPractice) && (
              <button
                onClick={onSwitchBackToPractice}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                title="Switch back to Full Accountant Practice Dashboard"
              >
                <Crown className="w-3.5 h-3.5 fill-amber-400" />
                <span className="hidden md:inline">Practice View</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Client Portal Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Welcome & Status Summary Banner */}
        <div className="bg-gradient-to-r from-blue-900/90 via-slate-900 to-indigo-950/90 text-white rounded-3xl p-6 sm:p-8 border border-blue-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-blue-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Verified BIR Taxpayer Account Portal</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Tax Compliance Status — [{selectedPeriod}]
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Welcome to your client compliance hub. Below are your active BIR tax filing obligations, payment status, eFPS confirmation references, and direct CPA advisory communications for the selected period.
              </p>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 text-right shrink-0">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Total Tax Payable</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                ₱{totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5"> Across {activeForms.length} active tax returns</span>
            </div>
          </div>
        </div>

        {/* Status Counter Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{activeForms.length}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total BIR Forms Due</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-amber-500">{pendingCount}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Filing / Payment</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-blue-500">{processingCount}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">In Processing</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-emerald-500">{filedCount}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Filed & Paid Compliant</p>
            </div>
          </div>
        </div>

        {/* BIR Forms & Compliance Obligation List */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span>BIR Tax Obligations & Filing Returns</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active tax compliance returns assigned to {activeClient.name} for period [{selectedPeriod}]
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsManageFormsModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Self-Assign BIR Forms</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print Compliance Certificate</span>
              </button>
            </div>
          </div>

          {activeForms.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Pending Obligations for [{selectedPeriod}]</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No active tax returns are currently set for this period. You can self-assign any applicable BIR forms at any time.
              </p>
              <button
                onClick={() => setIsManageFormsModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Assign BIR Forms to My Profile</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeForms.map((form) => {
                const statusInfo = getComplianceStatusInfo(form.status);
                const effectiveDeadline = form.deadline || getEffectiveDeadline(form, formReferences, selectedPeriod);

                return (
                  <div 
                    key={form.id || form.code}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 bg-slate-50/50 dark:bg-slate-800/30 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      
                      <div className="flex items-start space-x-3">
                        <div className="px-3 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-black text-sm shrink-0">
                          {form.code}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{form.description}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Deadline: <strong className="text-slate-800 dark:text-slate-200 font-mono">{effectiveDeadline}</strong></span>
                            <span>•</span>
                            <span>Assigned Period: <strong className="text-slate-800 dark:text-slate-200">{form.assignedPeriod || selectedPeriod}</strong></span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 ${statusInfo.badgeBg} ${statusInfo.badgeText} ${statusInfo.badgeBorder}`}>
                          <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`} />
                          <span>{statusInfo.text}</span>
                        </span>

                        {/* Amount Badge */}
                        <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
                          {form.amount ? `₱${form.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'W/O Payable'}
                        </div>

                        {/* Unassign obligation button */}
                        {onRemoveFormFromClient && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Unassign BIR ${form.code} from your compliance profile?`)) {
                                onRemoveFormFromClient(activeClient.id, form.id, form.code);
                                setAssignmentSuccessToast(`Unassigned BIR Form ${form.code}`);
                                setTimeout(() => setAssignmentSuccessToast(null), 3000);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Unassign form obligation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>

                    {/* Extended Details & References */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      
                      {/* Reference No */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">eFPS / Filing Ref No.</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {form.referenceNo || 'Awaiting Filing'}
                          </span>
                        </div>
                        {form.referenceNo && (
                          <button
                            onClick={() => handleCopyText(form.referenceNo!, form.code + '-ref')}
                            className="p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                            title="Copy Reference Number"
                          >
                            {copiedField === form.code + '-ref' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Confirmation No */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">BIR Confirmation Code</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {form.confirmationNo || 'Pending Confirmation'}
                          </span>
                        </div>
                        {form.confirmationNo && (
                          <button
                            onClick={() => handleCopyText(form.confirmationNo!, form.code + '-conf')}
                            className="p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                            title="Copy Confirmation Code"
                          >
                            {copiedField === form.code + '-conf' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Action / Payment Submission */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Client Action</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {form.status === 'Paid' ? 'Payment Verified' : form.status === 'Filed' ? 'Filing Complete' : 'Submit Bank Reference'}
                          </span>
                        </div>
                        {form.status !== 'Paid' && form.status !== 'Filed' && (
                          <button
                            onClick={() => setPaymentReceiptForm(form)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Send Receipt</span>
                          </button>
                        )}
                      </div>

                    </div>

                    {form.notes && (
                      <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl text-xs text-blue-900 dark:text-blue-300">
                        <strong>CPA Note:</strong> {form.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contact Assigned CPA & Client Advisory Desk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card 1: Assigned Tax Advisory Team */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Assigned Compliance Advisory Firm</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">BIZ-COMPLY Certified Tax & Accounting Services</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Lead CPA Officer:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Gerald (Super Admin CPA)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Advisory Email:</span>
                <span className="font-mono text-blue-500 font-bold">compliance@bizcomply.ph</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service SLA:</span>
                <span className="text-emerald-500 font-bold">Direct eFPS BIR Submission</span>
              </div>
            </div>
          </div>

          {/* Card 2: Submit Direct Request / Document Note */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Direct Client Support Request</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Send notes, payment confirmation numbers, or document requests to your CPA</p>
              </div>
            </div>

            {supportSentMsg ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Your request has been delivered to your handling CPA team!</span>
              </div>
            ) : (
              <form onSubmit={handleSendSupportMessage} className="space-y-3">
                <textarea
                  rows={2}
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="e.g. Please send the BIR payment confirmation receipt for Form 2550Q..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message to Accountant</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </main>

      {/* Payment Reference Modal */}
      {paymentReceiptForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800 space-y-4">
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Submit Payment Details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">BIR Form: {paymentReceiptForm.code} ({paymentReceiptForm.description})</p>
              </div>
            </div>

            <form onSubmit={handleSavePaymentReceipt} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Reference Number / eFPS Confirmation
                </label>
                <input
                  type="text"
                  required
                  value={paymentRefInput}
                  onChange={(e) => setPaymentRefInput(e.target.value)}
                  placeholder="e.g. LBP-REF-99281203"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes for CPA (Optional)
                </label>
                <textarea
                  rows={2}
                  value={paymentNotesInput}
                  onChange={(e) => setPaymentNotesInput(e.target.value)}
                  placeholder="e.g. Paid via Landbank ePayment on August 5..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPaymentReceiptForm(null)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  Submit Payment
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Toast Notification for Form Assignment */}
      {assignmentSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 font-bold text-xs animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{assignmentSuccessToast}</span>
        </div>
      )}

      {/* Self-Manage BIR Form Obligations Modal */}
      {isManageFormsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800 space-y-5 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Self-Assign BIR Tax Obligations</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select and assign BIR form compliance requirements applicable to {activeClient.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsManageFormsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={formSearchQuery}
                onChange={(e) => setFormSearchQuery(e.target.value)}
                placeholder="Search by form code or description (e.g. 2550Q, 1701Q, Withholding Tax)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Form Reference List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {formReferences
                .filter(ref => 
                  ref.code.toLowerCase().includes(formSearchQuery.toLowerCase()) ||
                  ref.description.toLowerCase().includes(formSearchQuery.toLowerCase())
                )
                .map(formRef => {
                  const existingForm = activeClient.forms.find(f => f.code === formRef.code);
                  const isAssigned = !!existingForm;

                  return (
                    <div 
                      key={formRef.id || formRef.code}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isAssigned 
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50' 
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="px-2.5 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-black text-xs shrink-0 mt-0.5">
                          {formRef.code}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{formRef.description}</h4>
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                              {formRef.frequency || 'Quarterly'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Standard BIR Deadline: <span className="font-mono">{formRef.defaultDeadlineRule || '15th/25th of month'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 self-end sm:self-center">
                        {isAssigned ? (
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold">
                              <Check className="w-3.5 h-3.5" />
                              <span>Assigned</span>
                            </span>
                            {onRemoveFormFromClient && existingForm && (
                              <button
                                onClick={() => {
                                  onRemoveFormFromClient(activeClient.id, existingForm.id, formRef.code);
                                  setAssignmentSuccessToast(`Removed ${formRef.code} from compliance list`);
                                  setTimeout(() => setAssignmentSuccessToast(null), 3000);
                                }}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (onAddFormToClient) {
                                onAddFormToClient(activeClient.id, formRef, undefined, selectedPeriod, selectedPeriod);
                                setAssignmentSuccessToast(`Assigned ${formRef.code} to your tax profile!`);
                                setTimeout(() => setAssignmentSuccessToast(null), 3000);
                              }
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign Obligation</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>{activeClient.forms.length} BIR forms currently assigned to your taxpayer account</span>
              <button
                onClick={() => setIsManageFormsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
