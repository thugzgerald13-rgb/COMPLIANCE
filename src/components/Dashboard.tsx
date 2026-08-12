import React, { useState, useEffect } from 'react';
import { Client, FormReference, FormStatus, BIRForm } from '../types';
import { Users, FileClock, CheckCircle, AlertCircle, Calendar, Edit3, X, Save, FileText, Building, Check, Bell, Mail, ShieldAlert, Clock, AlertTriangle, CheckCircle2, Lock, ShieldCheck, Search, ArrowRight, ExternalLink } from 'lucide-react';
import { getComplianceStatusInfo, getFormsForClientAndPeriod } from '../utils';
import { 
  getDueFormsForNotification, 
  loadNotificationSettings, 
  dispatchAutomatedNotifications,
  NotificationSettings 
} from '../utils/notificationService';
import { NotificationHubModal } from './NotificationHubModal';
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
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => 
    loadNotificationSettings(user?.email)
  );

  // Modals state for Pending and In Processing references
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isInProcessingModalOpen, setIsInProcessingModalOpen] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [processingSearchQuery, setProcessingSearchQuery] = useState('');

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

  const pendingFormsList = allForms
    .filter(f => f.status === 'Pending')
    .sort((a, b) => new Date(a.deadline || '').getTime() - new Date(b.deadline || '').getTime());

  const processingFormsList = allForms
    .filter(f => f.status === 'Processing')
    .sort((a, b) => new Date(a.deadline || '').getTime() - new Date(b.deadline || '').getTime());

  const filteredPendingForms = pendingFormsList.filter(f => 
    !pendingSearchQuery || 
    f.clientName.toLowerCase().includes(pendingSearchQuery.toLowerCase()) ||
    f.clientTin.includes(pendingSearchQuery) ||
    f.code.toLowerCase().includes(pendingSearchQuery.toLowerCase()) ||
    f.description.toLowerCase().includes(pendingSearchQuery.toLowerCase())
  );

  const filteredProcessingForms = processingFormsList.filter(f => 
    !processingSearchQuery || 
    f.clientName.toLowerCase().includes(processingSearchQuery.toLowerCase()) ||
    f.clientTin.includes(processingSearchQuery) ||
    f.code.toLowerCase().includes(processingSearchQuery.toLowerCase()) ||
    f.description.toLowerCase().includes(processingSearchQuery.toLowerCase())
  );

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

  const companyDisplayName = user?.companyInfo?.companyName || user?.name || 'Compliance Officer';

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{companyDisplayName} - Dashboard Overview</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">Click any Pending or In Processing stat card below to open its compliance references modal</p>
        </div>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => {
          return (
            <div 
              key={i} 
              onClick={() => {
                if (stat.id === 'Pending') setIsPendingModalOpen(true);
                else if (stat.id === 'Processing') setIsInProcessingModalOpen(true);
                else setFilterStatus('all');
              }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 p-6 flex items-center justify-between transition-all cursor-pointer group hover:shadow-md"
              title={stat.id === 'Pending' ? 'Click to view Pending References Modal' : stat.id === 'Processing' ? 'Click to view In Processing References Modal' : undefined}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bg} group-hover:scale-105 transition-transform`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{stat.value}</span>
                    {(stat.id === 'Pending' || stat.id === 'Processing') && (
                      <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        Open Modal
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: PENDING REFERENCES MODAL */}
      {isPendingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Pending BIR Tax References</span>
                    <span className="text-xs bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-800 font-mono">
                      {pendingFormsList.length} Total
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Period: [{selectedPeriod}] • Click any row or use quick controls to update compliance status
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search client or form..."
                    value={pendingSearchQuery}
                    onChange={(e) => setPendingSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-48"
                  />
                </div>

                <button
                  onClick={() => setIsPendingModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="p-4 sm:p-6 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
              {filteredPendingForms.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No pending references found!</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">All forms for this period are either in processing or filed.</p>
                </div>
              ) : (
                filteredPendingForms.map((item) => {
                  const deadlineInfo = getComplianceStatusInfo(item, item.deadline);
                  const refDesc = formReferences.find(r => r.code === item.code)?.description;

                  return (
                    <div 
                      key={`pending-modal-${item.clientId}-${item.id || item.code}`}
                      onClick={() => handleOpenEditModal(item)}
                      className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer group gap-3"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 flex items-center justify-center text-red-700 dark:text-red-300 font-bold text-xs shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                          {item.code}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{item.clientName}</span>
                            <span className="text-[11px] font-mono text-slate-400">({item.clientTin})</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{refDesc || item.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border ${deadlineInfo.color}`}>
                          {deadlineInfo.label} ({new Date(item.deadline || '').toLocaleDateString()})
                        </div>

                        {/* Tax Payable Choice */}
                        <select
                          value={item.taxStatus || ''}
                          onChange={(e) => {
                            const newTaxStatus = e.target.value as 'With Payable' | 'W/O Payable';
                            const updates: Partial<BIRForm> = { taxStatus: newTaxStatus };
                            if (newTaxStatus === 'W/O Payable') {
                              updates.status = item.dateFiled ? 'Filed' : 'Processing';
                            }
                            if (onUpdateForm) {
                              onUpdateForm(item.clientId, item.id, updates, {
                                code: item.code,
                                description: item.description,
                                deadline: item.deadline || '',
                                period: item.period || selectedPeriod,
                                assignedPeriod: item.assignedPeriod
                              });
                            }
                            if (newTaxStatus === 'With Payable') {
                              handleOpenEditModal({ ...item, taxStatus: 'With Payable' });
                            }
                          }}
                          className="text-xs font-bold rounded-lg px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                          {!item.taxStatus && <option value="" disabled>Select Payable</option>}
                          <option value="With Payable">With Payable</option>
                          <option value="W/O Payable">W/O Payable</option>
                        </select>

                        {/* Quick Edit */}
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {/* Status Select */}
                        <select
                          value={item.status}
                          onChange={(e) => handleQuickStatusChange(e, item)}
                          className="text-xs font-bold rounded-lg px-2 py-1 bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-none cursor-pointer"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">In Processing</option>
                          <option value="Filed">Filed</option>
                          {item.taxStatus !== 'W/O Payable' && <option value="Paid">Paid</option>}
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-xs text-slate-500 font-mono">
                Showing {filteredPendingForms.length} of {pendingFormsList.length} Pending
              </span>
              <button
                onClick={() => setIsPendingModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: IN PROCESSING REFERENCES MODAL */}
      {isInProcessingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FileClock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>In Processing BIR Tax References</span>
                    <span className="text-xs bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-mono">
                      {processingFormsList.length} Total
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Period: [{selectedPeriod}] • Click any row or use quick controls to update compliance status
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search client or form..."
                    value={processingSearchQuery}
                    onChange={(e) => setProcessingSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-48"
                  />
                </div>

                <button
                  onClick={() => setIsInProcessingModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="p-4 sm:p-6 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
              {filteredProcessingForms.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No in-processing references found!</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">All assigned forms are either pending or completed/filed.</p>
                </div>
              ) : (
                filteredProcessingForms.map((item) => {
                  const deadlineInfo = getComplianceStatusInfo(item, item.deadline);
                  const refDesc = formReferences.find(r => r.code === item.code)?.description;

                  return (
                    <div 
                      key={`processing-modal-${item.clientId}-${item.id || item.code}`}
                      onClick={() => handleOpenEditModal(item)}
                      className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer group gap-3"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-xs shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                          {item.code}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{item.clientName}</span>
                            <span className="text-[11px] font-mono text-slate-400">({item.clientTin})</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{refDesc || item.description}</p>
                          {item.notes && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 italic truncate">Note: {item.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border ${deadlineInfo.color}`}>
                          {deadlineInfo.label} ({new Date(item.deadline || '').toLocaleDateString()})
                        </div>

                        {/* Tax Payable Choice */}
                        <select
                          value={item.taxStatus || ''}
                          onChange={(e) => {
                            const newTaxStatus = e.target.value as 'With Payable' | 'W/O Payable';
                            const updates: Partial<BIRForm> = { taxStatus: newTaxStatus };
                            if (newTaxStatus === 'W/O Payable') {
                              updates.status = item.dateFiled ? 'Filed' : 'Processing';
                            }
                            if (onUpdateForm) {
                              onUpdateForm(item.clientId, item.id, updates, {
                                code: item.code,
                                description: item.description,
                                deadline: item.deadline || '',
                                period: item.period || selectedPeriod,
                                assignedPeriod: item.assignedPeriod
                              });
                            }
                            if (newTaxStatus === 'With Payable') {
                              handleOpenEditModal({ ...item, taxStatus: 'With Payable' });
                            }
                          }}
                          className="text-xs font-bold rounded-lg px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                          {!item.taxStatus && <option value="" disabled>Select Payable</option>}
                          <option value="With Payable">With Payable</option>
                          <option value="W/O Payable">W/O Payable</option>
                        </select>

                        {/* Date Filed inline if W/O Payable */}
                        {item.taxStatus === 'W/O Payable' ? (
                          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
                            <span className="text-[10px] font-bold text-slate-500">Filed:</span>
                            <input
                              type="date"
                              value={item.dateFiled || ''}
                              onChange={(e) => {
                                const dateVal = e.target.value;
                                if (onUpdateForm) {
                                  onUpdateForm(item.clientId, item.id, {
                                    dateFiled: dateVal || undefined,
                                    status: dateVal ? 'Filed' : 'Processing'
                                  }, {
                                    code: item.code,
                                    description: item.description,
                                    deadline: item.deadline || '',
                                    period: item.period || selectedPeriod,
                                    assignedPeriod: item.assignedPeriod
                                  });
                                }
                              }}
                              className="text-xs bg-transparent border-none p-0 text-slate-800 dark:text-slate-100 font-medium focus:outline-none"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}

                        {/* Status Select */}
                        <select
                          value={item.status}
                          onChange={(e) => handleQuickStatusChange(e, item)}
                          className="text-xs font-bold rounded-lg px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-none cursor-pointer"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">In Processing</option>
                          <option value="Filed">Filed</option>
                          {item.taxStatus !== 'W/O Payable' && <option value="Paid">Paid</option>}
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-xs text-slate-500 font-mono">
                Showing {filteredProcessingForms.length} of {processingFormsList.length} In Processing
              </span>
              <button
                onClick={() => setIsInProcessingModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reference Modal */}
      {editingForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
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

      {/* End Dashboard */}
    </div>
  );
}
