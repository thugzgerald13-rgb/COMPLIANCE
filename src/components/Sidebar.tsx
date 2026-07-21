import { LayoutDashboard, Users, FileText, Settings, Bell, BookOpen } from 'lucide-react';
import React from 'react';

interface SidebarProps {
  currentView: 'dashboard' | 'clients' | 'forms';
  onChangeView: (view: 'dashboard' | 'clients' | 'forms') => void;
}

export function Sidebar({ currentView, onChangeView }: SidebarProps) {
  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 flex items-center space-x-3">
        <FileText className="w-8 h-8 text-blue-400" />
        <span className="text-xl font-bold tracking-tight">Compliance Monitoring</span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        <button
          onClick={() => onChangeView('dashboard')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </button>
        
        <button
          onClick={() => onChangeView('clients')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">My Clients</span>
        </button>

        <button
          onClick={() => onChangeView('forms')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'forms' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="font-medium">Compliance Reference</span>
        </button>
      </nav>

      <div className="p-4">
        <div className="bg-slate-800 rounded-lg p-4 flex items-center space-x-3 cursor-pointer hover:bg-slate-700 transition-colors">
          <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center font-semibold">
            JD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Juan Dela Cruz</p>
            <p className="text-xs text-slate-400 truncate">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
