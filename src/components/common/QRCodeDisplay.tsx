import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Check } from 'lucide-react';

interface QRCodeDisplayProps {
  assetId: string;
  qrToken: string;
  size?: number;
  showDetails?: boolean;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  assetId,
  qrToken,
  size = 180,
  showDetails = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Payload encodes accessible full URL: origin + scanToken
  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const payload = originUrl ? `${originUrl}/?scanToken=${encodeURIComponent(qrToken)}` : `/device/qr/${qrToken}/`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, payload, {
        width: size,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      }, (err) => {
        if (!err && canvasRef.current) {
          setDataUrl(canvasRef.current.toDataURL('image/png'));
        }
      });
    }
  }, [payload, size]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr_${assetId}.png`;
    a.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
      <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-inner">
        <canvas ref={canvasRef} className="rounded" />
      </div>

      {showDetails && (
        <div className="mt-2.5 w-full">
          <div className="font-mono text-sm font-bold text-slate-800">{assetId}</div>
          <div className="flex items-center justify-center space-x-1.5 mt-1 text-[11px] text-slate-400">
            <span className="truncate max-w-[140px]">{qrToken.substring(0, 8)}...</span>
            <button
              onClick={handleCopy}
              className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded transition"
              title="Copy UUID Token"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center space-x-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
