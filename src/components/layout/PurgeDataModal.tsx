import React, { useState } from 'react';
import { 
  AlertTriangle, ShieldAlert, KeyRound, CheckCircle2, 
  X, RefreshCw, Database, Trash2, Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface PurgeDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurgeDataModal: React.FC<PurgeDataModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, executeAdminPurge, 
    devices, assignments, pickups, transfers, returns, tasks, incidents 
  } = useApp();

  const [scope, setScope] = useState<'INVENTORY_ONLY' | 'COMPLETE_FACTORY_RESET'>('INVENTORY_ONLY');
  const [password, setPassword] = useState('');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successReport, setSuccessReport] = useState<{ count: number; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
          <h3 className="text-lg font-black text-slate-900">Access Restricted</h3>
          <p className="text-xs text-slate-500">Only authorized System Administrators can access data purge operations.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 text-xs font-bold rounded-xl">Close</button>
        </div>
      </div>
    );
  }

  const operationalRecordCount = 
    devices.length + assignments.length + pickups.length + 
    transfers.length + returns.length + tasks.length + incidents.length;

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (confirmationPhrase.trim().toUpperCase() !== 'CONFIRM PURGE') {
      setErrorMsg('You must type "CONFIRM PURGE" in all caps to authorize this action.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = executeAdminPurge({
        password: password.trim(),
        confirmationPhrase: confirmationPhrase.trim(),
        scope
      });

      if (res.success) {
        setSuccessReport({
          count: res.deletedCount || 0,
          message: res.message || 'Purge operation completed successfully.'
        });
      } else {
        setErrorMsg(res.error || 'Purge authorization failed. Please check credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during the purge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-rose-200 shadow-2xl overflow-hidden my-8">
        {/* Danger Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-red-900 p-6 text-white flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <AlertTriangle className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Danger Zone: System Data Purge</h2>
              <p className="text-[11px] text-rose-200 mt-0.5">Administrative maintenance & database reset protocol</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-rose-200 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {successReport ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Purge Operation Successful</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">{successReport.message}</p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700">
                Records permanently deleted: <strong className="text-rose-600">{successReport.count}</strong>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                Close & Return to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleExecute} className="space-y-5">
              {/* Warning Card */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900">
                <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Permanent Operation Warning</span>
                </div>
                <p>
                  This operation deletes live records from both the client state and the central Firebase Realtime Database.
                  <strong> This operation is irreversible.</strong>
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 text-[11px]">
                  <div>
                    <span className="font-bold text-rose-800 block mb-0.5">Will Be Purged:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                      <li>Equipment & Device Registry ({devices.length})</li>
                      <li>Custody & Worker Assignments ({assignments.length})</li>
                      <li>Pickups, Transfers & Returns</li>
                      <li>Tasks & Incident Tickets ({tasks.length + incidents.length})</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-800 block mb-0.5">Protected & Preserved:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-emerald-700">
                      <li>System Administrator Accounts</li>
                      <li>Client Companies & Directory</li>
                      <li>Dynamic Studio Field Schemas</li>
                      <li>Immutable Audit Log Trail</li>
                    </ul>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Scope Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Select Purge Scope
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className={`p-3 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition ${
                    scope === 'INVENTORY_ONLY' ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="purge_scope"
                      value="INVENTORY_ONLY"
                      checked={scope === 'INVENTORY_ONLY'}
                      onChange={() => setScope('INVENTORY_ONLY')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Operational Purge (Recommended)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Wipes all ~{operationalRecordCount} inventory items, movements & custody transactions. Preserves user accounts and clients.
                      </div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition ${
                    scope === 'COMPLETE_FACTORY_RESET' ? 'border-rose-600 bg-rose-50/50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="purge_scope"
                      value="COMPLETE_FACTORY_RESET"
                      checked={scope === 'COMPLETE_FACTORY_RESET'}
                      onChange={() => setScope('COMPLETE_FACTORY_RESET')}
                      className="mt-0.5 text-rose-600"
                    />
                    <div>
                      <div className="font-bold text-rose-900">Complete Factory Reset</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Resets database to clean initial seed data. Keeps admin accounts and audit logs.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Password Re-authentication */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>2. Administrator Password Re-Verification</span>
                  <span className="text-[10px] text-slate-400 font-normal">Security challenge</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter current administrator password (e.g. admin123)"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              {/* Explicit Confirmation Phrase */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Type <span className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded">CONFIRM PURGE</span> to confirm
                </label>
                <input
                  type="text"
                  required
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  placeholder="CONFIRM PURGE"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || confirmationPhrase.trim().toUpperCase() !== 'CONFIRM PURGE'}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Purging Database...' : 'Authorize & Execute Purge'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
