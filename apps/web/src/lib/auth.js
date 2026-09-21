import { create } from 'zustand';
import { post } from './api';
const stored = localStorage.getItem('campus_user');
export const useAuth = create((set) => ({
    user: stored ? JSON.parse(stored) : null,
    login: async (loginId, password) => {
        const data = await post('/auth/login', {
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
export const isStaffSide = (role) => ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'ACCOUNTANT', 'OFFICE'].includes(role || '');
export const roleLabel = {
    SUPER_ADMIN: 'Super admin',
    ADMIN: 'Principal',
    HOD: 'Head of department',
    TEACHER: 'Teacher',
    STUDENT: 'Student',
    PARENT: 'Parent',
    ACCOUNTANT: 'Accounts',
    OFFICE: 'Office',
};
