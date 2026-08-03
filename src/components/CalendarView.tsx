import React, { useState, useMemo } from 'react';
import { Client, FormReference, BIRForm, FormStatus } from '../types';
import { 
  getFormsForClientAndPeriod, 
  getComplianceStatusInfo, 
  isFormAllowedForTaxpayerType 
} from '../utils';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  X, 
  Mail, 
  Phone, 
  Send, 
  Building, 
  List, 
  Grid, 
  User, 
  FileText,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { dispatchAutomatedNotifications, NotificationSettings } from '../utils/notificationService';

interface CalendarViewProps {
  clients: Client[];
  formReferences: FormReference[];
  selectedPeriod: string; // e.g., "2026-08"
  onChangePeriod: (period: string) => void;
  onUpdateForm?: (
    clientId: string, 
    formId: string, 
    updates: Partial<BIRForm>, 
    referenceData?: { code: string; description: string; deadline?: string; period?: string }
  ) => void;
}

export interface CalendarEvent {
  clientId: string;
  clientName: string;
  clientTin: string;
  clientRdo?: string;
  clientEmail?: string;
  clientPhone?: string;
  form: BIRForm;
  deadlineDateStr: string; // e.g. "2026-08-15"
  dayNumber: number; // e.g. 15
  refInfo: FormReference | undefined;
  statusInfo: {
    label: string;
    color: string;
    urgency?: 'high' | 'medium' | 'low' | 'completed';
  };
}

export function CalendarView({
  clients,
  formReferences,
  selectedPeriod,
  onChangePeriod,
  onUpdateForm
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'filed' | 'overdue'>('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Parse Year and Month from selectedPeriod ("YYYY-MM")
  const [year, month] = useMemo(() => {
    const parts = selectedPeriod.split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    return [y, m];
  }, [selectedPeriod]);

  // Navigate Months
  const handlePrevMonth = () => {
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    onChangePeriod(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    onChangePeriod(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleToday = () => {
    const today = new Date();
    onChangePeriod(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  };

  // Month metadata
  const monthName = useMemo(() => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [year, month]);

  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  }, [year, month]);

  const todayStr = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  // Compute all deadline calendar events for the selected period
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    clients.forEach(client => {
      // Get all forms for client in selectedPeriod
      const clientForms = getFormsForClientAndPeriod(client, selectedPeriod, formReferences);

      clientForms.forEach(form => {
        // Only consider if form is valid for taxpayer type
        if (!isFormAllowedForTaxpayerType(form.code, client.type)) return;

        const effectiveDl = form.deadline;
        if (!effectiveDl) return;

        // Parse date string (expects YYYY-MM-DD)
        const [dlYear, dlMonth, dlDay] = effectiveDl.split('-').map(Number);
        
        // Match current month/year
        if (dlYear === year && dlMonth === month) {
          const refInfo = formReferences.find(r => r.code === form.code);
          const statusInfo = getComplianceStatusInfo(form, effectiveDl);

          events.push({
            clientId: client.id,
            clientName: client.name,
            clientTin: client.tin,
            clientRdo: client.rdo,
            clientEmail: client.email,
            clientPhone: client.phone,
            form,
            deadlineDateStr: effectiveDl,
            dayNumber: dlDay,
            refInfo,
            statusInfo
          });
        }
      });
    });

    return events;
  }, [clients, formReferences, selectedPeriod, year, month]);

  // Filtered Events based on search, status, and client filters
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter(event => {
      // Client filter
      if (selectedClientFilter !== 'all' && event.clientId !== selectedClientFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'pending') {
        if (event.form.status === 'Filed' || event.form.status === 'Paid') return false;
      } else if (statusFilter === 'filed') {
        if (event.form.status !== 'Filed' && event.form.status !== 'Paid') return false;
      } else if (statusFilter === 'overdue') {
        if (event.statusInfo.label !== 'OVERDUE') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = event.clientName.toLowerCase().includes(query);
        const matchCode = event.form.code.toLowerCase().includes(query);
        const matchDesc = event.form.description.toLowerCase().includes(query);
        const matchTin = event.clientTin.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchDesc && !matchTin) return false;
      }

      return true;
    });
  }, [calendarEvents, selectedClientFilter, statusFilter, searchQuery]);

  // Group events by Day number for Month Grid View
  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      map[day] = [];
    }
    filteredEvents.forEach(event => {
      if (map[event.dayNumber]) {
        map[event.dayNumber].push(event);
      }
    });
    return map;
  }, [filteredEvents, daysInMonth]);

  // Stats
  const totalEventsCount = calendarEvents.length;
  const completedEventsCount = calendarEvents.filter(e => e.form.status === 'Filed' || e.form.status === 'Paid').length;
  const pendingEventsCount = calendarEvents.filter(e => e.form.status === 'Pending' || e.form.status === 'Processing').length;
  const overdueEventsCount = calendarEvents.filter(e => e.statusInfo.label === 'OVERDUE').length;

  // Actions
  const handleMarkFiled = (event: CalendarEvent) => {
    if (!onUpdateForm) return;
    const todayFormatted = new Date().toISOString().split('T')[0];
    onUpdateForm(
      event.clientId,
      event.form.id,
      {
        status: 'Filed',
        dateFiled: todayFormatted
      },
      {
        code: event.form.code,
        description: event.form.description,
        deadline: event.deadlineDateStr,
        period: event.form.period || selectedPeriod
      }
    );
    showToast(`Form ${event.form.code} marked as FILED for ${event.clientName}`);
  };

  const handleSendReminder = (event: CalendarEvent) => {
    const settings: NotificationSettings = {
      autoDispatchOnLoad: false,
      soundEnabled: true,
      browserNotificationsEnabled: true,
    };

    const isDueToday = event.deadlineDateStr === todayStr;
    const isOverdue = event.statusInfo.label === 'OVERDUE';
    const isUpcoming = !isDueToday && !isOverdue;

    dispatchAutomatedNotifications([
      {
        clientId: event.clientId,
        clientName: event.clientName,
        clientTin: event.clientTin,
        clientEmail: event.clientEmail,
        form: event.form,
        deadline: event.deadlineDateStr,
        diffDays: 0,
        isDueToday,
        isOverdue,
        isUpcoming
      }
    ], settings);

    showToast(`Web Push notification alert dispatched for ${event.clientName}!`);
  };

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  // Group events chronologically for Agenda / List View
  const agendaDays = useMemo(() => {
    const days = Object.keys(eventsByDay)
      .map(Number)
      .filter(day => eventsByDay[day].length > 0)
      .sort((a, b) => a - b);
    return days;
  }, [eventsByDay]);

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* View Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Compliance Workload Calendar</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Visual monthly BIR form deadline schedule across all registered clients
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Month Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Month Selector Controls */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm px-3 select-none min-w-[140px] text-center">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs px-3 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            Current Month
          </button>

          {/* Toggle Grid vs Agenda */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'agenda' 
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Total Deadlines</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalEventsCount}</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Filed / Paid</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completedEventsCount}</p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingEventsCount}</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Overdue</p>
            <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{overdueEventsCount}</p>
          </div>
          <div className="w-10 h-10 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client name, TIN, or BIR form code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Client Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">All Clients ({clients.length})</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">All Statuses</option>
              <option value="pending" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Pending / Processing</option>
              <option value="filed" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Filed / Paid</option>
              <option value="overdue" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Overdue Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        /* Calendar Month Grid View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-center py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            <span className="text-red-600 dark:text-red-400">Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-950">
            {/* Empty slots for days before 1st of the month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-prev-${i}`} className="min-h-[110px] bg-slate-100/50 dark:bg-slate-900/40 p-1.5 opacity-40 select-none" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayEvents = eventsByDay[dayNum] || [];
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => dayEvents.length > 0 && setSelectedDay(dayNum)}
                  className={`min-h-[110px] p-1.5 sm:p-2 bg-white dark:bg-slate-900 transition-all flex flex-col justify-between group ${
                    dayEvents.length > 0 ? 'hover:bg-blue-50/30 dark:hover:bg-slate-800/50 cursor-pointer' : ''
                  } ${isToday ? 'bg-amber-50/40 dark:bg-amber-950/20 ring-2 ring-amber-400/80 inset-0 z-10' : ''}`}
                >
                  {/* Top Bar of Day Box */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded-md ${
                      isToday 
                        ? 'bg-amber-500 text-white shadow-sm' 
                        : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {dayNum}
                    </span>

                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full">
                        {dayEvents.length} {dayEvents.length === 1 ? 'form' : 'forms'}
                      </span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => {
                      const isFiled = event.form.status === 'Filed' || event.form.status === 'Paid';
                      const isOverdue = event.statusInfo.label === 'OVERDUE';

                      return (
                        <div
                          key={`${event.clientId}-${event.form.id || event.form.code}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          className={`px-1.5 py-1 rounded text-[10px] font-bold border transition-transform hover:scale-[1.02] flex items-center justify-between gap-1 shadow-2xs ${
                            isFiled
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50'
                              : isOverdue
                              ? 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800/60 font-black'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
                          }`}
                          title={`${event.clientName}: BIR Form ${event.form.code} (${event.form.status})`}
                        >
                          <span className="truncate">
                            {event.form.code} • <span className="font-semibold">{event.clientName}</span>
                          </span>
                          {isFiled ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : isOverdue ? (
                            <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
                          ) : (
                            <Clock className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 text-center py-0.5 hover:underline">
                        +{dayEvents.length - 3} more forms
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda / List View */
        <div className="space-y-4">
          {agendaDays.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center">
              <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No BIR Deadlines Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No matching BIR form deadlines for the selected period and filters.
              </p>
            </div>
          ) : (
            agendaDays.map(dayNum => {
              const dayEvents = eventsByDay[dayNum];
              const dateObj = new Date(year, month - 1, dayNum);
              const dateFormatted = dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              const isToday = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` === todayStr;

              return (
                <div key={`agenda-day-${dayNum}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  {/* Date Group Header */}
                  <div className={`p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${
                    isToday ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50' : 'bg-slate-50/80 dark:bg-slate-800/50'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                        isToday ? 'bg-amber-500 text-white' : 'bg-slate-800 dark:bg-slate-700 text-white'
                      }`}>
                        {dayNum}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{dateFormatted}</h2>
                        {isToday && <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase">TODAY</span>}
                      </div>
                    </div>

                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      {dayEvents.length} {dayEvents.length === 1 ? 'Deadline' : 'Deadlines'}
                    </span>
                  </div>

                  {/* List of Forms on this Day */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dayEvents.map(event => {
                      const isFiled = event.form.status === 'Filed' || event.form.status === 'Paid';
                      const isOverdue = event.statusInfo.label === 'OVERDUE';

                      return (
                        <div key={`${event.clientId}-${event.form.id || event.form.code}`} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start space-x-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              isFiled
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : isOverdue
                                ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300'
                                : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                            }`}>
                              {event.form.code}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{event.clientName}</h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                                  isFiled
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                    : isOverdue
                                    ? 'bg-red-600 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}>
                                  {event.form.status === 'Filed' ? 'FILED' : event.form.status === 'Paid' ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{event.form.description}</p>
                              <div className="flex items-center space-x-3 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                <span>TIN: {event.clientTin}</span>
                                {event.clientRdo && <span>RDO: {event.clientRdo}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center space-x-2 shrink-0">
                            {!isFiled && (
                              <>
                                <button
                                  onClick={() => handleSendReminder(event)}
                                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                                  title="Send Web Push notification alert"
                                >
                                  <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                  <span>Alert</span>
                                </button>
                                <button
                                  onClick={() => handleMarkFiled(event)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Mark Filed</span>
                                </button>
                              </>
                            )}
                            {isFiled && (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Completed</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Day Overview Modal */}
      {selectedDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 text-slate-900 dark:text-slate-100">
            <div className="p-5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg">
                  {selectedDay}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Deadlines for {monthName} {selectedDay}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {(eventsByDay[selectedDay] || []).length} BIR form(s) due on this day
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {(eventsByDay[selectedDay] || []).map(event => {
                const isFiled = event.form.status === 'Filed' || event.form.status === 'Paid';
                const isOverdue = event.statusInfo.label === 'OVERDUE';

                return (
                  <div key={`${event.clientId}-${event.form.id || event.form.code}`} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">BIR Form {event.form.code}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          isFiled ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : isOverdue ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {event.form.status}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">{event.clientName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{event.form.description}</p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {!isFiled && (
                        <>
                          <button
                            onClick={() => handleSendReminder(event)}
                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Alert</span>
                          </button>
                          <button
                            onClick={() => handleMarkFiled(event)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Mark Filed</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setSelectedDay(null)}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 text-slate-900 dark:text-slate-100">
            <div className="p-5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-extrabold text-sm">
                  {selectedEvent.form.code}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">BIR Form {selectedEvent.form.code}</h2>
                  <p className="text-xs text-slate-400">{selectedEvent.clientName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Form Description:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedEvent.form.description}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Effective Deadline:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedEvent.deadlineDateStr}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Taxpayer TIN / RDO:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedEvent.clientTin} / {selectedEvent.clientRdo || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Current Status:</span>
                  <span className={`px-2 py-0.5 rounded font-bold uppercase ${selectedEvent.statusInfo.color}`}>
                    {selectedEvent.form.status} ({selectedEvent.statusInfo.label})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    handleSendReminder(selectedEvent);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>Send Alert Reminder</span>
                </button>

                {selectedEvent.form.status !== 'Filed' && selectedEvent.form.status !== 'Paid' && (
                  <button
                    onClick={() => {
                      handleMarkFiled(selectedEvent);
                      setSelectedEvent(null);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark as Filed</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
