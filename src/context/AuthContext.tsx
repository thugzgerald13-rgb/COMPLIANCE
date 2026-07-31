import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  login: (email: string, password: string) => { success: boolean; message?: string };
  register: (name: string, email: string, password: string, role: string) => { success: boolean; message?: string };
  loginWithGoogle: (email: string, name?: string) => { success: boolean; message?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
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
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  // Sync users list to state
  const refreshUsersList = () => {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!rawUsers) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      setAllUsers(DEFAULT_USERS.map(({ password, ...u }) => u));
    } else {
      try {
        const parsed = JSON.parse(rawUsers);
        setAllUsers(parsed.map(({ password, ...u }: any) => u));
      } catch (e) {
        setAllUsers(DEFAULT_USERS.map(({ password, ...u }) => u));
      }
    }
  };

  useEffect(() => {
    refreshUsersList();

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
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    refreshUsersList();

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

  const loginWithGoogle = (email: string, name?: string) => {
    const googleEmail = email.trim().toLowerCase();
    const googleName = name?.trim() || (googleEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const usersList = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS;

    let existing = usersList.find((u: any) => u.email.toLowerCase().trim() === googleEmail);
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, allUsers, login, register, loginWithGoogle, logout, switchUser, isAuthLoaded }}>
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
