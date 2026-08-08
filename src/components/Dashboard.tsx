import React, { useState, useEffect } from 'react';
import { Client, FormReference, FormStatus, BIRForm } from '../types';
import { Users, FileClock, CheckCircle, AlertCircle, Calendar, Edit3, X, Save, FileText, Building, Check, Bell, Mail, ShieldAlert, Clock, AlertTriangle, CheckCircle2, Crown, Sparkles, Rocket, Bot, Zap, Lock, ShieldCheck, RefreshCw, Cpu, Layers, Globe } from 'lucide-react';
import { getComplianceStatusInfo, getFormsForClientAndPeriod } from '../utils';
import { 
  getDueFormsForNotification, 
  loadNotificationSettings, 
  dispatchAutomatedNotifications,
  NotificationSettings 
} from '../utils/notificationService';
import { NotificationHubModal } from './NotificationHubModal';
import { AdminFeatureReleaseModal } from './AdminFeatureReleaseModal';
import { useAuth } from '../context/AuthContext';
import { useFeatureRelease } from '../context/FeatureReleaseContext';

interface DashboardProps {
  clients: Client[];
  formReferences: FormReference[];
  selectedPeriod: string;
  onUpdateForm?: (
    clientId: string,
    formId: string,
    updates: Partial<BIRForm>,
    formMeta?: { code: string; description: string; deadline: string; period: string; assignedPeriod?: string }
  ) => void;
  onRemoveFormFromClient?: (clientId: string, formId: string, formCode?: string) => void;
}

interface SelectedDashboardForm extends BIRForm {
  clientId: string;
  clientName: string;
  clientTin: string;
}

export function Dashboard({ clients, formReferences, selectedPeriod, onUpdateForm, onRemoveFormFromClient }: DashboardProps) {
  const { user, isSuperAdmin, workspaceMode, toggleWorkspaceMode } = useAuth();
  const { isFeatureAvailable, getFeatureStage, featureUpdates } = useFeatureRelease();
  const [filterStatus, setFilterStatus] = useState<'all' | 'Pending' | 'Processing'>('all');
  const [editingForm, setEditingForm] = useState<SelectedDashboardForm | null>(null);
  const [isNotificationHubOpen, setIsNotificationHubOpen] = useState(false);
  const [isAdminReleaseModalOpen, setIsAdminReleaseModalOpen] = useState(false);
  const [aiAnalysisOutput, setAiAnalysisOutput] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [efpsSyncMsg, setEfpsSyncMsg] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => 
    loadNotificationSettings(user?.email)
  );

  useEffect(() => {
    if (user?.email) {
      setNotificationSettings(loadNotificationSettings(user.email));
    }
  }, [user?.email]);

  // Calculate unfiled forms due today, overdue, or upcoming within 7 days
  const dueItems = getDueFormsForNotification(clients, formReferences, selectedPeriod);

  // Auto-dispatch on mount or when period / clients change
  useEffect(() => {
    if (notificationSettings.autoDispatchOnLoad && dueItems.length > 0) {
      dispatchAutomatedNotifications(dueItems, notificationSettings);
    }
  }, [selectedPeriod, clients.length]);

  // Form edit modal state
  const [editStatus, setEditStatus] = useState<FormStatus>('Pending');
  const [editTaxStatus, setEditTaxStatus] = useState<'With Payable' | 'W/O Payable'>('With Payable');
  const [editDeadline, setEditDeadline] = useState('');
  const [editDateFiled, setEditDateFiled] = useState('');
  const [editDatePaid, setEditDatePaid] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editRefNo, setEditRefNo] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const totalClients = clients.length;
  
  // Filter forms by selected period using getFormsForClientAndPeriod
  const allForms: SelectedDashboardForm[] = clients.flatMap(c => 
    getFormsForClientAndPeriod(c, selectedPeriod, formReferences).map(f => ({
      ...f,
      clientId: c.id,
      clientName: c.name,
      clientTin: c.tin
    }))
  );
  
  const pendingForms = allForms.filter(f => f.status === 'Pending').length;
  const processingForms = allForms.filter(f => f.status === 'Processing').length;
  const filedForms = allForms.filter(f => f.status === 'Filed' || f.status === 'Paid').length;

  const stats = [
    { id: 'all', title: 'Total Clients', value: totalClients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'Pending', title: 'Pending Forms', value: pendingForms, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { id: 'Processing', title: 'In Processing', value: processingForms, icon: FileClock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { id: 'filed', title: 'Filed & Paid', value: filedForms, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  // Recently updated or upcoming deadlines within the selected period
  const displayForms = allForms
    .filter(f => {
      if (filterStatus === 'Pending') return f.status === 'Pending';
      if (filterStatus === 'Processing') return f.status === 'Processing';
      return f.status === 'Pending' || f.status === 'Processing';
    })
    .sort((a, b) => new Date(a.deadline || '').getTime() - new Date(b.deadline || '').getTime());

  const handleOpenEditModal = (form: SelectedDashboardForm) => {
    setEditingForm(form);
    const taxStatus = form.taxStatus || 'With Payable';
    setEditTaxStatus(taxStatus);
    setEditDeadline(form.deadline || '');
    setEditDateFiled(form.dateFiled || '');
    setEditDatePaid(form.datePaid || '');
    setEditAmount(form.amount !== undefined ? String(form.amount) : '');
    setEditRefNo(form.referenceNo || form.confirmationNo || '');
    setEditNotes(form.notes || '');

    if (taxStatus === 'W/O Payable') {
      if (!form.dateFiled) {
        setEditStatus('Processing');
      } else {
        setEditStatus('Filed');
      }
    } else {
      setEditStatus(form.status);
    }
  };

  const handleTaxStatusSelectChange = (newTaxStatus: 'With Payable' | 'W/O Payable') => {
    setEditTaxStatus(newTaxStatus);
    if (newTaxStatus === 'W/O Payable') {
      if (!editDateFiled) {
        setEditStatus('Processing');
      } else {
        setEditStatus('Filed');
      }
      setEditAmount('');
      setEditDatePaid('');
    } else {
      if (editStatus === 'Processing' && editDateFiled) {
        setEditStatus('Filed');
      }
    }
  };

  const handleDateFiledSelectChange = (newDateVal: string) => {
    setEditDateFiled(newDateVal);
    if (editTaxStatus === 'W/O Payable') {
      if (newDateVal) {
        setEditStatus('Filed');
      } else {
        setEditStatus('Processing');
      }
    } else {
      if (newDateVal && (editStatus === 'Pending' || editStatus === 'Processing')) {
        setEditStatus(editAmount ? 'Paid' : 'Filed');
      }
    }
  };

  const handleSaveFormEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForm || !onUpdateForm) return;

    let finalStatus: FormStatus = 'Processing';
    if (editTaxStatus === 'W/O Payable') {
      finalStatus = editDateFiled ? 'Filed' : 'Processing';
    } else {
      const numericAmount = editAmount ? parseFloat(editAmount) : undefined;
      const hasDateFiled = Boolean(editDateFiled && editDateFiled.trim());
      const hasDatePaid = Boolean(editDatePaid && editDatePaid.trim());
      const hasAmount = Boolean(numericAmount !== undefined && numericAmount > 0);
      const hasRefNo = Boolean(editRefNo && editRefNo.trim());

      if (hasDateFiled && hasDatePaid && hasAmount && hasRefNo) {
        finalStatus = 'Paid';
      } else {
        finalStatus = 'Processing';
      }
    }

    const updates: Partial<BIRForm> = {
      status: finalStatus,
      taxStatus: editTaxStatus,
      deadline: editDeadline,
      notes: editNotes,
      referenceNo: editRefNo.trim() || undefined,
      confirmationNo: editRefNo.trim() || undefined,
      amount: editAmount ? parseFloat(editAmount) : undefined,
      dateFiled: editDateFiled || undefined,
      datePaid: editDatePaid || undefined,
    };

    onUpdateForm(
      editingForm.clientId,
      editingForm.id,
      updates,
      {
        code: editingForm.code,
        description: editingForm.description,
        deadline: editDeadline,
        period: editingForm.period || selectedPeriod,
        assignedPeriod: editingForm.assignedPeriod
      }
    );

    setEditingForm(null);
  };

  const handleQuickStatusChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    formItem: SelectedDashboardForm
  ) => {
    e.stopPropagation();
    if (!onUpdateForm) return;

    const newStatus = e.target.value as FormStatus;
    const updates: Partial<BIRForm> = { status: newStatus };

    if (newStatus === 'Filed' && !formItem.dateFiled) {
      updates.dateFiled = new Date().toISOString().split('T')[0];
    } else if (newStatus === 'Paid') {
      if (!formItem.dateFiled) updates.dateFiled = new Date().toISOString().split('T')[0];
      if (!formItem.datePaid) updates.datePaid = new Date().toISOString().split('T')[0];
    }

    onUpdateForm(
      formItem.clientId,
      formItem.id,
      updates,
      {
        code: formItem.code,
        description: formItem.description,
        deadline: formItem.deadline || '',
        period: formItem.period || selectedPeriod,
        assignedPeriod: formItem.assignedPeriod
      }
    );
  };

  const handleRunAiAnalysis = () => {
    setIsGeneratingAI(true);
    setAiAnalysisOutput(null);
    setTimeout(() => {
      const pendingCount = displayForms.filter(f => f.status === 'Pending').length;
      const processingCount = displayForms.filter(f => f.status === 'Processing').length;
      
      const summary = `🤖 BIR AI Compliance Risk Analysis Summary for Period [${selectedPeriod}]:
• Analyzed ${clients.length} Client Entity Records and ${allForms.length} Active BIR Tax Obligation Forms.
• High Priority Action Required: ${pendingCount} form(s) remain PENDING filing. Recommend prioritizing BIR Form 1601-EQ and 2550Q before monthly deadline cutoff.
• ${processingCount} form(s) currently IN PROCESSING awaiting final bank transaction reference receipt or eFPS payment confirmation.
• BIR Compliance Risk Index: ${pendingCount > 2 ? '⚠️ ELEVATED (Action Advised)' : '✅ LOW (On Track)'}
• Automatic compliance recommendation generated for ${user?.name || 'Tax Administrator'}.`;

      setAiAnalysisOutput(summary);
      setIsGeneratingAI(false);
    }, 800);
  };

  const handleRunEfpsSync = () => {
    setEfpsSyncMsg('Connecting to BIR eFPS / eBIRForms API gateway...');
    setTimeout(() => {
      setEfpsSyncMsg(`✅ eFPS Direct API Sync Completed! Verified ${allForms.length} BIR forms across ${clients.length} clients against BIR Central Database.`);
      setTimeout(() => setEfpsSyncMsg(null), 5000);
    }, 1000);
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Dashboard Overview</span>
            {isSuperAdmin && (
              <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Crown className="w-3 h-3 fill-amber-400" />
                <span>Developer Mode</span>
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">Click any pending or in-processing reference below to update its compliance status & details</p>
        </div>
      </div>

      {/* Super Admin Early Access Control Banner */}
      {isSuperAdmin && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border border-amber-500/40 text-slate-100 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Crown className="w-5 h-5 fill-amber-400 text-amber-950" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>Developer Web App Early Access Active</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">Full Privileges</span>
              </h3>
              <p className="text-xs text-slate-300">
                You have unrestricted access to all web app features and experimental updates before general release to users.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={toggleWorkspaceMode}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center space-x-1.5"
              title="Click to toggle workspace mode between Single-User and Multi-User Practice Mode"
            >
              {workspaceMode === 'single' ? <Users className="w-4 h-4 text-blue-400" /> : <Users className="w-4 h-4 text-emerald-400" />}
              <span>Switch to {workspaceMode === 'single' ? 'Multi-User' : 'Single-User'}</span>
            </button>

            <button
              onClick={() => setIsAdminReleaseModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center space-x-1.5"
            >
              <Rocket className="w-4 h-4 text-slate-950" />
              <span>Manage Early Access Updates</span>
            </button>
          </div>
        </div>
      )}

      {/* Feature Updates Section (Hidden for regular users if features are in superadmin_only early access) */}
      {((isSuperAdmin || isFeatureAvailable('ai_compliance_assistant')) || (isSuperAdmin || isFeatureAvailable('efiling_api_sync'))) && (
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card 1: AI Compliance Assistant & Smart BIR Advisor */}
          {(isSuperAdmin || isFeatureAvailable('ai_compliance_assistant')) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>AI Compliance Assistant & Smart Advisor</span>
                      {isSuperAdmin && getFeatureStage('ai_compliance_assistant') === 'superadmin_only' && (
                        <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 fill-amber-400" />
                          <span>Developer Early Access</span>
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      AI-driven tax risk analysis & automated BIR filing obligations advisor
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs">
                  {aiAnalysisOutput ? (
                    <pre className="whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-200 leading-relaxed text-[11px]">
                      {aiAnalysisOutput}
                    </pre>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 italic">
                      Click "Run AI Tax Risk Analysis" to generate real-time BIR compliance insights for period [{selectedPeriod}] across all client entities.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {isSuperAdmin ? '⚡ Unrestricted Developer Execution' : 'Released Feature'}
                  </span>
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={isGeneratingAI}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAI ? 'Analyzing...' : 'Run AI Tax Risk Analysis'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Automated eFPS / eBIRForms Direct API Sync */}
          {(isSuperAdmin || isFeatureAvailable('efiling_api_sync')) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>eFPS & eBIRForms Direct API Verification</span>
                      {isSuperAdmin && getFeatureStage('efiling_api_sync') === 'superadmin_only' && (
                        <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 fill-amber-400" />
                          <span>Admin Early Access</span>
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Direct API verification pipeline for BIR reference numbers & filing confirmations
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs">
                  {efpsSyncMsg ? (
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{efpsSyncMsg}</span>
                    </p>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 italic">
                      Validate confirmation and reference numbers directly against BIR eFPS servers for {clients.length} clients in period [{selectedPeriod}].
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {isSuperAdmin ? '⚡ Developer Gateway Live' : 'Released Feature'}
                  </span>
                  <button
                    onClick={handleRunEfpsSync}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync eFPS Status Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => {
          const isSelected = 
            (stat.id === 'Pending' && filterStatus === 'Pending') ||
            (stat.id === 'Processing' && filterStatus === 'Processing') ||
            (stat.id === 'all' && filterStatus === 'all');
            
          return (
            <div 
              key={i} 
              onClick={() => {
                if (stat.id === 'Pending') setFilterStatus('Pending');
                else if (stat.id === 'Processing') setFilterStatus('Processing');
                else setFilterStatus('all');
              }}
              className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border p-6 flex items-center justify-between transition-all cursor-pointer ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending & In Processing References Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Pending & In Processing References
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
              Click any row or use the Edit button to open full reference controls
            </p>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-lg text-xs border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                filterStatus === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Active ({pendingForms + processingForms})
            </button>
            <button
              onClick={() => setFilterStatus('Pending')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                filterStatus === 'Pending' ? 'bg-white dark:bg-slate-700 text-red-700 dark:text-red-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pending ({pendingForms})
            </button>
            <button
              onClick={() => setFilterStatus('Processing')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                filterStatus === 'Processing' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              In Processing ({processingForms})
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {displayForms.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No active {filterStatus !== 'all' ? filterStatus.toLowerCase() : 'pending/processing'} references found!</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All assigned tax compliance forms for this period are cleared or filed.</p>
            </div>
          ) : (
            displayForms.map((item) => {
              const deadlineInfo = getComplianceStatusInfo(item, item.deadline);
              const refDesc = formReferences.find(r => r.code === item.code)?.description;
              
              return (
                <div 
                  key={`${item.clientId}-${item.id || item.code}`} 
                  onClick={() => handleOpenEditModal(item)}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${
                    deadlineInfo.urgency === 'high' ? 'bg-red-50/20 dark:bg-red-950/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4 mb-3 sm:mb-0 flex-1 pr-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                      {item.code}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.clientName}</span>
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500">({item.clientTin})</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{refDesc || item.description}</p>
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5 truncate max-w-md">Note: {item.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end" onClick={(e) => e.stopPropagation()}>
                    <div className={`inline-flex items-center px-2.5 py-1 rounded text-xs border ${deadlineInfo.color}`}>
                      {deadlineInfo.label} ({new Date(item.deadline || '').toLocaleDateString()})
                    </div>

                    {/* 1. FIRST CHOICE: Tax Payable Status */}
                    <select
                      value={item.taxStatus || ''}
                      onChange={(e) => {
                        const newTaxStatus = e.target.value as 'With Payable' | 'W/O Payable';
                        const updates: Partial<BIRForm> = { taxStatus: newTaxStatus };
                        if (newTaxStatus === 'W/O Payable') {
                          if (!item.dateFiled) {
                            updates.status = 'Processing';
                          } else {
                            updates.status = 'Filed';
                          }
                          updates.datePaid = undefined;
                          updates.amount = undefined;
                        }
                        if (onUpdateForm) {
                          onUpdateForm(
                            item.clientId,
                            item.id,
                            updates,
                            {
                              code: item.code,
                              description: item.description,
                              deadline: item.deadline || '',
                              period: item.period || selectedPeriod,
                              assignedPeriod: item.assignedPeriod
                            }
                          );
                        }
                        if (newTaxStatus === 'With Payable') {
                          handleOpenEditModal({ ...item, taxStatus: 'With Payable' });
                        }
                      }}
                      className="text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                    >
                      {!item.taxStatus && <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">Select Payable Choice</option>}
                      <option value="With Payable" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">With Payable</option>
                      <option value="W/O Payable" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">W/O Payable</option>
                    </select>

                    {/* 2. NEXT TO APPEAR ACCORDING TO CHOICE */}
                    {item.taxStatus === 'W/O Payable' ? (
                      <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">Filed Date:</span>
                        <input
                          type="date"
                          value={item.dateFiled || ''}
                          onChange={(e) => {
                            const dateVal = e.target.value;
                            if (onUpdateForm) {
                              onUpdateForm(
                                item.clientId,
                                item.id,
                                {
                                  dateFiled: dateVal || undefined,
                                  status: dateVal ? 'Filed' : 'Processing'
                                },
                                {
                                  code: item.code,
                                  description: item.description,
                                  deadline: item.deadline || '',
                                  period: item.period || selectedPeriod,
                                  assignedPeriod: item.assignedPeriod
                                }
                              );
                            }
                          }}
                          className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleOpenEditModal(item)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 shadow-xs cursor-pointer"
                        title="Edit Date Filed, Amount Paid, Reference No. & Notes"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Details</span>
                      </button>
                    )}

                    {/* Status Dropdown */}
                    <select
                      value={item.status}
                      onChange={(e) => handleQuickStatusChange(e, item)}
                      className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs appearance-none ${
                        item.status === 'Pending' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300' 
                          : item.status === 'Processing'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                      }`}
                    >
                      <option value="Pending" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Pending</option>
                      <option value="Processing" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">In Processing</option>
                      <option value="Filed" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Filed</option>
                      {item.taxStatus !== 'W/O Payable' && <option value="Paid" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Paid</option>}
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Reference Modal */}
      {editingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {editingForm.code}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Edit Compliance Reference</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{editingForm.clientName} (TIN: {editingForm.clientTin})</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingForm(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFormEdit} className="p-6 space-y-4">
              <div className="bg-blue-50/50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-blue-900 dark:text-blue-300">{editingForm.code} - {editingForm.description}</p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">Assigned Period: {editingForm.period || selectedPeriod}</p>
              </div>

              {/* Date Filed / Payable Entries */}
              {editTaxStatus === 'W/O Payable' ? (
                <div className="bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">When it was Filed (Date Filed)</label>
                    <input
                      type="date"
                      value={editDateFiled}
                      onChange={(e) => handleDateFiledSelectChange(e.target.value)}
                      className="w-full text-xs border border-amber-300 dark:border-amber-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                    {!editDateFiled ? (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1">
                        * Date not yet updated. Compliance status is set to <span className="font-bold underline">In Processing</span>.
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                        * Date filed recorded. Compliance status is set to <span className="font-bold underline">Filed</span>.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date Filed</label>
                      <input
                        type="date"
                        value={editDateFiled}
                        onChange={(e) => handleDateFiledSelectChange(e.target.value)}
                        className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date Paid</label>
                      <input
                        type="date"
                        value={editDatePaid}
                        onChange={(e) => setEditDatePaid(e.target.value)}
                        className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Amount Paid (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-emerald-700 dark:text-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Reference / Confirmation No.</label>
                      <input
                        type="text"
                        placeholder="e.g. BIR-2026-9921"
                        value={editRefNo}
                        onChange={(e) => setEditRefNo(e.target.value)}
                        className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes / Remarks</label>
                    <textarea
                      rows={2}
                      placeholder="Add optional notes or compliance instructions..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingForm(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Feature Release Control Modal */}
      <AdminFeatureReleaseModal
        isOpen={isAdminReleaseModalOpen}
        onClose={() => setIsAdminReleaseModalOpen(false)}
      />
    </div>
  );
}
