import React, { useState, useMemo } from 'react';
import { Briefcase, Building2, ShieldCheck, User, ArrowRight, ArrowLeft, Check, Sparkles, FileText, Phone, MapPin, Hash, Layers, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CompanyInfo } from '../types';
import { formatTIN } from '../utils';
import { birRDOList } from '../rdoData';

export function AccountOnboardingModal() {
  const { user, updateUserAccountInfo, logout } = useAuth();

  // Step state: 'selection' or 'company_info'
  const [step, setStep] = useState<'selection' | 'company_info'>(
    user?.accountType ? 'company_info' : 'selection'
  );
  
  // Selected option: 'accountant' | 'business_owner'
  const [selectedType, setSelectedType] = useState<'accountant' | 'business_owner' | null>(
    user?.accountType || null
  );

  // Form states
  const [companyName, setCompanyName] = useState(user?.companyInfo?.companyName || user?.name || '');
  const [tin, setTin] = useState(formatTIN(user?.companyInfo?.tin || user?.tin || ''));
  const [rdo, setRdo] = useState(user?.companyInfo?.rdo || '043');
  const [isCustomRdo, setIsCustomRdo] = useState(false);
  const [industry, setIndustry] = useState(user?.companyInfo?.industry || 'Retail & Professional Services');
  const [address, setAddress] = useState(user?.companyInfo?.address || '');
  const [phone, setPhone] = useState(user?.companyInfo?.phone || '');
  const [clientDashboardMode, setClientDashboardMode] = useState<'shared_accountant' | 'business_owner'>(
    user?.clientDashboardMode || 'shared_accountant'
  );

  const [formError, setFormError] = useState<string | null>(null);

  const groupedRDOs = useMemo<Record<string, typeof birRDOList>>(() => {
    const groups: Record<string, typeof birRDOList> = {};
    birRDOList.forEach(r => {
      const reg = r.region || 'Other District Offices';
      if (!groups[reg]) groups[reg] = [];
      groups[reg].push(r);
    });
    return groups;
  }, []);

  const handleSelectOption = (type: 'accountant' | 'business_owner') => {
    setSelectedType(type);
    setFormError(null);
    if (!companyName && user?.name) {
      setCompanyName(user.name);
    }
    setStep('company_info');
  };

  const handleSubmitCompanyInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setFormError('Please enter your Company or Practice Name.');
      return;
    }
    if (!tin.trim()) {
      setFormError('Please enter your Tax Identification Number (TIN).');
      return;
    }

    if (!selectedType) return;

    const companyInfoObj: CompanyInfo = {
      companyName: companyName.trim(),
      tin: tin.trim(),
      rdo: rdo.trim(),
      industry: selectedType === 'business_owner' ? industry.trim() : undefined,
      address: address.trim(),
      phone: phone.trim(),
    };

    updateUserAccountInfo(
      selectedType, 
      companyInfoObj, 
      selectedType === 'business_owner' ? clientDashboardMode : 'shared_accountant'
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-sans overflow-y-auto">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full bg-slate-900 text-slate-100 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Top bar with Logout / Cancel */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-300">BIZ-COMPLY Account Onboarding</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-1 hover:text-red-400 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out ({user?.email})</span>
          </button>
        </div>

        {/* STEP 1: ACCOUNT TYPE SELECTION OPTIONS */}
        {step === 'selection' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-bold">
                <Layers className="w-3.5 h-3.5" />
                <span>Account Classification</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Select Your Account Option
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Welcome, <strong className="text-white">{user?.name}</strong>! Choose how you will operate your BIZ-COMPLY compliance profile:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              
              {/* Option 1: Accountant / Compliance Officer */}
              <div
                onClick={() => handleSelectOption('accountant')}
                className="group p-6 bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/80 hover:border-blue-500 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
                      CPA / Practice
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors mb-2">
                    Accountant / Compliance Officer
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    Designed for CPA practitioners, accounting firm teams, and compliance officers handling tax calendars, multiple client portfolios, and BIR filings.
                  </p>

                  <div className="space-y-2 pt-3 border-t border-slate-700/50 text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Multi-client BIR form tracking & directory</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Automated email & push deadline reminders</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Tax practice management & filing receipts</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-2">
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/30 group-hover:shadow-blue-600/30 cursor-pointer"
                  >
                    <span>Select Accountant / Compliance Officer</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Option 2: Business Owner */}
              <div
                onClick={() => handleSelectOption('business_owner')}
                className="group p-6 bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/80 hover:border-amber-500 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      Taxpayer Entity
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors mb-2">
                    Business Owner
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    Designed for business owners, sole proprietors, and corporate teams tracking internal BIR form obligations, eFPS confirmations, and deadline logs.
                  </p>

                  <div className="space-y-2 pt-3 border-t border-slate-700/50 text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Dedicated Taxpayer Portal & status cards</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Direct payment reference & BIR receipt storage</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Option to share with external CPA or self-manage</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-2">
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/30 group-hover:shadow-amber-500/30 cursor-pointer"
                  >
                    <span>Select Business Owner</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* STEP 2: COMPANY INFORMATION FORM PAGE */}
        {step === 'company_info' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('selection')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Option ({selectedType === 'accountant' ? 'Accountant' : 'Business Owner'})</span>
              </button>

              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                selectedType === 'accountant'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {selectedType === 'accountant' ? 'Accountant / Compliance Profile' : 'Business Owner Profile'}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {selectedType === 'accountant' ? 'Enter Practice & Firm Details' : 'Enter Company Details'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {selectedType === 'accountant' 
                  ? 'Please provide your accounting firm or compliance practice information to populate your practice header and client communication forms.'
                  : 'Please provide your registered business information for BIR tax form mapping and deadline tracking.'}
              </p>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCompanyInfo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Company / Practice Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    {selectedType === 'accountant' ? 'Accounting Firm / Practice Name *' : 'Registered Business / Company Name *'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={selectedType === 'accountant' ? 'e.g. Apex Accounting & Tax Advisory Services' : 'e.g. Acme Retail Enterprises Inc.'}
                      className="block w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {/* Tax Identification Number (TIN) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Tax Identification Number (TIN) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={18}
                      value={tin}
                      onChange={(e) => setTin(formatTIN(e.target.value))}
                      placeholder="000-000-000-00000"
                      className="block w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {/* Revenue District Office (RDO) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      BIR Revenue District Office (RDO)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomRdo(!isCustomRdo)}
                      className="text-[11px] text-blue-400 hover:underline cursor-pointer font-normal"
                    >
                      {isCustomRdo ? "Select List" : "Type Custom"}
                    </button>
                  </div>

                  {isCustomRdo ? (
                    <input
                      type="text"
                      value={rdo}
                      onChange={(e) => setRdo(e.target.value)}
                      placeholder="e.g. 039 or 054A"
                      className="block w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  ) : (
                    <select
                      value={rdo}
                      onChange={(e) => setRdo(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-400">Select RDO Office</option>
                      {Object.keys(groupedRDOs).map(region => {
                        const rdos = groupedRDOs[region];
                        return (
                          <optgroup key={region} label={region} className="bg-slate-900 text-amber-300 font-bold">
                            {rdos.map(r => (
                              <option 
                                key={r.code} 
                                value={r.code} 
                                className="bg-slate-800 text-white font-normal"
                              >
                                RDO {r.code} - {r.location}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Industry (If Business Owner) */}
                {selectedType === 'business_owner' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Line of Business / Industry
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Retail, Tech, Manufacturing"
                      className="block w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                )}

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0917-123-4567"
                      className="block w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Primary Business / Office Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street Address, City, Province"
                      className="block w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {/* Dashboard Mode Selection for Business Owner */}
                {selectedType === 'business_owner' && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-800 space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Taxpayer Portal Setup Preference
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setClientDashboardMode('shared_accountant')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          clientDashboardMode === 'shared_accountant'
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <p className="text-xs font-bold text-white">Shared with Accountant</p>
                        <p className="text-[11px] text-slate-400">External CPA firm prepares and files returns for you</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setClientDashboardMode('business_owner')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          clientDashboardMode === 'business_owner'
                            ? 'bg-amber-500/20 border-amber-500 text-white'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <p className="text-xs font-bold text-white">Self-Managed Business</p>
                        <p className="text-[11px] text-slate-400">Directly self-monitor and file BIR tax forms</p>
                      </button>
                    </div>
                  </div>
                )}

              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="submit"
                  className={`w-full py-3 px-6 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer ${
                    selectedType === 'accountant'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  <span>Save Company Info & Launch Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

          </div>
        )}

        {/* Footer info note */}
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Company information can be updated anytime in your user settings.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
