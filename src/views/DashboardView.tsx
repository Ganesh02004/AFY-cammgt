import React from 'react';
import { 
  Camera, Box, Warehouse, UserCheck, RotateCcw, ClipboardCheck, 
  ArrowRightLeft, AlertTriangle, Boxes, ArrowUpRight, Clock, MapPin, 
  CheckCircle2, Sparkles, ChevronRight, ShieldCheck, Megaphone, Bell
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DeviceStatusBadge, ConditionBadge } from '../components/common/Badge';

interface DashboardViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenScanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenScanner }) => {
  const { currentUser, devices, movements, tasks, incidents, returns, transfers, announcements, unreadNotificationCount } = useApp();

  // Controlled stock totals:
  const totalFleet = devices.length;
  // Available stock rule: Only devices with status AVAILABLE_STORAGE and custodian STORAGE
  const availableStorageCount = devices.filter(d => d.current_status === 'AVAILABLE_STORAGE' && d.current_custodian_type === 'STORAGE').length;
  const inFieldUseCount = devices.filter(d => d.current_status === 'ASSIGNED_WORKER').length;
  const withCollectorsCount = devices.filter(d => d.current_status === 'WITH_COLLECTOR').length;
  const awaitingInspectionCount = devices.filter(d => d.current_status === 'AWAITING_INSPECTION').length;
  const repairOrDamagedCount = devices.filter(d => ['UNDER_REPAIR', 'DAMAGED', 'LOST'].includes(d.current_status)).length;

  const myCustodyDevices = currentUser
    ? devices.filter(d => d.current_custodian_type === 'USER' && d.current_custodian_user_id === currentUser.id)
    : [];

  const pendingTransfers = currentUser
    ? transfers.filter(t => t.receiver_id === currentUser.id && t.status === 'PENDING')
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Camera className="w-80 h-80" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verifiable Equipment Custody Portal</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {currentUser?.first_name || currentUser?.username}!
          </h1>
          <p className="text-sm text-indigo-100/80 mt-2 leading-relaxed">
            Role: <span className="font-bold text-white uppercase">{currentUser?.role}</span>. You currently hold <span className="font-bold text-white underline">{myCustodyDevices.length} camera asset{myCustodyDevices.length === 1 ? '' : 's'}</span> in direct custody.
          </p>

          {/* Quick Action Badges */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('intake')}
              className="px-4 py-2 bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
            >
              <Warehouse className="w-4 h-4 text-indigo-600" />
              <span>Collect from Client</span>
            </button>
            <button
              onClick={() => onNavigate('assign_worker')}
              className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl border border-indigo-400/40 shadow-md transition flex items-center space-x-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Assign to Worker</span>
            </button>
            <button
              onClick={onOpenScanner}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-md transition flex items-center space-x-1.5"
            >
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>Scan QR Code</span>
            </button>
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={() => onNavigate('studio')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Setup Studio</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chatter Broadcast Announcement Stream */}
      {announcements.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-indigo-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                  Chatter Announcement
                </span>
                <span className="text-xs text-slate-500">
                  From <strong className="text-slate-800">{announcements[0].author_name}</strong> ({announcements[0].author_role})
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-1">
                {announcements[0].title}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                {announcements[0].message}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('notifications')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Open Notification Stream</span>
            {unreadNotificationCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-[10px] font-black">
                {unreadNotificationCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Pending Transfers Alert */}
      {pendingTransfers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                You have {pendingTransfers.length} incoming custody transfer request{pendingTransfers.length === 1 ? '' : 's'}
              </h4>
              <p className="text-xs text-amber-700">
                Equipment custody remains legally with sender until you review and confirm acceptance.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('transfers')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Review & Accept
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Fleet */}
        <div 
          onClick={() => onNavigate('master_inventory')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Fleet</span>
            <Box className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalFleet}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center">
            <span>All registered units</span>
            <ChevronRight className="w-3 h-3 ml-auto text-slate-300 group-hover:text-indigo-600" />
          </div>
        </div>

        {/* Available Storage */}
        <div 
          onClick={() => onNavigate('master_inventory', { status: 'AVAILABLE_STORAGE' })}
          className="bg-white p-4 rounded-2xl border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition cursor-pointer group bg-gradient-to-b from-white to-emerald-50/20"
        >
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Available Stock</span>
            <Warehouse className="w-4 h-4 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{availableStorageCount}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center">
            <span>In company storage</span>
            <ChevronRight className="w-3 h-3 ml-auto text-emerald-300" />
          </div>
        </div>

        {/* In Field Use */}
        <div 
          onClick={() => onNavigate('master_inventory', { status: 'ASSIGNED_WORKER' })}
          className="bg-white p-4 rounded-2xl border border-blue-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">In Field Use</span>
            <UserCheck className="w-4 h-4 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono">{inFieldUseCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center">
            <span>With active workers</span>
            <ChevronRight className="w-3 h-3 ml-auto text-slate-300" />
          </div>
        </div>

        {/* With Collectors / Transit */}
        <div 
          onClick={() => onNavigate('my_inventory')}
          className="bg-white p-4 rounded-2xl border border-indigo-200 hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">With Staff</span>
            <ArrowRightLeft className="w-4 h-4 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono">{withCollectorsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center">
            <span>Collector custody</span>
            <ChevronRight className="w-3 h-3 ml-auto text-slate-300" />
          </div>
        </div>

        {/* Awaiting Inspection */}
        <div 
          onClick={() => onNavigate('inspection_queue')}
          className="bg-white p-4 rounded-2xl border border-purple-200 hover:border-purple-400 hover:shadow-md transition cursor-pointer group bg-gradient-to-b from-white to-purple-50/20"
        >
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Inspection</span>
            <ClipboardCheck className="w-4 h-4 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">{awaitingInspectionCount}</div>
          <div className="text-[11px] text-purple-600 mt-1 font-semibold flex items-center">
            <span>Pending tech review</span>
            <ChevronRight className="w-3 h-3 ml-auto text-purple-300" />
          </div>
        </div>

        {/* Damage & Repair */}
        <div 
          onClick={() => onNavigate('incidents')}
          className="bg-white p-4 rounded-2xl border border-rose-200 hover:border-rose-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Quarantine</span>
            <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">{repairOrDamagedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center">
            <span>Damaged / Repair</span>
            <ChevronRight className="w-3 h-3 ml-auto text-slate-300" />
          </div>
        </div>
      </div>

      {/* Main Grid: My Custody & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): My Direct Custody List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                  <Box className="w-5 h-5 text-indigo-600" />
                  <span>My Active Custody ({myCustodyDevices.length})</span>
                </h3>
                <p className="text-xs text-slate-500">Devices currently checked out under your user account</p>
              </div>
              <button
                onClick={() => onNavigate('my_inventory')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>

            {myCustodyDevices.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Box className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">You currently have no devices checked out in your custody.</p>
                <button
                  onClick={() => onNavigate('intake')}
                  className="mt-3 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Intake New Devices
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myCustodyDevices.slice(0, 5).map(dev => (
                  <div key={dev.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-mono text-xs font-bold text-slate-700">
                        <Camera className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-900">{dev.asset_id}</span>
                          <ConditionBadge condition={dev.condition} />
                        </div>
                        <div className="text-xs text-slate-600 font-medium">{dev.brand_and_model}</div>
                        <div className="text-[11px] text-slate-400">
                          {dev.accessories || 'Standard accessories'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onNavigate('assign_worker', { deviceId: dev.id })}
                        className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => onNavigate('transfers', { initiateDeviceId: dev.id })}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        Transfer
                      </button>
                      <button
                        onClick={() => onNavigate('device_detail', { deviceId: dev.id })}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        title="View Device Record"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operational Quick Launcher */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-sm mb-3">Field Operations Workflow</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => onNavigate('intake')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900">1. Intake Collection</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Pick up from Client</div>
              </button>

              <button
                onClick={() => onNavigate('assign_worker')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900">2. Assign Worker</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Handover to Field Staff</div>
              </button>

              <button
                onClick={() => onNavigate('return_process')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900">3. Process Return</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Collect from Worker</div>
              </button>

              <button
                onClick={() => onNavigate('inspection_queue')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900">4. Tech Inspection</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Verify & Restock</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Immutable Movements Ledger */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Recent Movements Ledger</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Immutable</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Audited chronological custody changes</p>

            <div className="relative pl-4 border-l-2 border-indigo-100 space-y-4 text-xs">
              {movements.slice(0, 6).map((m, idx) => {
                const dev = devices.find(d => d.id === m.device_id);
                return (
                  <div key={m.id || idx} className="relative group">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-sm" />
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono font-bold text-indigo-600">{dev?.asset_id || `Device #${m.device_id}`}</span>
                      <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="font-medium text-slate-800 mt-0.5">
                      {m.from_custodian_name} ➔ <span className="text-indigo-700 font-bold">{m.to_custodian_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Status: <span className="font-semibold text-slate-700">{m.to_status}</span>
                    </div>
                    {m.notes && (
                      <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[220px]">
                        "{m.notes}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Field Tasks */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Scheduled Tasks ({tasks.length})</h3>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2">
              {tasks.slice(0, 3).map(t => (
                <div key={t.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{t.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(t.scheduled_time).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.priority === 'HIGH' || t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
