import React, { useState } from 'react';
import { Client, FormStatus, FormReference } from '../types';
import { Search, ChevronDown, ChevronRight, FileText, Plus, Trash2, XCircle } from 'lucide-react';
import { AddClientModal } from './AddClientModal';
import { isFormAllowedForTaxpayerType, calculateDeadline, isFormVisibleForPeriod, getEffectiveDeadline, getComplianceStatusInfo } from '../utils';

interface ClientListProps {
  clients: Client[];
  formReferences: FormReference[];
  onUpdateForm: (clientId: string, formId: string, updates: Partial<import('../types').BIRForm>) => void;
  onAddClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onAddFormToClient: (clientId: string, formRef: FormReference, deadline?: string, period?: string) => void;
  onRemoveFormFromClient: (clientId: string, formId: string) => void;
  selectedPeriod: string;
}

export function ClientList({ 
  clients, 
  formReferences, 
  onUpdateForm, 
  onAddClient, 
  onDeleteClient,
  onAddFormToClient,
  onRemoveFormFromClient,
  selectedPeriod
}: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRefToAdd, setSelectedRefToAdd] = useState<{ [clientId: string]: string }>({});

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
      const lowerRule = (ref.deadlineRule || '').toLowerCase();
      let targetPeriod = selectedPeriod;
      if (lowerRule.includes('following') || lowerRule.includes('next')) {
        const [y, m] = selectedPeriod.split('-').map(Number);
        const prevD = new Date(y, m - 2, 1);
        targetPeriod = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
      }
      const deadline = calculateDeadline(targetPeriod, ref.frequency, ref.deadlineRule);
      onAddFormToClient(clientId, ref, deadline, targetPeriod);
      setSelectedRefToAdd(prev => ({ ...prev, [clientId]: '' }));
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-slate-900">My Clients</h1>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search clients or TIN..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline font-medium">Add Client</span>
          </button>
        </div>
      </div>

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
            const visibleForms = client.forms.filter(f => isFormVisibleForPeriod(f, selectedPeriod, formReferences));
            const pendingCount = visibleForms.filter(f => f.status === 'Pending' || f.status === 'Processing').length;
            const availableRefs = formReferences.filter(r => isFormAllowedForTaxpayerType(r.code, client.type) && !visibleForms.some(f => f.code === r.code));

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
                              <div className="flex items-center space-x-3">
                                {(form.status === 'Filed' || form.status === 'Paid') && (
                                  <div className="flex flex-col items-end mr-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-[10px] text-slate-500 w-8 text-right">Filed:</span>
                                      <input 
                                        type="date" 
                                        className="text-[10px] border border-slate-200 rounded px-1 py-0.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 h-5"
                                        value={form.dateFiled || ''}
                                        onChange={(e) => onUpdateForm(client.id, form.id, { dateFiled: e.target.value })}
                                      />
                                    </div>
                                    {form.status === 'Paid' && form.taxStatus !== 'W/O Payable' && (
                                      <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-[10px] text-slate-500 w-8 text-right">Paid:</span>
                                        <input 
                                          type="date" 
                                          className="text-[10px] border border-slate-200 rounded px-1 py-0.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 h-5"
                                          value={form.datePaid || ''}
                                          onChange={(e) => onUpdateForm(client.id, form.id, { datePaid: e.target.value })}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                                <select
                                  value={form.taxStatus || ''}
                                  onChange={(e) => {
                                    const newTaxStatus = e.target.value as 'With Payable' | 'W/O Payable';
                                    const updates: Partial<import('../types').BIRForm> = { taxStatus: newTaxStatus };
                                    if (newTaxStatus === 'W/O Payable' && form.status === 'Paid') {
                                      updates.status = 'Filed';
                                      updates.datePaid = undefined;
                                    }
                                    onUpdateForm(client.id, form.id, updates);
                                  }}
                                  className="text-xs font-medium rounded-full px-3 py-1 border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                                >
                                  {!form.taxStatus && <option value="" disabled className="hidden"></option>}
                                  <option value="With Payable">With Payable</option>
                                  <option value="W/O Payable">W/O Payable</option>
                                </select>
                                <select
                                  value={form.status}
                                  onChange={(e) => {
                                    const newStatus = e.target.value as import('../types').FormStatus;
                                    const updates: Partial<import('../types').BIRForm> = { status: newStatus };
                                    if (newStatus === 'Filed' && !form.dateFiled) updates.dateFiled = new Date().toISOString().split('T')[0];
                                    if (newStatus === 'Paid') {
                                      if (!form.dateFiled) updates.dateFiled = new Date().toISOString().split('T')[0];
                                      if (!form.datePaid) updates.datePaid = new Date().toISOString().split('T')[0];
                                    }
                                    onUpdateForm(client.id, form.id, updates);
                                  }}
                                  className={`text-xs font-medium rounded-full px-3 py-1 border-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none ${getStatusColor(form.status)}`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Processing</option>
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
            <div className="p-8 text-center text-slate-500">
              No clients found matching your search.
            </div>
          )}
        </div>
      </div>

      <AddClientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={onAddClient}
        formReferences={formReferences}
        selectedPeriod={selectedPeriod}
      />
    </div>
  );
}
