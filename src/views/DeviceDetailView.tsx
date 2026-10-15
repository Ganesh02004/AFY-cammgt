import React from 'react';
import { 
  ArrowLeft, Camera, QrCode, Printer, UserCheck, ArrowRightLeft, 
  RotateCcw, AlertTriangle, ShieldAlert, Clock, MapPin, Trash2, 
  CheckCircle2, Building2, User as UserIcon, Calendar
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DeviceStatusBadge, ConditionBadge } from '../components/common/Badge';
import { QRCodeDisplay } from '../components/common/QRCodeDisplay';

interface DeviceDetailViewProps {
  deviceId: number;
  onNavigate: (view: string, params?: any) => void;
  onBack: () => void;
}

export const DeviceDetailView: React.FC<DeviceDetailViewProps> = ({ deviceId, onNavigate, onBack }) => {
  const { 
    currentUser, devices, clients, contacts, workers, users, 
    movements, activityLogs, deleteDevice 
  } = useApp();

  const device = devices.find(d => d.id === deviceId);

  if (!device) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
        <Camera className="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <h3 className="font-bold text-slate-800">Device Record Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested asset record does not exist or has been deleted.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const client = clients.find(c => c.id === device.source_client_id);
  const poc = contacts.find(c => c.id === device.initial_poc_id);
  const custodianUser = users.find(u => u.id === device.current_custodian_user_id);
  const custodianWorker = workers.find(w => w.id === device.current_custodian_worker_id);

  // Device-specific chronological records
  const deviceMovements = movements.filter(m => m.device_id === device.id);
  const deviceActivity = activityLogs.filter(a => a.device_id === device.id);

  // Permissions check
  const isInMyCustody = currentUser && device.current_custodian_type === 'USER' && device.current_custodian_user_id === currentUser.id;
  const canAssignOrTransfer = currentUser?.role === 'ADMIN' || isInMyCustody;
  const isAssignedToWorker = device.current_status === 'ASSIGNED_WORKER' && device.current_custodian_type === 'WORKER';

  const handleDelete = () => {
    if (confirm(`Permanently delete asset record ${device.asset_id}? This action is irreversible.`)) {
      const res = deleteDevice(device.id, "Admin manual removal");
      if (res.success) {
        onBack();
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Back to Fleet Overview</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {canAssignOrTransfer && (
            <>
              <button
                onClick={() => onNavigate('assign_worker', { deviceId: device.id })}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>Assign to Worker</span>
              </button>
              <button
                onClick={() => onNavigate('transfers', { initiateDeviceId: device.id })}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
              >
                <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                <span>Transfer Custody</span>
              </button>
            </>
          )}

          {isAssignedToWorker && (
            <button
              onClick={() => onNavigate('return_process', { deviceId: device.id, workerId: device.current_custodian_worker_id })}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Collect Return</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('device_label', { deviceId: device.id })}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Label</span>
          </button>

          <button
            onClick={() => onNavigate('incidents', { reportDeviceId: device.id })}
            className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center space-x-1.5"
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Report Incident</span>
          </button>

          {currentUser?.role === 'ADMIN' && (
            <>
              <button
                onClick={() => onNavigate('audited_adjustment', { deviceId: device.id })}
                className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs rounded-xl border border-purple-200 transition flex items-center space-x-1.5"
                title="Audited Admin Adjustment"
              >
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                <span>Adjustment</span>
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                title="Delete Device"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Detail Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-lg font-black text-indigo-700 tracking-tight">
                  {device.asset_id}
                </span>
                <DeviceStatusBadge status={device.current_status} />
                <ConditionBadge condition={device.condition} />
              </div>
              <h1 className="text-2xl font-black text-slate-900">{device.brand_and_model}</h1>
              <p className="text-xs text-slate-500 mt-1">
                Asset category: <span className="font-semibold text-slate-700 uppercase">{device.device_type}</span>
              </p>
            </div>

            {/* Current Custodian Highlight Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Active Custody Location
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  {device.current_custodian_type === 'USER' && <UserIcon className="w-5 h-5" />}
                  {device.current_custodian_type === 'WORKER' && <UserCheck className="w-5 h-5" />}
                  {device.current_custodian_type === 'STORAGE' && <Camera className="w-5 h-5" />}
                  {device.current_custodian_type === 'CLIENT' && <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {device.current_custodian_type === 'USER' && custodianUser && `Staff: ${custodianUser.first_name} ${custodianUser.last_name} (${custodianUser.role})`}
                    {device.current_custodian_type === 'WORKER' && custodianWorker && `Worker: ${custodianWorker.name} (${custodianWorker.worker_id})`}
                    {device.current_custodian_type === 'STORAGE' && 'Company Storage — Central Safe'}
                    {device.current_custodian_type === 'CLIENT' && `Source Client: ${client?.name}`}
                  </div>
                  <div className="text-xs text-slate-500">
                    {device.current_custodian_type === 'STORAGE' ? 'Unit available for assignment or dispatch.' : 'Under direct custody.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <span className="text-slate-400 block mb-0.5">IMEI / Serial</span>
                <span className="font-mono font-bold text-slate-800">{device.imei_or_serial || 'None'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <span className="text-slate-400 block mb-0.5">Source Client</span>
                <span className="font-bold text-slate-800">{client?.name || '—'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <span className="text-slate-400 block mb-0.5">Intake POC</span>
                <span className="font-medium text-slate-800">{poc?.name || 'Authorized Client Rep'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <span className="text-slate-400 block mb-0.5">Received Date</span>
                <span className="font-medium text-slate-800">{new Date(device.received_date).toLocaleDateString()}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 col-span-2">
                <span className="text-slate-400 block mb-1">Accessories Checked</span>
                <div className="flex flex-wrap gap-1">
                  {device.accessories ? (
                    device.accessories.split(',').map((acc, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100">
                        {acc.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="font-medium text-slate-500">Standard equipment bundle</span>
                  )}
                </div>
              </div>
            </div>

            {device.notes && (
              <div className="text-xs p-3 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
                <span className="font-bold text-slate-700">Intake Notes: </span>
                {device.notes}
              </div>
            )}
          </div>

          {/* Column 3: Verifiable QR Code Token */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Privacy-Safe Verifiable QR
            </span>
            <QRCodeDisplay 
              assetId={device.asset_id}
              qrToken={device.qr_token}
              size={190}
            />
            <p className="text-[10px] text-slate-400 mt-2 text-center max-w-[200px]">
              Encodes opaque lookup endpoint. Never embeds sensitive Aadhaar or personal data.
            </p>
          </div>
        </div>
      </div>

      {/* History Ledger & Activity Timeline Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movements History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Custody Movements Ledger ({deviceMovements.length})</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Immutable</span>
          </div>

          <div className="relative pl-4 border-l-2 border-indigo-100 space-y-4 text-xs">
            {deviceMovements.length === 0 ? (
              <p className="text-slate-400 text-xs py-2">No custody movements recorded yet.</p>
            ) : (
              deviceMovements.map((m, idx) => (
                <div key={m.id || idx} className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-sm" />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-slate-700">{m.related_transaction_type}</span>
                    <span>{new Date(m.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {m.from_custodian_name} ➔ <span className="text-indigo-700 font-bold">{m.to_custodian_name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Status: <span className="font-medium text-slate-700">{m.to_status}</span>
                  </div>
                  {m.notes && (
                    <div className="text-[11px] text-slate-500 italic mt-0.5">
                      "{m.notes}"
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Logged by actor: {m.actor_name}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detailed Activity Log */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Field Activity & GPS Log ({deviceActivity.length})</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timestamped</span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {deviceActivity.length === 0 ? (
              <p className="text-slate-400 text-xs py-2">No field activity logs recorded.</p>
            ) : (
              deviceActivity.map((a, idx) => (
                <div key={a.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-700">{a.action.replace(/_/g, ' ')}</span>
                    <span className="text-[11px] text-slate-400">{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700">{a.details}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-600">Actor: {a.actor_name} ({a.actor_role})</span>
                    {a.location_address && (
                      <span className="flex items-center text-slate-500">
                        <MapPin className="w-3 h-3 mr-0.5 text-slate-400" />
                        {a.location_address}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
