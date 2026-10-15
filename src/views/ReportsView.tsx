import React from 'react';
import { 
  BarChart3, Download, Camera, Warehouse, UserCheck, 
  RotateCcw, AlertTriangle, ArrowLeft, PieChart, Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ReportsViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onNavigate }) => {
  const { devices, clients, workers, movements, assignments, returns } = useApp();

  const totalDevices = devices.length || 1;
  const availableCount = devices.filter(d => d.current_status === 'AVAILABLE_STORAGE' && d.current_custodian_type === 'STORAGE').length;
  const inFieldCount = devices.filter(d => d.current_status === 'ASSIGNED_WORKER').length;
  const withCollectorCount = devices.filter(d => d.current_status === 'WITH_COLLECTOR').length;
  const inspectionCount = devices.filter(d => d.current_status === 'AWAITING_INSPECTION').length;
  const issueCount = devices.filter(d => ['UNDER_REPAIR', 'DAMAGED', 'LOST'].includes(d.current_status)).length;

  const exportFleet = () => {
    const headers = ["Asset ID", "Brand & Model", "Type", "Status", "Custodian Type", "Received Date"];
    const rows = devices.map(d => [d.asset_id, `"${d.brand_and_model}"`, d.device_type, d.current_status, d.current_custodian_type, d.received_date]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    downloadFile(csvContent, "afy_fleet_report.csv");
  };

  const exportMovements = () => {
    const headers = ["Timestamp", "Device ID", "From Custodian", "To Custodian", "To Status", "Actor", "Notes"];
    const rows = movements.map(m => [m.timestamp, m.device_id, `"${m.from_custodian_name}"`, `"${m.to_custodian_name}"`, m.to_status, `"${m.actor_name}"`, `"${m.notes || ''}"`]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    downloadFile(csvContent, "afy_movements_ledger.csv");
  };

  const exportWorkers = () => {
    const headers = ["Worker ID", "Name", "Phone", "Email", "Employer ID", "Designation"];
    const rows = workers.map(w => [w.worker_id, `"${w.name}"`, w.phone, `"${w.email || ''}"`, w.employer_company_id, `"${w.role_or_status}"`]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    downloadFile(csvContent, "afy_workers_roster.csv");
  };

  const downloadFile = (content: string, fileName: string) => {
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(content));
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Operational Intelligence</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Equipment Fleet Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive audit reports, distribution charts, and downloadable compliance extracts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportFleet}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Export Fleet CSV</span>
          </button>
        </div>
      </div>

      {/* Visual Distribution Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <span>Fleet Status Breakdown</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700">Available in Storage</span>
                <span className="font-mono text-slate-900">{availableCount} ({Math.round(availableCount / totalDevices * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(availableCount / totalDevices) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-700">In Field Use (Assigned)</span>
                <span className="font-mono text-slate-900">{inFieldCount} ({Math.round(inFieldCount / totalDevices * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(inFieldCount / totalDevices) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-indigo-700">With Staff / In Transit</span>
                <span className="font-mono text-slate-900">{withCollectorCount} ({Math.round(withCollectorCount / totalDevices * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(withCollectorCount / totalDevices) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-purple-700">Awaiting Inspection</span>
                <span className="font-mono text-slate-900">{inspectionCount} ({Math.round(inspectionCount / totalDevices * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(inspectionCount / totalDevices) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700">Quarantine / Damaged / Lost</span>
                <span className="font-mono text-slate-900">{issueCount} ({Math.round(issueCount / totalDevices * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(issueCount / totalDevices) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Client Fleet Share */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Client Fleet Distribution</span>
          </h3>

          <div className="space-y-3">
            {clients.map(c => {
              const count = devices.filter(d => d.source_client_id === c.id).length;
              const pct = Math.round((count / totalDevices) * 100);
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-800">{c.name} ({c.code})</span>
                    <span className="font-mono text-slate-900">{count} units ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CSV Export Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Downloadable Compliance & Ledger Extracts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs">Master Inventory Extract</h4>
            <p className="text-[11px] text-slate-500">All registered cameras, serial numbers, active custodians, and condition.</p>
            <button
              onClick={exportFleet}
              className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs">Immutable Movements Ledger</h4>
            <p className="text-[11px] text-slate-500">Complete historical audit trail of all custody transfers and handovers.</p>
            <button
              onClick={exportMovements}
              className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs">Worker Personnel Roster</h4>
            <p className="text-[11px] text-slate-500">Registered field staff list, employer staffing agencies, and contact data.</p>
            <button
              onClick={exportWorkers}
              className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
