import React, { useState } from 'react';
import { Client, FormStatus } from '../types';
import { Search, ChevronDown, ChevronRight, FileText, Plus, Trash2 } from 'lucide-react';
import { AddClientModal } from './AddClientModal';

interface ClientListProps {
  clients: Client[];
  onUpdateStatus: (clientId: string, formId: string, status: FormStatus) => void;
  onAddClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
}

export function ClientList({ clients, onUpdateStatus, onAddClient, onDeleteClient }: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  const getDeadlineInfo = (deadline: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadDate = new Date(deadline);
    deadDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', color: 'text-red-600 font-semibold' };
    if (diffDays === 0) return { label: 'Due Today', color: 'text-red-600 font-semibold' };
    if (diffDays <= 7) return { label: `Due in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`, color: 'text-amber-600 font-medium' };
    return { label: `Due in ${diffDays} days`, color: 'text-slate-500' };
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
            const pendingCount = client.forms.filter(f => f.status === 'Pending' || f.status === 'Processing').length;

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
                  <div className="bg-slate-50 p-4 border-t border-slate-100 pl-10">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-2" /> Current Filing Period Forms
                    </h4>
                    <div className="grid gap-3">
                      {client.forms.map((form) => {
                        const deadlineInfo = getDeadlineInfo(form.deadline);
                        return (
                        <div key={form.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{form.code}</span>
                              <span className="text-sm text-slate-500 hidden sm:inline">- {form.description}</span>
                            </div>
                            <div className="text-xs mt-1 flex items-center space-x-2">
                              <span className="text-slate-500">Deadline: {new Date(form.deadline).toLocaleDateString()}</span>
                              <span className={deadlineInfo.color}>
                                ({deadlineInfo.label})
                              </span>
                            </div>
                          </div>
                          <select
                            value={form.status}
                            onChange={(e) => onUpdateStatus(client.id, form.id, e.target.value as FormStatus)}
                            className={`text-sm font-medium rounded-full px-3 py-1 border-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none ${getStatusColor(form.status)}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Filed">Filed</option>
                            <option value="Paid">Paid</option>
                          </select>
                        </div>
                      )})}
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
      />
    </div>
  );
}
