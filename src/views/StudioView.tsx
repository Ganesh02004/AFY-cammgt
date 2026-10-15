import React, { useState } from 'react';
import { 
  Sparkles, Plus, Edit2, Eye, ToggleLeft, ToggleRight, 
  ArrowUp, ArrowDown, Check, X, AlertCircle, Building2, 
  Contact2, Briefcase, User, Boxes, ArrowLeft, Layers, 
  FileText, Shield, EyeOff, Save, CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  ObjectDefinition, FieldDefinition, DynamicFieldType, 
  FieldChoice 
} from '../types';

interface StudioViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const StudioView: React.FC<StudioViewProps> = ({ onNavigate }) => {
  const { 
    currentUser, objectDefinitions, fieldDefinitions, 
    createFieldDefinition, updateFieldDefinition, toggleFieldActive, 
    reorderFields, createObjectDefinition, dynamicRecords, saveDynamicRecord
  } = useApp();

  const [selectedObjectKey, setSelectedObjectKey] = useState<string>('worker');
  const [activeTab, setActiveTab] = useState<'fields' | 'preview' | 'records'>('fields');

  // New field modal state
  const [showAddField, setShowAddField] = useState(false);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldApiName, setFieldApiName] = useState('');
  const [fieldType, setFieldType] = useState<DynamicFieldType>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [helpText, setHelpText] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [showInList, setShowInList] = useState(true);
  const [isSensitive, setIsSensitive] = useState(false);
  const [rawChoices, setRawChoices] = useState('Option 1\nOption 2\nOption 3');

  // New object modal state
  const [showAddObject, setShowAddObject] = useState(false);
  const [newObjectName, setNewObjectName] = useState('');
  const [newObjectApiName, setNewObjectApiName] = useState('');
  const [newObjectDescription, setNewObjectDescription] = useState('');

  // Preview form test state
  const [previewFormData, setPreviewFormData] = useState<Record<string, any>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [previewSuccess, setPreviewSuccess] = useState(false);

  const selectedObject = objectDefinitions.find(o => o.api_name === selectedObjectKey) || objectDefinitions[0];
  const fields = fieldDefinitions
    .filter(f => f.object_key === selectedObjectKey)
    .sort((a, b) => a.display_order - b.display_order);

  // Auto-generate api_name from label
  const handleLabelChange = (lbl: string) => {
    setFieldLabel(lbl);
    if (!fieldApiName || fieldApiName === lbl.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, -1)) {
      setFieldApiName(lbl.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));
    }
  };

  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim() || !fieldApiName.trim()) return;

    let parsedChoices: FieldChoice[] | undefined = undefined;
    if (['select', 'radio', 'multiselect'].includes(fieldType)) {
      parsedChoices = rawChoices.split('\n').filter(Boolean).map((line, idx) => {
        const val = line.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        return {
          id: Date.now() + idx,
          value: val,
          label: line.trim(),
          display_order: (idx + 1) * 10,
          is_active: true
        };
      });
    }

    createFieldDefinition({
      object_key: selectedObjectKey,
      label: fieldLabel.trim(),
      api_name: fieldApiName.trim(),
      field_type: fieldType,
      is_required: isRequired,
      help_text: helpText.trim(),
      placeholder: placeholder.trim(),
      display_order: (fields.length + 1) * 10,
      is_active: true,
      is_searchable: true,
      show_in_list: showInList,
      is_sensitive: isSensitive,
      choices: parsedChoices
    });

    setShowAddField(false);
    setFieldLabel('');
    setFieldApiName('');
    setHelpText('');
    setPlaceholder('');
    setIsRequired(false);
    setIsSensitive(false);
  };

  const handleCreateObject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjectName.trim() || !newObjectApiName.trim()) return;

    const created = createObjectDefinition({
      name: newObjectName.trim(),
      api_name: newObjectApiName.trim(),
      description: newObjectDescription.trim(),
      icon: 'fa-cube',
      is_system: false,
      is_active: true
    });

    setSelectedObjectKey(created.api_name);
    setShowAddObject(false);
    setNewObjectName('');
    setNewObjectApiName('');
    setNewObjectDescription('');
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...fields];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    reorderFields(selectedObjectKey, reordered.map(f => f.id));
  };

  // Live Form Preview Submission Validation
  const handlePreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    fields.filter(f => f.is_active).forEach(f => {
      const val = previewFormData[f.api_name];
      if (f.is_required && (val === undefined || val === '' || val === null)) {
        errors[f.api_name] = `${f.label} is required.`;
      }
      if (f.field_type === 'phone' && val) {
        const clean = String(val).replace(/\D/g, '');
        if (clean.length < 10) {
          errors[f.api_name] = "Please enter a valid 10-digit Indian phone number.";
        }
      }
      if (f.field_type === 'email' && val) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          errors[f.api_name] = "Please enter a valid email address.";
        }
      }
    });

    setPreviewErrors(errors);
    if (Object.keys(errors).length === 0) {
      setPreviewSuccess(true);
      setTimeout(() => setPreviewSuccess(false), 3000);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-2" />
        <h3 className="font-bold text-slate-800">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">
          Only Administrators can access the Salesforce-Style Object & Field Studio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 to-indigo-900 p-6 md:p-8 rounded-3xl text-white shadow-xl">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Salesforce-Style Metadata Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Object & Dynamic Field Setup Studio
          </h1>
          <p className="text-xs text-purple-200/80 mt-1 max-w-xl">
            Configure custom fields, picklists, required rules, and data models without code deployments or database migrations.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowAddObject(true)}
            className="px-3.5 py-2 bg-purple-700/80 hover:bg-purple-700 text-white font-bold text-xs rounded-xl border border-purple-400/40 transition flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>New Custom Object</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Sidebar Object List, Right Field Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Objects Selector */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
            Business Entities
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm space-y-1">
            {objectDefinitions.map(obj => {
              const isSelected = obj.api_name === selectedObjectKey;
              const objFields = fieldDefinitions.filter(f => f.object_key === obj.api_name);
              return (
                <button
                  key={obj.id}
                  onClick={() => {
                    setSelectedObjectKey(obj.api_name);
                    setPreviewFormData({});
                    setPreviewErrors({});
                  }}
                  className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group ${
                    isSelected
                      ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-200'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold truncate">{obj.name}</div>
                    <div className={`text-[10px] truncate ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                      {obj.api_name} • {objFields.length} fields
                    </div>
                  </div>
                  {obj.is_system && (
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                      isSelected ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 text-slate-500'
                    }`}>
                      System
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Object Details & Fields Canvas */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black text-slate-900">{selectedObject.name}</h2>
                  <span className="font-mono text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-bold">
                    {selectedObject.api_name}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{selectedObject.description}</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddField(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Field</span>
                </button>
              </div>
            </div>

            {/* Sub-tabs: Fields Table, Live Form Preview, Records */}
            <div className="flex border-b border-slate-100 mt-4">
              <button
                onClick={() => setActiveTab('fields')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
                  activeTab === 'fields'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Configured Fields ({fields.length})
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                  activeTab === 'preview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Form Preview</span>
              </button>
            </div>

            {/* TAB 1: Fields Table */}
            {activeTab === 'fields' && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3 w-12">Order</th>
                      <th className="py-2.5 px-3">Field Label</th>
                      <th className="py-2.5 px-3">API Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Required</th>
                      <th className="py-2.5 px-3">List View</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((f, idx) => (
                      <tr key={f.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-0.5">
                            <button
                              onClick={() => handleMoveField(idx, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveField(idx, 'down')}
                              disabled={idx === fields.length - 1}
                              className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {f.label}
                          {f.is_sensitive && (
                            <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                              Masked
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {f.api_name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {f.field_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {f.is_required ? (
                            <span className="text-rose-600 font-bold text-[11px]">Required</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Optional</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {f.show_in_list ? (
                            <span className="text-emerald-600 font-bold text-[11px]">Visible</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Hidden</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {f.is_active ? (
                            <span className="inline-flex items-center text-emerald-700 font-semibold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-slate-400 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1.5"></span>
                              Deactivated
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => toggleFieldActive(f.id)}
                            className={`text-xs font-semibold px-2 py-0.5 rounded transition ${
                              f.is_active
                                ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {f.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Live Form Preview */}
            {activeTab === 'preview' && (
              <div className="mt-4 p-6 bg-slate-50 rounded-2xl border border-slate-200 max-w-xl mx-auto space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Live Form Simulator: {selectedObject.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Test field validation, dropdown options, and required constraints in real-time.
                  </p>
                </div>

                {previewSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Preview validated successfully! Form submission is valid.</span>
                  </div>
                )}

                <form onSubmit={handlePreviewSubmit} className="space-y-3.5">
                  {fields.filter(f => f.is_active).map(f => (
                    <div key={f.id} className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        {f.label} {f.is_required && <span className="text-rose-500">*</span>}
                      </label>

                      {f.field_type === 'textarea' ? (
                        <textarea
                          rows={2}
                          value={previewFormData[f.api_name] || ''}
                          onChange={(e) => setPreviewFormData({ ...previewFormData, [f.api_name]: e.target.value })}
                          placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                          className="form-textarea text-xs"
                        />
                      ) : f.field_type === 'select' ? (
                        <select
                          value={previewFormData[f.api_name] || ''}
                          onChange={(e) => setPreviewFormData({ ...previewFormData, [f.api_name]: e.target.value })}
                          className="form-select text-xs"
                        >
                          <option value="">-- Choose {f.label} --</option>
                          {f.choices?.map(c => (
                            <option key={c.id} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      ) : f.field_type === 'radio' ? (
                        <div className="space-y-1.5 pt-1">
                          {f.choices?.map(c => (
                            <label key={c.id} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name={f.api_name}
                                value={c.value}
                                checked={previewFormData[f.api_name] === c.value}
                                onChange={(e) => setPreviewFormData({ ...previewFormData, [f.api_name]: e.target.value })}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{c.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : f.field_type === 'boolean' ? (
                        <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(previewFormData[f.api_name])}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, [f.api_name]: e.target.checked })}
                            className="rounded text-indigo-600"
                          />
                          <span>Active / Checked</span>
                        </label>
                      ) : (
                        <input
                          type={f.field_type === 'number' ? 'number' : (f.field_type === 'date' ? 'date' : 'text')}
                          value={previewFormData[f.api_name] || ''}
                          onChange={(e) => setPreviewFormData({ ...previewFormData, [f.api_name]: e.target.value })}
                          placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                          className="form-input text-xs"
                        />
                      )}

                      {f.help_text && (
                        <div className="text-[10px] text-slate-400">{f.help_text}</div>
                      )}

                      {previewErrors[f.api_name] && (
                        <div className="text-[11px] text-rose-600 font-medium">
                          {previewErrors[f.api_name]}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="pt-3">
                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      Test Form Submission Validation
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Field Modal */}
      {showAddField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                Setup Studio
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Add Field to {selectedObject.name}
              </h3>
            </div>

            <form onSubmit={handleCreateField} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Field Label *</label>
                  <input
                    type="text"
                    value={fieldLabel}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="e.g. Alternate Phone, Badge Number"
                    className="form-input text-xs"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">API Key / Name *</label>
                  <input
                    type="text"
                    value={fieldApiName}
                    onChange={(e) => setFieldApiName(e.target.value)}
                    placeholder="e.g. alternate_phone"
                    className="form-input text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Field Type *</label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as DynamicFieldType)}
                    className="form-select text-xs font-medium"
                  >
                    <option value="text">Short Text</option>
                    <option value="textarea">Long Text / Textarea</option>
                    <option value="number">Number</option>
                    <option value="email">Email Address</option>
                    <option value="phone">Phone (Indian 10-Digit Mobile)</option>
                    <option value="date">Date</option>
                    <option value="datetime">Date & Time</option>
                    <option value="boolean">Checkbox / Boolean</option>
                    <option value="select">Picklist / Dropdown</option>
                    <option value="radio">Radio Buttons</option>
                    <option value="multiselect">Multi-Select Picklist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Placeholder Text</label>
                  <input
                    type="text"
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
                    placeholder="Input placeholder guidance"
                    className="form-input text-xs"
                  />
                </div>
              </div>

              {['select', 'radio', 'multiselect'].includes(fieldType) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Option Choices (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={rawChoices}
                    onChange={(e) => setRawChoices(e.target.value)}
                    className="form-textarea text-xs font-mono"
                    placeholder="Choice 1&#10;Choice 2&#10;Choice 3"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Help Text / Tooltip</label>
                <input
                  type="text"
                  value={helpText}
                  onChange={(e) => setHelpText(e.target.value)}
                  placeholder="Shown beneath input to guide operators"
                  className="form-input text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-semibold">Required Field</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInList}
                    onChange={(e) => setShowInList(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-semibold">Show in Table</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSensitive}
                    onChange={(e) => setIsSensitive(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-semibold">Mask for Staff</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddField(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
                >
                  Save & Publish Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Object Modal */}
      {showAddObject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 space-y-4 border border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-lg">Create New Custom Business Object</h3>
            <form onSubmit={handleCreateObject} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Object Name *</label>
                <input
                  type="text"
                  value={newObjectName}
                  onChange={(e) => {
                    setNewObjectName(e.target.value);
                    if (!newObjectApiName) {
                      setNewObjectApiName(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
                    }
                  }}
                  placeholder="e.g. Maintenance Work Order"
                  className="form-input text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">API Key / Identifier *</label>
                <input
                  type="text"
                  value={newObjectApiName}
                  onChange={(e) => setNewObjectApiName(e.target.value)}
                  placeholder="e.g. work_order"
                  className="form-input text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newObjectDescription}
                  onChange={(e) => setNewObjectDescription(e.target.value)}
                  placeholder="Purpose of this object..."
                  className="form-textarea text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddObject(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition"
                >
                  Create Object
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
