import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, User, Briefcase, RefreshCw, CheckCircle2, Clock, ShieldCheck, AlertCircle, Link, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChatMessage } from '../types';

interface ClientAccountantMessagingProps {
  clientEmail?: string;
  clientName?: string;
  formCodes?: string[];
  onOpenSyncModal?: () => void;
}

export function ClientAccountantMessaging({
  clientEmail,
  clientName,
  formCodes = [],
  onOpenSyncModal,
}: ClientAccountantMessagingProps) {
  const { user, syncWithAccountant } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedFormCode, setSelectedFormCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const effectiveClientEmail = clientEmail || user?.email || '';
  const isSynced = !!(user?.isSyncedWithAccountant || user?.syncedAccountantEmail);

  const fetchMessages = async () => {
    if (!effectiveClientEmail) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/messages?clientEmail=${encodeURIComponent(effectiveClientEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [effectiveClientEmail]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    try {
      setSending(true);
      setError(null);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: user.email,
          senderName: user.name || user.companyInfo?.companyName || 'Business Owner',
          senderRole: user.role || 'Business Owner',
          clientEmail: effectiveClientEmail,
          recipientEmail: user.syncedAccountantEmail,
          text: inputText.trim(),
          formCode: selectedFormCode || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setInputText('');
        setSelectedFormCode('');
        fetchMessages();
      } else {
        setError(data.message || 'Failed to send message.');
      }
    } catch (err: any) {
      setError(err.message || 'Error sending message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Client & Accountant Messaging</span>
              {isSynced && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Synced</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {isSynced
                ? `Direct communication line with ${user?.syncedAccountantName || user?.syncedAccountantEmail || 'Assigned Accountant'}`
                : 'Connect with your Accountant to exchange tax questions and filing receipts.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-1"
            title="Refresh Messages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {!isSynced && onOpenSyncModal && (
            <button
              onClick={onOpenSyncModal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 shadow-lg shadow-blue-900/30 cursor-pointer"
            >
              <Link className="w-3.5 h-3.5" />
              <span>Sync Accountant</span>
            </button>
          )}
        </div>
      </div>

      {!isSynced && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-xs text-amber-200">
          <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">Sync Required for Direct Messaging</p>
            <p className="text-amber-200/80 leading-relaxed">
              To send messages to your handling Compliance Officer or CPA, click "Sync Accountant" to select your CPA firm.
            </p>
          </div>
        </div>
      )}

      {/* Message Chat List */}
      <div className="h-72 overflow-y-auto p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
            <MessageSquare className="w-8 h-8 opacity-40" />
            <p className="text-xs">No message history yet. Send a inquiry or comment below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderEmail?.toLowerCase() === user?.email?.toLowerCase();
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 px-1">
                  <span className="font-bold text-slate-300">{msg.senderName}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] uppercase font-mono">
                    {msg.senderRole}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                    isMe
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

      {/* Message Input Form */}
      {error && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="space-y-2">
        {formCodes.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-medium">Tag BIR Form (Optional):</span>
            <select
              value={selectedFormCode}
              onChange={(e) => setSelectedFormCode(e.target.value)}
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- General Inquiry --</option>
              {formCodes.map((code) => (
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
            placeholder={isSynced ? "Type message or inquiry for your CPA..." : "Sync with accountant to enable messaging..."}
            disabled={!isSynced || sending}
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!isSynced || !inputText.trim() || sending}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-lg cursor-pointer flex items-center space-x-1.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
