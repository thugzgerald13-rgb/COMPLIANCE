import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Eye, EyeOff, Lock, Mail, User as UserIcon, ArrowRight, X, UserPlus, Check, Trash2 } from 'lucide-react';

interface GoogleAccount {
  name: string;
  email: string;
  avatarBg: string;
}

const SAVED_GOOGLE_ACCOUNTS_KEY = 'bir_google_saved_accounts_v1';

const DEFAULT_GOOGLE_ACCOUNTS: GoogleAccount[] = [
  {
    name: 'Gerald (Developer)',
    email: 'tagz.gerald13@gmail.com',
    avatarBg: 'bg-amber-600',
  },
  {
    name: 'Gerald Admin',
    email: 'thugz.gerald13@gmail.com',
    avatarBg: 'bg-blue-600',
  },
];

export function AuthPage() {
  const { login, register, loginWithGoogle, isSupabaseConnected } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI status states
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Google modal & saved accounts states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string | null>(null);
  const [isAddingNewGoogleAccount, setIsAddingNewGoogleAccount] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);

  useEffect(() => {
    const rawSaved = localStorage.getItem(SAVED_GOOGLE_ACCOUNTS_KEY);
    if (rawSaved) {
      try {
        const parsed = JSON.parse(rawSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGoogleAccounts(parsed);
          return;
        }
      } catch (e) {
        // Fallback
      }
    }
    setGoogleAccounts(DEFAULT_GOOGLE_ACCOUNTS);
  }, []);

  const saveAccountsList = (list: GoogleAccount[]) => {
    setGoogleAccounts(list);
    localStorage.setItem(SAVED_GOOGLE_ACCOUNTS_KEY, JSON.stringify(list));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address (e.g. user@domain.com). BIR TIN is not allowed for sign-in or registration.');
      return;
    }

    if (isRegister && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegister) {
        const res = await register(name, email, password, 'User');
        if (!res.success) {
          setError(res.message || 'Registration failed.');
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.message || 'Login failed.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGoogleAccount = async (accEmail: string, accName?: string) => {
    const finalEmail = accEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finalEmail)) {
      setError('Please enter a valid Google email address. BIR TIN is not allowed.');
      setShowGoogleModal(false);
      return;
    }

    setSelectedAccountEmail(finalEmail);
    const finalName = accName?.trim() || (finalEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    
    // Save to accounts list if not present
    if (!googleAccounts.some(a => a.email.toLowerCase() === finalEmail)) {
      const updated = [
        ...googleAccounts,
        {
          name: finalName,
          email: finalEmail,
          avatarBg: 'bg-indigo-600',
        }
      ];
      saveAccountsList(updated);
    }

    try {
      const res = await loginWithGoogle(finalEmail, finalName);
      if (res && !res.success) {
        setError(res.message || 'Google login failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign in error.');
    } finally {
      setShowGoogleModal(false);
      setSelectedAccountEmail(null);
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) return;
    handleSelectGoogleAccount(customGoogleEmail.trim(), customGoogleName.trim() || undefined);
  };

  const removeSavedGoogleAccount = (emailToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = googleAccounts.filter((a) => a.email.toLowerCase() !== emailToRemove.toLowerCase());
    saveAccountsList(updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center space-x-3 mb-3">
          <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10">
            <FileText className="w-7 h-7 text-blue-400" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">BIZ-COMPLY</span>
        </div>
        <h2 className="text-center text-sm font-medium text-slate-400">
          Monitoring Portal
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800/80 sm:px-8">
          
          {/* Mode Switcher Tabs (Sign In vs Register) */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                !isRegister
                  ? 'bg-slate-700 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                isRegister
                  ? 'bg-slate-700 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Full Name / Contact Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Juan Dela Cruz"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@example.com"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In / Register Button */}
          <button
            type="button"
            onClick={async () => {
              setError(null);
              if (isSupabaseConnected) {
                // Real Supabase OAuth flow -> redirects straight to accounts.google.com
                const res = await loginWithGoogle('');
                if (res && !res.success) {
                  setError(res.message || 'Google OAuth failed.');
                }
              } else {
                // Local dev preview mode: show clean prompt modal
                setCustomGoogleEmail('');
                setCustomGoogleName('');
                setIsAddingNewGoogleAccount(false);
                setShowGoogleModal(true);
              }
            }}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all flex items-center justify-center space-x-3 text-sm disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isRegister ? 'Register with Google' : 'Sign in with Google'}</span>
          </button>
        </div>
      </div>

      {/* Google Account Selector Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Google Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-2">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Choose a Google Account</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">to continue to BIZ-COMPLY Monitoring Portal</p>
            </div>

            {!isAddingNewGoogleAccount ? (
              <>
                <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800 border-t border-b border-slate-100 dark:border-slate-800 py-1 mb-4 max-h-60 overflow-y-auto">
                  {googleAccounts.map((acc) => {
                    const isSigningIn = selectedAccountEmail === acc.email.toLowerCase();
                    return (
                      <div
                        key={acc.email}
                        onClick={() => handleSelectGoogleAccount(acc.email, acc.name)}
                        className={`w-full py-2.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors group cursor-pointer ${
                          selectedAccountEmail !== null ? 'pointer-events-none opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className={`w-9 h-9 ${acc.avatarBg || 'bg-blue-600'} text-white font-semibold rounded-full flex items-center justify-center text-sm flex-shrink-0 shadow-sm`}>
                            {(acc.name || acc.email)[0].toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {acc.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{acc.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                          {isSigningIn ? (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => removeSavedGoogleAccount(acc.email, e)}
                              className="p-1 text-slate-300 dark:text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Remove saved account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingNewGoogleAccount(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Use another Google account</span>
                </button>
              </>
            ) : (
              <form onSubmit={handleCustomGoogleSubmit} className="space-y-3">
                <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-300 mb-2">
                  Enter your Google Account email below to authenticate directly.
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Google Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="e.g. user@gmail.com"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewGoogleAccount(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    Back to Accounts
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors shadow-sm flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Sign In</span>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            <div className="mt-5 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                To continue, Google will share your name and email address with BIZ-COMPLY.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
