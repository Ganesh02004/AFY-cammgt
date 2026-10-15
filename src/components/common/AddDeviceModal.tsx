import React, { useState } from 'react';
import { X, Plus, CheckCircle2, AlertCircle, Camera, Building2, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DeviceCondition, DeviceType, Device } from '../../types';
import { AccessoryMultiSelect } from './AccessoryMultiSelect';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (device: Device) => void;
  initialClientId?: number;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialClientId
}) => {
  const { clients, createDevice } = useApp();

  const [clientId, setClientId] = useState<number>(initialClientId || clients[0]?.id || 0);
  const [deviceType, setDeviceType] = useState<DeviceType>('CAMERA');
  const [brandAndModel, setBrandAndModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetId, setAssetId] = useState('');
  const [condition, setCondition] = useState<DeviceCondition>('EXCELLENT');
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>(['Adapter', 'Battery']);
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const newErrors: Record<string, string> = {};

    if (!clientId) {
      newErrors['client'] = "Source Client Company is required.";
    }

    if (!brandAndModel || !brandAndModel.trim()) {
      newErrors['brand'] = "Brand & Model is required.";
    }

    if (!serialNumber || !serialNumber.trim()) {
      newErrors['serial'] = "Serial Number / IMEI is mandatory.";
    }

    setFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setErrorMsg("Please fill in all mandatory fields before submitting.");
      return;
    }

    setIsSubmitting(true);

    const res = createDevice({
      source_client_id: clientId,
      device_type: deviceType,
      brand_and_model: brandAndModel.trim(),
      imei_or_serial: serialNumber.trim(),
      asset_id: assetId.trim() || undefined,
      condition,
      accessories: selectedAccessories.join(', '),
      notes: notes.trim()
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to save device record. Changes were NOT saved.");
    } else {
      // Reset form
      setBrandAndModel('');
      setSerialNumber('');
      setAssetId('');
      setNotes('');
      setFieldErrors({});
      if (onSuccess && res.device) {
        onSuccess(res.device);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Direct Equipment Registration</h3>
              <p className="text-xs text-slate-500">Register new equipment into company inventory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Company */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Client Company <span className="text-rose-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(Number(e.target.value));
                  if (fieldErrors['client']) setFieldErrors(prev => ({ ...prev, client: '' }));
                }}
                className={`form-select text-xs font-medium ${fieldErrors['client'] ? 'border-rose-500 ring-2 ring-rose-200' : ''}`}
                required
              >
                <option value={0}>-- Select Client Company --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {fieldErrors['client'] && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">{fieldErrors['client']}</p>
              )}
            </div>

            {/* Device Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Equipment Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                className="form-select text-xs font-medium"
              >
                <option value="CAMERA">Camera</option>
                <option value="SMARTPHONE">Smartphone</option>
                <option value="BODYCAM">Body Camera</option>
                <option value="DASHCAM">Dashcam</option>
                <option value="TABLET">Tablet</option>
                <option value="OTHER">Other Equipment</option>
              </select>
            </div>

            {/* Brand & Model */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Brand & Model <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={brandAndModel}
                onKeyDown={handleKeyDown}
                onChange={(e) => {
                  setBrandAndModel(e.target.value);
                  if (fieldErrors['brand']) setFieldErrors(prev => ({ ...prev, brand: '' }));
                }}
                placeholder="e.g. Sony Alpha 7 IV"
                className={`form-input text-xs ${fieldErrors['brand'] ? 'border-rose-500 ring-2 ring-rose-200' : ''}`}
              />
              {fieldErrors['brand'] && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">{fieldErrors['brand']}</p>
              )}
            </div>

            {/* Serial Number / IMEI */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Serial Number / IMEI <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={serialNumber}
                onKeyDown={handleKeyDown}
                onChange={(e) => {
                  setSerialNumber(e.target.value);
                  if (fieldErrors['serial']) setFieldErrors(prev => ({ ...prev, serial: '' }));
                }}
                placeholder="e.g. SN-SONY-99201"
                className={`form-input text-xs font-mono ${fieldErrors['serial'] ? 'border-rose-500 ring-2 ring-rose-200' : ''}`}
              />
              {fieldErrors['serial'] && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">{fieldErrors['serial']}</p>
              )}
            </div>

            {/* Condition */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Physical Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as DeviceCondition)}
                className="form-select text-xs"
              >
                <option value="EXCELLENT">Excellent (Like New)</option>
                <option value="GOOD">Good (Minor Scuffs)</option>
                <option value="FAIR">Fair (Visible Wear)</option>
                <option value="DAMAGED">Damaged / Non-Functional</option>
              </select>
            </div>

            {/* Custom Asset ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Asset ID <span className="text-slate-400 font-normal lowercase">(Optional - auto if blank)</span>
              </label>
              <input
                type="text"
                value={assetId}
                onKeyDown={handleKeyDown}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="Auto: CAM-2026-XXXX"
                className="form-input text-xs font-mono"
              />
            </div>
          </div>

          {/* Multi-Select Accessories */}
          <div>
            <AccessoryMultiSelect
              selectedAccessories={selectedAccessories}
              onChange={setSelectedAccessories}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Inspection Notes / Location
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Operational notes, initial condition details, site location..."
              className="form-textarea text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving to Database...' : 'Save Device Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
