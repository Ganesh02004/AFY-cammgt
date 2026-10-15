import React, { useState } from 'react';
import { ArrowLeft, Printer, Trash2, Layers, CheckCircle2, Shield, AlertCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { QRCodeDisplay } from '../components/common/QRCodeDisplay';
import { Device } from '../types';

interface DeviceLabelPrintViewProps {
  deviceId?: number;
  deviceIds?: number[];
  onBack: () => void;
}

export const DeviceLabelPrintView: React.FC<DeviceLabelPrintViewProps> = ({
  deviceId,
  deviceIds,
  onBack
}) => {
  const { devices, clients, projects } = useApp();

  // Initialize selected batch IDs from props
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    if (deviceIds && deviceIds.length > 0) {
      return Array.from(new Set(deviceIds));
    }
    if (deviceId) {
      return [deviceId];
    }
    return [];
  });

  const [printLayout, setPrintLayout] = useState<'a4' | 'thermal'>('a4');

  // Resolve matching devices without duplicates
  const batchDevices: Device[] = selectedIds
    .map(id => devices.find(d => d.id === id))
    .filter((d): d is Device => d !== undefined);

  const handleRemoveDevice = (idToRemove: number) => {
    setSelectedIds(prev => prev.filter(id => id !== idToRemove));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Print Controls Header - Hidden during print */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition flex items-center space-x-1.5 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Inventory</span>
          </button>

          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Multi-Device QR Label Printing</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ready to print <span className="font-bold text-indigo-600 font-mono">{batchDevices.length}</span> individual labels. Formatted for standard A4 sticker paper or thermal rolls.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Layout Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setPrintLayout('a4')}
              className={`px-3 py-1.5 rounded-lg transition ${
                printLayout === 'a4' 
                  ? 'bg-white text-indigo-700 shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4 Sheet Grid (2x4)
            </button>
            <button
              onClick={() => setPrintLayout('thermal')}
              className={`px-3 py-1.5 rounded-lg transition ${
                printLayout === 'thermal' 
                  ? 'bg-white text-indigo-700 shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Thermal Roll (3x2")
            </button>
          </div>

          <button
            onClick={handlePrint}
            disabled={batchDevices.length === 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print All Labels ({batchDevices.length})</span>
          </button>
        </div>
      </div>

      {/* Batch Device Chips Manager - Allows removing individual devices from print batch */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 no-print space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Active Print Batch ({batchDevices.length} Assets)
          </span>
          {batchDevices.length > 0 && (
            <button
              onClick={() => setSelectedIds([])}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition"
            >
              Clear Batch
            </button>
          )}
        </div>

        {batchDevices.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>No devices selected in this print batch. Please go back to Master Inventory and select equipment to print.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            {batchDevices.map(dev => (
              <div
                key={dev.id}
                className="inline-flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-xs"
              >
                <span className="font-mono font-bold text-indigo-700">{dev.asset_id}</span>
                <span className="text-slate-600 truncate max-w-[140px]">{dev.brand_and_model}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDevice(dev.id)}
                  className="text-slate-400 hover:text-rose-600 rounded-full p-0.5 transition"
                  title="Remove from print batch"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print Instructions Banner (Screen only) */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 flex items-center justify-between no-print">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Print Preview mode active: Exactly <strong>{batchDevices.length}</strong> unique QR sticker labels will be printed. No duplicate tokens.
          </span>
        </div>
        <span className="text-[11px] font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
          Ctrl + P / Cmd + P
        </span>
      </div>

      {/* PRINT CANVAS */}
      <div className="print-root">
        {printLayout === 'a4' ? (
          /* A4 Sheet Grid Layout: 2 Columns of 3.5" x 2" stickers, fits 8 to 10 labels per A4 page cleanly */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3 max-w-4xl mx-auto print:max-w-none">
            {batchDevices.map((device) => {
              const client = clients.find(c => c.id === device.source_client_id);
              const project = device.project_id ? projects.find(p => p.id === device.project_id) : undefined;

              return (
                <div
                  key={device.id}
                  className="bg-white border-2 border-slate-800 rounded-xl p-3.5 shadow-sm text-slate-900 flex flex-col justify-between break-inside-avoid page-break-inside-avoid print:shadow-none print:m-1"
                  style={{ minHeight: '175px' }}
                >
                  {/* Label Header */}
                  <div className="border-b-2 border-slate-900 pb-1.5 flex items-center justify-between text-xs">
                    <span className="font-extrabold tracking-wider text-[11px] uppercase">
                      AFY CUSTODY PORTAL
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-white px-1.5 py-0.2 rounded font-mono">
                      {device.device_type}
                    </span>
                  </div>

                  {/* Body: QR Code + Text Details */}
                  <div className="flex items-center space-x-3 py-2">
                    <div className="shrink-0 bg-white p-1 rounded-lg border border-slate-300">
                      <QRCodeDisplay
                        assetId={device.asset_id}
                        qrToken={device.qr_token}
                        size={96}
                        showDetails={false}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-mono text-base font-black tracking-tight text-slate-950 leading-tight">
                        {device.asset_id}
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {device.brand_and_model}
                      </div>
                      {device.imei_or_serial && (
                        <div className="font-mono text-[10px] text-slate-600 truncate">
                          SN: {device.imei_or_serial}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-600 truncate">
                        Client: <span className="font-semibold">{client?.name || 'Internal'}</span>
                      </div>
                      {project && (
                        <div className="text-[9px] text-indigo-700 font-semibold truncate">
                          Proj: {project.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Label Footer */}
                  <div className="border-t border-slate-300 pt-1 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                    <span>SECURITY SEAL TAG</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Thermal Sticker Layout: 1 Sticker per page / continuous roll */
          <div className="flex flex-col items-center space-y-6 print:space-y-4">
            {batchDevices.map((device) => {
              const client = clients.find(c => c.id === device.source_client_id);

              return (
                <div
                  key={device.id}
                  className="w-[300px] bg-white border-2 border-slate-900 rounded-xl p-4 shadow-md text-slate-900 text-center font-sans break-inside-avoid print:shadow-none print:m-0"
                >
                  <div className="border-b-2 border-slate-900 pb-1.5 mb-2 flex items-center justify-between">
                    <span className="font-extrabold text-xs tracking-wider">AFY INVENTORY</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-white px-1.5 py-0.5 rounded">
                      {device.device_type}
                    </span>
                  </div>

                  <div className="my-2 flex justify-center">
                    <QRCodeDisplay
                      assetId={device.asset_id}
                      qrToken={device.qr_token}
                      size={130}
                      showDetails={false}
                    />
                  </div>

                  <div className="font-mono text-lg font-black tracking-tight my-1">
                    {device.asset_id}
                  </div>

                  <div className="text-xs font-bold truncate">
                    {device.brand_and_model}
                  </div>

                  {device.imei_or_serial && (
                    <div className="font-mono text-[10px] text-slate-600">
                      SN: {device.imei_or_serial}
                    </div>
                  )}

                  <div className="border-t border-slate-300 pt-1.5 mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="truncate max-w-[140px]">{client?.name || 'AFY Internal'}</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Print Specific CSS Styles injected for crisp printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-root {
            display: block !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
