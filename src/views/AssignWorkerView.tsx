import React, { useState } from 'react';
import { 
  UserCheck, ArrowLeft, CheckCircle2, AlertCircle, Camera, 
  MapPin, Calendar, FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LocationPicker } from '../components/common/LocationPicker';

interface AssignWorkerViewProps {
  onNavigate: (view: string, params?: any) => void;
  preselectedDeviceId?: number;
}

export const AssignWorkerView: React.FC<AssignWorkerViewProps> = ({ 
  onNavigate, preselectedDeviceId 
}) => {
  const { currentUser, devices, workers, employers, assignDeviceToWorker } = useApp();

  // Devices available for assignment:
  // Must be in user's custody (or all unassigned if Admin)
  const assignableDevices = devices.filter(d => {
    if (d.current_status === 'ASSIGNED_WORKER') return false;
    if (['LOST', 'RETIRED', 'RETURNED_TO_CLIENT', 'DAMAGED', 'AWAITING_INSPECTION'].includes(d.current_status)) return false;
    if (currentUser?.role === 'ADMIN') return true;
    return d.current_custodian_type === 'USER' && d.current_custodian_user_id === currentUser?.id;
  });

  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(() => {
    if (preselectedDeviceId && assignableDevices.some(d => d.id === preselectedDeviceId)) {
      return preselectedDeviceId;
    }
    return assignableDevices[0]?.id || 0;
  });

  const [selectedWorkerId, setSelectedWorkerId] = useState<number>(workers[0]?.id || 0);
  const [condition, setCondition] = useState<string>('EXCELLENT');
  const [accessories, setAccessories] = useState<string>('');
  const [acknowledgement, setAcknowledgement] = useState<string>('Worker physically inspected camera, verified optical glass, and signed field dispatch manifest.');
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState<string>('');

  // Location
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ workerName: string; assetId: string } | null>(null);

  // Sync accessories from chosen device
  const handleDeviceChange = (devId: number) => {
    setSelectedDeviceId(devId);
    const d = devices.find(x => x.id === devId);
    if (d) {
      setCondition(d.condition);
      setAccessories(d.accessories || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedDeviceId) {
      setErrorMsg("Please select an available device to assign.");
      return;
    }
    if (!selectedWorkerId) {
      setErrorMsg("Please select a target Worker.");
      return;
    }

    const res = assignDeviceToWorker({
      deviceId: selectedDeviceId,
      workerId: selectedWorkerId,
      condition,
      accessories,
      acknowledgement,
      expectedReturnDate,
      notes,
      latitude,
      longitude,
      locationAddress
    });

    if (!res.success) {
      setErrorMsg(res.error || "Failed to assign device to worker.");
    } else {
      const dev = devices.find(d => d.id === selectedDeviceId);
      const wrk = workers.find(w => w.id === selectedWorkerId);
      setSuccessInfo({
        assetId: dev?.asset_id || `#${selectedDeviceId}`,
        workerName: wrk?.name || 'Worker'
      });
    }
  };

  if (successInfo) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Assignment Finalized!</h2>
        <p className="text-sm text-slate-600">
          Device <span className="font-mono font-bold text-indigo-700">{successInfo.assetId}</span> has been transferred into the custody of worker <span className="font-bold text-slate-900">{successInfo.workerName}</span>. Custody ledger and movement logs have been updated.
        </p>
        <div className="pt-4 flex items-center justify-center space-x-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              setSuccessInfo(null);
            }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Assign Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
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
            <UserCheck className="w-6 h-6 text-indigo-600" />
            <span>Assign Equipment to Worker</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hand over verified equipment to on-ground personnel. Enforces custody transfer and records digital acknowledgement.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {assignableDevices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">No assignable devices in your custody</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You must have devices with status "With Collector" or "Available in Storage" in your custody before you can assign them to workers.
          </p>
          <button
            onClick={() => onNavigate('intake')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-indigo-700 transition"
          >
            Collect Devices from Client
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Device selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Equipment Asset <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => handleDeviceChange(Number(e.target.value))}
                className="form-select text-xs font-mono"
                required
              >
                {assignableDevices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.asset_id} — {d.brand_and_model} ({d.condition})
                  </option>
                ))}
              </select>
            </div>

            {/* Worker selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Worker <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                className="form-select text-xs"
                required
              >
                {workers.map(w => {
                  const emp = employers.find(e => e.id === w.employer_company_id);
                  return (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.worker_id}) — {emp?.name || 'Staffing'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Handover Condition */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Handover Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="form-select text-xs"
              >
                <option value="EXCELLENT">Excellent (Flawless)</option>
                <option value="GOOD">Good (Operational standard)</option>
                <option value="FAIR">Fair (Visible wear)</option>
              </select>
            </div>

            {/* Expected Return Date */}
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

            {/* Accessories Checklist */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Accessories Delivered to Worker
              </label>
              <input
                type="text"
                value={accessories}
                onChange={(e) => setAccessories(e.target.value)}
                placeholder="e.g. Charger, 2x Batteries, Carrying pouch, SD Card"
                className="form-input text-xs"
              />
            </div>

            {/* Handover Acknowledgement */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Worker Handover Acknowledgement
              </label>
              <textarea
                value={acknowledgement}
                onChange={(e) => setAcknowledgement(e.target.value)}
                rows={2}
                className="form-textarea text-xs"
                placeholder="e.g. Worker physically inspected camera and verified accessories on-site..."
              />
            </div>

            {/* Operational Location & GPS */}
            <div className="md:col-span-2">
              <LocationPicker
                locationAddress={locationAddress}
                latitude={latitude}
                longitude={longitude}
                onChange={({ address, latitude: lat, longitude: lng }) => {
                  setLocationAddress(address);
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                label="Field Handover Location / GPS"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
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
              <UserCheck className="w-4 h-4" />
              <span>Confirm & Commit Handover</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
