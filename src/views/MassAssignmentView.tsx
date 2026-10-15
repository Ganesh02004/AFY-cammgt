import React, { useState } from 'react';
import { 
  Boxes, ArrowLeft, CheckCircle2, AlertCircle, Download, 
  UserCheck, Camera, ShieldCheck, CheckSquare, Square
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MassCameraAssignmentBatch } from '../types';

interface MassAssignmentViewProps {
  onNavigate: (view: string, params?: any) => void;
  preselectedIds?: number[];
}

export const MassAssignmentView: React.FC<MassAssignmentViewProps> = ({ 
  onNavigate, preselectedIds = [] 
}) => {
  const { devices, workers, employers, currentUser, executeMassAssignment } = useApp();

  // Devices eligible for mass assignment (in storage or with collector)
  const eligibleDevices = devices.filter(d => 
    d.current_status === 'AVAILABLE_STORAGE' || d.current_status === 'WITH_COLLECTOR'
  );

  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    if (preselectedIds.length > 0) {
      return preselectedIds.filter(id => eligibleDevices.some(d => d.id === id));
    }
    return eligibleDevices.slice(0, 3).map(d => d.id);
  });

  const [targetWorkerId, setTargetWorkerId] = useState<number>(workers[0]?.id || 0);
  const [purpose, setPurpose] = useState<string>('FIELD_OPS');
  const [notes, setNotes] = useState<string>('Mass deployment batch for route operations.');
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const [completedBatch, setCompletedBatch] = useState<MassCameraAssignmentBatch | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleSelectDevice = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === eligibleDevices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleDevices.map(d => d.id));
    }
  };

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedIds.length === 0) {
      setErrorMsg("Please select at least one camera asset for mass assignment.");
      return;
    }
    if (!targetWorkerId) {
      setErrorMsg("Please select a target Worker.");
      return;
    }

    const res = executeMassAssignment({
      workerId: targetWorkerId,
      deviceIds: selectedIds,
      purpose,
      notes,
      expectedReturnDate
    });

    if (!res.success) {
      setErrorMsg(res.error || "Mass assignment failed.");
    } else {
      setCompletedBatch(res.batch!);
    }
  };

  const handleExportBatchCSV = () => {
    if (!completedBatch) return;
    const headers = ["Device ID", "Asset ID", "Brand & Model", "Status", "Verdict"];
    const rows = completedBatch.summary_report.map(r => [
      r.device_id,
      r.asset_id,
      `"${r.brand_and_model || ''}"`,
      r.success ? "ASSIGNED" : "FAILED",
      `"${r.reason}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mass_batch_${completedBatch.batch_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (completedBatch) {
    const targetWorker = workers.find(w => w.id === targetWorkerId);
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Mass Assignment Batch Finalized!
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            Batch ID: <span className="font-bold text-indigo-700">{completedBatch.batch_id}</span>
          </p>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Successfully allocated <span className="font-bold text-slate-900">{completedBatch.successful_assignments} cameras</span> to worker <span className="font-bold text-indigo-700">{targetWorker?.name}</span>. Individual assignments and immutable movement logs were committed atomically.
          </p>

          <div className="pt-2 flex items-center justify-center space-x-3">
            <button
              onClick={handleExportBatchCSV}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Batch CSV Report</span>
            </button>
            <button
              onClick={() => onNavigate('master_inventory')}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Master Fleet Registry
            </button>
          </div>
        </div>

        {/* Detailed Rows Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Row-by-Row Execution Report</h3>
          <div className="divide-y divide-slate-100">
            {completedBatch.summary_report.map((r, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-indigo-700">{r.asset_id}</span>
                  <span className="text-slate-600 font-medium">{r.brand_and_model}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-500">{r.reason}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    r.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {r.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Boxes className="w-6 h-6 text-indigo-600" />
            <span>Mass Camera Assignment Studio</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Batch-allocate multiple physical cameras simultaneously. Enforces individual asset validation and maintains discrete movement records.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleExecute} className="space-y-6">
        {/* Step 1: Target Worker & Purpose */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
            1. Target Deployment Target
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Worker <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetWorkerId}
                onChange={(e) => setTargetWorkerId(Number(e.target.value))}
                className="form-select text-xs"
                required
              >
                {workers.map(w => {
                  const emp = employers.find(e => e.id === w.employer_company_id);
                  return (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.worker_id}) — {emp?.name || 'Agency'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Deployment Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="form-select text-xs font-medium"
              >
                <option value="FIELD_OPS">Standard Field Operations</option>
                <option value="SPECIAL_EVENT">Special Event / Crowd Control</option>
                <option value="AUDIT_INSPECTION">Audit & Facility Inspection</option>
                <option value="SURGE_STAFFING">Surge / Seasonal Staffing Deployment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Expected Return Date
              </label>
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="form-input text-xs"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Batch Deployment Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Operational purpose, team details, route specs..."
                className="form-textarea text-xs"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Multi-select Available Cameras */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                2. Select Equipment ({selectedIds.length} of {eligibleDevices.length} Selected)
              </h3>
              <p className="text-xs text-slate-500">Only dispatch-ready units in storage or collector custody can be batch assigned.</p>
            </div>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              {selectedIds.length === eligibleDevices.length ? "Deselect All" : "Select All Units"}
            </button>
          </div>

          {eligibleDevices.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No devices are currently available for batch assignment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
              {eligibleDevices.map(d => {
                const isSelected = selectedIds.includes(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => toggleSelectDevice(d.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="pt-0.5 text-indigo-600">
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-mono text-xs font-bold text-slate-900 truncate">
                        {d.asset_id}
                      </div>
                      <div className="text-xs text-slate-600 truncate">{d.brand_and_model}</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Status: <span className="font-medium text-slate-600">{d.current_status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition flex items-center space-x-1.5"
          >
            <Boxes className="w-4 h-4" />
            <span>Confirm & Execute Mass Assignment ({selectedIds.length} Cameras)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
