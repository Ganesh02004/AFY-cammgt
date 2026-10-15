import React, { useState } from 'react';
import { 
  RotateCcw, ArrowLeft, CheckCircle2, AlertCircle, Camera, 
  MapPin, UserCheck, ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LocationPicker } from '../components/common/LocationPicker';

interface ReturnProcessViewProps {
  onNavigate: (view: string, params?: any) => void;
  preselectedDeviceId?: number;
  preselectedWorkerId?: number;
}

export const ReturnProcessView: React.FC<ReturnProcessViewProps> = ({ 
  onNavigate, preselectedDeviceId, preselectedWorkerId 
}) => {
  const { devices, workers, currentUser, processReturn } = useApp();

  // Devices currently assigned to workers
  const assignedDevices = devices.filter(d => d.current_status === 'ASSIGNED_WORKER');

  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(() => {
    if (preselectedDeviceId && assignedDevices.some(d => d.id === preselectedDeviceId)) {
      return preselectedDeviceId;
    }
    return assignedDevices[0]?.id || 0;
  });

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  const [selectedWorkerId, setSelectedWorkerId] = useState<number>(() => {
    if (preselectedWorkerId) return preselectedWorkerId;
    if (selectedDevice?.current_custodian_worker_id) {
      return selectedDevice.current_custodian_worker_id;
    }
    return workers[0]?.id || 0;
  });

  const [condition, setCondition] = useState<string>(selectedDevice?.condition || 'GOOD');
  const [accessories, setAccessories] = useState<string>(selectedDevice?.accessories || '');
  const [notes, setNotes] = useState<string>('');
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ assetId: string; returnId: number } | null>(null);

  const handleDeviceChange = (devId: number) => {
    setSelectedDeviceId(devId);
    const dev = devices.find(d => d.id === devId);
    if (dev) {
      if (dev.current_custodian_worker_id) {
        setSelectedWorkerId(dev.current_custodian_worker_id);
      }
      setCondition(dev.condition);
      setAccessories(dev.accessories || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedDeviceId) {
      setErrorMsg("Please select an assigned device to return.");
      return;
    }

    const res = processReturn({
      deviceId: selectedDeviceId,
      workerId: selectedWorkerId,
      condition,
      accessories,
      notes,
      locationAddress,
      latitude,
      longitude
    });

    if (!res.success) {
      setErrorMsg(res.error || "Failed to process return.");
    } else {
      setSuccessInfo({
        assetId: selectedDevice?.asset_id || `#${selectedDeviceId}`,
        returnId: res.deviceReturn!.id
      });
    }
  };

  if (successInfo) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Return Logged & Quarantined!</h2>
        <p className="text-sm text-slate-600">
          Device <span className="font-mono font-bold text-indigo-700">{successInfo.assetId}</span> has been logged under Return #{successInfo.returnId}. 
          Per compliance rules, it is now marked as <span className="font-bold text-purple-700">Awaiting Inspection</span> in your custody and is <span className="underline">excluded from available stock</span> until technical inspection is completed.
        </p>

        <div className="pt-4 flex items-center justify-center space-x-3">
          <button
            onClick={() => onNavigate('inspection_queue')}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Go to Inspection Queue
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Dashboard
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
            <RotateCcw className="w-6 h-6 text-indigo-600" />
            <span>Process Equipment Return</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Collect equipment returned from workers. Puts device into "Awaiting Inspection" status before it can re-enter available stock.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {assignedDevices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <RotateCcw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">No devices currently assigned to workers</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All devices in the fleet are either in company storage or with collectors. No worker return is pending.
          </p>
          <button
            onClick={() => onNavigate('master_inventory')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-indigo-700 transition"
          >
            View Master Inventory
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Device to return */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Returning Device <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => handleDeviceChange(Number(e.target.value))}
                className="form-select text-xs font-mono"
                required
              >
                {assignedDevices.map(d => {
                  const wrk = workers.find(w => w.id === d.current_custodian_worker_id);
                  return (
                    <option key={d.id} value={d.id}>
                      {d.asset_id} — {d.brand_and_model} (Worker: {wrk?.name || 'Assigned'})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Worker returning */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Returning Worker <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                className="form-select text-xs"
                required
              >
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.worker_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Return condition */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Physical Condition at Return
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="form-select text-xs"
              >
                <option value="EXCELLENT">Excellent (Ready for immediate redeployment)</option>
                <option value="GOOD">Good (Normal wear)</option>
                <option value="FAIR">Fair (Needs cleaning / thorough check)</option>
                <option value="DAMAGED">Damaged / Non-Functional</option>
              </select>
            </div>

            {/* Accessories returned */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Accessories Received
              </label>
              <input
                type="text"
                value={accessories}
                onChange={(e) => setAccessories(e.target.value)}
                placeholder="e.g. Charger, 2x Batteries, Lens cap..."
                className="form-input text-xs"
              />
            </div>

            {/* Return notes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Return Inspection Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="State any observations, lens condition, scratches, missing components..."
                className="form-textarea text-xs"
              />
            </div>

            {/* Location */}
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
                label="Return Collection Point / GPS"
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
              <RotateCcw className="w-4 h-4" />
              <span>Collect Return into Inspection Queue</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
