import React, { useState } from 'react';
import { Client, FormStatus, FormReference, BIRForm } from '../types';
import { Search, ChevronDown, ChevronRight, FileText, Plus, Trash2, XCircle, Users, Mail, Edit3 } from 'lucide-react';
import { AddClientModal } from './AddClientModal';
import { UpdatePayableModal } from './UpdatePayableModal';
import { isFormAllowedForTaxpayerType, calculateDeadline, isFormVisibleForPeriod, getEffectiveDeadline, getComplianceStatusInfo, getComplianceDeadlineForPeriod, getFormsForClientAndPeriod } from '../utils';

interface ClientListProps {
  clients: Client[];
  formReferences: FormReference[];
  onUpdateForm: (
    clientId: string, 
    formId: string, 
    updates: Partial<BIRForm>, 
    formMeta?: { code: string; description: string; deadline: string; period: string }
  ) => void;
  onAddClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onClearAllClients?: () => void;
  onAddFormToClient: (clientId: string, formRef: FormReference, deadline?: string, period?: string, assignedPeriod?: string) => void;
  onRemoveFormFromClient: (clientId: string, formId: string) => void;
  selectedPeriod: string;
}

export function ClientList({ 
  clients, 
  formReferences, 
  onUpdateForm, 
  onAddClient, 
  onDeleteClient,
  onClearAllClients,
  onAddFormToClient,
  onRemoveFormFromClient,
  selectedPeriod
}: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRefToAdd, setSelectedRefToAdd] = useState<{ [clientId: string]: string }>({});
  const [payableModalForm, setPayableModalForm] = useState<{
    clientId: string;
    clientName: string;
    clientTin: string;
    form: BIRForm;
    formMeta: { code: string; description: string; deadline: string; period: string };
  } | null>(null);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.tin.includes(searchTerm)
  );

  const getStatusColor = (status: FormStatus) => {
    switch (status) {
      case 'Pending': return 'bg-red-100 text-red-800';
      case 'Processing': return 'bg-amber-100 text-amber-800';
      case 'Filed': return 'bg-blue-100 text-blue-800';
      case 'Paid': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleAddForm = (clientId: string) => {
    const code = selectedRefToAdd[clientId];
    if (!code) return;
    const ref = formReferences.find(f => f.code === code);
    if (ref) {
      const info = getComplianceDeadlineForPeriod(ref, selectedPeriod);
      const deadline = info.deadline || calculateDeadline(selectedPeriod, ref.frequency, ref.deadlineRule);
      const period = info.period || selectedPeriod;
      onAddFormToClient(clientId, ref, deadline, period, selectedPeriod);
      setSelectedRefToAdd(prev => ({ ...prev, [clientId]: '' }));
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Clients</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your active taxpayer clients and compliance deadlines</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {clients.length > 0 && onClearAllClients && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all clients from your account?')) {
                  onClearAllClients();
                }
              }}
              className="text-xs text-slate-500 hover:text-red-600 px-3 py-2 border border-slate-200 hover:border-red-200 rounded-lg transition-colors bg-white shadow-sm cursor-pointer"
            >
              Clear All Clients
            </button>
          )}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search clients or TIN..." 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-xs font-medium cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Add Client</span>
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No Clients Added Yet</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto mb-6">
            Your client workspace is currently empty. Click the button below to add your first client and assign tax compliance forms.
          </p>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Client</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50 font-medium text-slate-500 text-sm">
            <div className="col-span-4">Client Name</div>
            <div className="col-span-3">TIN</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3 text-right">Status</div>
          </div>

        <div className="divide-y divide-slate-100">
          {filteredClients.map((client) => {
            const isExpanded = expandedClient === client.id;
            const visibleForms = getFormsForClientAndPeriod(client, selectedPeriod, formReferences);
            const pendingCount = visibleForms.filter(f => f.status === 'Pending' || f.status === 'Processing').length;
            const availableRefs = formReferences.filter(r => isFormAllowedForTaxpayerType(r.code, client.type) && !client.forms.some(f => f.code === r.code));

            return (
              <div key={client.id} className="transition-colors hover:bg-slate-50/50">
                <div 
                  className="grid grid-cols-12 gap-4 p-4 items-center cursor-pointer group"
                  onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                >
                  <div className="col-span-4 font-medium text-slate-900 flex items-center space-x-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="truncate">{client.name}</span>
                  </div>
                  <div className="col-span-3 text-slate-500 font-mono text-sm">{client.tin}</div>
                  <div className="col-span-2 text-slate-500 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      {client.type}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center justify-end space-x-3 text-right">
                    {pendingCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {pendingCount} Pending Forms
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        All Cleared
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClient(client.id);
                      }}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                      title="Delete Client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50 p-4 border-t border-slate-100 pl-10 space-y-4">
                    {/* Contact channels summary banner */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                      <span className="font-semibold text-slate-700">Notification Email:</span>
                      <span className="flex items-center space-x-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        <Mail className="w-3 h-3 text-blue-600" />
                        <span>{client.email || 'Default System Email'}</span>
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center">
                        <FileText className="w-4 h-4 mr-2" /> Assigned Compliance Forms
                      </h4>
                      
                      {/* Add Form Reference selector */}
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedRefToAdd[client.id] || ''}
                          onChange={(e) => setSelectedRefToAdd({ ...selectedRefToAdd, [client.id]: e.target.value })}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
                        >
                          <option value="">+ Select Compliances</option>
                          {availableRefs.map(ref => (
                            <option key={ref.code} value={ref.code}>
                              {ref.code} - {ref.description}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddForm(client.id)}
                          disabled={!selectedRefToAdd[client.id]}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Add Form
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {visibleForms.length === 0 ? (
                        <div className="p-4 bg-white rounded-lg border border-slate-200 text-slate-400 text-xs text-center">
                          No compliance forms assigned to this client for the selected period. Select a reference above to add one.
                        </div>
                      ) : (
                        visibleForms.map((form) => {
                          const formRef = formReferences.find(r => r.code === form.code);
                          const effectiveDeadline = getEffectiveDeadline(form, formReferences, selectedPeriod);
                          const statusInfo = getComplianceStatusInfo(form, effectiveDeadline);
                          const refDesc = formRef?.description || form.description;
                          const deadlineRule = formRef?.deadlineRule;
                          const formMeta = {
                            code: form.code,
                            description: refDesc,
                            deadline: effectiveDeadline,
                            period: form.period || selectedPeriod
                          };
                          return (
                            <div key={form.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                              <div className="flex-1 pr-4">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-900 text-sm">{form.code}</span>
                                  <span className="text-sm text-slate-500 hidden sm:inline">- {refDesc}</span>
                                </div>
                                <div className="text-xs mt-1 flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-700">Deadline: {new Date(effectiveDeadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                  <span className={`px-2 py-0.5 rounded text-[11px] border ${statusInfo.color}`}>
                                    ({statusInfo.label})
                                  </span>
                                  {deadlineRule && (
                                    <span className="text-slate-500 text-[11px]">[{deadlineRule}]</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {/* 1. FIRST CHOICE: Tax Payable Status */}
                                <select
                                  value={form.taxStatus || ''}
                                  onChange={(e) => {
                                    const newTaxStatus = e.target.value as 'With Payable' | 'W/O Payable';
                                    const updates: Partial<BIRForm> = { taxStatus: newTaxStatus };

                                    if (newTaxStatus === 'W/O Payable') {
                                      if (!form.dateFiled) {
                                        updates.status = 'Processing';
                                      } else {
                                        updates.status = 'Filed';
                                      }
                                      updates.datePaid = undefined;
                                      updates.amount = undefined;
                                      onUpdateForm(client.id, form.id, updates, formMeta);
                                    } else if (newTaxStatus === 'With Payable') {
                                      onUpdateForm(client.id, form.id, updates, formMeta);
                                      setPayableModalForm({
                                        clientId: client.id,
                                        clientName: client.name,
                                        clientTin: client.tin,
                                        form: { ...form, taxStatus: 'With Payable' },
                                        formMeta
                                      });
                                    }
                                  }}
                                  className="text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                                >
                                  {!form.taxStatus && <option value="" disabled>Select Payable Choice</option>}
                                  <option value="With Payable">With Payable</option>
                                  <option value="W/O Payable">W/O Payable</option>
                                </select>

                                {/* 2. NEXT TO APPEAR ACCORDING TO CHOICE */}
                                {form.taxStatus === 'W/O Payable' ? (
                                  /* W/O PAYABLE: Next to appear is When it was Filed */
                                  <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                                    <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Filed Date:</span>
                                    <input
                                      type="date"
                                      value={form.dateFiled || ''}
                                      onChange={(e) => {
                                        const dateVal = e.target.value;
                                        if (dateVal) {
                                          onUpdateForm(client.id, form.id, { dateFiled: dateVal, status: 'Filed' }, formMeta);
                                        } else {
                                          onUpdateForm(client.id, form.id, { dateFiled: undefined, status: 'Processing' }, formMeta);
                                        }
                                      }}
                                      className="text-xs bg-white border border-slate-200 rounded-md px-2 py-0.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                ) : form.taxStatus === 'With Payable' ? (
                                  /* WITH PAYABLE: Next to appear is Edit Button opening Modal */
                                  <button
                                    onClick={() => setPayableModalForm({
                                      clientId: client.id,
                                      clientName: client.name,
                                      clientTin: client.tin,
                                      form,
                                      formMeta
                                    })}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 shadow-xs cursor-pointer"
                                    title="Edit Date Filed, Amount Paid, Reference No. & Notes"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit Details</span>
                                  </button>
                                ) : null}

                                {/* Status Selector / Indicator */}
                                <select
                                  value={form.status}
                                  onChange={(e) => {
                                    const newStatus = e.target.value as FormStatus;
                                    const updates: Partial<BIRForm> = { status: newStatus };
                                    if (newStatus === 'Filed' && !form.dateFiled) updates.dateFiled = new Date().toISOString().split('T')[0];
                                    if (newStatus === 'Paid') {
                                      if (!form.dateFiled) updates.dateFiled = new Date().toISOString().split('T')[0];
                                      if (!form.datePaid) updates.datePaid = new Date().toISOString().split('T')[0];
                                    }
                                    onUpdateForm(client.id, form.id, updates, formMeta);
                                  }}
                                  className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none shadow-xs ${getStatusColor(form.status)}`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">In Processing</option>
                                  <option value="Filed">Filed</option>
                                  {form.taxStatus !== 'W/O Payable' && <option value="Paid">Paid</option>}
                                </select>

                                <button
                                  onClick={() => onRemoveFormFromClient(client.id, form.id)}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                  title="Remove Form from Client"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No clients found matching your search.
            </div>
          )}
        </div>
      </div>
      )}

      <AddClientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={onAddClient}
        formReferences={formReferences}
        selectedPeriod={selectedPeriod}
      />

      {payableModalForm && (
        <UpdatePayableModal
          isOpen={!!payableModalForm}
          onClose={() => setPayableModalForm(null)}
          form={payableModalForm.form}
          clientName={payableModalForm.clientName}
          clientTin={payableModalForm.clientTin}
          onSave={(formId, updates) => {
            onUpdateForm(
              payableModalForm.clientId,
              formId,
              updates,
              payableModalForm.formMeta
            );
          }}
        />
      )}
    </div>
  );
}
