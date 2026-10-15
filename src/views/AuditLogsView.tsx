import React, { useState } from 'react';
import { ShieldAlert, Search, Filter, ArrowLeft, Download, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AuditLogsViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ onNavigate }) => {
  const { auditLogs, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-2" />
        <h3 className="font-bold text-slate-800">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">
          Only Administrators can view system audit logs.
        </p>
      </div>
    );
  }

  const filtered = auditLogs.filter(l => {
    const matchesSearch = 
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.safe_metadata.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.record_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.record_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'ALL' || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const handleExportCSV = () => {
    const headers = ["Timestamp", "Actor", "Action", "Record Type", "Record ID", "Metadata", "IP Address"];
    const rows = filtered.map(l => [
      l.timestamp,
      `"${l.actor_name}"`,
      l.action,
      l.record_type,
      `"${l.record_id}"`,
      `"${l.safe_metadata}"`,
      l.ip_address
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Compliance & Security Ledger</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            System Audit & Governance Logs ({auditLogs.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable trace of administrative adjustments, sensitive worker identity reveals, custody changes, and logins.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, actor, record, metadata..."
            className="form-input pl-9 text-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="form-select text-xs"
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="INTAKE_DEVICES">INTAKE_DEVICES</option>
            <option value="ASSIGN_DEVICE">ASSIGN_DEVICE</option>
            <option value="MASS_CAMERA_ASSIGNMENT">MASS_CAMERA_ASSIGNMENT</option>
            <option value="INITIATE_TRANSFER">INITIATE_TRANSFER</option>
            <option value="ACCEPT_TRANSFER">ACCEPT_TRANSFER</option>
            <option value="PROCESS_RETURN">PROCESS_RETURN</option>
            <option value="COMPLETE_INSPECTION">COMPLETE_INSPECTION</option>
            <option value="AUDITED_ADJUSTMENT">AUDITED_ADJUSTMENT</option>
            <option value="VIEW_SENSITIVE_WORKER_DATA">VIEW_SENSITIVE_WORKER_DATA</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Record</th>
                <th className="py-3 px-4">Audit Metadata</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No audit log entries matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {l.actor_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        l.action === 'AUDITED_ADJUSTMENT' || l.action === 'VIEW_SENSITIVE_WORKER_DATA'
                          ? 'bg-rose-100 text-rose-800'
                          : l.action === 'MASS_CAMERA_ASSIGNMENT' || l.action === 'ASSIGN_DEVICE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {l.record_type} #{l.record_id}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {l.safe_metadata}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {l.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
