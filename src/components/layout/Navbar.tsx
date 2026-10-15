import React, { useState } from 'react';
import { 
  Camera, Box, Warehouse, QrCode, Sparkles, ChevronDown, 
  UserCheck, ArrowRightLeft, RotateCcw, ClipboardCheck, 
  AlertTriangle, Building2, Contact2, Briefcase, ListTodo, 
  BarChart3, Users, ShieldAlert, Shield, Crown, User as UserIcon, 
  LogOut, RefreshCw, KeyRound, Boxes, MapPin, FolderKanban, Bell
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onOpenScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenScanner }) => {
  const { currentUser, users, setCurrentUser, logout, resetToSeedData, unreadNotificationCount } = useApp();
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const pendingApprovalsCount = users.filter(u => u.approval_status === 'PENDING').length;

  const handleRoleSwitch = (username: string) => {
    const target = users.find(u => u.username === username);
    if (target) {
      setCurrentUser(target);
      setUserMenuOpen(false);
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Brand Logo & Main Nav */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center space-x-2.5 focus:outline-none text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-slate-900 block leading-tight">AFY</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 block">(Any Thing For You) Inventory</span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            {currentUser && (
              <div className="hidden lg:flex items-center space-x-1 ml-6">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    currentView === 'dashboard'
                      ? 'text-indigo-600 bg-indigo-50/70 font-bold'
                      : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-50'
                  }`}
                >
                  <Box className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => onNavigate('my_inventory')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    currentView === 'my_inventory'
                      ? 'text-indigo-600 bg-indigo-50/70 font-bold'
                      : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-50'
                  }`}
                >
                  <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Inventory</span>
                </button>

                {(currentUser.role === 'ADMIN' || currentUser.role === 'MANAGEMENT') && (
                  <button
                    onClick={() => onNavigate('master_inventory')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                      currentView === 'master_inventory'
                        ? 'text-indigo-700 bg-indigo-50 border border-indigo-100 font-bold'
                        : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-50'
                    }`}
                  >
                    <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Master Inventory</span>
                  </button>
                )}

                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={() => onNavigate('studio')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                      currentView === 'studio'
                        ? 'text-purple-700 bg-purple-100 border border-purple-200'
                        : 'text-purple-700 bg-purple-50/80 border border-purple-200/70 hover:bg-purple-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Setup Studio</span>
                  </button>
                )}

                <button
                  onClick={onOpenScanner}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition flex items-center space-x-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-slate-400" />
                  <span>Scan QR</span>
                </button>

                {/* Operations Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setOperationsOpen(!operationsOpen); setDirectoryOpen(false); }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition flex items-center space-x-1"
                  >
                    <span>Operations</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {operationsOpen && (
                    <div 
                      className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in"
                      onMouseLeave={() => setOperationsOpen(false)}
                    >
                      <button
                        onClick={() => { onNavigate('intake'); setOperationsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <Warehouse className="w-4 h-4 text-slate-400" />
                        <span>Collect from Client</span>
                      </button>
                      <button
                        onClick={() => { onNavigate('assign_worker'); setOperationsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <UserCheck className="w-4 h-4 text-slate-400" />
                        <span>Assign to Worker</span>
                      </button>

                      {(currentUser.role === 'ADMIN' || currentUser.role === 'MANAGEMENT') && (
                        <button
                          onClick={() => { onNavigate('mass_assignment'); setOperationsOpen(false); }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 flex items-center space-x-2"
                        >
                          <Boxes className="w-4 h-4 text-indigo-600" />
                          <span>Mass Camera Assignment</span>
                        </button>
                      )}

                      <button
                        onClick={() => { onNavigate('transfers'); setOperationsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                        <span>Peer Transfers</span>
                      </button>

                      <button
                        onClick={() => { onNavigate('return_process'); setOperationsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <RotateCcw className="w-4 h-4 text-slate-400" />
                        <span>Process Worker Return</span>
                      </button>

                      <button
                        onClick={() => { onNavigate('inspection_queue'); setOperationsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <ClipboardCheck className="w-4 h-4 text-slate-400" />
                        <span>Inspection Queue</span>
                      </button>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={() => { onNavigate('incidents'); setOperationsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span>Incidents & Damages</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Directory Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setDirectoryOpen(!directoryOpen); setOperationsOpen(false); }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition flex items-center space-x-1"
                  >
                    <span>Directory</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {directoryOpen && (
                    <div 
                      className="absolute left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in"
                      onMouseLeave={() => setDirectoryOpen(false)}
                    >
                      <button
                        onClick={() => { onNavigate('projects'); setDirectoryOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <FolderKanban className="w-4 h-4 text-indigo-500" />
                        <span>Projects Directory</span>
                      </button>
                      <button
                        onClick={() => { onNavigate('clients'); setDirectoryOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>Clients & POCs</span>
                      </button>
                      <button
                        onClick={() => { onNavigate('workers'); setDirectoryOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <Contact2 className="w-4 h-4 text-slate-400" />
                        <span>Workers & Staffing</span>
                      </button>
                      <button
                        onClick={() => { onNavigate('employers'); setDirectoryOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span>Employer Companies</span>
                      </button>
                      <button
                        onClick={() => { onNavigate('tasks'); setDirectoryOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <ListTodo className="w-4 h-4 text-slate-400" />
                        <span>Tasks Management</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onNavigate('reports')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    currentView === 'reports'
                      ? 'text-indigo-600 bg-indigo-50/70 font-bold'
                      : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-50'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reports</span>
                </button>
              </div>
            )}
          </div>

          {/* User Profile, Role Badge, Quick Switcher */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <>
                {/* Role Pill */}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : currentUser.role === 'MANAGEMENT'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {currentUser.role === 'ADMIN' && <Crown className="w-3 h-3 mr-1 text-purple-600" />}
                  {currentUser.role === 'MANAGEMENT' && <Shield className="w-3 h-3 mr-1 text-blue-600" />}
                  {currentUser.role === 'POSTMAN' && <UserIcon className="w-3 h-3 mr-1 text-emerald-600" />}
                  {currentUser.role === 'ADMIN' ? 'Admin' : currentUser.role === 'MANAGEMENT' ? 'Management' : 'Field Collector'}
                </span>

                {/* Chatter & Notification Bell */}
                <button
                  onClick={() => onNavigate('notifications')}
                  className={`relative p-2 rounded-xl transition cursor-pointer ${
                    currentView === 'notifications'
                      ? 'bg-indigo-100 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
                  }`}
                  title="Communications, Chatter & Task Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  )}
                </button>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      {currentUser.first_name ? currentUser.first_name[0] : currentUser.username[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-slate-700 hidden sm:inline">
                      {currentUser.first_name} {currentUser.last_name}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {userMenuOpen && (
                    <div 
                      className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50 animate-fade-in"
                      onMouseLeave={() => setUserMenuOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.first_name} {currentUser.last_name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                        <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">{currentUser.work_location || 'Field Staff'}</p>
                      </div>

                      {/* Instant Role Switcher for Testing */}
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Quick Switch Demo Role</span>
                          <span className="text-[9px] text-indigo-600">Click to switch</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          <button
                            onClick={() => handleRoleSwitch('admin')}
                            className={`p-1 text-left rounded font-medium ${currentUser.username === 'admin' ? 'bg-purple-100 text-purple-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                          >
                            👑 Admin
                          </button>
                          <button
                            onClick={() => handleRoleSwitch('manager')}
                            className={`p-1 text-left rounded font-medium ${currentUser.username === 'manager' ? 'bg-blue-100 text-blue-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                          >
                            🛡️ Manager
                          </button>
                          <button
                            onClick={() => handleRoleSwitch('collector1')}
                            className={`p-1 text-left rounded font-medium ${currentUser.username === 'collector1' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                          >
                            📦 Collector 1
                          </button>
                          <button
                            onClick={() => handleRoleSwitch('collector2')}
                            className={`p-1 text-left rounded font-medium ${currentUser.username === 'collector2' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
                          >
                            📦 Collector 2
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => { onNavigate('profile'); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                      >
                        <UserIcon className="w-4 h-4 text-indigo-500" />
                        <span>My Profile & GPS Location</span>
                      </button>

                      <button
                        onClick={() => { onNavigate('notifications'); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Bell className="w-4 h-4 text-indigo-500" />
                          <span>Notifications & Chatter</span>
                        </div>
                        {unreadNotificationCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                            {unreadNotificationCount}
                          </span>
                        )}
                      </button>

                      {currentUser.role === 'ADMIN' && (
                        <>
                          <div className="border-t border-slate-100 my-1"></div>
                          <button
                            onClick={() => { onNavigate('studio'); setUserMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-xs text-purple-700 font-bold hover:bg-purple-50 flex items-center space-x-2"
                          >
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span>Object & Field Studio</span>
                          </button>

                          <button
                            onClick={() => { onNavigate('users'); setUserMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span>User Management</span>
                            </div>
                            {pendingApprovalsCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                                {pendingApprovalsCount}
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => { onNavigate('audit_logs'); setUserMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                          >
                            <ShieldAlert className="w-4 h-4 text-slate-400" />
                            <span>System Audit Logs</span>
                          </button>
                        </>
                      )}

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={() => {
                          if (confirm("Reset demo database back to clean baseline state?")) {
                            resetToSeedData();
                            setUserMenuOpen(false);
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4 text-rose-500" />
                        <span>Purge / Reset Demo Data</span>
                      </button>

                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); onNavigate('login'); }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4 text-slate-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-3.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  Log In
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
