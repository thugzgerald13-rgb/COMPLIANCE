import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logError, safeJsonParse, toErrorMessage } from '../lib/errors';

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  register: (name: string, email: string, password: string, role: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  loginWithGoogle: (email: string, name?: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  isAuthLoaded: boolean;
  isSupabaseConnected: boolean;
}


const DEFAULT_USERS = [
  {
    id: '1',
    name: 'Juan Dela Cruz',
    email: 'juan@example.com',
    password: 'password123',
    role: 'Admin',
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@example.com',
    password: 'password123',
    role: 'Compliance Officer',
  },
];

const USERS_STORAGE_KEY = 'bir_monitor_users_v1';
const CURRENT_USER_KEY = 'bir_monitor_current_user_v1';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  // Sync users list to state
  const refreshUsersList = () => {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!rawUsers) {
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      } catch (error) {
        logError('auth:seed-users', error);
      }
      setAllUsers(DEFAULT_USERS.map(({ password, ...u }) => u));
    } else {
      const parsed = safeJsonParse<Array<User & { password?: string }>>(rawUsers, 'auth:parse-users');
      if ('error' in parsed) {
        setAllUsers(DEFAULT_USERS.map(({ password, ...u }) => u));
      } else {
        setAllUsers(parsed.value.map(({ password, ...u }) => u));
      }
    }
  };

  useEffect(() => {
    refreshUsersList();

    if (supabase && isSupabaseConfigured) {
      // Supabase authentication listener
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          logError('auth:get-session', error);
        }
        if (session?.user) {
          const u: User = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            role: session.user.user_metadata?.role || 'Compliance Officer',
          };
          setUser(u);
        } else {
          // Fallback to local
          loadLocalUser();
        }
        setIsAuthLoaded(true);
      }).catch(err => {
        logError('auth:get-session', err);
        loadLocalUser();
        setIsAuthLoaded(true);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const u: User = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            role: session.user.user_metadata?.role || 'Compliance Officer',
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
      const parsed = safeJsonParse<User>(storedCurrentUser, 'auth:parse-current-user');
      if ('error' in parsed) {
        localStorage.removeItem(CURRENT_USER_KEY);
      } else {
        setUser(parsed.value);
      }
    }
  };

  // Reads the local user directory, falling back to the defaults on corrupted storage.
  const readLocalUsers = (): Array<User & { password?: string }> => {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!rawUsers) return DEFAULT_USERS;
    const parsed = safeJsonParse<Array<User & { password?: string }>>(rawUsers, 'auth:parse-users');
    return 'error' in parsed ? DEFAULT_USERS : parsed.value;
  };

  const persistCurrentUser = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    try {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
    } catch (error) {
      logError('auth:persist-current-user', error);
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
        const authenticatedUser: User = {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email || email,
          role: data.user.user_metadata?.role || 'Compliance Officer',
        };
        persistCurrentUser(authenticatedUser);
        return { success: true };
      }

      return { success: false, message: 'Sign in did not return an account. Please try again.' };
    }

    // Local fallback
    const usersList = readLocalUsers();

    const normalizedEmail = email.toLowerCase().trim();
    const foundUser = usersList.find(u => u.email.toLowerCase().trim() === normalizedEmail);

    if (!foundUser) {
      return { success: false, message: 'No account found with this email address. Please register first.' };
    }

    if (foundUser.password && foundUser.password !== password) {
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    const authenticatedUser: User = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role || 'Compliance Officer',
    };

    persistCurrentUser(authenticatedUser);
    return { success: true };
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            role: role.trim() || 'Compliance Officer',
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
          email: data.user.email || email,
          role: role.trim() || 'Compliance Officer',
        };
        persistCurrentUser(authenticatedUser);
        return { success: true };
      }

      return { success: false, message: 'Registration did not return an account. Please check your email for a confirmation link.' };
    }

    // Local fallback
    const usersList = readLocalUsers();

    const normalizedEmail = email.toLowerCase().trim();
    const existing = usersList.find(u => u.email.toLowerCase().trim() === normalizedEmail);

    if (existing) {
      return { success: false, message: 'An account with this email already exists. Try signing in instead.' };
    }

    const newUserObj = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role.trim() || 'Compliance Officer',
    };

    const updatedUsers = [...usersList, newUserObj];
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    } catch (error) {
      return { success: false, message: `Could not save your account on this device: ${toErrorMessage(error)}` };
    }
    refreshUsersList();

    const authenticatedUser: User = {
      id: newUserObj.id,
      name: newUserObj.name,
      email: newUserObj.email,
      role: newUserObj.role,
    };

    persistCurrentUser(authenticatedUser);
    return { success: true };
  };

  const loginWithGoogle = async (email: string, name?: string) => {
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
    const googleName = name?.trim() || (googleEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    
    const usersList = readLocalUsers();

    const existing = usersList.find(u => u.email.toLowerCase().trim() === googleEmail);
    let googleUser: User;

    if (existing) {
      googleUser = {
        id: existing.id,
        name: existing.name || googleName,
        email: existing.email,
        role: existing.role || 'Compliance Specialist',
      };
    } else {
      const newUserObj = {
        id: 'google_' + crypto.randomUUID(),
        name: googleName,
        email: googleEmail,
        password: '',
        role: 'Compliance Specialist',
      };
      usersList.push(newUserObj);
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
      } catch (error) {
        return { success: false, message: `Could not save your account on this device: ${toErrorMessage(error)}` };
      }
      googleUser = {
        id: newUserObj.id,
        name: newUserObj.name,
        email: newUserObj.email,
        role: newUserObj.role,
      };
    }

    refreshUsersList();
    persistCurrentUser(googleUser);
    return { success: true };
  };

  const switchUser = (userId: string) => {
    const usersList = readLocalUsers();
    const target = usersList.find(u => u.id === userId);
    if (target) {
      const authenticatedUser: User = {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role || 'Compliance Officer',
      };
      persistCurrentUser(authenticatedUser);
    }
  };

  const logout = async () => {
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logError('auth:sign-out', error);
      }
    }
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <AuthContext.Provider value={{
      user,
      allUsers,
      login,
      register,
      loginWithGoogle,
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
