import React, { useState } from 'react';
import { 
  Building2, Plus, Search, Phone, Mail, MapPin, 
  ChevronRight, Users, Camera, ArrowLeft, FolderKanban, CheckCircle2,
  Edit2, Trash2, Shield, Eye, Building, Home, Warehouse, X, Layers, AlertCircle,
  History, ArrowRightLeft, Clock, FileText, Smartphone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LocationPicker } from '../components/common/LocationPicker';
import { ClientCompany, ClientContact, ClientOffice, Project, ProjectType, OfficeType } from '../types';

interface ClientsViewProps {
  onNavigate: (view: string, params?: any) => void;
  initialClientId?: number;
  initialCreateMode?: boolean;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ 
  onNavigate, 
  initialClientId, 
  initialCreateMode 
}) => {
  const { 
    clients, contacts, devices, projects, clientOffices, currentUser, users, workers, movements, activityLogs,
    createClient, updateClient,
    createClientOffice, updateClientOffice, toggleOfficeStatus, deleteClientOffice,
    createContact, updateContact, deleteContact,
    createProject, processReturn
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(initialClientId || null);
  const [isFullPageCreate, setIsFullPageCreate] = useState<boolean>(Boolean(initialCreateMode));
  const [detailTab, setDetailTab] = useState<'offices' | 'projects' | 'contacts' | 'devices' | 'history'>('offices');

  // Client State
  const [editingClient, setEditingClient] = useState<ClientCompany | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientPinCode, setClientPinCode] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientLat, setClientLat] = useState<number | null>(null);
  const [clientLng, setClientLng] = useState<number | null>(null);
  const [clientStatus, setClientStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Office Modals
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState<ClientOffice | null>(null);
  const [officeName, setOfficeName] = useState('');
  const [officeType, setOfficeType] = useState<OfficeType>('BRANCH');
  const [officeAddress, setOfficeAddress] = useState('');
  const [officeCity, setOfficeCity] = useState('');
  const [officeState, setOfficeState] = useState('');
  const [officePinCode, setOfficePinCode] = useState('');
  const [officeLat, setOfficeLat] = useState<number | null>(null);
  const [officeLng, setOfficeLng] = useState<number | null>(null);
  const [officeContactPerson, setOfficeContactPerson] = useState('');
  const [officeContactPhone, setOfficeContactPhone] = useState('');

  // Contact / POC Modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [contactProjectIds, setContactProjectIds] = useState<number[]>([]);

  // Fast Client-Prelinked Project Modal
  const [showQuickProjectModal, setShowQuickProjectModal] = useState(false);
  const [quickProjectName, setQuickProjectName] = useState('');
  const [quickProjectType, setQuickProjectType] = useState<ProjectType>('Commercial');
  const [quickProjectDesc, setQuickProjectDesc] = useState('');
  const [quickProjectAddress, setQuickProjectAddress] = useState('');
  const [quickProjectCity, setQuickProjectCity] = useState('');
  const [quickProjectState, setQuickProjectState] = useState('');
  const [quickProjectLat, setQuickProjectLat] = useState<number | null>(null);
  const [quickProjectLng, setQuickProjectLng] = useState<number | null>(null);
  const [quickProjectContactIds, setQuickProjectContactIds] = useState<number[]>([]);

  // Return to Client Modal State
  const [returnDeviceModal, setReturnDeviceModal] = useState<any>(null);
  const [returnPocId, setReturnPocId] = useState<number>(0);
  const [returnCondition, setReturnCondition] = useState<string>('EXCELLENT');
  const [returnNotes, setReturnNotes] = useState<string>('');

  const activeClient = clients.find(c => c.id === selectedClientId);
  const activeClientOffices = clientOffices.filter(o => o.client_id === selectedClientId);
  const activeClientProjects = projects.filter(p => p.client_id === selectedClientId);
  const activeClientContacts = contacts.filter(c => c.client_id === selectedClientId);
  const activeClientDevices = devices.filter(d => d.source_client_id === selectedClientId);

  const handleReturnToClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnDeviceModal || !currentUser || !selectedClientId) return;

    const client = clients.find(c => c.id === selectedClientId);
    const poc = contacts.find(c => c.id === returnPocId);

    processReturn({
      deviceId: returnDeviceModal.id,
      workerId: 0,
      condition: returnCondition,
      notes: `Formally returned to Client ${client?.name} (Recipient POC: ${poc?.name || 'Authorized Client Rep'}). ${returnNotes}`,
      locationAddress: client?.address
    });

    setReturnDeviceModal(null);
    setReturnNotes('');
  };

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open Full-Page Edit Client
  const openEditClient = (client: ClientCompany) => {
    setEditingClient(client);
    setClientName(client.name);
    setClientCode(client.code);
    setClientAddress(client.address);
    setClientCity(client.city);
    setClientState(client.state);
    setClientPinCode(client.pin_code);
    setClientLat(client.latitude || null);
    setClientLng(client.longitude || null);
    setClientStatus(client.status);
    setIsFullPageCreate(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientCode.trim()) return;

    let savedClientId = selectedClientId;

    if (editingClient) {
      updateClient(editingClient.id, {
        name: clientName.trim(),
        code: clientCode.trim(),
        address: clientAddress.trim(),
        city: clientCity.trim() || 'Unspecified',
        state: clientState.trim() || 'Unspecified',
        pin_code: clientPinCode.trim() || '000000',
        latitude: clientLat,
        longitude: clientLng,
        status: clientStatus
      });
      savedClientId = editingClient.id;
    } else {
      const newClient = createClient({
        name: clientName.trim(),
        code: clientCode.trim(),
        address: clientAddress.trim(),
        city: clientCity.trim() || 'Unspecified',
        state: clientState.trim() || 'Unspecified',
        pin_code: clientPinCode.trim() || '000000',
        latitude: clientLat,
        longitude: clientLng,
        status: clientStatus
      });
      savedClientId = newClient.id;
    }

    setIsFullPageCreate(false);
    setEditingClient(null);
    setSelectedClientId(savedClientId);
    setClientName('');
    setClientCode('');
    setClientAddress('');
    setClientCity('');
    setClientState('');
    setClientPinCode('');
    setClientLat(null);
    setClientLng(null);
  };

  // Office actions
  const openAddOffice = () => {
    setEditingOffice(null);
    setOfficeName('');
    setOfficeType('BRANCH');
    setOfficeAddress(activeClient ? activeClient.address : '');
    setOfficeCity(activeClient ? activeClient.city : '');
    setOfficeState(activeClient ? activeClient.state : '');
    setOfficePinCode(activeClient ? activeClient.pin_code : '');
    setOfficeLat(null);
    setOfficeLng(null);
    setOfficeContactPerson('');
    setOfficeContactPhone('');
    setShowOfficeModal(true);
  };

  const openEditOffice = (office: ClientOffice) => {
    setEditingOffice(office);
    setOfficeName(office.name);
    setOfficeType(office.office_type);
    setOfficeAddress(office.address);
    setOfficeCity(office.city);
    setOfficeState(office.state);
    setOfficePinCode(office.pin_code);
    setOfficeLat(office.latitude || null);
    setOfficeLng(office.longitude || null);
    setOfficeContactPerson(office.contact_person || '');
    setOfficeContactPhone(office.contact_phone || '');
    setShowOfficeModal(true);
  };

  const handleSaveOffice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !officeName.trim() || !officeAddress.trim()) return;

    if (editingOffice) {
      updateClientOffice(editingOffice.id, {
        name: officeName.trim(),
        office_type: officeType,
        address: officeAddress.trim(),
        city: officeCity.trim() || 'Unspecified',
        state: officeState.trim() || 'Unspecified',
        pin_code: officePinCode.trim() || '000000',
        latitude: officeLat,
        longitude: officeLng,
        contact_person: officeContactPerson.trim() || undefined,
        contact_phone: officeContactPhone.trim() || undefined
      });
    } else {
      createClientOffice({
        client_id: selectedClientId,
        name: officeName.trim(),
        office_type: officeType,
        address: officeAddress.trim(),
        city: officeCity.trim() || 'Unspecified',
        state: officeState.trim() || 'Unspecified',
        pin_code: officePinCode.trim() || '000000',
        latitude: officeLat,
        longitude: officeLng,
        contact_person: officeContactPerson.trim() || undefined,
        contact_phone: officeContactPhone.trim() || undefined,
        is_active: true
      });
    }

    setShowOfficeModal(false);
    setEditingOffice(null);
  };

  // Contact actions
  const openAddContact = () => {
    setEditingContact(null);
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setContactDesignation('');
    setContactProjectIds([]);
    setShowContactModal(true);
  };

  const openEditContact = (c: ClientContact) => {
    setEditingContact(c);
    setContactName(c.name);
    setContactPhone(c.phone);
    setContactEmail(c.email || '');
    setContactDesignation(c.designation || '');
    const validProjects = (c.project_ids || []).filter(pid => 
      activeClientProjects.some(p => p.id === pid)
    );
    setContactProjectIds(validProjects);
    setShowContactModal(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !contactName.trim() || !contactPhone.trim()) return;

    if (editingContact) {
      updateContact(editingContact.id, {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        email: contactEmail.trim() || undefined,
        designation: contactDesignation.trim() || undefined,
        project_ids: contactProjectIds
      });
    } else {
      createContact({
        client_id: selectedClientId,
        name: contactName.trim(),
        phone: contactPhone.trim(),
        email: contactEmail.trim() || undefined,
        designation: contactDesignation.trim() || undefined,
        project_ids: contactProjectIds,
        is_active: true
      });
    }

    setShowContactModal(false);
    setEditingContact(null);
  };

  // Quick Project creation for active client
  const handleCreateQuickProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !quickProjectName.trim()) return;

    createProject({
      name: quickProjectName.trim(),
      project_type: quickProjectType,
      client_id: selectedClientId,
      contact_ids: quickProjectContactIds,
      status: 'ACTIVE',
      description: quickProjectDesc.trim() || undefined,
      address: quickProjectAddress.trim() || undefined,
      city: quickProjectCity.trim() || undefined,
      state: quickProjectState.trim() || undefined,
      latitude: quickProjectLat,
      longitude: quickProjectLng
    });

    setShowQuickProjectModal(false);
    setQuickProjectName('');
    setQuickProjectType('Commercial');
    setQuickProjectDesc('');
    setQuickProjectAddress('');
    setQuickProjectCity('');
    setQuickProjectState('');
    setQuickProjectLat(null);
    setQuickProjectLng(null);
    setQuickProjectContactIds([]);
  };

  // -------------------------------------------------------------
  // 1. FULL PAGE CLIENT CREATION & EDITING SCREEN
  // -------------------------------------------------------------
  if (isFullPageCreate) {
    return (
      <div className="space-y-6 pb-16 max-w-5xl mx-auto animate-fade-in px-2 sm:px-0">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                setIsFullPageCreate(false);
                setEditingClient(null);
              }}
              className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 transition mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back to Clients Directory</span>
            </button>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Building2 className="w-7 h-7 text-indigo-600" />
              <span>{editingClient ? `Edit Client Profile: ${editingClient.name}` : 'Register New Client Organization'}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Salesforce-Style Corporate Record Management • Configure client accounts with HQ addresses, GPS coordinates, and status.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveClient} className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>1. Company Profile & Identifiers</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Client Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Apex Security Solutions Pvt Ltd"
                  className="form-input text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Client Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientCode}
                  onChange={(e) => setClientCode(e.target.value)}
                  placeholder="e.g. APX-001"
                  className="form-input text-xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Account Status
                </label>
                <select
                  value={clientStatus}
                  onChange={(e) => setClientStatus(e.target.value as any)}
                  className="form-select text-xs font-medium"
                >
                  <option value="ACTIVE">ACTIVE (Operational)</option>
                  <option value="INACTIVE">INACTIVE (Archived)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>2. Corporate Headquarters & Geocoded Address</span>
            </h3>

            <LocationPicker
              label="Headquarters Address & Automatic GPS Location *"
              locationAddress={clientAddress}
              latitude={clientLat}
              longitude={clientLng}
              onChange={(loc) => {
                setClientAddress(loc.address);
                setClientLat(loc.latitude);
                setClientLng(loc.longitude);
                if (loc.city) setClientCity(loc.city);
                if (loc.state) setClientState(loc.state);
                if (loc.pin_code) setClientPinCode(loc.pin_code);
              }}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                  placeholder="e.g. Gurugram"
                  className="form-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  State / Province
                </label>
                <input
                  type="text"
                  value={clientState}
                  onChange={(e) => setClientState(e.target.value)}
                  placeholder="e.g. Haryana"
                  className="form-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  PIN / Postal Code
                </label>
                <input
                  type="text"
                  value={clientPinCode}
                  onChange={(e) => setClientPinCode(e.target.value)}
                  placeholder="e.g. 122002"
                  className="form-input text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsFullPageCreate(false);
                setEditingClient(null);
              }}
              className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingClient ? 'Save Client Changes' : 'Register & Open Client Record'}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. FULL PAGE SALESFORCE-STYLE CLIENT RECORD DETAIL VIEW
  // -------------------------------------------------------------
  if (activeClient) {
    return (
      <div className="space-y-6 pb-16 max-w-7xl mx-auto animate-fade-in px-2 sm:px-0">
        {/* Full Page Header & Actions */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <button
                onClick={() => setSelectedClientId(null)}
                className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 transition mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Back to Clients Directory</span>
              </button>

              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                  {activeClient.code}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {activeClient.sequence_id || `CLT-${activeClient.id}`}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeClient.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {activeClient.status}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1.5">
                {activeClient.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  {activeClient.address}, {activeClient.city}, {activeClient.state} - {activeClient.pin_code}
                </span>
                {activeClient.latitude && activeClient.longitude && (
                  <span className="font-mono text-[11px] text-indigo-600 bg-indigo-50/70 px-2 py-0.5 rounded">
                    GPS: {activeClient.latitude}, {activeClient.longitude}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('intake')}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Intake Equipment</span>
              </button>
              <button
                onClick={() => openEditClient(activeClient)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Client</span>
              </button>
              <button
                onClick={() => setSelectedClientId(null)}
                className="px-3.5 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Salesforce Summary Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Regional Offices</span>
              <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{activeClientOffices.length}</span>
            </div>
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Active Projects</span>
              <span className="text-lg font-extrabold text-indigo-700 mt-0.5 block">{activeClientProjects.length}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Authorized POCs</span>
              <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{activeClientContacts.length}</span>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Equipment Fleet</span>
              <span className="text-lg font-extrabold text-emerald-800 mt-0.5 block">{activeClientDevices.length} Units</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
          <div className="flex border-b border-slate-100 overflow-x-auto space-x-2 text-xs font-bold no-scrollbar">
            <button
              onClick={() => setDetailTab('offices')}
              className={`py-3 px-4 rounded-xl transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                detailTab === 'offices' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Offices & Hubs ({activeClientOffices.length})</span>
            </button>

            <button
              onClick={() => setDetailTab('projects')}
              className={`py-3 px-4 rounded-xl transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                detailTab === 'projects' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Projects ({activeClientProjects.length})</span>
            </button>

            <button
              onClick={() => setDetailTab('contacts')}
              className={`py-3 px-4 rounded-xl transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                detailTab === 'contacts' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Authorized POCs ({activeClientContacts.length})</span>
            </button>

            <button
              onClick={() => setDetailTab('devices')}
              className={`py-3 px-4 rounded-xl transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                detailTab === 'devices' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Client Inventory & Ledger ({activeClientDevices.length})</span>
            </button>

            <button
              onClick={() => setDetailTab('history')}
              className={`py-3 px-4 rounded-xl transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                detailTab === 'history' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Movement & Assignment Trail</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Offices */}
        {detailTab === 'offices' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Offices, Depots & Site Hubs</h3>
                <p className="text-xs text-slate-500">Operating branch locations for {activeClient.name}.</p>
              </div>
              <button
                onClick={openAddOffice}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Office / Depot</span>
              </button>
            </div>

            {activeClientOffices.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-bold">No registered branch offices or depots yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Register regional offices to assign localized device deployments.</p>
                <button
                  onClick={openAddOffice}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
                >
                  + Register First Office Location
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeClientOffices.map(office => (
                  <div
                    key={office.id}
                    className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                      office.is_active 
                        ? 'bg-slate-50/80 border-slate-200 hover:border-indigo-300' 
                        : 'bg-slate-100 border-slate-200 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {office.sequence_id}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase">
                              {office.office_type}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-base mt-1.5">{office.name}</h4>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => openEditOffice(office)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white transition"
                            title="Edit Office"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleOfficeStatus(office.id)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition cursor-pointer ${
                              office.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {office.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{office.address}, {office.city}, {office.state}</span>
                        </div>
                        {office.contact_person && (
                          <div className="text-[11px] text-slate-500">
                            Contact Person: <strong className="text-slate-800">{office.contact_person}</strong>
                            {office.contact_phone && ` (${office.contact_phone})`}
                          </div>
                        )}
                      </div>
                    </div>

                    {office.latitude && office.longitude && (
                      <div className="mt-4 pt-2.5 border-t border-slate-200 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                        <span>GPS Coordinates:</span>
                        <span>{office.latitude}, {office.longitude}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Projects */}
        {detailTab === 'projects' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Client Deployment Projects ({activeClientProjects.length})</h3>
                <p className="text-xs text-slate-500">Commercial or residential projects linked to {activeClient.name}.</p>
              </div>
              <button
                onClick={() => {
                  setQuickProjectName('');
                  setQuickProjectType('Commercial');
                  setQuickProjectDesc('');
                  setQuickProjectAddress(activeClient.address);
                  setQuickProjectCity(activeClient.city);
                  setQuickProjectState(activeClient.state);
                  setQuickProjectLat(null);
                  setQuickProjectLng(null);
                  setQuickProjectContactIds([]);
                  setShowQuickProjectModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Linked Project</span>
              </button>
            </div>

            {activeClientProjects.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-bold">No active deployment projects for this client.</p>
                <button
                  onClick={() => setShowQuickProjectModal(true)}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
                >
                  + Create First Project for {activeClient.name}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeClientProjects.map(proj => {
                  const linkedPocs = contacts.filter(c => proj.contact_ids?.includes(c.id));
                  const linkedDevs = devices.filter(d => d.project_id === proj.id);

                  return (
                    <div
                      key={proj.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-sm transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {proj.sequence_id}
                            </span>
                            <h4 className="font-bold text-slate-900 text-base mt-1.5">{proj.name}</h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            proj.project_type === 'Commercial' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {proj.project_type}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                          {proj.description || 'No project description recorded.'}
                        </p>

                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                          {proj.address && (
                            <div className="flex items-center space-x-1 text-slate-600 text-[11px]">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{proj.address}</span>
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500">
                            Site POCs: <span className="font-semibold text-slate-800">{linkedPocs.map(p => p.name).join(', ') || 'None assigned'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Fleet: {linkedDevs.length} Units</span>
                        <button
                          onClick={() => {
                            onNavigate('projects', { projectId: proj.id });
                          }}
                          className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Open Project Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Contacts / POCs */}
        {detailTab === 'contacts' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Authorized Client Contacts / POCs ({activeClientContacts.length})</h3>
                <p className="text-xs text-slate-500">Site leads authorized for equipment custody handovers.</p>
              </div>
              <button
                onClick={openAddContact}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Contact / POC</span>
              </button>
            </div>

            {activeClientContacts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-bold">No contact persons registered for this client yet.</p>
                <button
                  onClick={openAddContact}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
                >
                  + Add Authorized Client POC
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeClientContacts.map(poc => {
                  const pocProjects = activeClientProjects.filter(p => poc.project_ids?.includes(p.id));

                  return (
                    <div key={poc.id} className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs space-y-2.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 text-base">{poc.name}</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono text-slate-400">{poc.sequence_id || `CON-${poc.id}`}</span>
                            <button
                              onClick={() => openEditContact(poc)}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition"
                              title="Edit Contact"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">{poc.designation || 'Site Lead / Logistics Rep'}</div>
                        <div className="text-xs text-slate-800 font-mono mt-1 flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{poc.phone}</span>
                        </div>
                        {poc.email && (
                          <div className="text-xs text-slate-600 flex items-center space-x-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{poc.email}</span>
                          </div>
                        )}

                        <div className="pt-3 mt-3 border-t border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Designated Projects ({pocProjects.length}):
                          </span>
                          {pocProjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {pocProjects.map(proj => (
                                <span
                                  key={proj.id}
                                  className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md text-[10px] font-medium flex items-center space-x-1"
                                >
                                  <FolderKanban className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[130px]">{proj.name}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">All client sites / Unrestricted</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Client Dedicated Inventory & Return Ledger */}
        {detailTab === 'devices' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {activeClient.name} Dedicated Equipment Register ({activeClientDevices.length} Units)
                </h3>
                <p className="text-xs text-slate-500">
                  Central synchronized inventory ledger tracking all cameras and tracking hardware sourced from {activeClient.name}.
                </p>
              </div>
              <button
                onClick={() => onNavigate('intake')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Intake Equipment from {activeClient.name}</span>
              </button>
            </div>

            {activeClientDevices.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-bold">No equipment collected from this client yet.</p>
                <button
                  onClick={() => onNavigate('intake')}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
                >
                  + Start Intake for {activeClient.name}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-w-full">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Asset ID / Model</th>
                      <th className="p-3">Serial / IMEI</th>
                      <th className="p-3">Condition & Accessories</th>
                      <th className="p-3">Current Custodian</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {activeClientDevices.map(d => {
                      const isReturned = d.current_status === 'RETURNED_TO_CLIENT';
                      let custodianName = 'Storage / Depot';
                      if (d.current_custodian_type === 'USER') {
                        const u = users.find(x => x.id === d.current_custodian_user_id);
                        custodianName = u ? `${u.first_name} ${u.last_name}` : 'Staff User';
                      } else if (d.current_custodian_type === 'WORKER') {
                        const w = workers.find(x => x.id === d.current_custodian_worker_id);
                        custodianName = w ? `Worker: ${w.name}` : 'Worker';
                      } else if (d.current_custodian_type === 'CLIENT') {
                        custodianName = `Client: ${activeClient.name}`;
                      }

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-medium">
                            <div className="font-mono font-bold text-indigo-700">{d.asset_id}</div>
                            <div className="text-slate-900 font-bold mt-0.5">{d.brand_and_model}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            {d.imei_or_serial || 'None'}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{d.condition}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                              {d.accessories || 'Standard Accessories'}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{custodianName}</div>
                            <div className="text-[10px] text-slate-400">Type: {d.current_custodian_type}</div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              isReturned
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : d.current_status === 'ASSIGNED_WORKER'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {d.current_status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2 whitespace-nowrap">
                            {!isReturned && (
                              <button
                                onClick={() => {
                                  setReturnDeviceModal(d);
                                  setReturnPocId(activeClientContacts[0]?.id || 0);
                                  setReturnCondition(d.condition);
                                  setReturnNotes('');
                                }}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-lg text-[11px] transition cursor-pointer"
                              >
                                Return to Client
                              </button>
                            )}
                            <button
                              onClick={() => {
                                onNavigate('device_detail', { deviceId: d.id });
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                            >
                              Ledger
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Movement & Assignment History Trail */}
        {detailTab === 'history' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Client Equipment Audit & Movement Ledger</h3>
              <p className="text-xs text-slate-500">Historical trail of all custody transfers and returns for {activeClient.name}'s equipment.</p>
            </div>

            {(() => {
              const clientDeviceIds = activeClientDevices.map(d => d.id);
              const clientMovements = movements.filter(m => clientDeviceIds.includes(m.device_id));

              if (clientMovements.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500">
                    No movement records logged for this client's equipment yet.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {clientMovements.map(m => {
                    const dev = devices.find(d => d.id === m.device_id);
                    return (
                      <div key={m.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-indigo-700">{dev?.asset_id || `#${m.device_id}`}</span>
                            <span className="text-slate-900 font-bold">{dev?.brand_and_model}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                              {m.related_transaction_type}
                            </span>
                          </div>
                          <div className="text-slate-600 flex items-center space-x-1">
                            <span>From: <strong>{m.from_custodian_name}</strong></span>
                            <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                            <span>To: <strong>{m.to_custodian_name}</strong></span>
                          </div>
                          {m.notes && <p className="text-[11px] text-slate-500 italic">{m.notes}</p>}
                        </div>

                        <div className="text-right text-[11px] text-slate-400 shrink-0">
                          <div>{new Date(m.timestamp).toLocaleDateString()}</div>
                          <div>{new Date(m.timestamp).toLocaleTimeString()}</div>
                          <div className="text-slate-600 font-medium mt-0.5">Actor: {m.actor_name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Modal Dialogs inside Detail View */}

        {/* Add / Edit Office Modal */}
        {showOfficeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingOffice ? 'Edit Office Location' : `Add Office for ${activeClient?.name}`}
                </h3>
                <button
                  onClick={() => { setShowOfficeModal(false); setEditingOffice(null); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveOffice} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Office / Facility Name *</label>
                  <input
                    type="text"
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    placeholder="e.g. Whitefield Logistics Depot"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Office Type *</label>
                  <select
                    value={officeType}
                    onChange={(e) => setOfficeType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="HEADQUARTERS">Headquarters</option>
                    <option value="REGIONAL">Regional Depot / Center</option>
                    <option value="BRANCH">Branch Office</option>
                    <option value="WAREHOUSE">Warehouse / Storage Hub</option>
                    <option value="SITE_OFFICE">Client Site Deployment Office</option>
                  </select>
                </div>

                <LocationPicker
                  label="Office Physical Address *"
                  locationAddress={officeAddress}
                  latitude={officeLat}
                  longitude={officeLng}
                  onChange={(loc) => {
                    setOfficeAddress(loc.address);
                    setOfficeLat(loc.latitude);
                    setOfficeLng(loc.longitude);
                    if (loc.city) setOfficeCity(loc.city);
                    if (loc.state) setOfficeState(loc.state);
                    if (loc.pin_code) setOfficePinCode(loc.pin_code);
                  }}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={officeContactPerson}
                      onChange={(e) => setOfficeContactPerson(e.target.value)}
                      placeholder="e.g. Ramesh Singh"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={officeContactPhone}
                      onChange={(e) => setOfficeContactPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setShowOfficeModal(false); setEditingOffice(null); }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {editingOffice ? 'Update Office' : 'Save Office'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add / Edit Contact (POC) Modal */}
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingContact ? `Edit POC: ${editingContact.name}` : `Add POC for ${activeClient?.name}`}
                </h3>
                <button
                  onClick={() => { setShowContactModal(false); setEditingContact(null); }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Vikram Sethi"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="poc@client.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={contactDesignation}
                    onChange={(e) => setContactDesignation(e.target.value)}
                    placeholder="e.g. Asset & Logistics Lead"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Associate with Projects ({activeClient?.name})
                  </label>
                  <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 max-h-36 overflow-y-auto space-y-1.5">
                    {activeClientProjects.length > 0 ? (
                      activeClientProjects.map(proj => {
                        const isChecked = contactProjectIds.includes(proj.id);
                        return (
                          <label
                            key={proj.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs border transition ${
                              isChecked
                                ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setContactProjectIds(prev => [...prev, proj.id]);
                                  } else {
                                    setContactProjectIds(prev => prev.filter(id => id !== proj.id));
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="truncate">{proj.name}</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 shrink-0 font-mono">
                              {proj.sequence_id}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-1">
                        No projects currently registered for this client.
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setShowContactModal(false); setEditingContact(null); }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {editingContact ? 'Save Changes' : 'Add Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Project Creation Modal */}
        {showQuickProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Create Project for {activeClient?.name}</h3>
                  <p className="text-xs text-slate-500">Configure new project linked to client account.</p>
                </div>
                <button
                  onClick={() => setShowQuickProjectModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateQuickProject} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={quickProjectName}
                    onChange={(e) => setQuickProjectName(e.target.value)}
                    placeholder="e.g. Cyber City Surveillance Phase 2"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setQuickProjectType('Household / Domestic')}
                      className={`p-3 rounded-xl border text-left transition flex items-center space-x-2.5 cursor-pointer ${
                        quickProjectType === 'Household / Domestic'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Home className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs">Household / Domestic</div>
                        <div className="text-[10px] text-slate-400 font-normal">Residential / Villas</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuickProjectType('Commercial')}
                      className={`p-3 rounded-xl border text-left transition flex items-center space-x-2.5 cursor-pointer ${
                        quickProjectType === 'Commercial'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Building className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs">Commercial</div>
                        <div className="text-[10px] text-slate-400 font-normal">Enterprises / Tech Parks</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Description</label>
                  <textarea
                    rows={2}
                    value={quickProjectDesc}
                    onChange={(e) => setQuickProjectDesc(e.target.value)}
                    placeholder="Deployment objectives, equipment specifications..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <LocationPicker
                  label="Site Deployment Address"
                  locationAddress={quickProjectAddress}
                  latitude={quickProjectLat}
                  longitude={quickProjectLng}
                  onChange={(loc) => {
                    setQuickProjectAddress(loc.address);
                    setQuickProjectLat(loc.latitude);
                    setQuickProjectLng(loc.longitude);
                    if (loc.city) setQuickProjectCity(loc.city);
                    if (loc.state) setQuickProjectState(loc.state);
                  }}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designate Authorized POC ({activeClient?.name})
                  </label>
                  <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 max-h-32 overflow-y-auto space-y-1.5">
                    {activeClientContacts.length > 0 ? (
                      activeClientContacts.map(c => {
                        const isChecked = quickProjectContactIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs border transition ${
                              isChecked
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setQuickProjectContactIds(prev => [...prev, c.id]);
                                  } else {
                                    setQuickProjectContactIds(prev => prev.filter(id => id !== c.id));
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>{c.name}</span>
                              <span className="text-[10px] text-slate-400">({c.designation || 'Lead'})</span>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-1">No contacts available to designate.</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowQuickProjectModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Save Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Return Device to Client Modal */}
        {returnDeviceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Formally Return Device to Client</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{returnDeviceModal.asset_id} • {returnDeviceModal.brand_and_model}</p>
                </div>
                <button
                  onClick={() => setReturnDeviceModal(null)}
                  className="text-slate-400 hover:text-slate-600 rounded-full p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleReturnToClientSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Client Contact / POC *</label>
                  <select
                    value={returnPocId}
                    onChange={(e) => setReturnPocId(Number(e.target.value))}
                    className="form-select text-xs"
                  >
                    <option value={0}>-- Select Receiving Client POC --</option>
                    {activeClientContacts.map(poc => (
                      <option key={poc.id} value={poc.id}>
                        {poc.name} ({poc.designation || 'Contact Rep'}) - {poc.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Return Physical Condition *</label>
                  <select
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    className="form-select text-xs"
                  >
                    <option value="EXCELLENT">Excellent (Like New)</option>
                    <option value="GOOD">Good (Minor Scuffs)</option>
                    <option value="FAIR">Fair (Visible Wear)</option>
                    <option value="DAMAGED">Damaged / Non-Functional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Handover Confirmation & Notes</label>
                  <textarea
                    rows={3}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Record formal handover manifest reference, optical inspection notes, or signed receipt details..."
                    className="form-textarea text-xs"
                  />
                </div>

                <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReturnDeviceModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Confirm Formal Return
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. MAIN CLIENTS DIRECTORY LIST VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            <Building2 className="w-4 h-4" />
            <span>Enterprise Clients Directory</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Client Organizations ({clients.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage corporate client accounts, regional office branches, linked deployment projects, and authorized site contacts.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingClient(null);
            setClientName('');
            setClientCode(`CLT-${Math.floor(100 + Math.random() * 900)}`);
            setClientAddress('');
            setClientCity('');
            setClientState('');
            setClientPinCode('');
            setClientLat(null);
            setClientLng(null);
            setClientStatus('ACTIVE');
            setIsFullPageCreate(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Register Client Company</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search client name, code, city..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(c => {
          const clientPocs = contacts.filter(x => x.client_id === c.id);
          const clientProjs = projects.filter(p => p.client_id === c.id);
          const clientOffs = clientOffices.filter(o => o.client_id === c.id);
          const clientDevs = devices.filter(d => d.source_client_id === c.id);

          return (
            <div 
              key={c.id} 
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {c.code}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {c.sequence_id || `CLT-${c.id}`}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 text-lg mt-1.5">{c.name}</h3>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {c.status}
                    </span>
                    <button
                      onClick={() => openEditClient(c)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                      title="Edit Client"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <div className="flex items-center space-x-1 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.city}, {c.state}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{c.address}</p>
                </div>

                {/* 4-Item Stats Grid */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-4 gap-1.5 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Offices</span>
                    <span className="font-extrabold text-slate-900 text-sm">{clientOffs.length}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Projects</span>
                    <span className="font-extrabold text-indigo-700 text-sm">{clientProjs.length}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">POCs</span>
                    <span className="font-extrabold text-slate-900 text-sm">{clientPocs.length}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Units</span>
                    <span className="font-extrabold text-emerald-700 text-sm">{clientDevs.length}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedClientId(c.id);
                    setDetailTab('offices');
                  }}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <span>Open Client Record</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientsView;
