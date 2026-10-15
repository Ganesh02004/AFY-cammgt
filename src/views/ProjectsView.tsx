import React, { useState } from 'react';
import { 
  FolderKanban, Plus, Search, Filter, Building2, Home, 
  MapPin, UserCheck, Calendar, ArrowLeft, Edit2, Archive, 
  Trash2, AlertTriangle, CheckCircle2, ChevronRight, Boxes,
  Sparkles, ShieldAlert, X, Eye, FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Project, ProjectType, ProjectStatus } from '../types';
import { LocationPicker } from '../components/common/LocationPicker';

interface ProjectsViewProps {
  onNavigate: (view: string, params?: any) => void;
  initialProjectId?: number;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onNavigate, initialProjectId }) => {
  const { 
    projects, clients, contacts, devices, tasks, currentUser,
    createProject, updateProject, archiveProject, deleteProject, fieldDefinitions
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ProjectType>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals & form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedDetailProject, setSelectedDetailProject] = useState<Project | null>(() => {
    if (initialProjectId) {
      return projects.find(p => p.id === initialProjectId) || null;
    }
    return null;
  });
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Form Fields
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('Commercial');
  const [clientId, setClientId] = useState<number>(clients[0]?.id || 0);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState('');

  // Contacts filtered by currently selected client
  const availableClientContacts = contacts.filter(c => c.client_id === clientId);

  // Custom field definitions for Project from Studio
  const projectFieldDefs = fieldDefinitions.filter(f => f.object_key === 'project' && f.is_active);

  const resetForm = () => {
    setProjectName('');
    setProjectType('Commercial');
    const firstClient = clients[0]?.id || 0;
    setClientId(firstClient);
    setSelectedContactIds([]);
    setStatus('ACTIVE');
    setDescription('');
    setAddress('');
    setCity('');
    setState('');
    setLatitude(null);
    setLongitude(null);
    setCustomFields({});
    setFormError('');
    setEditingProject(null);
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setProjectName(proj.name);
    setProjectType(proj.project_type);
    setClientId(proj.client_id);
    setSelectedContactIds(proj.contact_ids || []);
    setStatus(proj.status);
    setDescription(proj.description || '');
    setAddress(proj.address || '');
    setCity(proj.city || '');
    setState(proj.state || '');
    setLatitude(proj.latitude || null);
    setLongitude(proj.longitude || null);
    setCustomFields(proj.custom_fields || {});
    setFormError('');
    setShowAddModal(true);
  };

  const handleClientChange = (newClientId: number) => {
    setClientId(newClientId);
    // Filter out contacts that do NOT belong to this new client to guarantee consistency
    setSelectedContactIds(prev => prev.filter(cId => {
      const contactObj = contacts.find(c => c.id === cId);
      return contactObj && contactObj.client_id === newClientId;
    }));
  };

  const toggleContactSelection = (contactId: number) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    );
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!projectName.trim()) {
      setFormError('Project name is required.');
      return;
    }
    if (!clientId) {
      setFormError('A client company must be selected.');
      return;
    }

    if (editingProject) {
      updateProject(editingProject.id, {
        name: projectName.trim(),
        project_type: projectType,
        client_id: clientId,
        contact_ids: selectedContactIds,
        status,
        description: description.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        latitude,
        longitude,
        custom_fields: customFields
      });
      if (selectedDetailProject?.id === editingProject.id) {
        setSelectedDetailProject(prev => prev ? {
          ...prev,
          name: projectName.trim(),
          project_type: projectType,
          client_id: clientId,
          contact_ids: selectedContactIds,
          status,
          description: description.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          latitude,
          longitude,
          custom_fields: customFields
        } : null);
      }
    } else {
      createProject({
        name: projectName.trim(),
        project_type: projectType,
        client_id: clientId,
        contact_ids: selectedContactIds,
        status,
        description: description.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        latitude,
        longitude,
        custom_fields: customFields
      });
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleDeleteAttempt = (proj: Project) => {
    const res = deleteProject(proj.id);
    if (!res.success) {
      setDeleteWarning(res.error || 'Cannot delete project.');
    } else {
      if (selectedDetailProject?.id === proj.id) {
        setSelectedDetailProject(null);
      }
      setDeleteWarning(null);
    }
  };

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sequence_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.city && p.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || p.project_type === typeFilter;
    const matchesClient = clientFilter === 'ALL' || p.client_id === Number(clientFilter);
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesType && matchesClient && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Project Management</h1>
              <p className="text-xs text-slate-500">
                Track client installations across Household / Domestic and Commercial customer contracts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Linked Record Deletion Warning Modal */}
      {deleteWarning && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">Deletion Prevented by Invariant</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {deleteWarning}
            </p>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setDeleteWarning(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, name, city..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Project Types</option>
              <option value="Household / Domestic">Household / Domestic</option>
              <option value="Commercial">Commercial</option>
            </select>
          </div>

          <div>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Projects</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Quick Type Filter Tabs */}
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">Category:</span>
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
              typeFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({projects.length})
          </button>
          <button
            onClick={() => setTypeFilter('Household / Domestic')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition inline-flex items-center space-x-1 ${
              typeFilter === 'Household / Domestic' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5 mr-1" />
            <span>Household / Domestic ({projects.filter(p => p.project_type === 'Household / Domestic').length})</span>
          </button>
          <button
            onClick={() => setTypeFilter('Commercial')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition inline-flex items-center space-x-1 ${
              typeFilter === 'Commercial' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 mr-1" />
            <span>Commercial ({projects.filter(p => p.project_type === 'Commercial').length})</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((proj) => {
          const client = clients.find(c => c.id === proj.client_id);
          const linkedContacts = contacts.filter(c => proj.contact_ids?.includes(c.id));
          const linkedDeviceCount = devices.filter(d => d.project_id === proj.id).length;
          const isHousehold = proj.project_type === 'Household / Domestic';

          return (
            <div
              key={proj.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                proj.status === 'ARCHIVED' ? 'border-slate-200 bg-slate-50/50 opacity-80' : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div>
                {/* Header line */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      {proj.sequence_id}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isHousehold
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isHousehold ? <Home className="w-3 h-3 mr-1" /> : <Building2 className="w-3 h-3 mr-1" />}
                      {proj.project_type}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      proj.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : proj.status === 'COMPLETED'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {proj.status}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-slate-900 text-sm mt-3 leading-snug">
                  {proj.name}
                </h3>

                {/* Client Company */}
                <div className="mt-2 flex items-center space-x-1.5 text-xs text-slate-600 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{client?.name || 'Unassigned Client'}</span>
                </div>

                {/* Location */}
                {proj.address && (
                  <div className="mt-1 flex items-start space-x-1.5 text-[11px] text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{proj.address}, {proj.city || ''}</span>
                  </div>
                )}

                {/* Linked Contacts / POCs */}
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Assigned POCs ({linkedContacts.length})</span>
                    <span>Fleet: {linkedDeviceCount} devs</span>
                  </div>
                  {linkedContacts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {linkedContacts.map(c => (
                        <span
                          key={c.id}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold flex items-center space-x-1"
                        >
                          <UserCheck className="w-3 h-3 text-indigo-500" />
                          <span>{c.name}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No specific client POC linked</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setSelectedDetailProject(proj)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(proj)}
                    title="Edit project"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {proj.status !== 'ARCHIVED' && (
                    <button
                      onClick={() => archiveProject(proj.id)}
                      title="Archive project"
                      className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAttempt(proj)}
                    title="Delete project"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No Projects Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No projects matched your search criteria. Create a new Household / Domestic or Commercial project to start tracking equipment deployments.
          </p>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FolderKanban className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingProject ? `Edit Project (${editingProject.sequence_id})` : 'Create New Project'}
                </h3>
              </div>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProject} className="space-y-4 mt-4">
              {/* Project Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. DLF Cyber City Surveillance Grid"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Project Type: Exactly Two Options as specified */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Project Type <span className="text-rose-500">* (Select One)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProjectType('Household / Domestic')}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start space-x-3 ${
                      projectType === 'Household / Domestic'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      projectType === 'Household / Domestic' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Household / Domestic</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Villas, gated societies, residential apartments & estates</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProjectType('Commercial')}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start space-x-3 ${
                      projectType === 'Commercial'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      projectType === 'Commercial' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Commercial</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Tech parks, warehouses, enterprise complexes & corporate offices</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Client Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Client Company <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => handleClientChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="ACTIVE">Active Deployment</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived / Closed</option>
                  </select>
                </div>
              </div>

              {/* Link Client Contacts (Strictly filtered to this client) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Link Client Contacts / POCs for this Project
                </label>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                  {availableClientContacts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableClientContacts.map(contact => {
                        const isSelected = selectedContactIds.includes(contact.id);
                        return (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => toggleContactSelection(contact.id)}
                            className={`p-2 rounded-xl text-left border text-xs transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-200'
                            }`}
                          >
                            <div>
                              <div className="font-semibold">{contact.name}</div>
                              <div className="text-[10px] text-slate-500">{contact.designation || contact.phone}</div>
                            </div>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-1">
                      No contacts registered for this client yet. You can add client contacts in the Clients Directory.
                    </p>
                  )}
                </div>
              </div>

              {/* Location Autocomplete with Geocoding and Manual Fallback */}
              <LocationPicker
                locationAddress={address}
                latitude={latitude}
                longitude={longitude}
                onChange={(loc) => {
                  setAddress(loc.address);
                  setLatitude(loc.latitude);
                  setLongitude(loc.longitude);
                  if (loc.city) setCity(loc.city);
                  if (loc.state) setState(loc.state);
                }}
                label="Site Physical Location & Coordinates"
                placeholder="Search project site, residential society, tech park..."
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Gurugram or Bengaluru"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Haryana or Karnataka"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Project Description / Scope of Work
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Installation requirements, security clearance protocols, camera count..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Custom Dynamic Fields for Project from Studio */}
              {projectFieldDefs.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center space-x-1.5 mb-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Custom Studio Fields
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100">
                    {projectFieldDefs.map(field => {
                      const val = customFields[field.api_name] ?? field.default_value ?? '';
                      return (
                        <div key={field.id} className={field.field_type === 'textarea' ? 'sm:col-span-2' : ''}>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {field.label} {field.is_required && <span className="text-rose-500">*</span>}
                          </label>
                          {field.field_type === 'select' ? (
                            <select
                              value={val}
                              onChange={(e) => setCustomFields({ ...customFields, [field.api_name]: e.target.value })}
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                              <option value="">-- Select --</option>
                              {field.choices?.map(c => (
                                <option key={c.id} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          ) : field.field_type === 'boolean' ? (
                            <label className="flex items-center space-x-2 text-xs text-slate-700 mt-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={(e) => setCustomFields({ ...customFields, [field.api_name]: e.target.checked })}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                              />
                              <span>Enabled</span>
                            </label>
                          ) : field.field_type === 'textarea' ? (
                            <textarea
                              rows={2}
                              value={val}
                              onChange={(e) => setCustomFields({ ...customFields, [field.api_name]: e.target.value })}
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          ) : (
                            <input
                              type={field.field_type === 'number' ? 'number' : 'text'}
                              value={val}
                              onChange={(e) => setCustomFields({ ...customFields, [field.api_name]: e.target.value })}
                              placeholder={field.placeholder || ''}
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail Slide-over / Modal */}
      {selectedDetailProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white ${
                  selectedDetailProject.project_type === 'Household / Domestic' ? 'bg-amber-600' : 'bg-indigo-600'
                }`}>
                  {selectedDetailProject.project_type === 'Household / Domestic' ? (
                    <Home className="w-6 h-6" />
                  ) : (
                    <Building2 className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {selectedDetailProject.sequence_id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedDetailProject.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-0.5">{selectedDetailProject.name}</h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Type and Client info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Project Type</span>
                  <span className="text-xs font-bold text-slate-800">{selectedDetailProject.project_type}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Client Company</span>
                  <span className="text-xs font-bold text-slate-800">
                    {clients.find(c => c.id === selectedDetailProject.client_id)?.name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Site Location</span>
                  <span className="text-xs font-medium text-slate-700">{selectedDetailProject.address || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">City / State</span>
                  <span className="text-xs font-medium text-slate-700">
                    {selectedDetailProject.city ? `${selectedDetailProject.city}, ${selectedDetailProject.state}` : 'N/A'}
                  </span>
                </div>
              </div>

              {selectedDetailProject.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description / Notes</h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                    {selectedDetailProject.description}
                  </p>
                </div>
              )}

              {/* Linked Contacts */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Linked Client POCs ({selectedDetailProject.contact_ids?.length || 0})
                </h4>
                <div className="space-y-1.5">
                  {contacts.filter(c => selectedDetailProject.contact_ids?.includes(c.id)).map(c => (
                    <div key={c.id} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{c.name}</span>
                        <span className="text-slate-400 text-[11px] ml-2">({c.designation || 'POC'})</span>
                      </div>
                      <div className="text-slate-600 text-xs font-mono">{c.phone}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Devices */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Associated Fleet Devices ({devices.filter(d => d.project_id === selectedDetailProject.id).length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {devices.filter(d => d.project_id === selectedDetailProject.id).length > 0 ? (
                    devices.filter(d => d.project_id === selectedDetailProject.id).map(dev => (
                      <div
                        key={dev.id}
                        onClick={() => onNavigate('device-detail', { deviceId: dev.id })}
                        className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs cursor-pointer transition group"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-indigo-700 group-hover:text-indigo-900">
                            {dev.asset_id}
                          </span>
                          <span className="text-slate-600 truncate">{dev.brand_and_model}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {dev.current_status}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">No cameras currently tagged with this project.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const proj = selectedDetailProject;
                  setSelectedDetailProject(null);
                  openEditModal(proj);
                }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition inline-flex items-center space-x-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Project</span>
              </button>

              <button
                onClick={() => setSelectedDetailProject(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
