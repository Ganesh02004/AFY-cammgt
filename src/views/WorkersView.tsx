import React, { useState } from 'react';
import { 
  Contact2, Search, Plus, Eye, EyeOff, ShieldAlert, 
  ArrowLeft, CheckCircle2, AlertCircle, Building2, Phone, Mail, MapPin
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Worker } from '../types';

interface WorkersViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const WorkersView: React.FC<WorkersViewProps> = ({ onNavigate }) => {
  const { 
    workers, employers, currentUser, createWorker, 
    updateWorker, revealSensitiveWorkerData, devices 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [revealedWorkerIds, setRevealedWorkerIds] = useState<number[]>([]);
  const [showAddWorker, setShowAddWorker] = useState(false);

  // Form state
  const [workerId, setWorkerId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [employerId, setEmployerId] = useState<number>(employers[0]?.id || 0);
  const [designation, setDesignation] = useState('Active Field Worker');
  const [aadhaar, setAadhaar] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  const filtered = workers.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.worker_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.phone.includes(searchTerm)
  );

  const handleReveal = (wId: number) => {
    if (currentUser?.role !== 'ADMIN') {
      alert("Privacy Restriction: Only Administrators can reveal unmasked Aadhaar and Bank details.");
      return;
    }

    if (revealedWorkerIds.includes(wId)) {
      setRevealedWorkerIds(prev => prev.filter(x => x !== wId));
    } else {
      setRevealedWorkerIds(prev => [...prev, wId]);
      revealSensitiveWorkerData(wId);
    }
  };

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId.trim() || !name.trim() || !phone.trim() || !employerId) return;

    createWorker({
      worker_id: workerId.trim(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      employer_company_id: employerId,
      role_or_status: designation.trim() || 'Active Field Worker',
      aadhaar_number: aadhaar.trim() || undefined,
      bank_account_number: bankAccount.trim() || undefined,
      bank_ifsc: bankIfsc.trim() || undefined,
      upi_id: upiId.trim() || undefined
    });

    setShowAddWorker(false);
    setWorkerId('');
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setAadhaar('');
    setBankAccount('');
  };

  const getMaskedAadhaar = (val?: string) => {
    if (!val) return '—';
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 4) {
      return `XXXX-XXXX-${clean.slice(-4)}`;
    }
    return 'XXXX-XXXX-XXXX';
  };

  const getMaskedBank = (val?: string) => {
    if (!val) return '—';
    const clean = val.replace(/\s+/g, '');
    if (clean.length >= 4) {
      return `XXXXXXXX${clean.slice(-4)}`;
    }
    return 'XXXXXXXXXXXX';
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            <Contact2 className="w-4 h-4" />
            <span>Personnel Directory</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Field Workers & Staffing Directory ({workers.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered on-ground field personnel. Sensitive Aadhaar and banking records are strictly masked by default per compliance standards.
          </p>
        </div>

        <button
          onClick={() => setShowAddWorker(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Worker</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search worker name, badge ID, phone..."
            className="form-input pl-9 text-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Workers Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(w => {
          const emp = employers.find(e => e.id === w.employer_company_id);
          const assignedCount = devices.filter(d => d.current_status === 'ASSIGNED_WORKER' && d.current_custodian_worker_id === w.id).length;
          const isRevealed = revealedWorkerIds.includes(w.id);

          return (
            <div key={w.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {w.worker_id}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {w.role_or_status}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-base mt-1">{w.name}</h3>
                  <div className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{emp?.name || 'Staffing Agency'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    {assignedCount} Assigned Device{assignedCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{w.phone}</span>
                </div>
                <div className="flex items-center space-x-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{w.email || '—'}</span>
                </div>
              </div>

              {/* Sensitive Masked Details */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                    <ShieldAlert className="w-3 h-3 text-amber-500" />
                    <span>Protected Identity & Banking Data</span>
                  </span>

                  {currentUser?.role === 'ADMIN' ? (
                    <button
                      onClick={() => handleReveal(w.id)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                    >
                      {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{isRevealed ? 'Hide Details' : 'Reveal (Audit Logged)'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Masked for non-admins</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Aadhaar Card:</span>
                    <span className={isRevealed ? 'text-slate-900 font-bold' : 'text-slate-500'}>
                      {isRevealed ? (w.aadhaar_number || 'None') : getMaskedAadhaar(w.aadhaar_number)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Bank Account:</span>
                    <span className={isRevealed ? 'text-slate-900 font-bold' : 'text-slate-500'}>
                      {isRevealed ? (w.bank_account_number || 'None') : getMaskedBank(w.bank_account_number)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Worker Modal */}
      {showAddWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-slate-900 text-lg">Register New Field Worker</h3>
            <form onSubmit={handleCreateWorker} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Worker Badge ID *</label>
                  <input
                    type="text"
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    placeholder="e.g. WRK-1005"
                    className="form-input text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rakesh Kumar"
                    className="form-input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9812345678"
                    className="form-input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="worker@example.com"
                    className="form-input text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employer / Staffing Agency *</label>
                  <select
                    value={employerId}
                    onChange={(e) => setEmployerId(Number(e.target.value))}
                    className="form-select text-xs"
                    required
                  >
                    {employers.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Aadhaar Number (Masked)</label>
                  <input
                    type="text"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value)}
                    placeholder="12-digit Aadhaar"
                    className="form-input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Account number"
                    className="form-input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWorker(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
                >
                  Register Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
