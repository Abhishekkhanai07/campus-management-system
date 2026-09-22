import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, CalendarCheck, CalendarDays, Repeat, FileText, ClipboardList, Wallet, ShieldCheck, Settings, LogOut, Menu, X, UserCog, BookOpen, Bell, MessageSquareWarning, } from 'lucide-react';
import { useAuth, roleLabel } from '../lib/auth';
import { initials } from '../lib/format';
import Assistant from './Assistant';
const NAV = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'OFFICE'] },
    { to: '/attendance', label: 'Take attendance', icon: CalendarCheck, roles: ['ADMIN', 'HOD', 'TEACHER', 'SUPER_ADMIN'] },
    { to: '/attendance/reports', label: 'Attendance reports', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER'] },
    { to: '/substitutions', label: 'Substitutions', icon: Repeat, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'OFFICE'] },
    { to: '/leave', label: 'Leave', icon: CalendarDays, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'ACCOUNTANT', 'OFFICE'] },
    { to: '/assignments', label: 'Assignments', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'STUDENT', 'PARENT'] },
    { to: '/exams', label: 'Exams & results', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER'] },
    { to: '/students', label: 'Students', icon: GraduationCap, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'OFFICE', 'ACCOUNTANT'] },
    { to: '/staff', label: 'Teachers', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'OFFICE'] },
    { to: '/allocation', label: 'Subject allocation', icon: UserCog, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD'] },
    { to: '/timetable', label: 'Timetable', icon: CalendarDays, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'STUDENT', 'PARENT'] },
    { to: '/fees', label: 'Fees', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'OFFICE'] },
    { to: '/me/attendance', label: 'My attendance', icon: CalendarCheck, roles: ['STUDENT', 'PARENT'] },
    { to: '/me/results', label: 'My results', icon: BookOpen, roles: ['STUDENT', 'PARENT'] },
    { to: '/me/fees', label: 'My fees', icon: Wallet, roles: ['STUDENT', 'PARENT'] },
    { to: '/notices', label: 'Notices', icon: Bell, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'OFFICE'] },
    { to: '/feedback', label: 'Student feedback', icon: MessageSquareWarning, roles: ['SUPER_ADMIN', 'ADMIN', 'HOD', 'STUDENT'] },
    { to: '/audit', label: 'Activity log', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { to: '/setup', label: 'Setup', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] },
];
export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const items = NAV.filter((n) => n.roles.includes(user.role));
    const signOut = () => {
        logout();
        navigate('/login');
    };
    return (_jsxs("div", { className: "min-h-full flex", children: [_jsxs("aside", { className: `fixed lg:static inset-y-0 left-0 z-40 w-[236px] bg-ink text-white flex flex-col shadow-rail
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} transition-transform`, children: [_jsxs("div", { className: "px-5 py-4 border-b border-white/10", children: [_jsx("div", { className: "text-[17px] font-semibold tracking-tight", children: "Campus" }), _jsx("div", { className: "text-[12px] text-ink-300 mt-0.5", children: "Sunrise Vidyalaya" })] }), _jsx("nav", { className: "flex-1 overflow-y-auto py-2", children: items.map((item) => (_jsxs(NavLink, { to: item.to, end: item.to === '/', onClick: () => setOpen(false), className: ({ isActive }) => `flex items-center gap-2.5 px-5 py-2 text-[13.5px] border-l-2 ${isActive
                                ? 'bg-ink-700 border-teal text-white'
                                : 'border-transparent text-ink-300 hover:text-white hover:bg-ink-700/60'}`, children: [_jsx(item.icon, { size: 16, strokeWidth: 1.8 }), item.label] }, item.to))) }), _jsxs("div", { className: "px-5 py-3 border-t border-white/10", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-teal flex items-center justify-center text-[12px] font-semibold", children: initials(user.name) }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-[13px] font-medium truncate", children: user.name }), _jsx("div", { className: "text-[11.5px] text-ink-300", children: roleLabel[user.role] })] })] }), _jsxs("button", { onClick: signOut, className: "mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-300 hover:text-white", children: [_jsx(LogOut, { size: 14 }), " Sign out"] })] })] }), open && (_jsx("div", { className: "fixed inset-0 bg-black/30 z-30 lg:hidden", onClick: () => setOpen(false) })), _jsxs("div", { className: "flex-1 min-w-0 flex flex-col", children: [_jsxs("header", { className: "lg:hidden sticky top-0 z-20 bg-white border-b border-line px-4 py-3 flex items-center gap-3", children: [_jsx("button", { onClick: () => setOpen((v) => !v), "aria-label": "Menu", children: open ? _jsx(X, { size: 20 }) : _jsx(Menu, { size: 20 }) }), _jsx("span", { className: "font-semibold text-ink", children: "Campus" })] }), _jsx("main", { className: "flex-1 px-4 lg:px-7 py-5 lg:py-7 max-w-[1400px] w-full", children: children })] }), _jsx(Assistant, {})] }));
}
