import React, { useState } from 'react';
import { 
  Warehouse, Search, Filter, Download, Plus, QrCode, 
  Printer, ShieldAlert, ChevronRight, Boxes, CheckSquare, Square,
  CheckCircle2, AlertCircle, FileSpreadsheet, X, Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DeviceStatusBadge, ConditionBadge } from '../components/common/Badge';
import { DeviceStatus, DeviceType, Device } from '../types';
import { exportDevicesToCSV, exportDevicesToExcel, getDeviceCustodianDisplay } from '../utils/exportUtils';

interface MasterInventoryViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenScanner: () => void;
  initialFilterStatus?: string;
}

export const MasterInventoryView: React.FC<MasterInventoryViewProps> = ({ 
  onNavigate, onOpenScanner, initialFilterStatus 
}) => {
  const { currentUser, devices, users, workers, clients, projects } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus || 'ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const [exportNotice, setExportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const filtered = devices.filter(d => {
    const matchesSearch = 
      d.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.brand_and_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.imei_or_serial && d.imei_or_serial.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || d.current_status === statusFilter;
    const matchesType = typeFilter === 'ALL' || d.device_type === typeFilter;
    const matchesClient = clientFilter === 'ALL' || String(d.source_client_id) === clientFilter;
    return matchesSearch && matchesStatus && matchesType && matchesClient;
  });

  const getCustodianDisplay = (dev: Device) => {
    return getDeviceCustodianDisplay(dev, users, workers, clients);
  };

  // Export handlers
  const handleExport = (format: 'csv' | 'excel', onlySelected: boolean = false) => {
    setShowExportMenu(false);
    const targetDevices = onlySelected 
      ? devices.filter(d => selectedDeviceIds.includes(d.id))
      : filtered;

    if (targetDevices.length === 0) {
      setExportNotice({
        type: 'error',
        message: onlySelected ? "No devices selected for export." : "No devices match the current filter criteria."
      });
      setTimeout(() => setExportNotice(null), 4000);
      return;
    }

    const exportContext = { clients, projects, users, workers };
    const result = format === 'csv'
      ? exportDevicesToCSV(targetDevices, exportContext)
      : exportDevicesToExcel(targetDevices, exportContext);

    if (result.success) {
      setExportNotice({
        type: 'success',
        message: `Successfully exported ${result.count} devices to ${format.toUpperCase()}. File downloaded.`
      });
    } else {
      setExportNotice({
        type: 'error',
        message: result.error || "Failed to generate export file."
      });
    }
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Selection handlers
  const allFilteredSelected = filtered.length > 0 && filtered.every(d => selectedDeviceIds.includes(d.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      // Remove currently filtered IDs from selection
      const filteredIdSet = new Set(filtered.map(d => d.id));
      setSelectedDeviceIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      // Add all currently filtered IDs to selection without duplicates
      const newIds = new Set([...selectedDeviceIds, ...filtered.map(d => d.id)]);
      setSelectedDeviceIds(Array.from(newIds));
    }
  };

  const toggleSelectDevice = (id: number) => {
    setSelectedDeviceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedDeviceIds([]);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            <Warehouse className="w-4 h-4" />
            <span>Enterprise Master Asset Registry</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Company Master Inventory ({devices.length} Assets)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Full enterprise custody records across all field staff, clients, company warehouses, and deployed workers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export Inventory</span>
            </button>

            {showExportMenu && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in text-xs"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Filtered Inventory ({filtered.length})
                </div>
                <button
                  onClick={() => handleExport('csv', false)}
                  className="w-full text-left px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 flex items-center space-x-2 text-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export as CSV</span>
                </button>
                <button
                  onClick={() => handleExport('excel', false)}
                  className="w-full text-left px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2 text-slate-700"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export as Excel (.xls)</span>
                </button>

                {selectedDeviceIds.length > 0 && (
                  <>
                    <div className="border-t border-slate-100 my-1"></div>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Selected Assets ({selectedDeviceIds.length})
                    </div>
                    <button
                      onClick={() => handleExport('csv', true)}
                      className="w-full text-left px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 flex items-center space-x-2 text-slate-700 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Export Selected (CSV)</span>
                    </button>
                    <button
                      onClick={() => handleExport('excel', true)}
                      className="w-full text-left px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2 text-slate-700 font-semibold"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export Selected (Excel)</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('print_label', { deviceIds: selectedDeviceIds.length > 0 ? selectedDeviceIds : filtered.map(d => d.id) })}
            className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center space-x-1.5 cursor-pointer"
            title="Open printable multi-label sheet for selected or filtered inventory"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>Print QR Labels {selectedDeviceIds.length > 0 ? `(${selectedDeviceIds.length})` : `(${filtered.length})`}</span>
          </button>

          <button
            onClick={() => onNavigate('intake')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Intake Equipment</span>
          </button>
        </div>
      </div>

      {/* Export Feedback Toast Banner */}
      {exportNotice && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-fade-in ${
          exportNotice.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {exportNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{exportNotice.message}</span>
          </div>
          <button 
            onClick={() => setExportNotice(null)} 
            className="text-slate-400 hover:text-slate-600 ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Batch Action Bar when devices are selected */}
      {selectedDeviceIds.length > 0 && (
        <div className="bg-indigo-900 text-white p-3.5 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <span className="w-6 h-6 rounded-lg bg-indigo-700 flex items-center justify-center font-mono font-bold text-xs">
              {selectedDeviceIds.length}
            </span>
            <span className="text-xs font-bold">
              {selectedDeviceIds.length} {selectedDeviceIds.length === 1 ? 'Device' : 'Devices'} Selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('print_label', { deviceIds: selectedDeviceIds })}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {selectedDeviceIds.length} QR Labels</span>
            </button>

            <button
              onClick={() => handleExport('csv', true)}
              className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleExport('excel', true)}
              className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGEMENT') && (
              <button
                onClick={() => onNavigate('mass_assignment', { preselectedIds: selectedDeviceIds })}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Mass Assign</span>
              </button>
            )}

            <button
              onClick={clearSelection}
              className="px-2.5 py-1.5 bg-indigo-950/60 hover:bg-indigo-950 text-indigo-200 font-medium text-xs rounded-xl transition flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Deselect</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Asset ID, model, IMEI..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE_STORAGE">Available in Storage</option>
            <option value="ASSIGNED_WORKER">Assigned to Worker</option>
            <option value="WITH_COLLECTOR">With Collector / Transit</option>
            <option value="AWAITING_INSPECTION">Awaiting Inspection</option>
            <option value="UNDER_REPAIR">Under Repair</option>
            <option value="DAMAGED">Damaged</option>
            <option value="LOST">Lost / Missing</option>
            <option value="RETURNED_TO_CLIENT">Returned to Client</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="CAMERA">Camera</option>
            <option value="SMARTPHONE">Smartphone</option>
            <option value="BODYCAM">Bodycam</option>
            <option value="DASHCAM">Dashcam</option>
            <option value="TABLET">Tablet</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Master Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-10">
                  <button 
                    onClick={toggleSelectAllFiltered} 
                    className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                    title={allFilteredSelected ? "Deselect all filtered" : "Select all filtered"}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Brand & Model</th>
                <th className="py-3 px-4">IMEI / Serial</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Current Custodian</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No equipment records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(dev => {
                  const client = clients.find(c => c.id === dev.source_client_id);
                  const isSelected = selectedDeviceIds.includes(dev.id);
                  return (
                    <tr 
                      key={dev.id} 
                      className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => toggleSelectDevice(dev.id)}
                          className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {dev.asset_id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {dev.brand_and_model}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {dev.imei_or_serial || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {client?.name || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {getCustodianDisplay(dev)}
                      </td>
                      <td className="py-3 px-4">
                        <DeviceStatusBadge status={dev.current_status} />
                      </td>
                      <td className="py-3 px-4">
                        <ConditionBadge condition={dev.condition} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onNavigate('print_label', { deviceIds: [dev.id] })}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                            title="Print QR Label"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              onClick={() => onNavigate('audited_adjustment', { deviceId: dev.id })}
                              className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition"
                              title="Audited Admin Adjustment"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onNavigate('device_detail', { deviceId: dev.id })}
                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                            title="View Record & History"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <span>Showing {filtered.length} of {devices.length} enterprise devices</span>
          <span className="text-[11px] text-slate-400 mt-1 sm:mt-0">
            {selectedDeviceIds.length > 0 
              ? `${selectedDeviceIds.length} items currently selected across filters.`
              : 'Click checkboxes to select multiple items for batch QR printing or export.'
            }
          </span>
        </div>
      </div>
    </div>
  );
};
