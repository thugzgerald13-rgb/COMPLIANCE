import React, { useState } from 'react';
import { Search, BookOpen, Clock, Calendar, Plus, Trash2, Edit2 } from 'lucide-react';
import { FormReference } from '../types';
import { AddReferenceModal } from './AddReferenceModal';

interface FormsDirectoryProps {
  forms: FormReference[];
  onAddFormReference: (form: FormReference) => void;
  onDeleteFormReference: (code: string) => void;
  onUpdateFormReference: (form: FormReference) => void;
}

export function FormsDirectory({ forms, onAddFormReference, onDeleteFormReference, onUpdateFormReference }: FormsDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormReference | null>(null);

  const filteredForms = forms.filter(form => 
    form.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    form.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (form: FormReference) => {
    setEditingForm(form);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingForm(null);
  };

  const handleSaveForm = (form: FormReference) => {
    if (editingForm) {
      onUpdateFormReference(form);
    } else {
      onAddFormReference(form);
    }
    handleCloseModal();
  };

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <BookOpen className="w-6 h-6 mr-3 text-blue-600" />
          Compliance Reference
        </h1>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search forms..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-72"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline font-medium">Add Reference</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredForms.map((form, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm">
                    {form.code}
                  </span>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditClick(form)}
                      className="text-slate-400 hover:text-blue-500 p-1 rounded hover:bg-blue-50"
                      title="Edit Reference"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteFormReference(form.code)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                      title="Delete Reference"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 line-clamp-2" title={form.description}>
                  {form.description}
                </h3>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-start text-sm text-slate-600">
                <Calendar className="w-4 h-4 mr-2 text-slate-400 shrink-0 mt-0.5" />
                <span><span className="font-medium text-slate-700">Frequency:</span> {form.frequency}</span>
              </div>
              <div className="flex items-start text-sm text-slate-600">
                <Clock className="w-4 h-4 mr-2 text-slate-400 shrink-0 mt-0.5" />
                <span><span className="font-medium text-slate-700">Deadline:</span> {form.deadlineRule}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredForms.length === 0 && (
        <div className="text-center p-12 bg-white rounded-xl border border-slate-100">
          <p className="text-slate-500 text-lg">No BIR forms found matching your search.</p>
        </div>
      )}

      <AddReferenceModal 
        isOpen={isAddModalOpen || !!editingForm} 
        onClose={handleCloseModal} 
        onAdd={handleSaveForm}
        initialData={editingForm || undefined}
      />
    </div>
  );
}
