import React, { useState } from 'react';
import { 
  AlertTriangle, Plus, CheckCircle2, ShieldAlert, ArrowLeft, 
  Camera, Check, Search, FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Incident } from '../types';

interface IncidentsViewProps {
  onNavigate: (view: string, params?: any) => void;
  reportDeviceId?: number;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({ onNavigate, reportDeviceId }) => {
  const { incidents, devices, currentUser, reportIncident, resolveIncident } = useApp();
  const [showReportModal, setShowReportModal] = useState(Boolean(reportDeviceId));

  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(() => {
    if (reportDeviceId) return reportDeviceId;
    return devices[0]?.id || 0;
  });

  const [incidentType, setIncidentType] = useState<Incident['incident_type']>('DAMAGE');
  const [notes, setNotes] = useState('');
  const [resolveModalId, setResolveModalId] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId || !notes.trim()) return;

    reportIncident({
      device_id: selectedDeviceId,
      incident_type: incidentType,
      reporter_id: currentUser?.id || 1,
      notes: notes.trim(),
      status: 'REPORTED'
    });

    setShowReportModal(false);
    setNotes('');
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalId || !resolutionNotes.trim()) return;

    resolveIncident(resolveModalId, resolutionNotes.trim());
    setResolveModalId(null);
    setResolutionNotes('');
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Loss & Damage Governance</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Equipment Incidents & Damages ({incidents.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Physical damage, loss, or serial discrepancy logging with automatic quarantine safety locks.
          </p>
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Report New Incident</span>
        </button>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {incidents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">No Active Incidents</h3>
            <p className="text-xs text-slate-500 mt-1">All equipment across the enterprise is accounted for and operational.</p>
          </div>
        ) : (
          incidents.map(inc => {
            const dev = devices.find(d => d.id === inc.device_id);
            const isResolved = inc.status === 'RESOLVED';

            return (
              <div key={inc.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-slate-900">{dev?.asset_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inc.incident_type === 'DAMAGE' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inc.incident_type}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {inc.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium">{dev?.brand_and_model}</div>
                    </div>
                  </div>

                  {!isResolved && (currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGEMENT') && (
                    <button
                      onClick={() => setResolveModalId(inc.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve Incident</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {inc.notes}
                </p>

                {inc.resolution_notes && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <span className="font-bold">Resolution: </span>
                    {inc.resolution_notes}
                  </div>
                )}

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Reported on: {new Date(inc.timestamp).toLocaleString()}</span>
                  <button
                    onClick={() => onNavigate('device_detail', { deviceId: inc.device_id })}
                    className="font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    View Asset Record →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 space-y-4 border border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-lg">Report Equipment Incident</h3>
            <form onSubmit={handleCreateReport} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Equipment Asset *</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
                  className="form-select text-xs font-mono"
                  required
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.asset_id} — {d.brand_and_model} ({d.current_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Incident Classification *</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as Incident['incident_type'])}
                  className="form-select text-xs font-semibold"
                >
                  <option value="DAMAGE">Physical Damage</option>
                  <option value="LOSS">Device Lost / Missing in Field</option>
                  <option value="DISCREPANCY">Inventory Audit Discrepancy</option>
                  <option value="THEFT">Suspected Theft</option>
                  <option value="OTHER">Other Operational Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Incident Details & Evidence *</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe damage circumstance, optics scratches, missing parts, location..."
                  className="form-textarea text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition"
                >
                  Submit & Quarantine Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 space-y-4 border border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-lg">Resolve Incident #{resolveModalId}</h3>
            <form onSubmit={handleConfirmResolve} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Resolution Summary *</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe repair performed, insurance clearance, replacement, or disposal..."
                  className="form-textarea text-xs"
                  required
                  autoFocus
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolveModalId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
