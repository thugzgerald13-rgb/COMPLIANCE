import React, { useState, useEffect } from 'react';
import { FormReference } from '../types';
import { X } from 'lucide-react';

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
  const [deadlineRule, setDeadlineRule] = useState('');

  useEffect(() => {
    if (initialData && isOpen) {
      setCode(initialData.code);
      setDescription(initialData.description);
      setFrequency(initialData.frequency);
      setDeadlineRule(initialData.deadlineRule);
    } else if (isOpen) {
      setCode('');
      setDescription('');
      setFrequency('Monthly');
      setDeadlineRule('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      code,
      description,
      frequency,
      deadlineRule
    });
    setCode('');
    setDescription('');
    setFrequency('Monthly');
    setDeadlineRule('');
    onClose();
  };

  const isEditing = !!initialData;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{isEditing ? 'Edit Compliance Reference' : 'Add Compliance Reference'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Form Code</label>
            <input 
              required
              disabled={isEditing}
              type="text" 
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              placeholder="e.g. 1601-C"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Monthly Remittance Return..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
              <select 
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annually">Annually</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deadline Rule</label>
              <input 
                required
                type="text" 
                value={deadlineRule}
                onChange={e => setDeadlineRule(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 10th day of the following month"
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Add Reference'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
