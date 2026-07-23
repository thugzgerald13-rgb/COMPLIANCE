import React from 'react';
import { Client, FormReference } from '../types';
import { Users, FileClock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { getEffectiveDeadline, getComplianceStatusInfo, getFormsForClientAndPeriod } from '../utils';

interface DashboardProps {
  clients: Client[];
  formReferences: FormReference[];
  selectedPeriod: string;
}

export function Dashboard({ clients, formReferences, selectedPeriod }: DashboardProps) {
  const totalClients = clients.length;
  
  // Filter forms by selected period using getFormsForClientAndPeriod
  const allForms = clients.flatMap(c => 
    getFormsForClientAndPeriod(c, selectedPeriod, formReferences).map(f => ({
      ...f,
      clientName: c.name
    }))
  );
  
  const pendingForms = allForms.filter(f => f.status === 'Pending').length;
  const processingForms = allForms.filter(f => f.status === 'Processing').length;
  const filedForms = allForms.filter(f => f.status === 'Filed' || f.status === 'Paid').length;

  const stats = [
    { title: 'Total Clients', value: totalClients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Pending Forms', value: pendingForms, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { title: 'In Processing', value: processingForms, icon: FileClock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { title: 'Filed & Paid', value: filedForms, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  // Recently updated or upcoming deadlines within the selected period
  const upcomingDeadlines = allForms
    .filter(f => f.status === 'Pending' || f.status === 'Processing')
    .sort((a, b) => new Date(a.deadline || '').getTime() - new Date(b.deadline || '').getTime())
    .slice(0, 8);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-slate-400" />
            Upcoming Deadlines (Pending/Processing)
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {upcomingDeadlines.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No upcoming deadlines!</div>
          ) : (
            upcomingDeadlines.map((item, i) => {
              const deadlineInfo = getComplianceStatusInfo(item, item.deadline);
              const refDesc = formReferences.find(r => r.code === item.code)?.description;
              return (
                <div key={i} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors ${deadlineInfo.urgency === 'high' ? 'bg-red-50/30' : ''}`}>
                  <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                      {item.code.substring(0, 4)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{item.clientName}</p>
                      <p className="text-sm text-slate-500">{refDesc || item.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded text-xs border ${deadlineInfo.color}`}>
                      {deadlineInfo.label} ({new Date(item.deadline).toLocaleDateString()})
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      item.status === 'Pending' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
