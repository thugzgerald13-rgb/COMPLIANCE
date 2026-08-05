import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  register: (name: string, email: string, password: string, role: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  loginWithGoogle: (email: string, name?: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  logout: () => void;
  isAuthLoaded: boolean;
  isSupabaseConnected: boolean;
}


interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordHash?: string;
  passwordSalt?: string;
  /** Legacy plaintext credential, migrated to a salted hash on next sign-in. */
  password?: string;
}

const env = (import.meta as any).env || {};
const DEMO_PASSWORD: string | undefined = env.DEV ? env.VITE_DEMO_PASSWORD : undefined;

const DEMO_USERS: StoredUser[] = [
  { id: '1', name: 'Juan Dela Cruz', email: 'juan@example.com', role: 'Admin' },
  { id: '2', name: 'Maria Santos', email: 'maria@example.com', role: 'Compliance Officer' },
];

const USERS_STORAGE_KEY = 'bir_monitor_users_v1';
const CURRENT_USER_KEY = 'bir_monitor_current_user_v1';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoded = new TextEncoder().encode(`${salt}:${password}`);
  return toHex(await crypto.subtle.digest('SHA-256', encoded));
}

function newSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

function publicUser(u: StoredUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role || 'Compliance Officer',
  };
}

function readStoredUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function seedDemoUsers(): Promise<StoredUser[]> {
  if (!DEMO_PASSWORD) return [];
  const salt = newSalt();
  const passwordHash = await hashPassword(DEMO_PASSWORD, salt);
  return DEMO_USERS.map(u => ({ ...u, passwordSalt: salt, passwordHash }));
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  // Sync users list to state, never exposing credential material
  const refreshUsersList = () => {
    setAllUsers(readStoredUsers().map(publicUser));
  };

  useEffect(() => {
    if (!localStorage.getItem(USERS_STORAGE_KEY)) {
      seedDemoUsers().then(seeded => {
        if (seeded.length > 0) {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(seeded));
        }
        refreshUsersList();
      });
    } else {
      refreshUsersList();
    }

    if (supabase && isSupabaseConfigured) {
      // Supabase authentication listener
      supabase.auth.getSession().then(({ data: { session } }) => {
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
      try {
        setUser(JSON.parse(storedCurrentUser));
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
        const authenticatedUser: User = {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email || email,
          role: data.user.user_metadata?.role || 'Compliance Officer',
        };
        setUser(authenticatedUser);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
        return { success: true };
      }
    }

    // Local fallback
    const usersList = readStoredUsers();

    const normalizedEmail = email.toLowerCase().trim();
    const foundUser = usersList.find(u => u.email.toLowerCase().trim() === normalizedEmail);

    const invalidCredentials = { success: false, message: 'Incorrect email or password.' };

    if (!foundUser) {
      return invalidCredentials;
    }

    if (foundUser.password) {
      if (foundUser.password !== password) {
        return invalidCredentials;
      }
      const passwordSalt = newSalt();
      foundUser.passwordSalt = passwordSalt;
      foundUser.passwordHash = await hashPassword(password, passwordSalt);
      delete foundUser.password;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
    } else {
      if (!foundUser.passwordHash || !foundUser.passwordSalt) {
        return invalidCredentials;
      }
      const candidateHash = await hashPassword(password, foundUser.passwordSalt);
      if (candidateHash !== foundUser.passwordHash) {
        return invalidCredentials;
      }
    }

    const authenticatedUser = publicUser(foundUser);

    setUser(authenticatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
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
        setUser(authenticatedUser);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
        return { success: true };
      }
    }

    // Local fallback
    const usersList = readStoredUsers();

    const normalizedEmail = email.toLowerCase().trim();
    const existing = usersList.find(u => u.email.toLowerCase().trim() === normalizedEmail);

    if (existing) {
      return { success: false, message: 'An account with this email already exists. Try signing in instead.' };
    }

    const passwordSalt = newSalt();
    const newUserObj: StoredUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      passwordSalt,
      passwordHash: await hashPassword(password, passwordSalt),
      role: role.trim() || 'Compliance Officer',
    };

    const updatedUsers = [...usersList, newUserObj];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    refreshUsersList();

    const authenticatedUser = publicUser(newUserObj);

    setUser(authenticatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
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
    
    const usersList = readStoredUsers();

    const existing = usersList.find(u => u.email.toLowerCase().trim() === googleEmail);
    let googleUser: User;

    if (existing) {
      // An unverified email is not proof of ownership: refuse to take over
      // an account that is protected by a password.
      if (existing.passwordHash || existing.password) {
        return { success: false, message: 'This email is registered with a password. Please sign in with your password.' };
      }
      googleUser = {
        ...publicUser(existing),
        name: existing.name || googleName,
        role: existing.role || 'Compliance Specialist',
      };
    } else {
      const newUserObj: StoredUser = {
        id: 'google_' + crypto.randomUUID(),
        name: googleName,
        email: googleEmail,
        role: 'Compliance Specialist',
      };
      usersList.push(newUserObj);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
      googleUser = publicUser(newUserObj);
    }

    refreshUsersList();
    setUser(googleUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(googleUser));
    return { success: true };
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
      login,
      register,
      loginWithGoogle,
      logout,
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
