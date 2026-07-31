import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Eye, EyeOff, Lock, Mail, User as UserIcon, Briefcase, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export function AuthPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Compliance Officer');
  const [showPassword, setShowPassword] = useState(false);

  // UI status states
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
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

    setTimeout(() => {
      if (isRegister) {
        const res = register(name, email, password, role);
        if (!res.success) {
          setError(res.message || 'Registration failed.');
        }
      } else {
        const res = login(email, password);
        if (!res.success) {
          setError(res.message || 'Login failed.');
        }
      }
      setIsLoading(false);
    }, 400);
  };

  const fillQuickDemo = (demoEmail: string, demoPass: string) => {
    setIsRegister(false);
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
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
          <span className="text-2xl font-bold tracking-tight text-white">BIR Compliance</span>
        </div>
        <h2 className="text-center text-sm font-medium text-slate-400">
          Tax Compliance & Monitoring Portal
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800/80 sm:px-8">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                !isRegister
                  ? 'bg-blue-600 text-white shadow-md'
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
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                isRegister
                  ? 'bg-blue-600 text-white shadow-md'
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
                  Full Name
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Role / Position
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                  </div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full pl-9 pr-8 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="Compliance Officer">Compliance Officer</option>
                    <option value="Tax Consultant">Tax Consultant</option>
                    <option value="Admin">Admin</option>
                    <option value="Accountant">Accountant</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50 cursor-pointer"
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

          {/* Quick Demo Access */}
          {!isRegister && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <p className="text-xs font-medium text-slate-400 mb-2.5 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Quick Demo Credentials</span>
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fillQuickDemo('juan@example.com', 'password123')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 text-xs text-slate-300 flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div>
                    <span className="font-semibold text-slate-200">Juan Dela Cruz</span>
                    <span className="text-slate-400 ml-1">(Admin)</span>
                    <div className="text-[10px] text-slate-500">juan@example.com</div>
                  </div>
                  <span className="text-[10px] text-blue-400 group-hover:underline">Use Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('maria@example.com', 'password123')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 text-xs text-slate-300 flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div>
                    <span className="font-semibold text-slate-200">Maria Santos</span>
                    <span className="text-slate-400 ml-1">(Officer)</span>
                    <div className="text-[10px] text-slate-500">maria@example.com</div>
                  </div>
                  <span className="text-[10px] text-blue-400 group-hover:underline">Use Demo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
