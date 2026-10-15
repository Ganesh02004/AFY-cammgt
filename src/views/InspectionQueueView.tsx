import React, { useState } from 'react';
import { 
  ClipboardCheck, ArrowLeft, CheckCircle2, AlertTriangle, 
  RotateCcw, ShieldCheck, Warehouse, Wrench, Ban, Archive
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DeviceReturn, InspectionResult, ReturnOutcome } from '../types';

interface InspectionQueueViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const InspectionQueueView: React.FC<InspectionQueueViewProps> = ({ onNavigate }) => {
  const { returns, devices, workers, users, completeInspection } = useApp();

  const pendingReturns = returns.filter(r => !r.inspection_completed);
  const completedReturns = returns.filter(r => r.inspection_completed);

  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [selectedReturn, setSelectedReturn] = useState<DeviceReturn | null>(null);

  // Inspection form
  const [inspectionResult, setInspectionResult] = useState<InspectionResult>('PASSED');
  const [outcome, setOutcome] = useState<ReturnOutcome>('AVAILABLE_STORAGE');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleOpenInspection = (ret: DeviceReturn) => {
    setSelectedReturn(ret);
    setInspectionResult('PASSED');
    setOutcome('AVAILABLE_STORAGE');
    setNotes('');
    setErrorMsg('');
  };

  const handleCompleteInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    const res = completeInspection({
      returnId: selectedReturn.id,
      inspectionResult,
      outcome,
      notes
    });

    if (!res.success) {
      setErrorMsg(res.error || "Failed to finalize inspection.");
    } else {
      setSuccessMsg(`Inspection finalized for Return #${selectedReturn.id}. Outcome: ${outcome}`);
      setSelectedReturn(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            <span>Equipment Technical Inspection Queue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Returned equipment is strictly quarantined until certified by a technician. Only devices passing inspection with storage outcome become available stock.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-6 pt-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'pending'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Pending Inspection</span>
          {pendingReturns.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold">
              {pendingReturns.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'completed'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Inspection History</span>
          <span className="text-[10px] text-slate-400">({completedReturns.length})</span>
        </button>
      </div>

      {/* Pending Queue List */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingReturns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">Inspection Queue Clear</h3>
              <p className="text-xs text-slate-500 mt-1">
                There are currently no returned units awaiting technical inspection.
              </p>
            </div>
          ) : (
            pendingReturns.map(ret => {
              const dev = devices.find(d => d.id === ret.device_id);
              const worker = workers.find(w => w.id === ret.worker_id);
              const receiver = users.find(u => u.id === ret.receiving_user_id);

              return (
                <div key={ret.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                        <ClipboardCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-slate-900">{dev?.asset_id}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                            Awaiting Inspection
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">{dev?.brand_and_model}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenInspection(ret)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Perform Inspection</span>
                    </button>
                  </div>

                  <div className="text-xs text-slate-500 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Returned By Worker:</span>
                      <span className="font-bold text-slate-800">{worker ? `${worker.name} (${worker.worker_id})` : 'Worker'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Received By Staff:</span>
                      <span className="font-medium text-slate-800">{receiver ? `${receiver.first_name} ${receiver.last_name}` : 'Staff'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Return Time:</span>
                      <span className="font-medium text-slate-800">{new Date(ret.return_time).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Reported Condition:</span>
                      <span className="font-bold text-amber-700">{ret.condition}</span>
                    </div>
                  </div>

                  {ret.notes && (
                    <div className="text-xs p-2.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                      <span className="font-semibold text-slate-700">Worker Return Notes: </span>
                      {ret.notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Completed Queue List */}
      {activeTab === 'completed' && (
        <div className="space-y-3">
          {completedReturns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">No completed inspections yet.</p>
            </div>
          ) : (
            completedReturns.map(ret => {
              const dev = devices.find(d => d.id === ret.device_id);
              const inspector = users.find(u => u.id === ret.inspector_id);

              return (
                <div key={ret.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-xs text-indigo-700">{dev?.asset_id}</div>
                      <div className="font-bold text-slate-900 text-sm">{dev?.brand_and_model}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {ret.inspection_result}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        Outcome: {ret.outcome}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Inspector: {inspector ? `${inspector.first_name} ${inspector.last_name}` : 'Technician'}</span>
                    <span>{ret.inspection_time ? new Date(ret.inspection_time).toLocaleString() : ''}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Inspection Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-5 border border-slate-100">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                Technical Certification
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Complete Device Inspection
              </h3>
              <p className="text-xs text-slate-500">
                Verifying {devices.find(d => d.id === selectedReturn.device_id)?.asset_id}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCompleteInspection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Inspection Verdict *
                </label>
                <select
                  value={inspectionResult}
                  onChange={(e) => setInspectionResult(e.target.value as InspectionResult)}
                  className="form-select text-xs font-semibold"
                  required
                >
                  <option value="PASSED">Passed (All functional, optics & battery optimal)</option>
                  <option value="NEEDS_REPAIR">Needs Repair / Maintenance Required</option>
                  <option value="DAMAGED">Physical Damage Detected</option>
                  <option value="MISSING_ACCESSORIES">Accessories Incomplete</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Disposal & Restocking Outcome *
                </label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as ReturnOutcome)}
                  className="form-select text-xs font-semibold"
                  required
                >
                  <option value="AVAILABLE_STORAGE">Move to Company Storage (Make Available Stock)</option>
                  <option value="RETURNED_CLIENT">Return to Source Client Company</option>
                  <option value="UNDER_REPAIR">Send to Repair Bay / Workshop</option>
                  <option value="DAMAGED">Mark as Damaged Quarantine</option>
                  <option value="RETIRED">Retire / Archive Asset</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Only selecting "Move to Company Storage" will make this unit count towards available dispatch stock.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Technician Notes & Diagnostics
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Record sensor tests, lens clarity, battery cycle health, firmware version..."
                  className="form-textarea text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Inspection Verdict</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
