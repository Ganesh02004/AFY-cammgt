import React from 'react';
import { DeviceStatus, DeviceCondition } from '../../types';

export const DeviceStatusBadge: React.FC<{ status: DeviceStatus; className?: string }> = ({ status, className = '' }) => {
  const mapping: Record<DeviceStatus, { label: string; bg: string; text: string; border: string }> = {
    AVAILABLE_STORAGE: { label: 'Available in Storage', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    ASSIGNED_WORKER: { label: 'Assigned to Worker', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    WITH_COLLECTOR: { label: 'With Collector / In Transit', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    EXPECTED: { label: 'Expected', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    RETURN_REQUESTED: { label: 'Return Requested', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    RETURN_IN_TRANSIT: { label: 'Return In Transit', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    AWAITING_INSPECTION: { label: 'Awaiting Inspection', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    UNDER_REPAIR: { label: 'Under Repair', bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
    DAMAGED: { label: 'Damaged', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    LOST: { label: 'Lost / Missing', bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300' },
    RETURNED_TO_CLIENT: { label: 'Returned to Client', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    RETIRED: { label: 'Retired', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  };

  const item = mapping[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${item.bg} ${item.text} ${item.border} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {item.label}
    </span>
  );
};

export const ConditionBadge: React.FC<{ condition: DeviceCondition | string }> = ({ condition }) => {
  const mapping: Record<string, { label: string; color: string }> = {
    EXCELLENT: { label: 'Excellent', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    GOOD: { label: 'Good', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    FAIR: { label: 'Fair', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    DAMAGED: { label: 'Damaged', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  };
  const item = mapping[condition] || { label: condition, color: 'bg-gray-100 text-gray-800 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${item.color}`}>
      {item.label}
    </span>
  );
};
