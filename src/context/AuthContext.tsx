import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, CompanyInfo } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type WorkspaceMode = 'single' | 'multi';
export type SubscriptionTier = 'free_trial' | 'subscriber';

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  isSuperAdmin: boolean;
  workspaceMode: WorkspaceMode | null;
  subscriptionTier: SubscriptionTier;
  isWorkspaceLocked: boolean;
  toggleWorkspaceMode: () => void;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  resetWorkspaceMode: (force?: boolean) => void;
  upgradeToSubscriber: () => void;
  unlockWorkspaceMode: () => void;
  downgradeToFreeTrial: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  loginAsClientPortal: (clientId: string, clientName: string, clientTin: string, clientEmail?: string) => void;
  register: (name: string, email: string, password: string, role: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  loginWithGoogle: (email: string, name?: string, roleHint?: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  updateUserDashboardMode: (mode: 'shared_accountant' | 'business_owner') => void;
  updateUserAccountInfo: (accountType: 'accountant' | 'business_owner', companyInfo: CompanyInfo, clientDashboardMode?: 'shared_accountant' | 'business_owner') => void;
  logout: () => void;
  switchUser: (userId: string) => void;
  isAuthLoaded: boolean;
  isSupabaseConnected: boolean;
}


const SUPER_ADMIN_EMAILS = ['thugz.gerald13@gmail.com', 'tagz.gerald13@gmail.com'];

const isSuperAdminEmail = (email?: string) => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

const DEFAULT_USERS = [
  {
    id: 'super_admin_thugz',
    name: 'Gerald (Super Admin)',
    email: 'thugz.gerald13@gmail.com',
    password: 'password123',
    role: 'Super Admin',
  },
  {
    id: 'super_admin_tagz',
    name: 'Gerald (Super Admin)',
    email: 'tagz.gerald13@gmail.com',
    password: 'password123',
    role: 'Super Admin',
  },
];

const USERS_STORAGE_KEY = 'bir_monitor_users_v1';
const CURRENT_USER_KEY = 'bir_monitor_current_user_v1';
const WORKSPACE_MODE_KEY = 'bir_monitor_workspace_mode_v1';
const SUBSCRIPTION_TIER_KEY = 'bir_monitor_subscription_tier_v1';
const WORKSPACE_LOCKED_KEY = 'bir_monitor_workspace_locked_v1';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [subscriptionTier, setSubscriptionTierState] = useState<SubscriptionTier>(() => {
    const saved = localStorage.getItem(SUBSCRIPTION_TIER_KEY);
    return saved === 'subscriber' ? 'subscriber' : 'free_trial';
  });
  const [isWorkspaceLocked, setIsWorkspaceLockedState] = useState<boolean>(() => {
    return localStorage.getItem(WORKSPACE_LOCKED_KEY) === 'true';
  });
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode | null>(() => {
    const saved = localStorage.getItem(WORKSPACE_MODE_KEY);
    return (saved === 'single' || saved === 'multi') ? saved : null;
  });
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  const isSuperAdmin = Boolean(user && (user.role === 'Super Admin' || user.role === 'Admin' || isSuperAdminEmail(user.email) || user.email?.toLowerCase().includes('gerald13')));

  const toggleWorkspaceMode = () => {
    const nextMode: WorkspaceMode = workspaceMode === 'single' ? 'multi' : 'single';
    setWorkspaceModeState(nextMode);
    localStorage.setItem(WORKSPACE_MODE_KEY, nextMode);
  };

  const setWorkspaceMode = (mode: WorkspaceMode) => {
    setWorkspaceModeState(mode);
    localStorage.setItem(WORKSPACE_MODE_KEY, mode);

    if (subscriptionTier === 'subscriber' && !isSuperAdmin) {
      setIsWorkspaceLockedState(true);
      localStorage.setItem(WORKSPACE_LOCKED_KEY, 'true');
    }
  };

  const resetWorkspaceMode = (force: boolean = false) => {
    if (subscriptionTier === 'free_trial' || !isWorkspaceLocked || force || isSuperAdmin) {
      setWorkspaceModeState(null);
      localStorage.removeItem(WORKSPACE_MODE_KEY);
    }
  };

  const upgradeToSubscriber = () => {
    setSubscriptionTierState('subscriber');
    localStorage.setItem(SUBSCRIPTION_TIER_KEY, 'subscriber');

    // Prompt user again to choose single or multi, which will lock in their subscriber status
    setIsWorkspaceLockedState(false);
    localStorage.removeItem(WORKSPACE_LOCKED_KEY);
    setWorkspaceModeState(null);
    localStorage.removeItem(WORKSPACE_MODE_KEY);
  };

  const unlockWorkspaceMode = () => {
    setIsWorkspaceLockedState(false);
    localStorage.setItem(WORKSPACE_LOCKED_KEY, 'false');
  };

  const downgradeToFreeTrial = () => {
    setSubscriptionTierState('free_trial');
    localStorage.setItem(SUBSCRIPTION_TIER_KEY, 'free_trial');
    setIsWorkspaceLockedState(false);
    localStorage.setItem(WORKSPACE_LOCKED_KEY, 'false');
  };

  // Sync users list to state & central storage
  const refreshUsersList = async () => {
    let usersList: any[] = [];
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          usersList = data.users;
        }
      }
    } catch (e) {}

    if (usersList.length === 0) {
      const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (rawUsers) {
        try {
          usersList = JSON.parse(rawUsers);
        } catch (e) {
          usersList = DEFAULT_USERS;
        }
      } else {
        usersList = DEFAULT_USERS;
      }
    }

    // Ensure super admin emails are present and have Super Admin role
    SUPER_ADMIN_EMAILS.forEach((saEmail) => {
      const existingIdx = usersList.findIndex((u: any) => u.email?.toLowerCase().trim() === saEmail);
      if (existingIdx >= 0) {
        usersList[existingIdx].role = 'Super Admin';
      } else {
        usersList.unshift({
          id: 'super_admin_' + saEmail.split('@')[0],
          name: 'Gerald (Super Admin)',
          email: saEmail,
          password: 'password123',
          role: 'Super Admin',
        });
      }
    });

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
    setAllUsers(usersList.map(({ password, ...u }: any) => u));
    return usersList;
  };

  const getLocalUserBackup = (userEmail?: string, userId?: string) => {
    if (!userEmail && !userId) return null;
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!rawUsers) return null;
    try {
      const uList = JSON.parse(rawUsers);
      const normEmail = userEmail?.toLowerCase().trim();
      return uList.find((x: any) => (userId && x.id === userId) || (normEmail && x.email?.toLowerCase().trim() === normEmail)) || null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    refreshUsersList();

    if (supabase && isSupabaseConfigured) {
      // Supabase authentication listener
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const userEmail = session.user.email || '';
          const meta = session.user.user_metadata || {};
          const localBackup = getLocalUserBackup(userEmail, session.user.id);

          const accountType = meta.accountType || localBackup?.accountType;
          const companyInfo = meta.companyInfo || localBackup?.companyInfo;
          const clientDashboardMode = meta.clientDashboardMode || localBackup?.clientDashboardMode;
          const tin = companyInfo?.tin || meta.tin || localBackup?.tin;
          const clientId = meta.clientId || localBackup?.clientId;

          const u: User = {
            id: session.user.id,
            name: companyInfo?.companyName || meta.full_name || localBackup?.name || session.user.email?.split('@')[0] || 'User',
            email: userEmail,
            role: isSuperAdminEmail(userEmail) ? 'Super Admin' : (meta.role || localBackup?.role || 'Compliance Officer'),
            accountType,
            companyInfo,
            clientDashboardMode,
            tin,
            clientId,
            organization_id: localBackup?.organization_id || 'org_main_practice',
          };
          setUser(u);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(u));
        } else {
          // Fallback to local / central
          loadLocalUser();
        }
        setIsAuthLoaded(true);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const userEmail = session.user.email || '';
          const meta = session.user.user_metadata || {};
          const localBackup = getLocalUserBackup(userEmail, session.user.id);

          const accountType = meta.accountType || localBackup?.accountType;
          const companyInfo = meta.companyInfo || localBackup?.companyInfo;
          const clientDashboardMode = meta.clientDashboardMode || localBackup?.clientDashboardMode;
          const tin = companyInfo?.tin || meta.tin || localBackup?.tin;
          const clientId = meta.clientId || localBackup?.clientId;

          const u: User = {
            id: session.user.id,
            name: companyInfo?.companyName || meta.full_name || localBackup?.name || session.user.email?.split('@')[0] || 'User',
            email: userEmail,
            role: isSuperAdminEmail(userEmail) ? 'Super Admin' : (meta.role || localBackup?.role || 'Compliance Officer'),
            accountType,
            companyInfo,
            clientDashboardMode,
            tin,
            clientId,
            organization_id: localBackup?.organization_id || 'org_main_practice',
          };
          setUser(u);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(u));
        } else {
          setUser(null);
          localStorage.removeItem(CURRENT_USER_KEY);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      loadLocalUser();
      setIsAuthLoaded(true);
    }
  }, []);

  const loadLocalUser = async () => {
    const storedCurrentUser = localStorage.getItem(CURRENT_USER_KEY);
    if (storedCurrentUser) {
      try {
        let parsed: User = JSON.parse(storedCurrentUser);
        if (isSuperAdminEmail(parsed.email)) {
          parsed.role = 'Super Admin';
        }
        
        // Fetch from central storage server first to ensure option & company info are synced across devices
        if (parsed.email) {
          try {
            const res = await fetch(`/api/users/find?q=${encodeURIComponent(parsed.email)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.user) {
                const central = data.user;
                parsed = {
                  ...parsed,
                  name: central.companyInfo?.companyName || central.name || parsed.name,
                  role: isSuperAdminEmail(central.email) ? 'Super Admin' : (central.role || parsed.role),
                  accountType: central.accountType || parsed.accountType,
                  companyInfo: central.companyInfo || parsed.companyInfo,
                  clientDashboardMode: central.clientDashboardMode || parsed.clientDashboardMode,
                  tin: central.companyInfo?.tin || central.tin || parsed.tin,
                };
              }
            }
          } catch (e) {}
        }

        const localBackup = getLocalUserBackup(parsed.email, parsed.id);
        if (localBackup) {
          parsed.accountType = parsed.accountType || localBackup.accountType;
          parsed.companyInfo = parsed.companyInfo || localBackup.companyInfo;
          parsed.clientDashboardMode = parsed.clientDashboardMode || localBackup.clientDashboardMode;
          parsed.tin = parsed.tin || localBackup.tin;
          parsed.clientId = parsed.clientId || localBackup.clientId;
        }

        setUser(parsed);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(parsed));
      } catch (e) {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Central Storage Server Login / Check
    try {
      const res = await fetch(`/api/users/find?q=${encodeURIComponent(normalizedEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const foundUser = data.user;
          if (foundUser.password && foundUser.password !== password) {
            return { success: false, message: 'Incorrect password. Please try again.' };
          }

          const authenticatedUser: User = {
            id: foundUser.id,
            name: foundUser.companyInfo?.companyName || foundUser.name,
            email: foundUser.email,
            role: isSuperAdminEmail(foundUser.email) ? 'Super Admin' : (foundUser.role || 'Compliance Officer'),
            organization_id: foundUser.organization_id || 'org_main_practice',
            clientId: foundUser.clientId,
            tin: foundUser.companyInfo?.tin || foundUser.tin,
            clientDashboardMode: foundUser.clientDashboardMode,
            accountType: foundUser.accountType,
            companyInfo: foundUser.companyInfo,
          };

          setUser(authenticatedUser);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
          return { success: true };
        }
      }
    } catch (e) {}

    // 2. Supabase Login
    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        const userEmail = data.user.email || email;
        const meta = data.user.user_metadata || {};
        const localBackup = getLocalUserBackup(userEmail, data.user.id);

        const accountType = meta.accountType || localBackup?.accountType;
        const companyInfo = meta.companyInfo || localBackup?.companyInfo;
        const clientDashboardMode = meta.clientDashboardMode || localBackup?.clientDashboardMode;
        const tin = companyInfo?.tin || meta.tin || localBackup?.tin;

        const authenticatedUser: User = {
          id: data.user.id,
          name: companyInfo?.companyName || meta.full_name || localBackup?.name || data.user.email?.split('@')[0] || 'User',
          email: userEmail,
          role: isSuperAdminEmail(userEmail) ? 'Super Admin' : (meta.role || localBackup?.role || 'Compliance Officer'),
          organization_id: 'org_main_practice',
          accountType,
          companyInfo,
          clientDashboardMode,
          tin,
        };
        setUser(authenticatedUser);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));

        // Sync to central storage server
        try {
          await fetch('/api/users/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: authenticatedUser.id,
              email: authenticatedUser.email,
              name: authenticatedUser.name,
              accountType: authenticatedUser.accountType,
              companyInfo: authenticatedUser.companyInfo,
              clientDashboardMode: authenticatedUser.clientDashboardMode,
              role: authenticatedUser.role,
              tin: authenticatedUser.tin,
            }),
          });
        } catch (e) {}

        return { success: true };
      }
    }

    // 3. Local fallback
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const usersList = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS;

    const foundUser = usersList.find((u: any) => u.email.toLowerCase().trim() === normalizedEmail);

    if (foundUser) {
      if (foundUser.password && foundUser.password !== password) {
        return { success: false, message: 'Incorrect password. Please try again.' };
      }

      const authenticatedUser: User = {
        id: foundUser.id,
        name: foundUser.companyInfo?.companyName || foundUser.name,
        email: foundUser.email,
        role: isSuperAdminEmail(foundUser.email) ? 'Super Admin' : (foundUser.role || 'Compliance Officer'),
        organization_id: foundUser.organization_id || 'org_main_practice',
        clientId: foundUser.clientId,
        tin: foundUser.companyInfo?.tin || foundUser.tin,
        clientDashboardMode: foundUser.clientDashboardMode,
        accountType: foundUser.accountType,
        companyInfo: foundUser.companyInfo,
      };

      setUser(authenticatedUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
      return { success: true };
    }

    return { success: false, message: 'No user account found with this email address. Please check your credentials or register.' };
  };

  const loginAsClientPortal = (clientId: string, clientName: string, clientTin: string, clientEmail?: string, organizationId?: string) => {
    const clientUser: User = {
      id: clientId,
      name: clientName,
      email: clientEmail || `${clientTin}@taxpayer.bizcomply.ph`,
      role: 'Client',
      organization_id: organizationId || 'org_main_practice',
      clientId: clientId,
      tin: clientTin,
      accountType: 'business_owner',
      clientDashboardMode: 'business_owner',
      companyInfo: {
        companyName: clientName,
        tin: clientTin,
        rdo: '043',
      }
    };
    setUser(clientUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(clientUser));
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const isSuper = isSuperAdminEmail(normalizedEmail);
    const assignedRole = isSuper ? 'Super Admin' : (role.trim() || 'Compliance Officer');

    // Register in central storage server
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          password,
          role: assignedRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const newUserObj = data.user;
          const authenticatedUser: User = {
            id: newUserObj.id,
            name: newUserObj.name,
            email: newUserObj.email,
            role: assignedRole,
            organization_id: 'org_main_practice',
            accountType: newUserObj.accountType,
            companyInfo: newUserObj.companyInfo,
            clientDashboardMode: newUserObj.clientDashboardMode,
          };

          setUser(authenticatedUser);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));

          if (supabase && isSupabaseConfigured) {
            await supabase.auth.signUp({
              email: normalizedEmail,
              password,
              options: {
                data: {
                  full_name: name.trim(),
                  role: assignedRole,
                },
              },
            }).catch(() => {});
          }

          refreshUsersList();
          return { success: true };
        }
      }
    } catch (e) {}

    // Local fallback
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const usersList = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS;

    const existing = usersList.find((u: any) => u.email.toLowerCase().trim() === normalizedEmail);

    if (existing) {
      return { success: false, message: 'An account with this email already exists. Try signing in instead.' };
    }

    const newUserObj = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: assignedRole,
      organization_id: 'org_main_practice',
    };

    const updatedUsers = [...usersList, newUserObj];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    refreshUsersList();

    const authenticatedUser: User = {
      id: newUserObj.id,
      name: newUserObj.name,
      email: newUserObj.email,
      role: newUserObj.role,
      organization_id: newUserObj.organization_id,
    };

    setUser(authenticatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
    return { success: true };
  };

  const loginWithGoogle = async (email: string, name?: string, roleHint?: string) => {
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true };
    }

    // Central server login with Google
    const googleEmail = email.trim().toLowerCase();
    const isSuper = isSuperAdminEmail(googleEmail);
    const defaultRole = isSuper ? 'Super Admin' : (roleHint || 'Compliance Specialist');
    const googleName = name?.trim() || (googleEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: googleName,
          email: googleEmail,
          role: defaultRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const u = data.user;
          const googleUser: User = {
            id: u.id,
            name: u.companyInfo?.companyName || u.name || googleName,
            email: u.email,
            role: u.role || defaultRole,
            clientDashboardMode: u.clientDashboardMode,
            accountType: u.accountType,
            companyInfo: u.companyInfo,
            tin: u.companyInfo?.tin || u.tin,
            clientId: u.clientId,
          };
          refreshUsersList();
          setUser(googleUser);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(googleUser));
          return { success: true };
        }
      }
    } catch (e) {}

    // Fallback
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const usersList = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS;

    let existing = usersList.find((u: any) => u.email.toLowerCase().trim() === googleEmail);
    let googleUser: User;

    if (existing) {
      if (isSuper) {
        existing.role = 'Super Admin';
      } else if (roleHint) {
        existing.role = roleHint;
      }
      googleUser = {
        id: existing.id,
        name: existing.companyInfo?.companyName || existing.name || googleName,
        email: existing.email,
        role: existing.role || defaultRole,
        clientDashboardMode: existing.clientDashboardMode,
        accountType: existing.accountType,
        companyInfo: existing.companyInfo,
        tin: existing.companyInfo?.tin || existing.tin,
        clientId: existing.clientId,
      };
    } else {
      const newUserObj = {
        id: 'google_' + crypto.randomUUID(),
        name: googleName,
        email: googleEmail,
        password: '',
        role: defaultRole,
      };
      usersList.push(newUserObj);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
      googleUser = {
        id: newUserObj.id,
        name: newUserObj.name,
        email: newUserObj.email,
        role: newUserObj.role,
      };
    }

    refreshUsersList();
    setUser(googleUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(googleUser));
    return { success: true };
  };

  const updateUserDashboardMode = async (mode: 'shared_accountant' | 'business_owner') => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      clientDashboardMode: mode,
    };
    setUser(updatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

    // Sync to Central Server
    try {
      await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          clientDashboardMode: mode,
        }),
      });
    } catch (e) {}

    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      try {
        const usersList = JSON.parse(rawUsers);
        const normEmail = user.email?.toLowerCase().trim();
        const idx = usersList.findIndex((u: any) => u.id === user.id || (normEmail && u.email?.toLowerCase().trim() === normEmail));
        if (idx !== -1) {
          usersList[idx].clientDashboardMode = mode;
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
        }
      } catch (e) {}
    }

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.updateUser({
          data: {
            clientDashboardMode: mode,
          }
        });
      } catch (e) {}
    }
  };

  const updateUserAccountInfo = async (
    accountType: 'accountant' | 'business_owner',
    companyInfo: CompanyInfo,
    clientDashboardMode?: 'shared_accountant' | 'business_owner'
  ) => {
    if (!user) return;

    let newRole = user.role;
    if (!isSuperAdmin) {
      newRole = accountType === 'accountant' ? 'Compliance Officer' : 'Client';
    }

    const effectiveDashboardMode = clientDashboardMode || (accountType === 'business_owner' ? 'business_owner' : 'shared_accountant');

    const updatedUser: User = {
      ...user,
      name: companyInfo.companyName || user.name,
      accountType,
      companyInfo,
      role: newRole,
      tin: companyInfo.tin || user.tin,
      clientDashboardMode: effectiveDashboardMode,
    };

    setUser(updatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

    // SYNC TO CENTRAL SERVER
    try {
      await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          name: companyInfo.companyName || user.name,
          accountType,
          companyInfo,
          clientDashboardMode: effectiveDashboardMode,
          role: newRole,
          tin: companyInfo.tin || user.tin,
        }),
      });
    } catch (err) {
      console.error('Failed to sync user profile to central storage server:', err);
    }

    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    let usersList: any[] = [];
    if (rawUsers) {
      try {
        usersList = JSON.parse(rawUsers);
      } catch (e) {
        usersList = [];
      }
    }

    const normEmail = user.email?.toLowerCase().trim();
    const idx = usersList.findIndex((u: any) => u.id === user.id || (normEmail && u.email?.toLowerCase().trim() === normEmail));

    if (idx !== -1) {
      usersList[idx] = {
        ...usersList[idx],
        name: companyInfo.companyName || usersList[idx].name,
        accountType,
        companyInfo,
        role: newRole,
        tin: companyInfo.tin || usersList[idx].tin,
        clientDashboardMode: effectiveDashboardMode,
      };
    } else {
      usersList.push({
        id: user.id,
        name: companyInfo.companyName || user.name,
        email: user.email,
        accountType,
        companyInfo,
        role: newRole,
        tin: companyInfo.tin || user.tin,
        clientDashboardMode: effectiveDashboardMode,
        organization_id: user.organization_id || 'org_main_practice',
      });
    }

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: companyInfo.companyName || user.name,
            accountType,
            companyInfo,
            role: newRole,
            clientDashboardMode: effectiveDashboardMode,
            tin: companyInfo.tin || user.tin,
          }
        });
      } catch (err) {
        console.error('Failed to sync user metadata to Supabase:', err);
      }
    }

    refreshUsersList();
  };

  const switchUser = (userId: string) => {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const usersList = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS;
    const target = usersList.find((u: any) => u.id === userId);
    if (target) {
      const authenticatedUser: User = {
        id: target.id,
        name: target.companyInfo?.companyName || target.name,
        email: target.email,
        role: target.role || 'Compliance Officer',
        organization_id: target.organization_id || 'org_main_practice',
        clientId: target.clientId,
        tin: target.companyInfo?.tin || target.tin,
        clientDashboardMode: target.clientDashboardMode,
        accountType: target.accountType,
        companyInfo: target.companyInfo,
      };
      setUser(authenticatedUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
    }
  };

  const logout = async () => {
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <AuthContext.Provider value={{
      user,
      allUsers,
      isSuperAdmin,
      workspaceMode,
      subscriptionTier,
      isWorkspaceLocked,
      toggleWorkspaceMode,
      setWorkspaceMode,
      resetWorkspaceMode,
      upgradeToSubscriber,
      unlockWorkspaceMode,
      downgradeToFreeTrial,
      login,
      loginAsClientPortal,
      register,
      loginWithGoogle,
      updateUserDashboardMode,
      updateUserAccountInfo,
      logout,
      switchUser,
      isAuthLoaded,
      isSupabaseConnected: isSupabaseConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
