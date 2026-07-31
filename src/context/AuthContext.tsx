import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => { success: boolean; message?: string };
  register: (name: string, email: string, password: string, role: string) => { success: boolean; message?: string };
  loginWithGoogle: (email?: string, name?: string) => { success: boolean; message?: string };
  logout: () => void;
  isAuthLoaded: boolean;
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
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  useEffect(() => {
    // Seed initial users if none exist
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!storedUsers) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    }

    // Load active user session
    const storedCurrentUser = localStorage.getItem(CURRENT_USER_KEY);
    if (storedCurrentUser) {
      try {
        setUser(JSON.parse(storedCurrentUser));
      } catch (e) {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
    setIsAuthLoaded(true);
  }, []);

  const login = (email: string, password: string) => {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const usersList = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS;

    const normalizedEmail = email.toLowerCase().trim();
    const foundUser = usersList.find((u: any) => u.email.toLowerCase().trim() === normalizedEmail);

    if (!foundUser) {
      return { success: false, message: 'No account found with this email address.' };
    }

    if (foundUser.password !== password) {
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    const authenticatedUser: User = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role || 'Compliance Officer',
    };

    setUser(authenticatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
    return { success: true };
  };

  const register = (name: string, email: string, password: string, role: string) => {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const usersList = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS;

    const normalizedEmail = email.toLowerCase().trim();
    const existing = usersList.find((u: any) => u.email.toLowerCase().trim() === normalizedEmail);

    if (existing) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const newUserObj = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role.trim() || 'Compliance Officer',
    };

    const updatedUsers = [...usersList, newUserObj];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

    const authenticatedUser: User = {
      id: newUserObj.id,
      name: newUserObj.name,
      email: newUserObj.email,
      role: newUserObj.role,
    };

    setUser(authenticatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
    return { success: true };
  };

  const loginWithGoogle = (email?: string, name?: string) => {
    const googleEmail = email || 'tagz.gerald13@gmail.com';
    const googleName = name || (googleEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    const googleUser: User = {
      id: 'google_' + Date.now(),
      name: googleName,
      email: googleEmail,
      role: 'Compliance Specialist',
    };

    setUser(googleUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(googleUser));

    // Also persist in users list if not existing
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const usersList = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS;
    if (!usersList.some((u: any) => u.email.toLowerCase() === googleUser.email.toLowerCase())) {
      usersList.push({ ...googleUser, password: '' });
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
    }

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, isAuthLoaded }}>
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
