import React, { useState } from 'react';
import { 
  Box, Search, Filter, Camera, ArrowRightLeft, UserCheck, 
  RotateCcw, AlertTriangle, QrCode, Printer, Plus, ChevronRight, FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DeviceStatusBadge, ConditionBadge } from '../components/common/Badge';

interface MyInventoryViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenScanner: () => void;
}

export const MyInventoryView: React.FC<MyInventoryViewProps> = ({ onNavigate, onOpenScanner }) => {
  const { currentUser, devices, clients } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  if (!currentUser) return null;

  // Filter devices in currently logged-in user's direct custody
  const myDevices = devices.filter(d => 
    d.current_custodian_type === 'USER' && 
    d.current_custodian_user_id === currentUser.id
  );

  const filtered = myDevices.filter(d => {
    const matchesSearch = 
      d.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.brand_and_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.imei_or_serial && d.imei_or_serial.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'ALL' || d.device_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            <Box className="w-4 h-4" />
            <span>Field Custody Management</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            My Inventory Custody ({myDevices.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Equipment currently in your personal custody ({currentUser.first_name} {currentUser.last_name}). You are legally accountable for these units until assigned or transferred.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => onNavigate('intake')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Collect from Client</span>
          </button>
          <button
            onClick={onOpenScanner}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Scan Device</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Asset ID, model, serial..."
            className="form-input pl-9 text-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="form-select text-xs"
          >
            <option value="ALL">All Device Types</option>
            <option value="CAMERA">Cameras</option>
            <option value="SMARTPHONE">Smartphones</option>
            <option value="BODYCAM">Body Cameras</option>
            <option value="DASHCAM">Dashcams</option>
            <option value="TABLET">Tablets</option>
          </select>
        </div>
      </div>

      {/* Devices Grid / List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">No devices found in your custody</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || filterType !== 'ALL'
              ? 'Try modifying your search or filter criteria.'
              : 'You do not have any cameras or equipment checked out. Use "Collect from Client" to intake new units.'}
          </p>
          <button
            onClick={() => onNavigate('intake')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-indigo-700 transition"
          >
            Intake Devices Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(dev => {
            const client = clients.find(c => c.id === dev.source_client_id);
            return (
              <div 
                key={dev.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm font-extrabold text-indigo-700 tracking-tight">
                        {dev.asset_id}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-0.5">{dev.brand_and_model}</h4>
                    </div>
                    <ConditionBadge condition={dev.condition} />
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Client:</span>
                      <span className="font-medium text-slate-800">{client?.name || 'Standard Client'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Serial/IMEI:</span>
                      <span className="font-mono text-slate-700">{dev.imei_or_serial || 'None'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Status:</span>
                      <DeviceStatusBadge status={dev.current_status} />
                    </div>
                    {dev.accessories && (
                      <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                        <span className="font-semibold text-slate-600">Accessories: </span>
                        {dev.accessories}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onNavigate('assign_worker', { deviceId: dev.id })}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center space-x-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign</span>
                    </button>
                    <button
                      onClick={() => onNavigate('transfers', { initiateDeviceId: dev.id })}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition flex items-center space-x-1"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                      <span>Transfer</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onNavigate('device_label', { deviceId: dev.id })}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title="Print Thermal Label"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onNavigate('device_detail', { deviceId: dev.id })}
                      className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                      title="View Details & Ledger"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
