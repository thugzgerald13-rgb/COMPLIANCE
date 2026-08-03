import React, { useState, useEffect } from 'react';
import { Client, FormReference, FormStatus, BIRForm } from '../types';
import { Users, FileClock, CheckCircle, AlertCircle, Calendar, Edit3, X, Save, FileText, Building, Check, Bell, Mail, Phone, Send, ShieldAlert, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getComplianceStatusInfo, getFormsForClientAndPeriod } from '../utils';
import { 
  getDueFormsForNotification, 
  loadNotificationSettings, 
  dispatchAutomatedNotifications,
  NotificationSettings 
} from '../utils/notificationService';
import { NotificationHubModal } from './NotificationHubModal';
import { useAuth } from '../context/AuthContext';

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
}

interface SelectedDashboardForm extends BIRForm {
  clientId: string;
  clientName: string;
  clientTin: string;
}

export function Dashboard({ clients, formReferences, selectedPeriod, onUpdateForm }: DashboardProps) {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<'all' | 'Pending' | 'Processing'>('all');
  const [editingForm, setEditingForm] = useState<SelectedDashboardForm | null>(null);
  const [isNotificationHubOpen, setIsNotificationHubOpen] = useState(false);
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
    setEditStatus(form.status);
    setEditTaxStatus(form.taxStatus || 'With Payable');
    setEditDeadline(form.deadline || '');
    setEditDateFiled(form.dateFiled || new Date().toISOString().split('T')[0]);
    setEditDatePaid(form.datePaid || new Date().toISOString().split('T')[0]);
    setEditAmount(form.amount !== undefined ? String(form.amount) : '');
    setEditRefNo(form.referenceNo || form.confirmationNo || '');
    setEditNotes(form.notes || '');
  };

  const handleSaveFormEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForm || !onUpdateForm) return;

    const updates: Partial<BIRForm> = {
      status: editStatus,
      taxStatus: editTaxStatus,
      deadline: editDeadline,
      notes: editNotes,
      referenceNo: editRefNo,
      amount: editAmount ? parseFloat(editAmount) : undefined,
    };

    if (editStatus === 'Filed' || editStatus === 'Paid') {
      updates.dateFiled = editDateFiled;
    } else {
      updates.dateFiled = undefined;
    }

    if (editStatus === 'Paid' && editTaxStatus !== 'W/O Payable') {
      updates.datePaid = editDatePaid;
    } else {
      updates.datePaid = undefined;
    }

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

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">Click any pending or in-processing reference below to update its compliance status & details</p>
        </div>

        {/* Automated Email & Phone Notification Trigger Hub Button */}
        <button
          onClick={() => setIsNotificationHubOpen(true)}
          className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer shadow-sm text-xs font-bold ${
            dueItems.length > 0 
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400 shadow-amber-500/20 animate-pulse' 
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Automated Email & Phone Dispatcher</span>
          {dueItems.length > 0 ? (
            <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold">
              {dueItems.length} DUE ALERTS
            </span>
          ) : (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-medium">
              Active
            </span>
          )}
        </button>
      </div>
      
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
              className={`bg-white rounded-xl shadow-sm border p-6 flex items-center justify-between transition-all cursor-pointer ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending & In Processing References Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Pending & In Processing References
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any row or use the Edit button to open full reference controls
            </p>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Active ({pendingForms + processingForms})
            </button>
            <button
              onClick={() => setFilterStatus('Pending')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterStatus === 'Pending' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingForms})
            </button>
            <button
              onClick={() => setFilterStatus('Processing')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterStatus === 'Processing' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Processing ({processingForms})
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {displayForms.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
              <p className="text-sm font-semibold text-slate-800">No active {filterStatus !== 'all' ? filterStatus.toLowerCase() : 'pending/processing'} references found!</p>
              <p className="text-xs text-slate-400 mt-1">All assigned tax compliance forms for this period are cleared or filed.</p>
            </div>
          ) : (
            displayForms.map((item) => {
              const deadlineInfo = getComplianceStatusInfo(item, item.deadline);
              const refDesc = formReferences.find(r => r.code === item.code)?.description;
              
              return (
                <div 
                  key={`${item.clientId}-${item.id || item.code}`} 
                  onClick={() => handleOpenEditModal(item)}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-blue-50/40 transition-colors cursor-pointer group ${
                    deadlineInfo.urgency === 'high' ? 'bg-red-50/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4 mb-3 sm:mb-0 flex-1 pr-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                      {item.code}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{item.clientName}</span>
                        <span className="text-xs font-mono text-slate-400">({item.clientTin})</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{refDesc || item.description}</p>
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 italic mt-0.5 truncate max-w-md">Note: {item.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center space-x-3 justify-between sm:justify-end">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded text-xs border ${deadlineInfo.color}`}>
                      {deadlineInfo.label} ({new Date(item.deadline || '').toLocaleDateString()})
                    </div>

                    {/* Quick status dropdown selector directly in row */}
                    <div onClick={(e) => e.stopPropagation()} className="relative">
                      <select
                        value={item.status}
                        onChange={(e) => handleQuickStatusChange(e, item)}
                        className={`text-xs font-semibold rounded-full px-3 py-1 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none ${
                          item.status === 'Pending' 
                            ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' 
                            : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
                        }`}
                      >
                        <option value="Pending" className="bg-white text-slate-800">Pending</option>
                        <option value="Processing" className="bg-white text-slate-800">In Processing</option>
                        <option value="Filed" className="bg-white text-slate-800">Filed</option>
                        <option value="Paid" className="bg-white text-slate-800">Paid</option>
                      </select>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(item);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-medium"
                      title="Edit reference details"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="hidden md:inline">Edit</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Reference Modal */}
      {editingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {editingForm.code}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Edit Compliance Reference</h3>
                  <p className="text-xs text-slate-500">{editingForm.clientName} (TIN: {editingForm.clientTin})</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingForm(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFormEdit} className="p-6 space-y-4">
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-slate-700">
                <p className="font-semibold text-blue-900">{editingForm.code} - {editingForm.description}</p>
                <p className="text-slate-500 mt-0.5">Assigned Period: {editingForm.period || selectedPeriod}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Compliance Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as FormStatus)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">In Processing</option>
                    <option value="Filed">Filed</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tax Payable Status</label>
                  <select
                    value={editTaxStatus}
                    onChange={(e) => setEditTaxStatus(e.target.value as 'With Payable' | 'W/O Payable')}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="With Payable">With Payable</option>
                    <option value="W/O Payable">W/O Payable</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Effective Deadline Date</label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {(editStatus === 'Filed' || editStatus === 'Paid') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Date Filed</label>
                    <input
                      type="date"
                      value={editDateFiled}
                      onChange={(e) => setEditDateFiled(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {editStatus === 'Paid' && editTaxStatus !== 'W/O Payable' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Date Paid</label>
                      <input
                        type="date"
                        value={editDatePaid}
                        onChange={(e) => setEditDatePaid(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Amount / Tax Paid (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Reference / Confirmation No.</label>
                  <input
                    type="text"
                    placeholder="e.g. BIR-2026-9921"
                    value={editRefNo}
                    onChange={(e) => setEditRefNo(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Add optional notes or compliance instructions..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingForm(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
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

      {/* Notification Hub Modal */}
      <NotificationHubModal
        isOpen={isNotificationHubOpen}
        onClose={() => setIsNotificationHubOpen(false)}
        dueItems={dueItems}
        settings={notificationSettings}
        onUpdateSettings={setNotificationSettings}
        onUpdateForm={onUpdateForm}
        selectedPeriod={selectedPeriod}
      />
    </div>
  );
}
