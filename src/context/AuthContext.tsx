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

  // Sync users list to state
  const refreshUsersList = () => {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    let usersList: any[] = [];
    if (!rawUsers) {
      usersList = DEFAULT_USERS;
    } else {
      try {
        usersList = JSON.parse(rawUsers);
      } catch (e) {
        usersList = DEFAULT_USERS;
      }
    }

    // Filter out example emails
    usersList = usersList.filter((u: any) => u.email && !u.email.toLowerCase().endsWith('@example.com'));

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
  };

  useEffect(() => {
    refreshUsersList();

    if (supabase && isSupabaseConfigured) {
      // Supabase authentication listener
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const userEmail = session.user.email || '';
          const u: User = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            email: userEmail,
            role: isSuperAdminEmail(userEmail) ? 'Super Admin' : (session.user.user_metadata?.role || 'Compliance Officer'),
          };
          setUser(u);
        } else {
          // Fallback to local
          loadLocalUser();
        }
        setIsAuthLoaded(true);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const userEmail = session.user.email || '';
          const u: User = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            email: userEmail,
            role: isSuperAdminEmail(userEmail) ? 'Super Admin' : (session.user.user_metadata?.role || 'Compliance Officer'),
          };
          setUser(u);
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

  const loadLocalUser = () => {
    const storedCurrentUser = localStorage.getItem(CURRENT_USER_KEY);
    if (storedCurrentUser) {
      try {
        const parsed: User = JSON.parse(storedCurrentUser);
        if (isSuperAdminEmail(parsed.email)) {
          parsed.role = 'Super Admin';
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(parsed));
        }
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  };

  const login = async (email: string, password: string) => {
    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        const userEmail = data.user.email || email;
        const authenticatedUser: User = {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          email: userEmail,
          role: isSuperAdminEmail(userEmail) ? 'Super Admin' : (data.user.user_metadata?.role || 'Compliance Officer'),
        };
        setUser(authenticatedUser);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
        return { success: true };
      }
    }

    // Local fallback
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const usersList = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS;

    const normalizedEmail = email.toLowerCase().trim();
    const foundUser = usersList.find((u: any) => u.email.toLowerCase().trim() === normalizedEmail);

    if (foundUser) {
      if (foundUser.password && foundUser.password !== password) {
        return { success: false, message: 'Incorrect password. Please try again.' };
      }

      const authenticatedUser: User = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: isSuperAdminEmail(foundUser.email) ? 'Super Admin' : (foundUser.role || 'Compliance Officer'),
        organization_id: foundUser.organization_id || 'org_main_practice',
        clientId: foundUser.clientId,
        tin: foundUser.tin,
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
    };
    setUser(clientUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(clientUser));
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const isSuper = isSuperAdminEmail(normalizedEmail);
    const assignedRole = isSuper ? 'Super Admin' : (role.trim() || 'Compliance Officer');

    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
            role: assignedRole,
          },
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        const authenticatedUser: User = {
          id: data.user.id,
          name: name.trim(),
          email: data.user.email || normalizedEmail,
          role: assignedRole,
          organization_id: 'org_main_practice',
        };
        setUser(authenticatedUser);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
        return { success: true };
      }
    }

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

    // Local fallback
    const googleEmail = email.trim().toLowerCase();
    const isSuper = isSuperAdminEmail(googleEmail);
    const defaultRole = isSuper ? 'Super Admin' : (roleHint || 'Compliance Specialist');
    const googleName = name?.trim() || (googleEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    
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
        name: existing.name || googleName,
        email: existing.email,
        role: existing.role || defaultRole,
        clientDashboardMode: existing.clientDashboardMode,
        accountType: existing.accountType,
        companyInfo: existing.companyInfo,
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

  const updateUserDashboardMode = (mode: 'shared_accountant' | 'business_owner') => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      clientDashboardMode: mode,
    };
    setUser(updatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      try {
        const usersList = JSON.parse(rawUsers);
        const idx = usersList.findIndex((u: any) => u.id === user.id || u.email?.toLowerCase().trim() === user.email?.toLowerCase().trim());
        if (idx !== -1) {
          usersList[idx].clientDashboardMode = mode;
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
        }
      } catch (e) {}
    }
  };

  const updateUserAccountInfo = (
    accountType: 'accountant' | 'business_owner',
    companyInfo: CompanyInfo,
    clientDashboardMode?: 'shared_accountant' | 'business_owner'
  ) => {
    if (!user) return;

    let newRole = user.role;
    if (!isSuperAdmin) {
      newRole = accountType === 'accountant' ? 'Compliance Officer' : 'Client';
    }

    const updatedUser: User = {
      ...user,
      name: companyInfo.companyName || user.name,
      accountType,
      companyInfo,
      role: newRole,
      tin: companyInfo.tin || user.tin,
      clientDashboardMode: clientDashboardMode || (accountType === 'business_owner' ? 'business_owner' : 'shared_accountant'),
    };

    setUser(updatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      try {
        const usersList = JSON.parse(rawUsers);
        const idx = usersList.findIndex((u: any) => u.id === user.id || u.email?.toLowerCase().trim() === user.email?.toLowerCase().trim());
        if (idx !== -1) {
          usersList[idx] = {
            ...usersList[idx],
            name: companyInfo.companyName || usersList[idx].name,
            accountType,
            companyInfo,
            role: newRole,
            tin: companyInfo.tin || usersList[idx].tin,
            clientDashboardMode: clientDashboardMode || (accountType === 'business_owner' ? 'business_owner' : 'shared_accountant'),
          };
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
        }
      } catch (e) {}
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
        name: target.name,
        email: target.email,
        role: target.role || 'Compliance Officer',
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
