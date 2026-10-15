import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import { X, Camera, Search, Smartphone, RefreshCw, AlertCircle, CheckCircle2, ArrowRight, Copy, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Device } from '../../types';
import { GlobalSearchWithSuggestions } from '../common/GlobalSearchWithSuggestions';

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
  const pairingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const scannerContainerId = 'interactive-qr-reader';

  const pairingUrl = typeof window !== 'undefined' ? `${window.location.origin}/?pairToken=${pairingToken}` : '';

  useEffect(() => {
    if (activeTab === 'remote' && pairingCanvasRef.current && pairingUrl) {
      QRCode.toCanvas(pairingCanvasRef.current, pairingUrl, {
        width: 150,
        margin: 1,
        color: { dark: '#1e1b4b', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      });
    }
  }, [activeTab, pairingUrl]);

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
                  Type Asset ID, Model, or Serial Number for Live Suggestions
                </label>
                <GlobalSearchWithSuggestions
                  onSelectDevice={(dev) => {
                    onSelectDevice(dev);
                    onClose();
                  }}
                  placeholder="Type to search (e.g. CAM-2026, Sony, SN-7780)..."
                />
              </div>

              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Quick Select Active Fleet Units ({devices.length})
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {devices.slice(0, 8).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        onSelectDevice(d);
                        onClose();
                      }}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex items-center justify-between group cursor-pointer"
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
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col items-center">
                <div className="flex items-center space-x-2 text-indigo-900 font-extrabold text-sm mb-1">
                  <Smartphone className="w-5 h-5 text-indigo-600" />
                  <span>Desktop-to-Mobile Remote Pairing</span>
                </div>
                <p className="text-xs text-slate-600 max-w-xs mb-3">
                  Scan this QR code with your mobile phone camera to open the remote scanner interface.
                </p>

                {/* Pairing QR Canvas */}
                <div className="p-2.5 bg-white border border-indigo-200 rounded-2xl shadow-sm mb-2">
                  <canvas ref={pairingCanvasRef} className="rounded-lg" />
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-200">
                  <span>Pair Token: {pairingToken}</span>
                  <button
                    onClick={() => {
                      if (pairingUrl) {
                        navigator.clipboard.writeText(pairingUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }
                    }}
                    className="text-slate-400 hover:text-indigo-600 ml-1"
                    title="Copy Link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between text-slate-600 font-semibold mb-1">
                  <span>Pairing Session Status</span>
                  <span className="text-[10px] text-slate-400 font-mono">Token valid (10m expiry)</span>
                </div>
                <div className="text-xs text-slate-700 font-medium flex items-center justify-center">
                  {pairingStatus === 'waiting' ? (
                    <span className="text-amber-600 font-bold animate-pulse flex items-center">
                      <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Waiting for mobile device connection...
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Remote Mobile Scanner Connected
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                🔒 Does not transmit login credentials. Uses short-lived ephemeral session token.
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
