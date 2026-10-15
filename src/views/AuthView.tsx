import React, { useState } from 'react';
import { 
  Camera, Lock, User as UserIcon, Mail, Phone, ShieldCheck, 
  Building2, AlertCircle, CheckCircle2, ArrowRight, Sparkles, X,
  BadgeCheck, UserCheck, Shield, Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { auth, googleProvider, signInWithPopup, createUserWithEmailAndPassword } from '../lib/firebase';

interface AuthViewProps {
  onSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const { login, loginWithGoogle, registerUser, users, setCurrentUser } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state - starts empty with no hardcoded prefilled credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register form state - starts empty
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('POSTMAN');
  const [regEmpId, setRegEmpId] = useState('');
  const [regMsg, setRegMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Google Authentication State
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleModalMode, setGoogleModalMode] = useState<'signin' | 'signup'>('signin');
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');
  const [googleRoleSelect, setGoogleRoleSelect] = useState<UserRole>('POSTMAN');
  const [googlePhoneInput, setGooglePhoneInput] = useState('');
  const [googleEmpIdInput, setGoogleEmpIdInput] = useState('');
  const [googleModalError, setGoogleModalError] = useState('');

  const openGoogleModal = (modalMode: 'signin' | 'signup') => {
    setGoogleModalMode(modalMode);
    setGoogleModalError('');
    setGoogleEmailInput('');
    setGoogleNameInput('');
    setGoogleRoleSelect('POSTMAN');
    setGooglePhoneInput('');
    setGoogleEmpIdInput('');
    setIsGoogleModalOpen(true);
  };

  const handleRealGoogleAuth = async (targetMode: 'signin' | 'signup') => {
    setIsGoogleLoading(true);
    setLoginError('');
    setRegMsg(null);
    setGoogleModalError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const email = (fbUser.email || '').trim().toLowerCase();
      const displayName = fbUser.displayName || '';
      const photoURL = fbUser.photoURL || undefined;

      if (!email) {
        throw new Error("No email returned from Google identity provider.");
      }

      if (targetMode === 'signin') {
        const res = loginWithGoogle(email);
        if (res.success && res.user) {
          onSuccess();
        } else if (res.pending_approval) {
          setLoginError(res.error || "Your account has been registered with Google, but is pending Administrator approval. Please wait for an Admin to activate your access.");
        } else {
          // New Google user trying to sign in - prompt to complete staff profile for admin approval
          setGoogleModalMode('signup');
          setGoogleEmailInput(email);
          setGoogleNameInput(displayName);
          setGoogleRoleSelect('POSTMAN');
          setIsGoogleModalOpen(true);
        }
      } else {
        // Sign up with Google: open registration modal with verified email & name
        setGoogleModalMode('signup');
        setGoogleEmailInput(email);
        setGoogleNameInput(displayName);
        setGoogleRoleSelect('POSTMAN');
        setIsGoogleModalOpen(true);
      }
    } catch (err: any) {
      console.warn("Firebase Google popup note:", err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return; // User intentionally closed popup
      }
      if (err.code === 'auth/unauthorized-domain') {
        const domainNotice = `Firebase Notice: Domain (${window.location.hostname}) must be added in Firebase Console > Authentication > Settings > Authorized Domains.`;
        if (targetMode === 'signin') {
          setLoginError(domainNotice);
        } else {
          setRegMsg({ type: 'error', text: domainNotice });
        }
        openGoogleModal(targetMode);
      } else {
        const errorMsg = err.message || 'Google Authentication failed. Please try again or use standard password login.';
        if (targetMode === 'signin') {
          setLoginError(errorMsg);
        } else {
          setRegMsg({ type: 'error', text: errorMsg });
        }
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleExecuteGoogleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleModalError('');

    const email = googleEmailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setGoogleModalError('Please enter a valid Google email address.');
      return;
    }

    if (googleModalMode === 'signup' && !googleNameInput.trim()) {
      setGoogleModalError('Please enter your full name for registration.');
      return;
    }

    const res = loginWithGoogle({
      email,
      name: googleNameInput.trim() || undefined,
      requestedRole: googleRoleSelect,
      phone: googlePhoneInput.trim() || undefined,
      employeeId: googleEmpIdInput.trim() || undefined
    });

    if (res.success) {
      setIsGoogleModalOpen(false);
      if (res.pending_approval) {
        setRegMsg({
          type: 'success',
          text: res.message || "Registration submitted! Your account is pending Administrator review. You will be able to log in once an Admin approves your access."
        });
        setMode('register');
      } else {
        onSuccess();
      }
    } else {
      setGoogleModalError(res.error || 'Google authentication failed.');
    }
  };

  const handleQuickSelectGoogleUser = (email: string) => {
    const res = loginWithGoogle(email);
    if (res.success && res.user) {
      setIsGoogleModalOpen(false);
      onSuccess();
    } else {
      setGoogleModalError(res.error || 'Google authentication failed or account is pending approval.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim()) {
      setLoginError('Please enter your username or email address.');
      return;
    }
    const res = login(username.trim(), password);
    if (res.success) {
      onSuccess();
    } else {
      setLoginError(res.error || 'Invalid credentials or user pending approval.');
    }
  };

  const handleAutofillDemo = (uname: string, pwd: string = 'admin123') => {
    setUsername(uname);
    setPassword(pwd);
    setLoginError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegMsg(null);
    if (!regUsername.trim() || !regEmail.trim()) {
      setRegMsg({ type: 'error', text: 'Username and Email are required.' });
      return;
    }

    // Register user in Firebase Auth so they appear in Firebase Console
    if (regPassword.length >= 6) {
      try {
        await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      } catch (fbErr: any) {
        console.log("Firebase Auth notice:", fbErr.code || fbErr.message);
      }
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
        text: res.message || `Account "${regUsername}" registered successfully! It is currently pending Administrator review and approval.`
      });
      // Clear registration form
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
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 relative">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-800 p-8 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center mx-auto mb-3 border border-white/20">
            <Camera className="w-8 h-8 text-indigo-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">AFY CamGuard</h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-xs mx-auto">
            Any Thing For You — Camera & Device Custody Management
          </p>

          <div className="flex bg-white/10 backdrop-blur-md rounded-xl p-1 mt-6 border border-white/20">
            <button
              onClick={() => { setMode('login'); setLoginError(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-white hover:text-indigo-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setRegMsg(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
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

              {/* Clean Google Sign-In Button */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() => handleRealGoogleAuth('signin')}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center space-x-2.5 cursor-pointer"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 absolute">or sign in with password</span>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username or Email
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin or your username"
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
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Authenticate</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Optional Demo Helpers for Testing Team */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Testing Quick Fill
                    </span>
                    <span className="text-[10px] text-indigo-500">Click to fill</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAutofillDemo('admin')}
                      className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-center transition cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-slate-800">Admin</div>
                      <div className="text-[9px] text-slate-400">admin / admin123</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutofillDemo('manager')}
                      className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-center transition cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-slate-800">Manager</div>
                      <div className="text-[9px] text-slate-400">manager / admin123</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutofillDemo('collector1')}
                      className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-center transition cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-slate-800">Postman</div>
                      <div className="text-[9px] text-slate-400">collector1 / admin123</div>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
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

              {/* Google Sign-Up for Registration */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() => handleRealGoogleAuth('signup')}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center space-x-2.5 cursor-pointer"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Connecting to Google...' : 'Sign up with Google'}</span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 absolute">or register with details</span>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={regFirstName}
                      onChange={(e) => setRegFirstName(e.target.value)}
                      placeholder="e.g. Rahul"
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
                      placeholder="e.g. Sharma"
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
                    placeholder="Choose a username"
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
                    placeholder="your.email@company.com"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Requested Role</label>
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
                      placeholder="e.g. EMP-101"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer"
                >
                  Submit Registration
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Google Authentication & Account Selector Modal */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {googleModalMode === 'signin' ? 'Sign in with Google' : 'Register with Google'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    AFY Single Sign-On Authentication
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {googleModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{googleModalError}</span>
                </div>
              )}

              {/* In Sign In mode: Show existing user accounts for instant 1-click select */}
              {googleModalMode === 'signin' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Select an Account
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {users.slice(0, 5).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickSelectGoogleUser(u.email)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 flex items-center justify-between text-left transition group cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {u.first_name ? u.first_name[0] : u.username[0].toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate">
                              {u.first_name} {u.last_name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{u.email}</div>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="relative flex items-center justify-center my-3">
                    <div className="border-t border-slate-200 w-full"></div>
                    <span className="bg-white px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 absolute">or enter Google email</span>
                  </div>
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={handleExecuteGoogleAuth} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Google Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={googleEmailInput}
                      onChange={(e) => setGoogleEmailInput(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {googleModalMode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={googleNameInput}
                        onChange={(e) => setGoogleNameInput(e.target.value)}
                        placeholder="e.g. Alex Johnson"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Requested Role</label>
                        <select
                          value={googleRoleSelect}
                          onChange={(e) => setGoogleRoleSelect(e.target.value as UserRole)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="POSTMAN">Field Collector</option>
                          <option value="MANAGEMENT">Supervisor / Manager</option>
                          <option value="ADMIN">System Administrator</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Employee ID (Optional)</label>
                        <input
                          type="text"
                          value={googleEmpIdInput}
                          onChange={(e) => setGoogleEmpIdInput(e.target.value)}
                          placeholder="EMP-..."
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsGoogleModalOpen(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
                  >
                    {googleModalMode === 'signin' ? 'Authenticate' : 'Complete Sign Up'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
