import React, { useState, useEffect } from 'react';
import { BIRForm, FormStatus } from '../types';
import { X, Save, Calendar, DollarSign, Hash, FileText, CheckCircle, Clock } from 'lucide-react';

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

  useEffect(() => {
    if (form) {
      setDateFiled(form.dateFiled || '');
      setDatePaid(form.datePaid || '');
      setAmountPaid(form.amount !== undefined && form.amount !== null ? String(form.amount) : '');
      setReferenceNo(form.referenceNo || form.confirmationNo || '');
      setNotes(form.notes || '');
    }
  }, [form]);

  if (!isOpen || !form) return null;

  const numericAmount = amountPaid ? parseFloat(amountPaid) : undefined;
  const hasDateFiled = Boolean(dateFiled && dateFiled.trim());
  const hasDatePaid = Boolean(datePaid && datePaid.trim());
  const hasAmount = Boolean(numericAmount !== undefined && numericAmount > 0);
  const hasRefNo = Boolean(referenceNo && referenceNo.trim());

  const isComplete = hasDateFiled && hasDatePaid && hasAmount && hasRefNo;
  const calculatedStatus: FormStatus = isComplete ? 'Paid' : 'Processing';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Partial<BIRForm> = {
      taxStatus: 'With Payable',
      status: calculatedStatus,
      dateFiled: dateFiled || undefined,
      datePaid: datePaid || undefined,
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
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
          <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300">
            <p className="font-bold text-blue-900 dark:text-blue-300">
              BIR Form {form.code} - {form.description}
            </p>
            {form.deadline && (
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Effective Deadline: <span className="font-medium text-slate-800 dark:text-slate-200">{form.deadline}</span>
              </p>
            )}
          </div>

          {/* Status Live Notice */}
          <div className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-medium ${
            isComplete 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300' 
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
          }`}>
            {isComplete ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>All 4 details complete! Compliance status will be set to <strong>Paid</strong>.</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>If any of the 4 details is missing, status will remain <strong>In Processing</strong>.</span>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 1. Date Filed Entry */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>1. Date Filed {!hasDateFiled && <span className="text-red-500">*</span>}</span>
              </label>
              <input
                type="date"
                value={dateFiled}
                onChange={(e) => setDateFiled(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* 2. Date Paid Entry */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>2. Date Paid {!hasDatePaid && <span className="text-red-500">*</span>}</span>
              </label>
              <input
                type="date"
                value={datePaid}
                onChange={(e) => setDatePaid(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 3. Amount Paid Entry */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>3. Amount Paid (₱) {!hasAmount && <span className="text-red-500">*</span>}</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* 4. Reference / Confirmation No. Entry */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>4. Reference No. {!hasRefNo && <span className="text-red-500">*</span>}</span>
              </label>
              <input
                type="text"
                placeholder="e.g. BIR-2026-991204"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium font-mono"
              />
            </div>
          </div>

          {/* Notes / Remarks Entry */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Notes / Remarks</span>
            </label>
            <textarea
              rows={2}
              placeholder="Enter optional compliance notes, bank receipt details, or audit remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
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
