import React, { useState, useEffect } from 'react';
import { BIRForm, FormStatus } from '../types';
import { X, Save, Calendar, DollarSign, Hash, FileText, CheckCircle } from 'lucide-react';

interface UpdatePayableModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: BIRForm | null;
  clientName?: string;
  clientTin?: string;
  onSave: (
    formId: string, 
    updates: Partial<BIRForm>
  ) => void;
}

export function UpdatePayableModal({
  isOpen,
  onClose,
  form,
  clientName,
  clientTin,
  onSave
}: UpdatePayableModalProps) {
  const [dateFiled, setDateFiled] = useState('');
  const [datePaid, setDatePaid] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<FormStatus>('Paid');

  useEffect(() => {
    if (form) {
      setDateFiled(form.dateFiled || new Date().toISOString().split('T')[0]);
      setDatePaid(form.datePaid || new Date().toISOString().split('T')[0]);
      setAmountPaid(form.amount !== undefined ? String(form.amount) : '');
      setReferenceNo(form.referenceNo || form.confirmationNo || '');
      setNotes(form.notes || '');
      setStatus(form.status === 'Pending' || form.status === 'Processing' ? 'Paid' : form.status);
    }
  }, [form]);

  if (!isOpen || !form) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = amountPaid ? parseFloat(amountPaid) : undefined;
    
    // Determine status: if amount paid & date filed exist, default to Paid or Filed
    let finalStatus = status;
    if (numericAmount && numericAmount > 0 && dateFiled) {
      finalStatus = 'Paid';
    } else if (dateFiled) {
      finalStatus = status === 'Pending' || status === 'Processing' ? 'Filed' : status;
    }

    const updates: Partial<BIRForm> = {
      taxStatus: 'With Payable',
      status: finalStatus,
      dateFiled: dateFiled || undefined,
      datePaid: datePaid || (numericAmount ? dateFiled : undefined),
      amount: numericAmount,
      referenceNo: referenceNo.trim() || undefined,
      confirmationNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onSave(form.id, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-sm">
              {form.code}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Update Reference (With Payable)</h2>
              <p className="text-xs text-slate-400">
                {clientName ? `${clientName} ${clientTin ? `(TIN: ${clientTin})` : ''}` : `BIR Form ${form.code}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-xs text-slate-700">
            <p className="font-bold text-blue-900">
              BIR Form {form.code} - {form.description}
            </p>
            {form.deadline && (
              <p className="text-slate-500 mt-0.5">
                Effective Deadline: <span className="font-medium text-slate-800">{form.deadline}</span>
              </p>
            )}
          </div>

          {/* Date Filed Entry */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Date Filed</span>
            </label>
            <input
              type="date"
              required
              value={dateFiled}
              onChange={(e) => setDateFiled(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Amount Paid Entry */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Amount Paid (₱)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Reference / Confirmation No. Entry */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-600" />
              <span>Reference / Confirmation No.</span>
            </label>
            <input
              type="text"
              placeholder="e.g. BIR-2026-991204 / eFPS Confirmation #"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Notes / Remarks Entry */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Notes / Remarks</span>
            </label>
            <textarea
              rows={3}
              placeholder="Enter compliance notes, bank receipt details, or audit remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
            />
          </div>

          {/* Compliance Status Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Compliance Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FormStatus)}
              className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="Paid">Paid</option>
              <option value="Filed">Filed</option>
              <option value="Processing">In Processing</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Entry Details</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
