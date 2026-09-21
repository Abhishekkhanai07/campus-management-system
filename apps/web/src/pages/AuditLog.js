import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { timeAgo } from '../lib/format';
import { Badge, Empty, Loading, Panel, Select, Stat, Table, Td, PageTitle, Button } from '../components/ui';
const MODULES = ['AUTH', 'ATTENDANCE', 'LEAVE', 'SUBSTITUTION', 'ASSIGNMENT', 'EXAM', 'FEES', 'STUDENT', 'STAFF', 'SETUP', 'USER', 'NOTICE'];
export default function AuditLog() {
    const [module, setModule] = useState('');
    const [sensitiveOnly, setSensitiveOnly] = useState(false);
    const [page, setPage] = useState(1);
    const { data, isLoading } = useQuery({
        queryKey: ['audit', module, sensitiveOnly, page],
        queryFn: () => get('/audit', {
            module: module || undefined,
            sensitiveOnly: sensitiveOnly ? 'true' : undefined,
            page,
        }),
    });
    const { data: stats } = useQuery({ queryKey: ['audit-stats'], queryFn: () => get('/audit/stats') });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitle, { title: "Activity log", subtitle: "Every change is recorded with the user, the time and what changed. Nothing here can be edited or deleted." }), stats && (_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4", children: [_jsx(Stat, { label: "Logins this week", value: stats.loginsLast7Days }), _jsx(Stat, { label: "Busiest module", value: stats.byModule.sort((a, b) => b.count - a.count)[0]?.module || '—' }), _jsx(Stat, { label: "Most active user", value: _jsx("span", { className: "text-[15px]", children: stats.topUsers[0]?.user || '—' }), hint: `${stats.topUsers[0]?.count || 0} actions` }), _jsx(Stat, { label: "Records on this page", value: data?.rows.length || 0 })] })), _jsxs("div", { className: "flex flex-wrap gap-3 mb-4", children: [_jsxs(Select, { value: module, onChange: (e) => { setModule(e.target.value); setPage(1); }, className: "max-w-[220px]", children: [_jsx("option", { value: "", children: "All modules" }), MODULES.map((m) => (_jsx("option", { value: m, children: m.toLowerCase() }, m)))] }), _jsxs("label", { className: "flex items-center gap-2 text-[13.5px] text-gray-600", children: [_jsx("input", { type: "checkbox", checked: sensitiveOnly, onChange: (e) => { setSensitiveOnly(e.target.checked); setPage(1); } }), "Only marks, fees and other sensitive actions"] })] }), _jsx(Panel, { title: data ? `${data.total} records` : 'Activity', children: isLoading ? (_jsx(Loading, {})) : !data?.rows.length ? (_jsx(Empty, { title: "Nothing logged for this filter" })) : (_jsxs(_Fragment, { children: [_jsx(Table, { head: ['When', 'Who', 'Role', 'Module', 'Action', 'Details'], children: data.rows.map((r) => (_jsxs("tr", { className: r.isSensitive ? 'bg-amber-light/40' : '', children: [_jsx(Td, { className: "text-gray-500 whitespace-nowrap", children: timeAgo(r.at) }), _jsx(Td, { className: "font-medium", children: r.who }), _jsx(Td, { className: "text-gray-500", children: r.role?.toLowerCase().replace('_', ' ') }), _jsx(Td, { children: r.module.toLowerCase() }), _jsx(Td, { children: r.isSensitive ? (_jsx(Badge, { tone: "pending", children: r.action.replace(/_/g, ' ').toLowerCase() })) : (r.action.replace(/_/g, ' ').toLowerCase()) }), _jsx(Td, { className: "text-gray-500 max-w-[280px] truncate", children: r.details ? JSON.stringify(r.details) : '—' })] }, r.id))) }), data.pages > 1 && (_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-t border-line", children: [_jsxs("span", { className: "text-[13px] text-gray-500", children: ["Page ", data.page, " of ", data.pages] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "secondary", disabled: page <= 1, onClick: () => setPage((p) => p - 1), children: "Previous" }), _jsx(Button, { size: "sm", variant: "secondary", disabled: page >= data.pages, onClick: () => setPage((p) => p + 1), children: "Next" })] })] }))] })) })] }));
}
