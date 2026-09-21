import { create } from 'zustand';
import { post } from './api';

export type Role =
  | 'SUPER_ADMIN' | 'ADMIN' | 'HOD' | 'TEACHER'
  | 'STUDENT' | 'PARENT' | 'ACCOUNTANT' | 'OFFICE';

export interface SessionUser {
  id: string;
  loginId: string;
  role: Role;
  name: string;
  staffId?: string;
  studentId?: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
}

interface AuthState {
  user: SessionUser | null;
  login: (loginId: string, password: string) => Promise<SessionUser>;
  logout: () => void;
}

const stored = localStorage.getItem('campus_user');

export const useAuth = create<AuthState>((set) => ({
  user: stored ? JSON.parse(stored) : null,

  login: async (loginId, password) => {
    const data = await post<{ accessToken: string; user: SessionUser }>('/auth/login', {
      loginId,
      password,
    });
    localStorage.setItem('campus_token', data.accessToken);
    localStorage.setItem('campus_user', JSON.stringify(data.user));
    set({ user: data.user });
    return data.user;
  },

  logout: () => {
    localStorage.removeItem('campus_token');
    localStorage.removeItem('campus_user');
    set({ user: null });
  },
}));

export const isStaffSide = (role?: Role) =>
  ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'ACCOUNTANT', 'OFFICE'].includes(role || '');

export const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Principal',
  HOD: 'Head of department',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
  ACCOUNTANT: 'Accounts',
  OFFICE: 'Office',
};
