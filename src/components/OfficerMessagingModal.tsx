import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, RefreshCw, Search, Users, Building2, CheckCircle2, Clock, AlertCircle, User, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Client, ChatMessage, FormReference } from '../types';

interface OfficerMessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  initialSelectedClientEmail?: string;
  formReferences?: FormReference[];
}

export function OfficerMessagingModal({
  isOpen,
  onClose,
  clients,
  initialSelectedClientEmail,
  formReferences = [],
}: OfficerMessagingModalProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientEmail, setSelectedClientEmail] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedFormCode, setSelectedFormCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Filter clients by search
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tin.includes(searchTerm) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Set initial selected client when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedClientEmail) {
        setSelectedClientEmail(initialSelectedClientEmail);
      } else if (clients.length > 0 && !selectedClientEmail) {
        setSelectedClientEmail(clients[0].email || '');
      }
    }
  }, [isOpen, initialSelectedClientEmail, clients]);

  const selectedClient = clients.find(c => c.email?.toLowerCase() === selectedClientEmail.toLowerCase()) || clients[0];

  const fetchMessages = async () => {
    if (!selectedClientEmail) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/messages?clientEmail=${encodeURIComponent(selectedClientEmail)}`);
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data.success && Array.isArray(data.messages)) {
            setMessages(data.messages);
            localStorage.setItem(`biz_comply_msg_${selectedClientEmail.toLowerCase()}`, JSON.stringify(data.messages));
            return;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load messages from server, using local fallback:', err);
    } finally {
      setLoading(false);
    }

    // Local fallback
    try {
      const stored = localStorage.getItem(`biz_comply_msg_${selectedClientEmail.toLowerCase()}`);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        setMessages([]);
      }
    } catch (e) {
      setMessages([]);
    }
  };

  useEffect(() => {
    if (isOpen && selectedClientEmail) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, selectedClientEmail]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !selectedClientEmail) return;

    const senderDisplayName = user.companyInfo?.companyName || user.name || 'Compliance Officer';

    const newMsgObj: ChatMessage = {
      id: `msg_${Date.now()}`,
      clientEmail: selectedClientEmail,
      senderEmail: user.email,
      senderName: senderDisplayName,
      senderRole: user.role || 'Compliance Officer',
      recipientEmail: selectedClientEmail,
      text: inputText.trim(),
      formCode: selectedFormCode || undefined,
      timestamp: new Date().toISOString(),
    };

    try {
      setSending(true);
      setError(null);

      let sentViaServer = false;
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: user.email,
          senderName: senderDisplayName,
          senderRole: user.role || 'Compliance Officer',
          clientEmail: selectedClientEmail,
          recipientEmail: selectedClientEmail,
          text: inputText.trim(),
          formCode: selectedFormCode || undefined,
        }),
      });

      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            sentViaServer = true;
          }
        }
      }

      // Local storage backup
      const currentList = [...messages, newMsgObj];
      setMessages(currentList);
      localStorage.setItem(`biz_comply_msg_${selectedClientEmail.toLowerCase()}`, JSON.stringify(currentList));

      setInputText('');
      setSelectedFormCode('');
      if (sentViaServer) {
        fetchMessages();
      }
    } catch (err) {
      const currentList = [...messages, newMsgObj];
      setMessages(currentList);
      localStorage.setItem(`biz_comply_msg_${selectedClientEmail.toLowerCase()}`, JSON.stringify(currentList));
      setInputText('');
      setSelectedFormCode('');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  // Available forms for selected client
  const clientForms = selectedClient?.forms || [];
  const formCodesList = Array.from(new Set([
    ...clientForms.map(f => f.code),
    ...formReferences.map(f => f.code)
  ])).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Client Communications Desk</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-mono font-semibold">
                  Compliance Officer Portal
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Direct two-way messaging with taxpayers, BIR form queries, and compliance updates.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Panel: Client Selector */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-slate-950/60 shrink-0 h-48 md:h-full">
            <div className="p-3 border-b border-slate-800/80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search client by name or TIN..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
              {filteredClients.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No clients found.
                </div>
              ) : (
                filteredClients.map((client) => {
                  const clientEmail = client.email || `${client.id}@client.local`;
                  const isSelected = clientEmail.toLowerCase() === selectedClientEmail.toLowerCase();
                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientEmail(clientEmail)}
                      className={`w-full p-3 text-left transition-colors flex items-center justify-between cursor-pointer group ${
                        isSelected
                          ? 'bg-blue-600/15 border-l-4 border-blue-500'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'
                        }`}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                            {client.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            TIN: {client.tin} • RDO {client.rdo}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-blue-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Active Chat Thread */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
            {selectedClient ? (
              <>
                {/* Active Client Sub-header */}
                <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white flex items-center space-x-2">
                        <span>{selectedClient.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">
                          TIN: {selectedClient.tin}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {selectedClient.email ? `Linked Email: ${selectedClient.email}` : `RDO ${selectedClient.rdo} • ${selectedClient.type}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={fetchMessages}
                    disabled={loading}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1"
                    title="Refresh Thread"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-[11px] hidden sm:inline">Refresh</span>
                  </button>
                </div>

                {/* Message Thread */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-12">
                      <MessageSquare className="w-10 h-10 opacity-30 text-blue-400" />
                      <p className="text-xs font-medium text-slate-400">No message history with {selectedClient.name}.</p>
                      <p className="text-[11px] text-slate-500 max-w-sm">
                        Type a message below to send tax reminders, form filing updates, or advisory inquiries directly to this business owner.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOfficer = msg.senderEmail?.toLowerCase() === user?.email?.toLowerCase() ||
                        msg.senderRole?.toLowerCase().includes('officer') ||
                        msg.senderRole?.toLowerCase().includes('cpa') ||
                        msg.senderRole?.toLowerCase().includes('accountant');

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOfficer ? 'items-end' : 'items-start'} space-y-1`}
                        >
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 px-1">
                            <span className="font-bold text-slate-300">{msg.senderName}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] uppercase font-mono">
                              {msg.senderRole || (isOfficer ? 'Compliance Officer' : 'Client')}
                            </span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                              isOfficer
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-tl-none'
                            }`}
                          >
                            {msg.formCode && (
                              <div className="mb-1.5 inline-block px-2 py-0.5 rounded bg-black/20 text-[10px] font-mono font-bold text-amber-300">
                                Re: BIR Form {msg.formCode}
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Footer */}
                <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0 space-y-2">
                  {error && (
                    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="space-y-2">
                    {formCodesList.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-slate-400 font-medium">Tag BIR Form:</span>
                        <select
                          value={selectedFormCode}
                          onChange={(e) => setSelectedFormCode(e.target.value)}
                          className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">-- General Message --</option>
                          {formCodesList.map((code) => (
                            <option key={code} value={code}>
                              BIR Form {code}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={`Message ${selectedClient.name}...`}
                        disabled={sending}
                        className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />

                      <button
                        type="submit"
                        disabled={!inputText.trim() || sending}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-lg cursor-pointer flex items-center space-x-1.5 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select a client from the list to view or start messaging.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
