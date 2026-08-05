import React, { useState, useEffect } from 'react';
import { FormReference } from '../types';
import { X } from 'lucide-react';
import { MODAL_OVERLAY_SUBTLE, FIELD_LABEL, FIELD_INPUT, FIELD_SELECT, BTN_CANCEL, BTN_PRIMARY } from './ui';

interface AddReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (form: FormReference) => void;
  initialData?: FormReference;
}

export function AddReferenceModal({ isOpen, onClose, onAdd, initialData }: AddReferenceModalProps) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('Monthly');
  const [customFrequency, setCustomFrequency] = useState('');
  const [deadlineRule, setDeadlineRule] = useState('');

  useEffect(() => {
    if (initialData && isOpen) {
      setCode(initialData.code);
      setDescription(initialData.description);
      setDeadlineRule(initialData.deadlineRule);
      if (['Monthly', 'Quarterly', 'Annually'].includes(initialData.frequency)) {
        setFrequency(initialData.frequency);
        setCustomFrequency('');
      } else {
        setFrequency('Others');
        setCustomFrequency(initialData.frequency || '');
      }
    } else if (isOpen) {
      setCode('');
      setDescription('');
      setFrequency('Monthly');
      setCustomFrequency('');
      setDeadlineRule('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalFrequency = frequency === 'Others' ? (customFrequency.trim() || 'Others') : frequency;
    onAdd({
      code,
      description,
      frequency: finalFrequency,
      deadlineRule
    });
    setCode('');
    setDescription('');
    setFrequency('Monthly');
    setCustomFrequency('');
    setDeadlineRule('');
    onClose();
  };

  const isEditing = !!initialData;

  return (
    <div className={MODAL_OVERLAY_SUBTLE}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Compliance Reference' : 'Add Compliance Reference'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className={FIELD_LABEL}>Form Code</label>
            <input 
              required
              disabled={isEditing}
              type="text" 
              value={code}
              onChange={e => setCode(e.target.value)}
              className={`${FIELD_INPUT} disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400`}
              placeholder="e.g. 1601-C"
            />
          </div>
          
          <div>
            <label className={FIELD_LABEL}>Description</label>
            <textarea 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={FIELD_INPUT}
              placeholder="e.g. Monthly Remittance Return..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={FIELD_LABEL}>Frequency</label>
              <select 
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className={FIELD_SELECT}
              >
                <option value="Monthly" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Monthly</option>
                <option value="Quarterly" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Quarterly</option>
                <option value="Annually" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Annually</option>
                <option value="Others" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Others</option>
              </select>
            </div>
            {frequency === 'Others' && (
              <div>
                <label className={FIELD_LABEL}>How often</label>
                <input 
                  required
                  type="text" 
                  value={customFrequency}
                  onChange={e => setCustomFrequency(e.target.value)}
                  className={FIELD_INPUT}
                  placeholder="e.g. Every 6 months, As needed, One-time"
                />
              </div>
            )}
            <div>
              <label className={FIELD_LABEL}>Deadline Rule</label>
              <input 
                required
                type="text" 
                value={deadlineRule}
                onChange={e => setDeadlineRule(e.target.value)}
                className={FIELD_INPUT}
                placeholder="e.g. 10th day of the following month"
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className={BTN_CANCEL}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className={BTN_PRIMARY}
            >
              {isEditing ? 'Save Changes' : 'Add Reference'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
