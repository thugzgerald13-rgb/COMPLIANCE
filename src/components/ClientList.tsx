import React, { useState } from 'react';
import { Client, FormStatus, FormReference, BIRForm, TaxPayerType } from '../types';
import { useAuth } from '../context/AuthContext';
import { Search, ChevronDown, ChevronRight, FileText, Plus, Trash2, XCircle, Users, Mail, Edit3, Building2, Filter, ArrowUpDown, Clock, Calendar, RotateCcw, X, CheckCircle2, MessageSquare, Share2 } from 'lucide-react';
import { AddClientModal } from './AddClientModal';
import { UpdatePayableModal } from './UpdatePayableModal';
import { ShareClientPortalModal } from './ShareClientPortalModal';
import { isFormAllowedForTaxpayerType, calculateDeadline, isFormVisibleForPeriod, getEffectiveDeadline, getComplianceStatusInfo, getComplianceDeadlineForPeriod, getFormsForClientAndPeriod } from '../utils';
import { getRDOLocationDisplay } from '../rdoData';

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
  onRemoveFormFromClient: (clientId: string, formId: string, formCode?: string) => void;
  selectedPeriod: string;
  onOpenMessaging?: (clientEmail?: string) => void;
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
  selectedPeriod,
  onOpenMessaging
}: ClientListProps) {
  const { loginAsClientPortal } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRefToAdd, setSelectedRefToAdd] = useState<{ [clientId: string]: string }>({});
  const [deletingFormState, setDeletingFormState] = useState<{ clientId: string; formId: string; formCode: string; clientName: string } | null>(null);
  const [sharingClient, setSharingClient] = useState<Client | null>(null);
  const [payableModalForm, setPayableModalForm] = useState<{
    clientId: string;
    clientName: string;
    clientTin: string;
    form: BIRForm;
    formMeta: { code: string; description: string; deadline: string; period: string };
  } | null>(null);

  // Filter & Sort State
  const [typeFilter, setTypeFilter] = useState<'all' | TaxPayerType>('all');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'pending' | 'cleared'>('all');
  const [formStatusFilter, setFormStatusFilter] = useState<'all' | FormStatus>('all');
  const [rdoFilter, setRdoFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'chrono-asc' | 'chrono-desc' | 'name-asc' | 'name-desc'>('chrono-asc');

  // List of distinct RDOs from current clients
  const uniqueRDOs = Array.from(new Set(clients.map(c => c.rdo).filter(Boolean)))
    .sort((a, b) => Number(a) - Number(b));

  // Helper function to get earliest compliance deadline for a client
  const getEarliestDeadlineForClient = (client: Client): number => {
    const visibleForms = getFormsForClientAndPeriod(client, selectedPeriod, formReferences);
    if (visibleForms.length === 0) return Infinity;
    const timestamps = visibleForms.map(f => {
      const eff = getEffectiveDeadline(f, formReferences, selectedPeriod);
      return new Date(eff).getTime();
    });
    return Math.min(...timestamps);
  };

  // Filter clients
  const filteredClients = clients.filter(client => {
    // 1. Search filter
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      client.tin.includes(searchTerm) ||
      client.rdo.includes(searchTerm);
    if (!matchesSearch) return false;

    // 2. Taxpayer Type filter
    if (typeFilter !== 'all' && client.type !== typeFilter) return false;

    // 3. RDO filter
    if (rdoFilter !== 'all' && client.rdo !== rdoFilter) return false;

    const visibleForms = getFormsForClientAndPeriod(client, selectedPeriod, formReferences);
    const pendingCount = visibleForms.filter(f => f.status === 'Pending' || f.status === 'Processing').length;

    // 4. Client Status filter
    if (clientStatusFilter === 'pending' && pendingCount === 0) return false;
    if (clientStatusFilter === 'cleared' && (visibleForms.length === 0 || pendingCount > 0)) return false;

    // 5. Form Status filter
    if (formStatusFilter !== 'all') {
      const hasMatchingForm = visibleForms.some(f => f.status === formStatusFilter);
      if (!hasMatchingForm) return false;
    }

    return true;
  });

  // Sort clients chronologically or alphabetically
  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortOrder === 'chrono-asc') {
      const deadlineA = getEarliestDeadlineForClient(a);
      const deadlineB = getEarliestDeadlineForClient(b);
      if (deadlineA !== deadlineB) return deadlineA - deadlineB;
      return a.name.localeCompare(b.name);
    } else if (sortOrder === 'chrono-desc') {
      const deadlineA = getEarliestDeadlineForClient(a);
      const deadlineB = getEarliestDeadlineForClient(b);
      if (deadlineA !== deadlineB) return deadlineB - deadlineA;
      return a.name.localeCompare(b.name);
    } else if (sortOrder === 'name-asc') {
      return a.name.localeCompare(b.name);
    } else if (sortOrder === 'name-desc') {
      return b.name.localeCompare(a.name);
    }
    return 0;
  });

  const isAnyFilterActive = 
    typeFilter !== 'all' || 
    clientStatusFilter !== 'all' || 
    formStatusFilter !== 'all' || 
    rdoFilter !== 'all' || 
    searchTerm !== '' || 
    sortOrder !== 'chrono-asc';

  const resetFilters = () => {
    setTypeFilter('all');
    setClientStatusFilter('all');
    setFormStatusFilter('all');
    setRdoFilter('all');
    setSearchTerm('');
    setSortOrder('chrono-asc');
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Clients</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage taxpayer clients and monitor compliance deadlines in chronological sequence</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {clients.length > 0 && onClearAllClients && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all clients from your account?')) {
                  onClearAllClients();
                }
              }}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/50 rounded-lg transition-colors bg-white dark:bg-slate-900 shadow-sm cursor-pointer"
            >
              Clear All Clients
            </button>
          )}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search clients, TIN, RDO..." 
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 text-xs"
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

      {/* FILTER & CHRONOLOGICAL SORTING TOOLBAR */}
      {clients.length > 0 && (
        <div className="mb-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Left: Section Label & Indicator */}
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Filter className="w-4 h-4" />
              </div>
              <span>Client Filters & Chronological Controls</span>
              {isAnyFilterActive && (
                <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                  Active
                </span>
              )}
            </div>

            {/* Right: Filter Controls Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 w-full lg:w-auto">
              {/* 1. Sort Order Dropdown (Chronological Default) */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Sort Order
                </label>
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer pr-7"
                  >
                    <option value="chrono-asc">📅 Chronological (Earliest First)</option>
                    <option value="chrono-desc">📅 Chronological (Latest First)</option>
                    <option value="name-asc">🔤 Name (A - Z)</option>
                    <option value="name-desc">🔤 Name (Z - A)</option>
                  </select>
                </div>
              </div>

              {/* 2. Taxpayer Type Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Taxpayer Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="all">All Taxpayer Types</option>
                  <option value="Individual">Individual</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>

              {/* 3. Client Compliance Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Client Status
                </label>
                <select
                  value={clientStatusFilter}
                  onChange={(e) => setClientStatusFilter(e.target.value as any)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Needs Action / Pending</option>
                  <option value="cleared">Fully Cleared</option>
                </select>
              </div>

              {/* 4. Individual Form Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Form Status
                </label>
                <select
                  value={formStatusFilter}
                  onChange={(e) => setFormStatusFilter(e.target.value as any)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="all">All Form Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">In Processing</option>
                  <option value="Filed">Filed</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              {/* 5. RDO Office Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  RDO Office
                </label>
                <select
                  value={rdoFilter}
                  onChange={(e) => setRdoFilter(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="all">All RDO Offices</option>
                  {uniqueRDOs.map(rdo => (
                    <option key={rdo} value={rdo}>RDO {rdo}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Status summary & Reset */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                Showing <strong className="text-slate-800 dark:text-slate-200">{sortedClients.length}</strong> of {clients.length} clients
                {sortOrder.startsWith('chrono') && (
                  <span className="ml-1 text-slate-400 dark:text-slate-500">
                    — Ordered chronologically by compliance deadline
                  </span>
                )}
              </span>
            </div>

            {isAnyFilterActive && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center space-x-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-xs cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
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
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
            <div className="col-span-4 flex items-center space-x-1">
              <span>Client Name</span>
              {sortOrder.startsWith('name') && <ArrowUpDown className="w-3 h-3 text-blue-600" />}
            </div>
            <div className="col-span-3">TIN</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3 text-right flex items-center justify-end space-x-1">
              <span>Status</span>
              {sortOrder.startsWith('chrono') && <Clock className="w-3 h-3 text-blue-600" />}
            </div>
          </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedClients.map((client) => {
            const isExpanded = expandedClient === client.id;
            const rawVisibleForms = getFormsForClientAndPeriod(client, selectedPeriod, formReferences);
            
            // Filter forms if a formStatusFilter is set
            const visibleFormsFiltered = formStatusFilter === 'all'
              ? rawVisibleForms
              : rawVisibleForms.filter(f => f.status === formStatusFilter);

            // ALWAYS SORT FORMS IN CHRONOLOGICAL ORDER BY DEADLINE!
            const sortedVisibleForms = [...visibleFormsFiltered].sort((a, b) => {
              const deadlineA = new Date(getEffectiveDeadline(a, formReferences, selectedPeriod)).getTime();
              const deadlineB = new Date(getEffectiveDeadline(b, formReferences, selectedPeriod)).getTime();
              return deadlineA - deadlineB;
            });

            const pendingCount = rawVisibleForms.filter(f => f.status === 'Pending' || f.status === 'Processing').length;
            const availableRefs = formReferences.filter(r => isFormAllowedForTaxpayerType(r.code, client.type) && !client.forms.some(f => f.code === r.code));

            return (
              <div key={client.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <div 
                  className="grid grid-cols-12 gap-4 p-4 items-center cursor-pointer group text-slate-900 dark:text-slate-100"
                  onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                >
                  <div className="col-span-4 font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="truncate">{client.name}</span>
                  </div>
                  <div className="col-span-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{client.tin}</div>
                  <div className="col-span-2 text-slate-500 dark:text-slate-400 text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {client.type}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center justify-end space-x-3 text-right">
                    {pendingCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        {pendingCount} Pending Forms
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                        All Cleared
                      </span>
                    )}
                    {onOpenMessaging && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMessaging(client.email);
                        }}
                        className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title={`Message ${client.name}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClient(client.id);
                      }}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/50"
                      title="Delete Client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border-t border-slate-200 dark:border-slate-800 pl-10 space-y-4">
                    {/* Contact channels & RDO summary banner */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold text-slate-700 dark:text-slate-200">BIR RDO Office:</span>
                          <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/50">
                            RDO {client.rdo} — {getRDOLocationDisplay(client.rdo)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 ml-0 sm:ml-2">
                          <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Email:</span>
                          <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {client.email || 'Default System Email'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {onOpenMessaging && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenMessaging(client.email);
                            }}
                            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-sm"
                            title={`Send direct message to ${client.name}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Message Client</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingClient(client);
                          }}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30 transition-colors cursor-pointer"
                          title="Share Client Portal with Business Owner by TIN #"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share Client Portal</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            loginAsClientPortal(client.id, client.name, client.tin, client.email);
                          }}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                          title="Sign in as client to test Client Portal view"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Launch Client Portal</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> Assigned Compliance Forms (Chronological Order)
                      </h4>
                      
                      {/* Add Form Reference selector */}
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedRefToAdd[client.id] || ''}
                          onChange={(e) => setSelectedRefToAdd({ ...selectedRefToAdd, [client.id]: e.target.value })}
                          className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
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
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          Add Form
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {sortedVisibleForms.length === 0 ? (
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 text-xs text-center">
                          {formStatusFilter !== 'all' 
                            ? `No forms assigned with status "${formStatusFilter}".`
                            : 'No compliance forms assigned to this client for the selected period. Select a reference above to add one.'}
                        </div>
                      ) : (
                        sortedVisibleForms.map((form) => {
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
                            <div key={form.id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                              <div className="flex-1 pr-4">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-900 dark:text-white text-sm">{form.code}</span>
                                  <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">- {refDesc}</span>
                                </div>
                                <div className="text-xs mt-1 flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    Deadline: {new Date(effectiveDeadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[11px] border ${statusInfo.color}`}>
                                    ({statusInfo.label})
                                  </span>
                                  {deadlineRule && (
                                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">[{deadlineRule}]</span>
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
                                  className="text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                                >
                                  {!form.taxStatus && <option value="" disabled>Select Payable Choice</option>}
                                  <option value="With Payable">With Payable</option>
                                  <option value="W/O Payable">W/O Payable</option>
                                </select>

                                {/* 2. NEXT TO APPEAR ACCORDING TO CHOICE */}
                                {form.taxStatus === 'W/O Payable' ? (
                                  /* W/O PAYABLE: Next to appear is When it was Filed */
                                  <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">Filed Date:</span>
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
                                      className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                  onClick={() => setDeletingFormState({ clientId: client.id, formId: form.id, formCode: form.code, clientName: client.name })}
                                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                  title="Delete erroneous compliance form assignment"
                                >
                                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600 dark:hover:text-red-400" />
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
          
          {sortedClients.length === 0 && (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-1">No Clients Match Your Filters</p>
              <p className="mb-4">Try adjusting your filters or search term to see matching clients.</p>
              {isAnyFilterActive && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={onAddClient}
        formReferences={formReferences}
        selectedPeriod={selectedPeriod}
      />

      {/* Update Payable Modal */}
      {payableModalForm && (
        <UpdatePayableModal
          isOpen={!!payableModalForm}
          onClose={() => setPayableModalForm(null)}
          form={payableModalForm.form}
          clientId={payableModalForm.clientId}
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
          onDeleteForm={(clientId, formId, formCode) => {
            onRemoveFormFromClient(clientId, formId, formCode);
            setPayableModalForm(null);
          }}
        />
      )}

      {/* Delete Form Confirmation Modal */}
      {deletingFormState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Erroneous Form?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{deletingFormState.clientName}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 mb-5 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">
                BIR Form {deletingFormState.formCode}
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Are you sure you want to remove this compliance form assignment? This will permanently delete this form from <span className="font-semibold text-slate-800 dark:text-slate-200">{deletingFormState.clientName}</span>'s active requirements.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeletingFormState(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveFormFromClient(deletingFormState.clientId, deletingFormState.formId, deletingFormState.formCode);
                  setDeletingFormState(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Form</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Share Client Portal Modal */}
      <ShareClientPortalModal
        isOpen={!!sharingClient}
        onClose={() => setSharingClient(null)}
        client={sharingClient}
      />
    </div>
  );
}
