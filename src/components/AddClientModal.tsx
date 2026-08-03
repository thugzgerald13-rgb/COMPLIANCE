import React, { useState, useEffect } from 'react';
import { Client, TaxPayerType, FormReference, BIRForm } from '../types';
import { X, CheckSquare, Square } from 'lucide-react';
import { isFormAllowedForTaxpayerType, calculateDeadline } from '../utils';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (client: Client) => void;
  formReferences: FormReference[];
  selectedPeriod: string;
}

export function AddClientModal({ isOpen, onClose, onAdd, formReferences, selectedPeriod }: AddClientModalProps) {
  const [name, setName] = useState('');
  const [tin, setTin] = useState('');
  const [rdo, setRdo] = useState('');
  const [type, setType] = useState<TaxPayerType>('Individual');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const allowedFormReferences = formReferences.filter(f => isFormAllowedForTaxpayerType(f.code, type));

  // Pre-select default forms based on taxpayer type
  useEffect(() => {
    if (formReferences.length > 0) {
      const defaultSelected = allowedFormReferences.filter(f => {
        if (f.code === '1601-C' || f.code === '0619-E') return true;
        if (type === 'Corporate' && (f.code === '2550Q' || f.code === '1702Q')) return true;
        if (type === 'Individual' && (f.code === '2551Q' || f.code === '1701Q')) return true;
        return false;
      }).map(f => f.code);
      setSelectedCodes(defaultSelected);
    }
  }, [type, formReferences]);

  if (!isOpen) return null;

  const toggleForm = (code: string) => {
    if (selectedCodes.includes(code)) {
      setSelectedCodes(selectedCodes.filter(c => c !== code));
    } else {
      setSelectedCodes([...selectedCodes, code]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const clientForms: BIRForm[] = selectedCodes.map(code => {
      const ref = formReferences.find(f => f.code === code);
      let deadline = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
      if (ref) {
        deadline = calculateDeadline(selectedPeriod, ref.frequency, ref.deadlineRule);
      }
      return {
        id: crypto.randomUUID(),
        code,
        description: ref?.description || code,
        status: 'Pending',
        deadline,
        period: selectedPeriod,
        assignedPeriod: selectedPeriod || '2026-01',
      };
    });

    const newClient: Client = {
      id: crypto.randomUUID(),
      name,
      tin,
      rdo,
      type,
      forms: clientForms
    };
    onAdd(newClient);
    setName('');
    setTin('');
    setRdo('');
    setType('Individual');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Client</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client Name</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
              placeholder="e.g. Acme Corp"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">TIN</label>
            <input 
              required
              type="text" 
              value={tin}
              onChange={e => setTin(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
              placeholder="000-000-000-000"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RDO Code</label>
              <input 
                required
                type="text" 
                value={rdo}
                onChange={e => setRdo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                placeholder="039"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select 
                value={type}
                onChange={e => setType(e.target.value as TaxPayerType)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
              >
                <option value="Individual" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Individual</option>
                <option value="Corporate" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Corporate</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Applicable Compliance References</label>
            <div className="border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 rounded-lg p-3 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
              {allowedFormReferences.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">No compliance references available for this client type.</p>
              ) : (
                allowedFormReferences.map(f => {
                  const isChecked = selectedCodes.includes(f.code);
                  return (
                    <div 
                      key={f.code}
                      onClick={() => toggleForm(f.code)}
                      className="py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 px-1 rounded transition-colors"
                    >
                      <div className="flex items-center space-x-2 overflow-hidden">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
                        )}
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{f.code}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">- {f.description}</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium ml-2 shrink-0">
                        {f.frequency}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="pt-2 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
