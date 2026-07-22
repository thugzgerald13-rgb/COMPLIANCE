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
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Add New Client</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Acme Corp"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">TIN</label>
            <input 
              required
              type="text" 
              value={tin}
              onChange={e => setTin(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="000-000-000-000"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">RDO Code</label>
              <input 
                required
                type="text" 
                value={rdo}
                onChange={e => setRdo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="039"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select 
                value={type}
                onChange={e => setType(e.target.value as TaxPayerType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Individual">Individual</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Applicable Compliance References</label>
            <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto divide-y divide-slate-100">
              {allowedFormReferences.length === 0 ? (
                <p className="text-xs text-slate-400">No compliance references available for this client type.</p>
              ) : (
                allowedFormReferences.map(f => {
                  const isChecked = selectedCodes.includes(f.code);
                  return (
                    <div 
                      key={f.code}
                      onClick={() => toggleForm(f.code)}
                      className="py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-1 rounded transition-colors"
                    >
                      <div className="flex items-center space-x-2 overflow-hidden">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="font-semibold text-xs text-slate-900">{f.code}</span>
                        <span className="text-xs text-slate-500 truncate">- {f.description}</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium ml-2 shrink-0">
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
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
