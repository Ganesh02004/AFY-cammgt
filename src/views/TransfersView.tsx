import React, { useState } from 'react';
import { 
  ArrowRightLeft, Plus, CheckCircle2, XCircle, Clock, 
  ArrowLeft, AlertCircle, Camera, User, MapPin
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LocationPicker } from '../components/common/LocationPicker';

interface TransfersViewProps {
  onNavigate: (view: string, params?: any) => void;
  initiateDeviceId?: number;
}

export const TransfersView: React.FC<TransfersViewProps> = ({ onNavigate, initiateDeviceId }) => {
  const { 
    currentUser, transfers, devices, users, 
    initiateTransfer, acceptTransfer, rejectTransfer, cancelTransfer 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'initiate'>(
    initiateDeviceId ? 'initiate' : 'incoming'
  );

  // New transfer form state
  const myDevices = devices.filter(d => 
    d.current_custodian_type === 'USER' && 
    d.current_custodian_user_id === currentUser?.id &&
    !['ASSIGNED_WORKER', 'LOST', 'RETIRED'].includes(d.current_status)
  );

  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(() => {
    if (initiateDeviceId && myDevices.some(d => d.id === initiateDeviceId)) {
      return initiateDeviceId;
    }
    return myDevices[0]?.id || 0;
  });

  const availableReceivers = users.filter(u => u.id !== currentUser?.id && u.is_active);
  const [selectedReceiverId, setSelectedReceiverId] = useState<number>(availableReceivers[0]?.id || 0);
  const [condition, setCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [rejectModalTransferId, setRejectModalTransferId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Lists
  const incomingTransfers = transfers.filter(t => t.receiver_id === currentUser?.id);
  const outgoingTransfers = transfers.filter(t => t.sender_id === currentUser?.id);

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedDeviceId) {
      setErrorMsg("Please select a device in your custody.");
      return;
    }
    if (!selectedReceiverId) {
      setErrorMsg("Please select a receiver.");
      return;
    }

    const res = initiateTransfer({
      deviceId: selectedDeviceId,
      receiverId: selectedReceiverId,
      condition,
      notes,
      latitude,
      longitude,
      locationAddress
    });

    if (!res.success) {
      setErrorMsg(res.error || "Failed to initiate transfer.");
    } else {
      setActiveTab('outgoing');
      setNotes('');
    }
  };

  const handleAccept = (tId: number) => {
    const res = acceptTransfer(tId);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to accept transfer.");
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalTransferId || !rejectReason.trim()) return;
    rejectTransfer(rejectModalTransferId, rejectReason.trim());
    setRejectModalTransferId(null);
    setRejectReason('');
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
            <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
            <span>Operational Peer Transfers</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Custody legally remains with the sender until the receiving staff member inspects and explicitly accepts custody.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('initiate')}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Initiate New Transfer</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-6 pt-2">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'incoming'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Incoming Transfers</span>
          {incomingTransfers.filter(t => t.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {incomingTransfers.filter(t => t.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('outgoing')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'outgoing'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Outgoing Sent</span>
          <span className="text-[10px] text-slate-400">({outgoingTransfers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('initiate')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'initiate'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Transfer</span>
        </button>
      </div>

      {/* Tab 1: Incoming */}
      {activeTab === 'incoming' && (
        <div className="space-y-3">
          {incomingTransfers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <ArrowRightLeft className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No incoming transfers found for your account.</p>
            </div>
          ) : (
            incomingTransfers.map(t => {
              const dev = devices.find(d => d.id === t.device_id);
              const sender = users.find(u => u.id === t.sender_id);
              const isPending = t.status === 'PENDING';

              return (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-slate-900">{dev?.asset_id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPending ? 'bg-amber-100 text-amber-800' : (t.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600')
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">{dev?.brand_and_model}</div>
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAccept(t.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept Custody</span>
                        </button>
                        <button
                          onClick={() => {
                            setRejectModalTransferId(t.id);
                            setRejectReason('');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs rounded-xl transition flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Sender Staff:</span>
                      <span className="font-bold text-slate-800">{sender ? `${sender.first_name} ${sender.last_name}` : 'Staff'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Condition:</span>
                      <span className="font-medium text-slate-800">{t.condition}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Initiated:</span>
                      <span className="font-medium text-slate-800">{new Date(t.initiated_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {t.notes && (
                    <div className="text-xs p-2.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                      <span className="font-semibold text-slate-700">Notes: </span>
                      {t.notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Outgoing */}
      {activeTab === 'outgoing' && (
        <div className="space-y-3">
          {outgoingTransfers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <ArrowRightLeft className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No outgoing transfers initiated by you.</p>
            </div>
          ) : (
            outgoingTransfers.map(t => {
              const dev = devices.find(d => d.id === t.device_id);
              const receiver = users.find(u => u.id === t.receiver_id);
              const isPending = t.status === 'PENDING';

              return (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-slate-900">{dev?.asset_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPending ? 'bg-amber-100 text-amber-800' : (t.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600')
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium">To: {receiver ? `${receiver.first_name} ${receiver.last_name}` : 'Staff'}</div>
                    </div>

                    {isPending && (
                      <button
                        onClick={() => cancelTransfer(t.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                      >
                        Cancel Transfer
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-slate-500">
                    {isPending ? (
                      <span className="text-amber-700 font-medium">
                        ⏳ Custody remains with you until {receiver?.first_name} clicks "Accept".
                      </span>
                    ) : (
                      <span>Transfer resolved: {t.status} at {t.accepted_at ? new Date(t.accepted_at).toLocaleString() : '—'}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: Initiate New */}
      {activeTab === 'initiate' && (
        <form onSubmit={handleInitiate} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Initiate Custody Handover
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Device in Your Custody *
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
                className="form-select text-xs font-mono"
                required
              >
                {myDevices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.asset_id} — {d.brand_and_model} ({d.condition})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Staff Recipient *
              </label>
              <select
                value={selectedReceiverId}
                onChange={(e) => setSelectedReceiverId(Number(e.target.value))}
                className="form-select text-xs"
                required
              >
                {availableReceivers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.role}) — {u.work_location || 'Field'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Condition at Handover
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="form-select text-xs"
              >
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Handover Notes / Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Reason for transfer, deployment route, return instructions..."
                className="form-textarea text-xs"
              />
            </div>

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
                label="Transfer Exchange Location"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setActiveTab('incoming')}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Send Transfer Request</span>
            </button>
          </div>
        </form>
      )}

      {/* Reject Reason Modal */}
      {rejectModalTransferId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Reject Custody Transfer</h3>
            <p className="text-xs text-slate-500">
              Please state why you are declining custody (e.g. physical damage found, serial mismatch, wrong equipment).
            </p>
            <form onSubmit={handleConfirmReject} className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Enter rejection reason..."
                className="form-textarea text-xs"
                required
                autoFocus
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalTransferId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
