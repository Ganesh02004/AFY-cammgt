import React, { useState } from 'react';
import { 
  Warehouse, Plus, Trash2, Camera, CheckCircle2, AlertCircle, 
  MapPin, UserCheck, Calendar, ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LocationPicker } from '../components/common/LocationPicker';
import { DeviceCondition, DeviceType } from '../types';

interface IntakeViewProps {
  onNavigate: (view: string, params?: any) => void;
}

interface DeviceRow {
  id: string;
  asset_id: string;
  device_type: DeviceType;
  brand_and_model: string;
  imei_or_serial: string;
  accessories: string;
  condition: DeviceCondition;
  notes: string;
}

export const IntakeView: React.FC<IntakeViewProps> = ({ onNavigate }) => {
  const { clients, contacts, currentUser, intakeDevices, createContact } = useApp();

  const [selectedClientId, setSelectedClientId] = useState<number>(clients[0]?.id || 0);
  const [selectedPocId, setSelectedPocId] = useState<number>(0);
  const [scheduledTime, setScheduledTime] = useState(new Date().toISOString().substring(0, 16));
  const [notes, setNotes] = useState('');
  
  // Location
  const [locationAddress, setLocationAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Quick Add POC modal state
  const [showAddPoc, setShowAddPoc] = useState(false);
  const [newPocName, setNewPocName] = useState('');
  const [newPocPhone, setNewPocPhone] = useState('');
  const [newPocDesignation, setNewPocDesignation] = useState('');

  // Device rows
  const [devicesData, setDevicesData] = useState<DeviceRow[]>([
    {
      id: 'row-1',
      asset_id: '',
      device_type: 'CAMERA',
      brand_and_model: 'Sony Alpha 7 IV',
      imei_or_serial: '',
      accessories: 'Charger, 2x Batteries, Lens, Bag',
      condition: 'EXCELLENT',
      notes: ''
    }
  ]);

  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ pickupId: number; count: number } | null>(null);

  // Filter contacts by selected client (Cascading requirement)
  const clientContacts = contacts.filter(c => c.client_id === selectedClientId && c.is_active);

  const handleClientChange = (newClientId: number) => {
    setSelectedClientId(newClientId);
    // Clear previously selected POC when client changes (dynamic specification rule 6)
    setSelectedPocId(0);
  };

  const handleAddDeviceRow = () => {
    setDevicesData(prev => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        asset_id: '',
        device_type: 'CAMERA',
        brand_and_model: '',
        imei_or_serial: '',
        accessories: 'Charger, Battery',
        condition: 'GOOD',
        notes: ''
      }
    ]);
  };

  const handleRemoveDeviceRow = (id: string) => {
    if (devicesData.length === 1) return;
    setDevicesData(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof DeviceRow, value: any) => {
    setDevicesData(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleCreatePoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPocName.trim() || !newPocPhone.trim()) return;

    const newContact = createContact({
      client_id: selectedClientId,
      name: newPocName.trim(),
      phone: newPocPhone.trim(),
      designation: newPocDesignation.trim() || 'Site Representative',
      is_active: true
    });

    setSelectedPocId(newContact.id);
    setShowAddPoc(false);
    setNewPocName('');
    setNewPocPhone('');
    setNewPocDesignation('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedClientId) {
      setErrorMsg("Please select a Source Client Company.");
      return;
    }

    for (let i = 0; i < devicesData.length; i++) {
      const row = devicesData[i];
      if (!row.brand_and_model.trim()) {
        setErrorMsg(`Row #${i + 1}: Brand & Model is required.`);
        return;
      }
    }

    const res = intakeDevices({
      clientId: selectedClientId,
      actualPocId: selectedPocId || undefined,
      scheduledTime,
      notes,
      location: locationAddress,
      latitude,
      longitude,
      devicesData: devicesData.map(d => ({
        asset_id: d.asset_id.trim() || undefined,
        device_type: d.device_type,
        brand_and_model: d.brand_and_model.trim(),
        imei_or_serial: d.imei_or_serial.trim() || undefined,
        accessories: d.accessories,
        condition: d.condition,
        notes: d.notes
      }))
    });

    if (!res.success) {
      setErrorMsg(res.error || "Failed to complete device intake.");
    } else {
      setSuccessInfo({ pickupId: res.pickup!.id, count: res.createdDevices!.length });
    }
  };

  if (successInfo) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Intake Completed Successfully!</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Successfully processed intake of <span className="font-bold text-slate-900">{successInfo.count} devices</span> under Pickup batch #{successInfo.pickupId}. Custody has been atomically transferred to your active staff account.
        </p>

        <div className="pt-4 flex items-center justify-center space-x-3">
          <button
            onClick={() => onNavigate('my_inventory')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            View in My Inventory
          </button>
          <button
            onClick={() => {
              setSuccessInfo(null);
              setDevicesData([{
                id: 'row-1',
                asset_id: '',
                device_type: 'CAMERA',
                brand_and_model: '',
                imei_or_serial: '',
                accessories: 'Charger, Battery',
                condition: 'GOOD',
                notes: ''
              }]);
            }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Intake Another Batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Warehouse className="w-6 h-6 text-indigo-600" />
            <span>Client Equipment Intake (Intake Batch)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Capture cameras & tracking equipment received from corporate clients. Generates asset IDs, verifiable QR tokens, and intake movements atomically.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Pickup Header Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
            1. Client & Pickup Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Client Company <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientChange(Number(e.target.value))}
                className="form-select text-xs font-medium"
                required
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) - {c.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Cascading Contact / POC Select */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Client POC / Contact Rep
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddPoc(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  + Add POC
                </button>
              </div>
              <select
                value={selectedPocId}
                onChange={(e) => setSelectedPocId(Number(e.target.value))}
                className="form-select text-xs"
              >
                <option value={0}>-- Select Authorized Contact Rep --</option>
                {clientContacts.map(poc => (
                  <option key={poc.id} value={poc.id}>
                    {poc.name} {poc.designation ? `(${poc.designation})` : ''} - {poc.phone}
                  </option>
                ))}
              </select>
              {clientContacts.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  No contacts found for this client. Click "+ Add POC" to register one.
                </p>
              )}
            </div>

            {/* Read-Only Handover Date/Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Handover Date & Time</span>
                <span className="text-[10px] text-slate-400 font-normal">Auto-Captured (Server Time)</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  readOnly
                  disabled
                  value={new Date(scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-xl outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Acting Collector User */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Receiving Staff (Collector)
              </label>
              <input
                type="text"
                disabled
                value={`${currentUser?.first_name} ${currentUser?.last_name} (${currentUser?.role})`}
                className="form-input text-xs bg-slate-50 text-slate-500 font-medium"
              />
            </div>

            {/* Operational Location & GPS */}
            <div className="md:col-span-2">
              <LocationPicker
                autoDetectOnMount={true}
                locationAddress={locationAddress}
                latitude={latitude}
                longitude={longitude}
                onChange={({ address, latitude: lat, longitude: lng }) => {
                  setLocationAddress(address);
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                label="Physical Handover Location / Facility"
                placeholder="e.g. Apex Security Sector 24 Facility, Warehouse Gate 2..."
              />
            </div>
          </div>
        </div>

        {/* Step 2: Dynamic Devices Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                2. Intake Equipment Batch ({devicesData.length} unit{devicesData.length === 1 ? '' : 's'})
              </h3>
              <p className="text-xs text-slate-500">Each equipment unit will receive an individual record and QR code.</p>
            </div>
            <button
              type="button"
              onClick={handleAddDeviceRow}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Device Row</span>
            </button>
          </div>

          <div className="space-y-4">
            {devicesData.map((row, idx) => (
              <div 
                key={row.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 relative space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-700 font-mono">
                    Device #{idx + 1}
                  </span>
                  {devicesData.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDeviceRow(row.id)}
                      className="text-slate-400 hover:text-rose-600 transition"
                      title="Remove Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Device Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Type
                    </label>
                    <select
                      value={row.device_type}
                      onChange={(e) => updateRow(row.id, 'device_type', e.target.value)}
                      className="form-select text-xs"
                    >
                      <option value="CAMERA">Camera</option>
                      <option value="SMARTPHONE">Smartphone</option>
                      <option value="BODYCAM">Bodycam</option>
                      <option value="DASHCAM">Dashcam</option>
                      <option value="TABLET">Tablet</option>
                      <option value="OTHER">Other Accessory</option>
                    </select>
                  </div>

                  {/* Brand & Model */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Brand & Model <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={row.brand_and_model}
                      onChange={(e) => updateRow(row.id, 'brand_and_model', e.target.value)}
                      placeholder="e.g. Sony Alpha 7 IV"
                      className="form-input text-xs"
                      required
                    />
                  </div>

                  {/* Serial / IMEI */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Serial / IMEI
                    </label>
                    <input
                      type="text"
                      value={row.imei_or_serial}
                      onChange={(e) => updateRow(row.id, 'imei_or_serial', e.target.value)}
                      placeholder="e.g. SN-SONY-77801"
                      className="form-input text-xs font-mono"
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Physical Condition
                    </label>
                    <select
                      value={row.condition}
                      onChange={(e) => updateRow(row.id, 'condition', e.target.value)}
                      className="form-select text-xs"
                    >
                      <option value="EXCELLENT">Excellent (Like New)</option>
                      <option value="GOOD">Good (Minor Scuffs)</option>
                      <option value="FAIR">Fair (Visible Wear)</option>
                      <option value="DAMAGED">Damaged / Non-Functional</option>
                    </select>
                  </div>

                  {/* Accessories */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Accessories Included
                    </label>
                    <input
                      type="text"
                      value={row.accessories}
                      onChange={(e) => updateRow(row.id, 'accessories', e.target.value)}
                      placeholder="e.g. Charger, USB-C Cable, 64GB SD Card, Lens 28-70mm"
                      className="form-input text-xs"
                    />
                  </div>

                  {/* Custom Asset ID (Optional) */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Asset ID <span className="text-slate-400 font-normal">(Leave blank to auto-generate)</span>
                    </label>
                    <input
                      type="text"
                      value={row.asset_id}
                      onChange={(e) => updateRow(row.id, 'asset_id', e.target.value)}
                      placeholder="Auto: CAM-2026-XXXX"
                      className="form-input text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm & Commit Intake ({devicesData.length} Devices)</span>
          </button>
        </div>
      </form>

      {/* Quick Add POC Modal */}
      {showAddPoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Add New Client Contact POC</h3>
            <form onSubmit={handleCreatePoc} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newPocName}
                  onChange={(e) => setNewPocName(e.target.value)}
                  placeholder="e.g. Vikram Sethi"
                  className="form-input text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={newPocPhone}
                  onChange={(e) => setNewPocPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="form-input text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={newPocDesignation}
                  onChange={(e) => setNewPocDesignation(e.target.value)}
                  placeholder="e.g. Warehouse Lead"
                  className="form-input text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddPoc(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Save POC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
