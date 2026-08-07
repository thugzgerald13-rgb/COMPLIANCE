import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Crown, 
  Layers, 
  Globe, 
  Lock, 
  CheckCircle2, 
  X, 
  Plus, 
  RefreshCw, 
  Rocket, 
  Zap, 
  Bot, 
  Cpu, 
  Eye, 
  Sliders,
  Check,
  AlertCircle,
  User,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFeatureRelease, FeatureUpdate } from '../context/FeatureReleaseContext';

interface AdminFeatureReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminFeatureReleaseModal({ isOpen, onClose }: AdminFeatureReleaseModalProps) {
  const { user, isSuperAdmin, workspaceMode, setWorkspaceMode } = useAuth();
  const { 
    featureUpdates, 
    toggleFeatureStage, 
    releaseAllToUsers, 
    resetToDefaults, 
    addFeatureUpdate 
  } = useFeatureRelease();

  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureKey, setNewFeatureKey] = useState('');
  const [newFeatureDesc, setNewFeatureDesc] = useState('');
  const [newFeatureCategory, setNewFeatureCategory] = useState<'AI & Automation' | 'BIR Compliance' | 'Audit & Multi-Branch' | 'Notifications'>('AI & Automation');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  if (!isOpen || !isSuperAdmin) return null;

  const categories = ['All', 'AI & Automation', 'BIR Compliance', 'Audit & Multi-Branch', 'Notifications'];

  const filteredUpdates = filterCategory === 'All' 
    ? featureUpdates 
    : featureUpdates.filter(f => f.category === filterCategory);

  const superAdminOnlyCount = featureUpdates.filter(f => f.stage === 'superadmin_only').length;
  const releasedAllCount = featureUpdates.filter(f => f.stage === 'released_all').length;

  const handleToggle = (id: string, name: string, currentStage: string) => {
    toggleFeatureStage(id);
    const newStageText = currentStage === 'superadmin_only' ? 'Released to All Users' : 'Restricted to Super Admin Early Access';
    setSuccessBanner(`Updated "${name}" -> ${newStageText}`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleReleaseAll = () => {
    releaseAllToUsers();
    setSuccessBanner('All feature updates are now officially released to ALL general users!');
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleAddFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureName.trim() || !newFeatureDesc.trim()) return;

    const generatedKey = newFeatureKey.trim() 
      ? newFeatureKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : newFeatureName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    addFeatureUpdate({
      codeKey: generatedKey,
      name: newFeatureName.trim(),
      description: newFeatureDesc.trim(),
      category: newFeatureCategory,
      stage: 'superadmin_only', // Default to super admin early access first!
      version: 'v2.6.0-beta',
      releaseDate: new Date().toISOString().split('T')[0],
      createdBy: user?.name || 'Super Admin'
    });

    setNewFeatureName('');
    setNewFeatureKey('');
    setNewFeatureDesc('');
    setShowAddForm(false);
    setSuccessBanner(`Added "${newFeatureName.trim()}" in Super Admin Early Access mode!`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] font-sans">
        
        {/* Header Section */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/80 border-b border-slate-800 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] flex items-center space-x-1 shadow-xs">
                <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-950" />
                <span>Super Admin Release Control Center</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
                Full Unrestricted Access Enabled
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Web App Early Access & Feature Updates Engine</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              As <strong>Super Admin</strong>, every web app update is available to you <strong>first</strong> for live testing and validation before releasing to general users.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer shrink-0 ml-4 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-6 py-2.5 text-xs text-emerald-300 font-bold flex items-center space-x-2 animate-in slide-in-from-top duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Top Summary & Action Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">Super Admin Testing</span>
                <span className="text-xl font-black text-white">{superAdminOnlyCount} Update(s)</span>
                <span className="text-[10px] text-slate-400 block">Exclusive Early Access</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">Released to All Users</span>
                <span className="text-xl font-black text-white">{releasedAllCount} Update(s)</span>
                <span className="text-[10px] text-slate-400 block">Live Public Access</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col justify-between space-y-2">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Admin Release Actions</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleReleaseAll}
                  className="flex-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1 shadow-xs"
                  title="Promote all current early access updates to general users"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Release All to Users</span>
                </button>
                <button
                  onClick={resetToDefaults}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Reset feature updates to default baseline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Super Admin Workspace Mode Switcher Control */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800 via-slate-850 to-indigo-950/60 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                {workspaceMode === 'single' ? <User className="w-5 h-5 text-emerald-400" /> : <Users className="w-5 h-5 text-blue-400" />}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>Super Admin Workspace Operating Mode</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-200 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">Instant Toggle</span>
                </h4>
                <p className="text-xs text-slate-200 mt-0.5">
                  Current Active Workspace Mode: <strong className={workspaceMode === 'single' ? 'text-emerald-400' : 'text-blue-400'}>
                    {workspaceMode === 'single' ? 'Solo Taxpayer / Single-User Mode' : 'Multi-User Practice / Client Management Mode'}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => {
                  setWorkspaceMode('single');
                  setSuccessBanner('Switched Workspace Operating Mode to Single-User Solo Mode');
                  setTimeout(() => setSuccessBanner(null), 3000);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 border ${
                  workspaceMode === 'single'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Single-User</span>
              </button>

              <button
                onClick={() => {
                  setWorkspaceMode('multi');
                  setSuccessBanner('Switched Workspace Operating Mode to Multi-User Practice Mode');
                  setTimeout(() => setSuccessBanner(null), 3000);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 border ${
                  workspaceMode === 'multi'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Multi-User</span>
              </button>
            </div>
          </div>

          {/* Filter Bar & Add New Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterCategory === cat
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Cancel Form' : 'Register New Update Preview'}</span>
            </button>
          </div>

          {/* Add New Feature Form */}
          {showAddForm && (
            <form onSubmit={handleAddFeature} className="p-4 bg-slate-800/90 border border-indigo-500/40 rounded-xl space-y-3 animate-in fade-in duration-150">
              <h4 className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Register Web App Update Preview (Super Admin Early Access)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Update Name</label>
                  <input
                    type="text"
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    placeholder="e.g. BIR Form 2551Q Quarterly Percentage Tax Assistant"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Category</label>
                  <select
                    value={newFeatureCategory}
                    onChange={(e: any) => setNewFeatureCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="AI & Automation">AI & Automation</option>
                    <option value="BIR Compliance">BIR Compliance</option>
                    <option value="Audit & Multi-Branch">Audit & Multi-Branch</option>
                    <option value="Notifications">Notifications</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Description & Scope</label>
                <textarea
                  value={newFeatureDesc}
                  onChange={(e) => setNewFeatureDesc(e.target.value)}
                  placeholder="Describe what this update introduces..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 h-16"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer shadow-md"
                >
                  Save to Super Admin Preview
                </button>
              </div>
            </form>
          )}

          {/* Feature Updates List Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
              <span>Web App Feature Updates ({filteredUpdates.length})</span>
              <span className="text-[11px] text-amber-400">⚡ Super Admin Has Unrestricted Access to ALL</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredUpdates.map((item) => {
                const isSuperAdminOnly = item.stage === 'superadmin_only';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSuperAdminOnly
                        ? 'bg-slate-800/90 border-amber-500/40 shadow-lg shadow-amber-950/20'
                        : 'bg-slate-800/50 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Left Details */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                            <span>{item.name}</span>
                          </h3>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                            {item.version}
                          </span>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                            {item.category}
                          </span>

                          {/* Release Stage Pill */}
                          {isSuperAdminOnly ? (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1 shadow-xs">
                              <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>Super Admin Early Access</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                              <Globe className="w-3 h-3 text-emerald-400" />
                              <span>Released to All Users</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="text-[11px] text-slate-400 flex items-center space-x-3 pt-0.5">
                          <span>Key: <code className="text-amber-300/90 font-mono text-[10px]">{item.codeKey}</code></span>
                          <span>•</span>
                          <span>Registered: {item.releaseDate}</span>
                        </div>
                      </div>

                      {/* Right Stage Toggle Controls */}
                      <div className="flex sm:flex-col items-center justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-700/80 pt-3 sm:pt-0 sm:pl-4 shrink-0 gap-2">
                        <div className="text-right sm:text-center text-[10px] font-mono text-slate-400">
                          Status Stage
                        </div>

                        <button
                          onClick={() => handleToggle(item.id, item.name, item.stage)}
                          className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-md ${
                            isSuperAdminOnly
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isSuperAdminOnly ? (
                            <>
                              <Rocket className="w-3.5 h-3.5" />
                              <span>Release to All Users</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Restrict to Admin Only</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Super Admin Privileges Overview */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
            <h4 className="font-extrabold text-amber-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Super Admin Master Privileges Summary</span>
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Immediate access to all new feature updates before public deployment.</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Bypass workspace lock-in & toggle Single/Multi mode anytime.</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Full access to AI Compliance Assistant, eFPS API, and Multi-Branch tools.</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>1-click feature promotion to push early access updates to all client users.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Logged in as <strong>{user?.name}</strong> ({user?.email}) • <strong>Super Admin</strong>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Portal
          </button>
        </div>

      </div>
    </div>
  );
}
