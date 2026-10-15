import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Search, Smartphone, RefreshCw, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Device } from '../../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDevice: (device: Device) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onSelectDevice }) => {
  const { devices } = useApp();
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'remote'>('camera');
  const [manualQuery, setManualQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [pairingToken] = useState(() => Math.random().toString(36).substring(2, 10).toUpperCase());
  const [pairingStatus, setPairingStatus] = useState<'waiting' | 'paired'>('waiting');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-qr-reader';

  // Process scanned or queried string
  const handleFoundValue = (rawVal: string) => {
    let clean = rawVal.trim();
    if (clean.includes('/device/qr/')) {
      clean = clean.split('/device/qr/')[1].split('/')[0].split('?')[0];
    }

    const matched = devices.find(d => 
      d.qr_token.toLowerCase() === clean.toLowerCase() ||
      d.asset_id.toLowerCase() === clean.toLowerCase() ||
      (d.imei_or_serial && d.imei_or_serial.toLowerCase() === clean.toLowerCase())
    );

    if (matched) {
      stopCamera();
      onSelectDevice(matched);
      onClose();
    } else {
      setErrorMsg(`No device matching token or ID "${clean}" was found.`);
    }
  };

  const startCamera = async () => {
    setErrorMsg('');
    try {
      const devicesList = await Html5Qrcode.getCameras();
      if (!devicesList || devicesList.length === 0) {
        setErrorMsg("No camera devices detected on this hardware. Please use Manual Search tab.");
        return;
      }

      setCameras(devicesList);
      const chosenId = selectedCameraId || devicesList[devicesList.length - 1].id;
      setSelectedCameraId(chosenId);

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        chosenId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleFoundValue(decodedText);
        },
        () => {
          // Scanning frame callback (no-op)
        }
      );
      setCameraStarted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Camera access permission denied or failed to initialize.");
      setCameraStarted(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && cameraStarted) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error("Error stopping camera", e);
      }
      setCameraStarted(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, selectedCameraId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Device QR & Asset Lookup</h3>
              <p className="text-xs text-slate-500">Scan camera sticker or search by ID</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('camera')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'camera'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera</span>
          </button>
          <button
            onClick={() => { stopCamera(); setActiveTab('manual'); }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Manual Search</span>
          </button>
          <button
            onClick={() => { stopCamera(); setActiveTab('remote'); }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'remote'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile Remote Sync</span>
          </button>
        </div>

        {/* Tab contents */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'camera' && (
            <div className="space-y-4 text-center">
              <div className="relative mx-auto w-full max-w-xs aspect-square bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                <div id={scannerContainerId} className="w-full h-full" />
                {!cameraStarted && !errorMsg && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
                    <p className="text-xs">Initializing camera viewfinder...</p>
                  </div>
                )}
              </div>

              {cameras.length > 1 && (
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-xs text-slate-500 font-medium">Switch Camera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.substring(0, 5)}`}</option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Align the device QR code within the frame to view custody history and device actions.
              </p>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Asset ID, IMEI, or Serial Number
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={manualQuery}
                      onChange={(e) => setManualQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFoundValue(manualQuery)}
                      placeholder="e.g. CAM-2026-0001, SN-SONY-77801..."
                      className="form-input text-xs"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => handleFoundValue(manualQuery)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center space-x-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Quick Select Active Fleet Units
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {devices.slice(0, 6).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        onSelectDevice(d);
                        onClose();
                      }}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 font-mono">
                          {d.asset_id}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {d.brand_and_model} {d.imei_or_serial ? `(${d.imei_or_serial})` : ''}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'remote' && (
            <div className="space-y-4 text-center py-2">
              <div className="inline-block p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <Smartphone className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
                <h4 className="font-bold text-slate-900 text-sm">Desktop-to-Mobile Scanner Pairing</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Use your phone's camera to scan equipment tags while working comfortably on your desktop.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-600">Pairing Session Code</div>
                <div className="font-mono text-xl font-black text-indigo-700 tracking-widest my-1">
                  {pairingToken}
                </div>
                <div className="text-[11px] text-slate-400">
                  Status: {pairingStatus === 'waiting' ? (
                    <span className="text-amber-600 font-bold animate-pulse">● Waiting for phone stream</span>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Mobile Connected
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Point your phone's browser to the remote scanner view with pairing token to broadcast real-time scans directly into this terminal.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>🔒 Scanning only views authenticated records; never alters custody automatically.</span>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
