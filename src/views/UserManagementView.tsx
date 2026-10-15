import React, { useState } from 'react';
import { 
  Users, Plus, CheckCircle2, XCircle, Shield, 
  Crown, UserCheck, Search, ToggleLeft, ToggleRight, ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

interface UserManagementViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ onNavigate }) => {
  const { 
    currentUser, users, approveUser, rejectUser, 
    toggleUserStatus, updateUserRole, registerUser 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);

  // New user form state
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('POSTMAN');
  const [workLocation, setWorkLocation] = useState('');

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-2" />
        <h3 className="font-bold text-slate-800">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">
          Only Administrators can manage user accounts.
        </p>
      </div>
    );
  }

  const filtered = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingUsers = users.filter(u => u.approval_status === 'PENDING');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;

    registerUser({
      username: username.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      work_location: workLocation.trim()
    });

    setShowAddUser(false);
    setUsername('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
            <Users className="w-4 h-4" />
            <span>Staff Administration</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            User Accounts & Security Roles ({users.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage staff credentials, approve self-registered field collectors, and assign access permissions.
          </p>
        </div>

        <button
          onClick={() => setShowAddUser(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Pending Approvals Section */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
            <Shield className="w-4 h-4 text-amber-600" />
            <span>Pending Self-Registrations Awaiting Approval ({pendingUsers.length})</span>
          </div>

          <div className="space-y-2">
            {pendingUsers.map(u => (
              <div key={u.id} className="p-3 bg-white rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900">{u.first_name} {u.last_name}</span>
                  <span className="text-slate-500 font-mono ml-2">(@{u.username})</span>
                  <div className="text-[11px] text-slate-500">
                    Requested Role: <strong className="text-indigo-600">{u.role}</strong> • Email: {u.email} • Mobile: {u.phone}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => approveUser(u.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => rejectUser(u.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition flex items-center space-x-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search username, staff name, email..."
            className="form-input pl-9 text-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                        {u.first_name ? u.first_name[0] : u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{u.first_name} {u.last_name}</div>
                        <div className="text-[11px] text-slate-400">@{u.username} • {u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-semibold"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGEMENT">Management Staff</option>
                      <option value="POSTMAN">Postman / Collector</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                    {u.phone || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {u.work_location || 'Field Hub'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.approval_status === 'APPROVED' && u.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : (u.approval_status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')
                    }`}>
                      {u.approval_status === 'APPROVED' ? (u.is_active ? 'Active' : 'Deactivated') : u.approval_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.id !== currentUser.id && (
                      <button
                        onClick={() => toggleUserStatus(u.id)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                          u.is_active
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-4 border border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-lg">Add New Staff Account</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. rahulj"
                    className="form-input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@afy.local"
                    className="form-input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Rahul"
                    className="form-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Joshi"
                    className="form-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98200 77889"
                    className="form-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">System Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="form-select text-xs font-bold"
                  >
                    <option value="POSTMAN">Postman / Collector</option>
                    <option value="MANAGEMENT">Management Staff</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Hub / Work Location</label>
                  <input
                    type="text"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    placeholder="e.g. NCR Field Operations, Gurugram"
                    className="form-input text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
