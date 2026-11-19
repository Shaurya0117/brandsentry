'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';

export interface RoleContextType {
  role: UserRole;
  userName: string;
  setRole: (role: UserRole) => void;
  setUserName: (name: string) => void;
  canManageKB: boolean;
  canSubmitContent: boolean;
  canReviseContent: boolean;
  canApprove: boolean;
  canRequestChanges: boolean;
}

const DEFAULT_USERS: Record<UserRole, string> = {
  Admin: 'Sarah (Brand Admin)',
  Creator: 'Alex (Content Creator)',
  Manager: 'Marcus (Brand Manager)',
  Reviewer: 'Elena (Compliance Reviewer)',
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('Creator');
  const [userName, setUserNameState] = useState<string>(DEFAULT_USERS.Creator);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('brandsentry_role') as UserRole | null;
      const savedName = localStorage.getItem('brandsentry_user_name');
      if (savedRole && ['Admin', 'Creator', 'Manager', 'Reviewer'].includes(savedRole)) {
        setRoleState(savedRole);
        setUserNameState(savedName || DEFAULT_USERS[savedRole]);
      }
    } catch (e) {
      console.error('Failed to read role from localStorage', e);
    }
    setMounted(true);
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    const newName = DEFAULT_USERS[newRole];
    setUserNameState(newName);
    try {
      localStorage.setItem('brandsentry_role', newRole);
      localStorage.setItem('brandsentry_user_name', newName);
    } catch (e) {
      console.error('Failed to write role to localStorage', e);
    }
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
    try {
      localStorage.setItem('brandsentry_user_name', name);
    } catch (e) {
      console.error('Failed to write user name to localStorage', e);
    }
  };

  const value: RoleContextType = {
    role,
    userName,
    setRole,
    setUserName,
    canManageKB: role === 'Admin',
    canSubmitContent: role === 'Creator' || role === 'Admin',
    canReviseContent: role === 'Creator' || role === 'Admin',
    canApprove: role === 'Manager' || role === 'Reviewer' || role === 'Admin',
    canRequestChanges: role === 'Manager' || role === 'Reviewer' || role === 'Admin',
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
