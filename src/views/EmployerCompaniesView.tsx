import React, { useState } from 'react';
import { Briefcase, Plus, Search, Building2, MapPin, Users, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface EmployerCompaniesViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const EmployerCompaniesView: React.FC<EmployerCompaniesViewProps> = ({ onNavigate }) => {
  const { employers, workers, createEmployer } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [contactDetails, setContactDetails] = useState('');

  const filtered = employers.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    createEmployer({
      name: name.trim(),
      code: code.trim(),
      address: address.trim(),
      contact_details: contactDetails.trim() || undefined,
      status: 'ACTIVE'
    });

    setShowAdd(false);
    setName('');
    setCode('');
    setAddress('');
    setContactDetails('');
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Staffing & Vendor Agencies</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Employer Companies ({employers.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Staffing agencies, security contractors, and partner vendors deploying on-ground camera operators.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employer Agency</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employer agency name, code..."
            className="form-input pl-9 text-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(emp => {
          const empWorkers = workers.filter(w => w.employer_company_id === emp.id);

          return (
            <div key={emp.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {emp.code}
                  </span>
                  <h3 className="font-black text-slate-900 text-base mt-1.5">{emp.name}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {emp.status}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{emp.address}</span>
                </div>
                {emp.contact_details && (
                  <p className="text-[11px] text-slate-400">{emp.contact_details}</p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{empWorkers.length} Registered Field Workers</span>
                <button
                  onClick={() => onNavigate('workers')}
                  className="font-bold text-indigo-600 hover:text-indigo-800"
                >
                  View Personnel →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 space-y-4 border border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-lg">Add Employer Agency</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Agency Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rapid Dispatch Services"
                  className="form-input text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unique Agency Code *</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. RDS-001"
                  className="form-input text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Office Address *</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full office address"
                  className="form-textarea text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Details / Helpdesk</label>
                <input
                  type="text"
                  value={contactDetails}
                  onChange={(e) => setContactDetails(e.target.value)}
                  placeholder="dispatch@rapidsvc.com | 011-45678900"
                  className="form-input text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
                >
                  Save Agency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
