import React, { useState, useEffect, useRef } from 'react';
import { Search, Camera, ChevronRight, X, User, Building2, Shield, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Device } from '../../types';
import { DeviceStatusBadge, ConditionBadge } from './Badge';
import { getDeviceCustodianDisplay } from '../../utils/exportUtils';

interface GlobalSearchWithSuggestionsProps {
  onSelectDevice: (device: Device) => void;
  placeholder?: string;
  className?: string;
}

export const GlobalSearchWithSuggestions: React.FC<GlobalSearchWithSuggestionsProps> = ({
  onSelectDevice,
  placeholder = "Search Asset ID, Serial Number, Model, Custodian...",
  className = ""
}) => {
  const { devices, users, workers, clients } = useApp();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce input by 200ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching devices
  const suggestions: Device[] = debouncedQuery.length >= 1
    ? devices.filter(d => {
        const q = debouncedQuery.toLowerCase();
        const matchesAssetId = d.asset_id.toLowerCase().includes(q);
        const matchesModel = d.brand_and_model.toLowerCase().includes(q);
        const matchesSerial = d.imei_or_serial ? d.imei_or_serial.toLowerCase().includes(q) : false;
        const matchesType = d.device_type.toLowerCase().includes(q);
        const matchesQr = d.qr_token.toLowerCase().includes(q);
        const custodianStr = getDeviceCustodianDisplay(d, users, workers, clients).toLowerCase();
        const matchesCustodian = custodianStr.includes(q);
        return matchesAssetId || matchesModel || matchesSerial || matchesType || matchesQr || matchesCustodian;
      }).slice(0, 8)
    : [];

  const handleSelect = (device: Device) => {
    setQuery('');
    setIsOpen(false);
    onSelectDevice(device);
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none font-medium text-slate-800 transition"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 rounded-full p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Live Suggestions Dropdown */}
      {isOpen && debouncedQuery.length >= 1 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in max-h-96 overflow-y-auto">
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Live Matching Assets ({suggestions.length})</span>
            <span>Press Esc to close</span>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 flex flex-col items-center space-y-1">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <p className="font-semibold text-slate-700">No matching assets found</p>
              <p className="text-[11px] text-slate-400">No devices matching "{debouncedQuery}" in serial numbers, asset IDs, or custodian records.</p>
            </div>
          ) : (
            <div className="p-1.5 space-y-1">
              {suggestions.map((dev) => {
                const custodianName = getDeviceCustodianDisplay(dev, users, workers, clients);
                return (
                  <button
                    key={dev.id}
                    onClick={() => handleSelect(dev)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-extrabold text-xs text-indigo-700">{dev.asset_id}</span>
                          <span className="text-slate-900 font-bold text-xs truncate max-w-[180px]">{dev.brand_and_model}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          <span>SN: <strong className="font-mono text-slate-700">{dev.imei_or_serial || 'N/A'}</strong></span>
                          <span>•</span>
                          <span className="truncate max-w-[160px]">Holder: <strong className="text-slate-700">{custodianName}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 ml-2">
                      <DeviceStatusBadge status={dev.current_status} />
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
