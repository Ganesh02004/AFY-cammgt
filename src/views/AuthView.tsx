import React, { useState } from 'react';
import { 
  Camera, Lock, User as UserIcon, Mail, Phone, ShieldCheck, 
  Building2, AlertCircle, CheckCircle2, ArrowRight, Sparkles 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

interface AuthViewProps {
  onSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const { login, loginWithGoogle, registerUser, users, setCurrentUser } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('POSTMAN');
  const [regEmpId, setRegEmpId] = useState('');
  const [regMsg, setRegMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleGoogleAuth = () => {
    setLoginError('');
    const res = loginWithGoogle();
    if (res.success) {
      onSuccess();
    } else {
      setLoginError(res.error || 'Google authentication failed.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const res = login(username, password);
    if (res.success) {
      onSuccess();
    } else {
      setLoginError(res.error || 'Invalid credentials or user not approved.');
    }
  };

  const handleQuickLogin = (uname: string) => {
    const found = users.find(u => u.username === uname);
    if (found) {
      setCurrentUser(found);
      onSuccess();
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegMsg(null);
    if (!regUsername || !regEmail) {
      setRegMsg({ type: 'error', text: 'Username and Email are required.' });
      return;
    }

    const res = registerUser({
      username: regUsername.trim(),
      email: regEmail.trim(),
      first_name: regFirstName.trim(),
      last_name: regLastName.trim(),
      phone: regPhone.trim(),
      role: regRole,
      employee_id: regEmpId.trim() || undefined
    });

    if (res.success) {
      setRegMsg({
        type: 'success',
        text: 'Account created! Since non-admin accounts require admin approval, an administrator will verify your access.'
      });
      // Reset registration form
      setRegUsername('');
      setRegPassword('');
      setRegFirstName('');
      setRegLastName('');
      setRegEmail('');
      setRegPhone('');
      setRegEmpId('');
    } else {
      setRegMsg({ type: 'error', text: res.error || 'Registration failed.' });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4 sm:px-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-800 p-8 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center mx-auto mb-3 border border-white/20">
            <Camera className="w-8 h-8 text-indigo-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">AFY CamGuard</h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-xs mx-auto">
            Any Thing For You — Device Custody & Fleet Tracking
          </p>

          <div className="flex bg-white/10 backdrop-blur-md rounded-xl p-1 mt-6 border border-white/20">
            <button
              onClick={() => { setMode('login'); setLoginError(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-white hover:text-indigo-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setRegMsg(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-white hover:text-indigo-200'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {mode === 'login' ? (
            <div className="space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Google One-Click Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center space-x-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google (ganeshpurma5@gmail.com)</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 absolute">or sign in with password</span>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or collector1"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-md shadow-indigo-100 flex items-center justify-center space-x-2"
              >
                <span>Authenticate</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Demo Account Quick Switcher */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                  Or Quick Switch Demo Roles
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-xl text-center transition group"
                  >
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">Admin</div>
                    <div className="text-[10px] text-slate-500">Superuser</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('manager1')}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-xl text-center transition group"
                  >
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">Manager</div>
                    <div className="text-[10px] text-slate-500">Operations</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('collector1')}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-xl text-center transition group"
                  >
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">Postman</div>
                    <div className="text-[10px] text-slate-500">Field Staff</div>
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              {regMsg && (
                <div
                  className={`p-3 rounded-xl flex items-start space-x-2 text-xs ${
                    regMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {regMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{regMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="janedoe"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Role</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="POSTMAN">Postman / Field Collector</option>
                    <option value="MANAGEMENT">Management / Supervisor</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={regEmpId}
                    onChange={(e) => setRegEmpId(e.target.value)}
                    placeholder="EMP-902"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Phone</label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+1 555 0192"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-100"
              >
                Submit Registration
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
